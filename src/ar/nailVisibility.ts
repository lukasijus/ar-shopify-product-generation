import type * as Ort from "onnxruntime-web";

import { configureOnnxRuntime } from "./onnxRuntime";
import {
  distance,
  dot,
  type FingerConfig,
  type FingerName,
  fingerConfigs,
  isFingerEligible,
  isFiniteLandmark,
  type Landmark,
  type OverlayCanvasSize,
  toCanvasPoint,
} from "./nailGeometry";

export type NailVisibilitySource = "heuristic" | "onnx" | "fallback";

export type NailVisibilityDecision = {
  finger: FingerName;
  visible: boolean;
  confidence: number;
  source: NailVisibilitySource;
  reasons: string[];
};

export type NailVisibilityComparison = {
  finger: FingerName;
  heuristic: NailVisibilityDecision;
  model: NailVisibilityDecision;
};

export type NailVisibilityModel = {
  readonly label: string;
  readonly ready: boolean;
  predict(
    config: FingerConfig,
    landmarks: Landmark[],
    size: OverlayCanvasSize,
  ): Promise<NailVisibilityDecision>;
};

export const nailVisibilityFeatureNames = [
  "bias",
  "isThumb",
  "isIndex",
  "isMiddle",
  "isRing",
  "isPinky",
  "distalLengthNormalized",
  "supportLengthNormalized",
  "distalSupportRatio",
  "extensionDot",
  "wristToTipRatio",
  "edgeSafetyNormalized",
  "tipX",
  "tipY",
  "dipX",
  "dipY",
  "horizontalBias",
  "directionYNormalized",
  "zDelta",
  "nearEdgeFlag",
  "shortSegmentFlag",
  "foldedFingerFlag",
  "tipNotExtendedFlag",
] as const;

export type NailVisibilityFeatureName =
  (typeof nailVisibilityFeatureNames)[number];

export type NailVisibilityFeatures = {
  values: number[];
  reasons: string[];
};

const finiteOrZero = (value: number): number =>
  Number.isFinite(value) ? value : 0;

export const extractNailVisibilityFeatures = (
  config: FingerConfig,
  landmarks: Landmark[],
  size: OverlayCanvasSize,
): NailVisibilityFeatures => {
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
    return {
      values: nailVisibilityFeatureNames.map((name) =>
        name === "bias" ? 1 : 0,
      ),
      reasons: ["missing-landmarks"],
    };
  }

  const tipPoint = toCanvasPoint(tip, size);
  const dipPoint = toCanvasPoint(dip, size);
  const pipPoint = toCanvasPoint(pip, size);
  const wristPoint = toCanvasPoint(wrist, size);
  const minSize = Math.max(Math.min(size.width, size.height), 1);
  const edgeSafety = Math.min(
    tipPoint.x,
    size.width - tipPoint.x,
    tipPoint.y,
    size.height - tipPoint.y,
  );
  const distalLength = distance(tip, dip, size);
  const supportLength = distance(dip, pip, size);
  const distalX = tipPoint.x - dipPoint.x;
  const distalY = tipPoint.y - dipPoint.y;
  const supportX = dipPoint.x - pipPoint.x;
  const supportY = dipPoint.y - pipPoint.y;
  const extensionDot = dot(distalX, distalY, supportX, supportY);
  const wristToTip = Math.hypot(
    tipPoint.x - wristPoint.x,
    tipPoint.y - wristPoint.y,
  );
  const wristToDip = Math.max(
    Math.hypot(dipPoint.x - wristPoint.x, dipPoint.y - wristPoint.y),
    1,
  );
  const directionLength = Math.max(Math.hypot(distalX, distalY), 1);
  const horizontalBias = Math.abs(distalX) / Math.max(Math.abs(distalY), 1);
  const distalSupportRatio = distalLength / Math.max(supportLength, 1);

  const reasons: string[] = [];
  if (edgeSafety / minSize < 0.015) {
    reasons.push("tip-near-edge");
  }
  if (distalLength < 7 || supportLength < 7) {
    reasons.push("short-finger-segment");
  }
  if (extensionDot < -0.1) {
    reasons.push("folded-finger");
  }
  if (wristToTip < wristToDip * 0.96) {
    reasons.push("tip-not-extended");
  }

  return {
    values: [
      1,
      config.finger === "thumb" ? 1 : 0,
      config.finger === "index" ? 1 : 0,
      config.finger === "middle" ? 1 : 0,
      config.finger === "ring" ? 1 : 0,
      config.finger === "pinky" ? 1 : 0,
      finiteOrZero(distalLength / minSize),
      finiteOrZero(supportLength / minSize),
      finiteOrZero(distalSupportRatio),
      finiteOrZero(extensionDot),
      finiteOrZero(wristToTip / wristToDip),
      finiteOrZero(edgeSafety / minSize),
      finiteOrZero(tip.x),
      finiteOrZero(tip.y),
      finiteOrZero(dip.x),
      finiteOrZero(dip.y),
      finiteOrZero(horizontalBias),
      finiteOrZero(distalY / directionLength),
      finiteOrZero((tip.z ?? 0) - (dip.z ?? 0)),
      reasons.includes("tip-near-edge") ? 1 : 0,
      reasons.includes("short-finger-segment") ? 1 : 0,
      reasons.includes("folded-finger") ? 1 : 0,
      reasons.includes("tip-not-extended") ? 1 : 0,
    ],
    reasons,
  };
};

