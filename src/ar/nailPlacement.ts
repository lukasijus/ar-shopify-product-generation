import type * as Ort from "onnxruntime-web";

import {
  clamp,
  distance,
  dot,
  type FingerConfig,
  type FingerName,
  fingerConfigs,
  isFiniteLandmark,
  type Landmark,
  type NailAssetVariantName,
  type NailOverlay,
  type OverlayCanvasSize,
  selectNailAssetVariant,
  toCanvasPoint,
} from "./nailGeometry";
import { configureOnnxRuntime } from "./onnxRuntime";

export type NailPlacementSource = "heuristic" | "onnx" | "fallback";

export type NailPlacementDecision = {
  finger: FingerName;
  overlay: NailOverlay;
  source: NailPlacementSource;
  confidence: number;
};

export type NailPlacementComparison = {
  finger: FingerName;
  heuristic: NailOverlay;
  model: NailOverlay;
  source: NailPlacementSource;
};

export type NailPlacementModel = {
  readonly label: string;
  readonly ready: boolean;
  predict(
    config: FingerConfig,
    landmarks: Landmark[],
    size: OverlayCanvasSize,
    overlay: NailOverlay,
    visibilityConfidence?: number,
  ): Promise<NailPlacementDecision>;
};

const nailAssetVariants: NailAssetVariantName[] = [
  "front",
  "slightLeft",
  "slightRight",
  "angledLeft",
  "angledRight",
  "side",
];

export const nailPlacementFeatureNames = [
  "bias",
  "isThumb",
  "isIndex",
  "isMiddle",
  "isRing",
  "isPinky",
  "tipX",
  "tipY",
  "dipX",
  "dipY",
  "pipX",
  "pipY",
  "distalLengthNormalized",
  "supportLengthNormalized",
  "distalSupportRatio",
  "extensionDot",
  "wristToTipRatio",
  "edgeSafetyNormalized",
  "horizontalBias",
  "directionXNormalized",
  "directionYNormalized",
  "overlayCenterXNormalized",
  "overlayCenterYNormalized",
  "overlayWidthNormalized",
  "overlayHeightNormalized",
  "overlayAngleSin",
  "overlayAngleCos",
  "visibilityConfidence",
] as const;

type NailPlacementMetadata = {
  modelPath: string;
  inputName: string;
  outputName: string;
  featureNames: readonly string[];
  outputNames: readonly string[];
};

const placementOutputNames = [
  "centerDxRatio",
  "centerDyRatio",
  "widthScaleDelta",
  "heightScaleDelta",
  "angleDeltaRadians",
  "frontLogit",
  "slightLeftLogit",
  "slightRightLogit",
  "angledLeftLogit",
  "angledRightLogit",
  "sideLogit",
] as const;

const defaultMetadata: NailPlacementMetadata = {
  modelPath: "/models/nail-placement.onnx",
  inputName: "features",
  outputName: "placement",
  featureNames: nailPlacementFeatureNames,
  outputNames: placementOutputNames,
};

const finiteOrZero = (value: number): number =>
  Number.isFinite(value) ? value : 0;

