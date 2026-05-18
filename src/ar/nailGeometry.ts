export type Landmark = {
  x: number;
  y: number;
  z?: number;
};

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";
export type NailAssetVariantName = "front" | "angled" | "side";

export type NailOverlay = {
  finger: FingerName;
  variant: NailAssetVariantName;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
  color: string;
  accentColor: string;
};

type FingerConfig = {
  finger: FingerName;
  tip: number;
  dip: number;
  pip: number;
  widthRatio: number;
  lengthRatio: number;
  bedOffsetRatio: number;
  color: string;
  accentColor: string;
};

export type NailOverlayOptions = {
  allowedFingers?: readonly FingerName[];
};

const FINGERS: FingerConfig[] = [
  {
    finger: "thumb",
    tip: 4,
    dip: 3,
    pip: 2,
    widthRatio: 0.56,
    lengthRatio: 1.02,
    bedOffsetRatio: 0.3,
    color: "#f3d8cc",
    accentColor: "#f7a7bc",
  },
  {
    finger: "index",
    tip: 8,
    dip: 7,
    pip: 6,
    widthRatio: 0.54,
    lengthRatio: 1.08,
    bedOffsetRatio: 0.3,
    color: "#f7dce5",
    accentColor: "#f9b8ca",
  },
  {
    finger: "middle",
    tip: 12,
    dip: 11,
    pip: 10,
    widthRatio: 0.56,
    lengthRatio: 1.14,
    bedOffsetRatio: 0.3,
    color: "#f2d2de",
    accentColor: "#fff3f6",
  },
  {
    finger: "ring",
    tip: 16,
    dip: 15,
    pip: 14,
    widthRatio: 0.52,
    lengthRatio: 1.04,
    bedOffsetRatio: 0.31,
    color: "#f6d7df",
    accentColor: "#f1a6be",
  },
  {
    finger: "pinky",
    tip: 20,
    dip: 19,
    pip: 18,
    widthRatio: 0.46,
    lengthRatio: 0.94,
    bedOffsetRatio: 0.32,
    color: "#efd0dc",
    accentColor: "#fff5f8",
  },
];

export type OverlayCanvasSize = {
  width: number;
  height: number;
};

const distance = (
  a: Landmark,
  b: Landmark,
  size: OverlayCanvasSize,
): number => {
  const dx = (a.x - b.x) * size.width;
  const dy = (a.y - b.y) * size.height;

  return Math.hypot(dx, dy);
};

const toCanvasPoint = (
  landmark: Landmark,
  size: OverlayCanvasSize,
): { x: number; y: number } => ({
  x: landmark.x * size.width,
  y: landmark.y * size.height,
});

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const isFiniteLandmark = (
  landmark: Landmark | undefined,
): landmark is Landmark =>
  Boolean(
    landmark &&
    Number.isFinite(landmark.x) &&
    Number.isFinite(landmark.y) &&
    (landmark.z === undefined || Number.isFinite(landmark.z)),
  );

const dot = (aX: number, aY: number, bX: number, bY: number): number => {
  const aLength = Math.max(Math.hypot(aX, aY), 1);
  const bLength = Math.max(Math.hypot(bX, bY), 1);

  return (aX * bX + aY * bY) / (aLength * bLength);
};

export const selectNailAssetVariant = (
  finger: FingerName,
  directionX: number,
  directionY: number,
): NailAssetVariantName => {
  const horizontalBias =
    Math.abs(directionX) / Math.max(Math.abs(directionY), 1);

  if (finger === "thumb" && horizontalBias > 0.92) {
    return "side";
  }

  if (horizontalBias > 0.58) {
    return "angled";
  }

  return "front";
};

const isFingerEligible = (
  config: FingerConfig,
  landmarks: Landmark[],
  size: OverlayCanvasSize,
): boolean => {
  const wrist = landmarks[0];
  const tip = landmarks[config.tip];
  const dip = landmarks[config.dip];
  const pip = landmarks[config.pip];

  if (
    !isFiniteLandmark(wrist) ||
    !isFiniteLandmark(tip) ||
    !isFiniteLandmark(dip) ||
    !isFiniteLandmark(pip)
  ) {
    return false;
  }

  const tipPoint = toCanvasPoint(tip, size);
  const dipPoint = toCanvasPoint(dip, size);
  const pipPoint = toCanvasPoint(pip, size);
  const wristPoint = toCanvasPoint(wrist, size);
  const edgePadding = Math.min(size.width, size.height) * 0.015;

  if (
    tipPoint.x < edgePadding ||
    tipPoint.x > size.width - edgePadding ||
    tipPoint.y < edgePadding ||
    tipPoint.y > size.height - edgePadding
  ) {
    return false;
  }

  const distalLength = distance(tip, dip, size);
  const supportLength = distance(dip, pip, size);
  if (distalLength < 7 || supportLength < 7) {
    return false;
  }

  const distalX = tipPoint.x - dipPoint.x;
  const distalY = tipPoint.y - dipPoint.y;
  const supportX = dipPoint.x - pipPoint.x;
  const supportY = dipPoint.y - pipPoint.y;
  const extensionDot = dot(distalX, distalY, supportX, supportY);
  if (extensionDot < -0.1) {
    return false;
  }

  const wristToTip = Math.hypot(
    tipPoint.x - wristPoint.x,
    tipPoint.y - wristPoint.y,
  );
  const wristToDip = Math.hypot(
    dipPoint.x - wristPoint.x,
    dipPoint.y - wristPoint.y,
  );
  if (wristToTip < wristToDip * 0.96) {
    return false;
  }

  return true;
};

export const computeNailOverlays = (
  landmarks: Landmark[],
  size: OverlayCanvasSize,
  options: NailOverlayOptions = {},
): NailOverlay[] => {
  if (landmarks.length < 21 || size.width <= 0 || size.height <= 0) {
    return [];
  }

  const allowedFingers = options.allowedFingers
    ? new Set<FingerName>(options.allowedFingers)
    : null;

  return FINGERS.flatMap((config) => {
    if (allowedFingers && !allowedFingers.has(config.finger)) {
      return [];
    }

    if (!isFingerEligible(config, landmarks, size)) {
      return [];
    }

    const tip = landmarks[config.tip];
    const dip = landmarks[config.dip];
    const pip = landmarks[config.pip];
    const tipPoint = toCanvasPoint(tip, size);
    const dipPoint = toCanvasPoint(dip, size);

    const directionX = tipPoint.x - dipPoint.x;
    const directionY = tipPoint.y - dipPoint.y;
    const distalLength = Math.max(distance(tip, dip, size), 10);
    const supportLength = Math.max(distance(dip, pip, size), distalLength);
    const segmentLength = clamp(
      distalLength * 0.72 + supportLength * 0.28,
      14,
      110,
    );
    const directionLength = Math.max(Math.hypot(directionX, directionY), 1);
    const unitX = directionX / directionLength;
    const unitY = directionY / directionLength;
    const angle = Math.atan2(directionY, directionX) + Math.PI / 2;
    const width = clamp(segmentLength * config.widthRatio, 9, 48);
    const height = clamp(segmentLength * config.lengthRatio, 16, 78);

    return [
      {
        finger: config.finger,
        variant: selectNailAssetVariant(config.finger, directionX, directionY),
        centerX: tipPoint.x - unitX * height * config.bedOffsetRatio,
        centerY: tipPoint.y - unitY * height * config.bedOffsetRatio,
        width,
        height,
        angle,
        color: config.color,
        accentColor: config.accentColor,
      },
    ];
  });
};