const sigmoid = (value: number): number => 1 / (1 + Math.exp(-value));

export class HeuristicNailVisibilityModel implements NailVisibilityModel {
  readonly label = "heuristic";
  readonly ready = true;

  async predict(
    config: FingerConfig,
    landmarks: Landmark[],
    size: OverlayCanvasSize,
  ): Promise<NailVisibilityDecision> {
    const features = extractNailVisibilityFeatures(config, landmarks, size);
    const visible = isFingerEligible(config, landmarks, size);
    const score =
      -1.6 +
      features.values[6] * 36 +
      features.values[7] * 24 +
      features.values[9] * 2.5 +
      (features.values[10] - 0.96) * 18 +
      features.values[11] * 18;

    return {
      finger: config.finger,
      visible,
      confidence: visible ? Math.max(sigmoid(score), 0.72) : 1 - sigmoid(score),
      source: "heuristic",
      reasons: features.reasons,
    };
  }
}

type NailVisibilityMetadata = {
  modelPath: string;
  inputName: string;
  outputName: string;
  featureNames: readonly string[];
  threshold: number;
};

const defaultMetadata: NailVisibilityMetadata = {
  modelPath: "/models/nail-visibility.onnx",
  inputName: "features",
  outputName: "probability",
  featureNames: nailVisibilityFeatureNames,
  threshold: 0.5,
};

export class OnnxNailVisibilityModel implements NailVisibilityModel {
  readonly label = "onnx";
  private ort: typeof Ort | null = null;
  private session: Ort.InferenceSession | null = null;
  private metadata: NailVisibilityMetadata = defaultMetadata;
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
  ): Promise<NailVisibilityDecision> {
    if (!this.session || !this.ort) {
      await this.load();
    }

    if (!this.session || !this.ort) {
      throw new Error("The ONNX visibility model is not loaded.");
    }

    const features = extractNailVisibilityFeatures(config, landmarks, size);
    const expectedFeatureCount = this.metadata.featureNames.length;
    if (features.values.length !== expectedFeatureCount) {
      throw new Error(
        `Feature count mismatch: expected ${expectedFeatureCount}, got ${features.values.length}.`,
      );
    }

    const tensor = new this.ort.Tensor(
      "float32",
      Float32Array.from(features.values),
      [1, expectedFeatureCount],
    );
    const outputs = await this.session.run({
      [this.metadata.inputName]: tensor,
    });
    const output = outputs[this.metadata.outputName];
    const probability =
      output?.data?.[0] !== undefined ? Number(output.data[0]) : 0;
    const visible = probability >= this.metadata.threshold;

    return {
      finger: config.finger,
      visible,
      confidence: visible ? probability : 1 - probability,
      source: "onnx",
      reasons: features.reasons,
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
          : new Error("Failed to load ONNX visibility model.");
      this.session = null;
      this.ort = null;
    }
  }

  private async loadMetadata(): Promise<NailVisibilityMetadata> {
    const response = await fetch("/models/nail-visibility.metadata.json");
    if (!response.ok) {
      return defaultMetadata;
    }

    const metadata = (await response.json()) as Partial<NailVisibilityMetadata>;
    const featureNames = metadata.featureNames ?? defaultMetadata.featureNames;

    return {
      modelPath: metadata.modelPath ?? defaultMetadata.modelPath,
      inputName: metadata.inputName ?? defaultMetadata.inputName,
      outputName: metadata.outputName ?? defaultMetadata.outputName,
      featureNames,
      threshold: metadata.threshold ?? defaultMetadata.threshold,
    };
  }
}

export class CompositeNailVisibilityModel implements NailVisibilityModel {
  readonly label = "model";
  private readonly heuristic = new HeuristicNailVisibilityModel();
  private readonly onnx = new OnnxNailVisibilityModel();
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
  ): Promise<NailVisibilityDecision> {
    await this.initialize();

    if (this.onnx.ready) {
      return this.onnx.predict(config, landmarks, size);
    }

    const fallback = await this.heuristic.predict(config, landmarks, size);
    return {
      ...fallback,
      source: "fallback",
      reasons: this.onnx.error
        ? [...fallback.reasons, "onnx-load-failed"]
        : fallback.reasons,
    };
  }

  async compare(
    landmarks: Landmark[],
    size: OverlayCanvasSize,
  ): Promise<NailVisibilityComparison[]> {
    await this.initialize();

    const comparisons: NailVisibilityComparison[] = [];
    for (const config of fingerConfigs) {
      comparisons.push({
        finger: config.finger,
        heuristic: await this.heuristic.predict(config, landmarks, size),
        model: await this.predict(config, landmarks, size),
      });
    }

    return comparisons;
  }
}