export const extractNailPlacementFeatures = (
  config: FingerConfig,
  landmarks: Landmark[],
  size: OverlayCanvasSize,
  overlay: NailOverlay,
  visibilityConfidence = 1,
): number[] => {
  const wrist = landmarks[0];
  const tip = landmarks[config.tip];
  const dip = landmarks[config.dip];
  const pip = landmarks[config.pip];

  if (
    !isFiniteLandmark(wrist) ||
    !isFiniteLandmark(tip) ||
    !isFiniteLandmark(dip) ||
    !isFiniteLandmark(pip) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    return nailPlacementFeatureNames.map((name) => (name === "bias" ? 1 : 0));
  }

  const tipPoint = toCanvasPoint(tip, size);
  const dipPoint = toCanvasPoint(dip, size);
  const pipPoint = toCanvasPoint(pip, size);
  const wristPoint = toCanvasPoint(wrist, size);
  const minSize = Math.max(Math.min(size.width, size.height), 1);
  const distalLength = distance(tip, dip, size);
  const supportLength = distance(dip, pip, size);
  const distalX = tipPoint.x - dipPoint.x;
  const distalY = tipPoint.y - dipPoint.y;
  const supportX = dipPoint.x - pipPoint.x;
  const supportY = dipPoint.y - pipPoint.y;
  const directionLength = Math.max(Math.hypot(distalX, distalY), 1);
  const wristToDip = Math.max(
    Math.hypot(dipPoint.x - wristPoint.x, dipPoint.y - wristPoint.y),
    1,
  );
  const edgeSafety = Math.min(
    tipPoint.x,
    size.width - tipPoint.x,
    tipPoint.y,
    size.height - tipPoint.y,
  );

  return [
    1,
    config.finger === "thumb" ? 1 : 0,
    config.finger === "index" ? 1 : 0,
    config.finger === "middle" ? 1 : 0,
    config.finger === "ring" ? 1 : 0,
    config.finger === "pinky" ? 1 : 0,
    finiteOrZero(tip.x),
    finiteOrZero(tip.y),
    finiteOrZero(dip.x),
    finiteOrZero(dip.y),
    finiteOrZero(pip.x),
    finiteOrZero(pip.y),
    finiteOrZero(distalLength / minSize),
    finiteOrZero(supportLength / minSize),
    finiteOrZero(distalLength / Math.max(supportLength, 1)),
    finiteOrZero(dot(distalX, distalY, supportX, supportY)),
    finiteOrZero(
      Math.hypot(tipPoint.x - wristPoint.x, tipPoint.y - wristPoint.y) /
        wristToDip,
    ),
    finiteOrZero(edgeSafety / minSize),
    finiteOrZero(Math.abs(distalX) / Math.max(Math.abs(distalY), 1)),
    finiteOrZero(distalX / directionLength),
    finiteOrZero(distalY / directionLength),
    finiteOrZero(overlay.centerX / size.width),
    finiteOrZero(overlay.centerY / size.height),
    finiteOrZero(overlay.width / minSize),
    finiteOrZero(overlay.height / minSize),
    finiteOrZero(Math.sin(overlay.angle)),
    finiteOrZero(Math.cos(overlay.angle)),
    clamp(visibilityConfidence, 0, 1),
  ];
};

export const applyPlacementPrediction = (
  overlay: NailOverlay,
  rawOutput: readonly number[],
): NailOverlay => {
  const variantLogits = rawOutput.slice(5, 11);
  const variantIndex = variantLogits.reduce(
    (bestIndex, value, index) =>
      value > (variantLogits[bestIndex] ?? Number.NEGATIVE_INFINITY)
        ? index
        : bestIndex,
    0,
  );

  return {
    ...overlay,
    centerX:
      overlay.centerX + clamp(rawOutput[0] ?? 0, -0.22, 0.22) * overlay.width,
    centerY:
      overlay.centerY + clamp(rawOutput[1] ?? 0, -0.22, 0.22) * overlay.height,
    width: clamp(
      overlay.width * (1 + clamp(rawOutput[2] ?? 0, -0.22, 0.22)),
      7,
      58,
    ),
    height: clamp(
      overlay.height * (1 + clamp(rawOutput[3] ?? 0, -0.2, 0.2)),
      13,
      88,
    ),
    angle: overlay.angle + clamp(rawOutput[4] ?? 0, -0.26, 0.26),
    variant: nailAssetVariants[variantIndex] ?? overlay.variant,
  };
};

export class HeuristicNailPlacementModel implements NailPlacementModel {
  readonly label = "heuristic";
  readonly ready = true;

  async predict(
    _config: FingerConfig,
    _landmarks: Landmark[],
    _size: OverlayCanvasSize,
    overlay: NailOverlay,
    visibilityConfidence = 1,
  ): Promise<NailPlacementDecision> {
    void visibilityConfidence;

    return {
      finger: overlay.finger,
      overlay,
      source: "heuristic",
      confidence: 1,
    };
  }
}

export class OnnxNailPlacementModel implements NailPlacementModel {
  readonly label = "onnx";
  private ort: typeof Ort | null = null;
  private session: Ort.InferenceSession | null = null;
  private metadata: NailPlacementMetadata = defaultMetadata;
  private loadPromise: Promise<void> | null = null;
  private loadError: Error | null = null;

  get ready(): boolean {
    return Boolean(this.session);
  }

  get error(): Error | null {
    return this.loadError;
  }

  async load(): Promise<void> {
    this.loadPromise ??= this.loadModel();
    await this.loadPromise;
  }

  async predict(
    config: FingerConfig,
    landmarks: Landmark[],
    size: OverlayCanvasSize,
    overlay: NailOverlay,
    visibilityConfidence = 1,
  ): Promise<NailPlacementDecision> {
    if (!this.session || !this.ort) {
      await this.load();
    }

    if (!this.session || !this.ort) {
      throw new Error("The ONNX placement model is not loaded.");
    }

    const features = extractNailPlacementFeatures(
      config,
      landmarks,
      size,
      overlay,
      visibilityConfidence,
    );
    const expectedFeatureCount = this.metadata.featureNames.length;
    if (features.length !== expectedFeatureCount) {
      throw new Error(
        `Placement feature count mismatch: expected ${expectedFeatureCount}, got ${features.length}.`,
      );
    }

    const tensor = new this.ort.Tensor("float32", Float32Array.from(features), [
      1,
      expectedFeatureCount,
    ]);
    const outputs = await this.session.run({
      [this.metadata.inputName]: tensor,
    });
    const output = outputs[this.metadata.outputName];
    const rawOutput = Array.from((output?.data ?? []) as ArrayLike<number>).map(
      Number,
    );

    return {
      finger: overlay.finger,
      overlay: applyPlacementPrediction(overlay, rawOutput),
      source: "onnx",
      confidence: 1,
    };
  }

  private async loadModel(): Promise<void> {
    try {
      const [ort, metadata] = await Promise.all([
        import("onnxruntime-web"),
        this.loadMetadata(),
      ]);
      configureOnnxRuntime(ort);
      this.ort = ort;
      this.metadata = metadata;
      this.session = await ort.InferenceSession.create(metadata.modelPath, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    } catch (error) {
      this.loadError =
        error instanceof Error
          ? error
          : new Error("Failed to load ONNX placement model.");
      this.session = null;
      this.ort = null;
    }
  }

  private async loadMetadata(): Promise<NailPlacementMetadata> {
    const response = await fetch("/models/nail-placement.metadata.json");
    if (!response.ok) {
      return defaultMetadata;
    }

    const metadata = (await response.json()) as Partial<NailPlacementMetadata>;

    return {
      modelPath: metadata.modelPath ?? defaultMetadata.modelPath,
      inputName: metadata.inputName ?? defaultMetadata.inputName,
      outputName: metadata.outputName ?? defaultMetadata.outputName,
      featureNames: metadata.featureNames ?? defaultMetadata.featureNames,
      outputNames: metadata.outputNames ?? defaultMetadata.outputNames,
    };
  }
}

export class CompositeNailPlacementModel implements NailPlacementModel {
  readonly label = "model";
  private readonly heuristic = new HeuristicNailPlacementModel();
  private readonly onnx = new OnnxNailPlacementModel();
  private loading: Promise<void>;

  constructor() {
    this.loading = this.onnx.load();
  }

  get ready(): boolean {
    return this.onnx.ready || this.heuristic.ready;
  }

  async initialize(): Promise<void> {
    await this.loading;
  }

  async predict(
    config: FingerConfig,
    landmarks: Landmark[],
    size: OverlayCanvasSize,
    overlay: NailOverlay,
    visibilityConfidence = 1,
  ): Promise<NailPlacementDecision> {
    await this.initialize();

    if (this.onnx.ready) {
      return this.onnx.predict(
        config,
        landmarks,
        size,
        overlay,
        visibilityConfidence,
      );
    }

    const fallback = await this.heuristic.predict(
      config,
      landmarks,
      size,
      overlay,
      visibilityConfidence,
    );
    return {
      ...fallback,
      source: "fallback",
    };
  }

  async compare(
    overlays: NailOverlay[],
    landmarks: Landmark[],
    size: OverlayCanvasSize,
  ): Promise<NailPlacementComparison[]> {
    await this.initialize();

    const comparisons: NailPlacementComparison[] = [];
    for (const overlay of overlays) {
      const config = fingerConfigs.find(
        (candidate) => candidate.finger === overlay.finger,
      );
      if (!config) {
        continue;
      }

      const model = await this.predict(config, landmarks, size, overlay);
      comparisons.push({
        finger: overlay.finger,
        heuristic: overlay,
        model: model.overlay,
        source: model.source,
      });
    }

    return comparisons;
  }
}

export const getHeuristicVariantIndex = (
  config: FingerConfig,
  landmarks: Landmark[],
  size: OverlayCanvasSize,
): number => {
  const tip = landmarks[config.tip];
  const dip = landmarks[config.dip];
  if (!isFiniteLandmark(tip) || !isFiniteLandmark(dip)) {
    return 0;
  }

  const tipPoint = toCanvasPoint(tip, size);
  const dipPoint = toCanvasPoint(dip, size);
  const variant = selectNailAssetVariant(
    config.finger,
    tipPoint.x - dipPoint.x,
    tipPoint.y - dipPoint.y,
  );

  return Math.max(nailAssetVariants.indexOf(variant), 0);
};

export const nailPlacementOutputNames = placementOutputNames;
export const nailPlacementVariants = nailAssetVariants;
