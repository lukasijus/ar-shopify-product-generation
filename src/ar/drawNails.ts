import type { NailOverlay } from "./nailGeometry";
import type { NailProductStyle } from "../app/pressOnProducts";
import type { NailAssetSet } from "./nailAssets";

type Point = {
  x: number;
  y: number;
};

const drawStar = (
  context: CanvasRenderingContext2D,
  center: Point,
  radius: number,
): void => {
  context.beginPath();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const currentRadius = index % 2 === 0 ? radius : radius * 0.42;
    const x = center.x + Math.cos(angle) * currentRadius;
    const y = center.y + Math.sin(angle) * currentRadius;

    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  }
  context.closePath();
};

const drawHeart = (
  context: CanvasRenderingContext2D,
  center: Point,
  size: number,
): void => {
  context.beginPath();
  context.moveTo(center.x, center.y + size * 0.34);
  context.bezierCurveTo(
    center.x - size,
    center.y - size * 0.26,
    center.x - size * 0.46,
    center.y - size,
    center.x,
    center.y - size * 0.36,
  );
  context.bezierCurveTo(
    center.x + size * 0.46,
    center.y - size,
    center.x + size,
    center.y - size * 0.26,
    center.x,
    center.y + size * 0.34,
  );
  context.closePath();
};

const drawFlower = (
  context: CanvasRenderingContext2D,
  center: Point,
  radius: number,
): void => {
  for (let index = 0; index < 5; index += 1) {
    const angle = (index * Math.PI * 2) / 5;
    context.beginPath();
    context.ellipse(
      center.x + Math.cos(angle) * radius * 0.58,
      center.y + Math.sin(angle) * radius * 0.58,
      radius * 0.34,
      radius * 0.58,
      angle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
};

const addFinishDetails = (
  context: CanvasRenderingContext2D,
  overlay: NailOverlay,
  style: NailProductStyle,
): void => {
  const halfWidth = overlay.width / 2;
  const halfHeight = overlay.height / 2;
  const detailSize = Math.max(2.2, overlay.width * 0.12);

  context.shadowColor = "transparent";

  if (style.finish === "monochrome") {
    context.strokeStyle = style.tipColor;
    context.lineWidth = Math.max(1.2, overlay.width * 0.08);
    context.beginPath();
    context.moveTo(-halfWidth * 0.52, -halfHeight * 0.1);
    context.lineTo(halfWidth * 0.52, halfHeight * 0.28);
    context.stroke();
    return;
  }

  if (style.finish === "chrome") {
    context.strokeStyle = "rgba(255, 255, 255, 0.78)";
    context.lineWidth = Math.max(1.6, overlay.width * 0.1);
    context.beginPath();
    context.moveTo(-halfWidth * 0.35, -halfHeight * 0.48);
    context.lineTo(halfWidth * 0.34, halfHeight * 0.3);
    context.stroke();
    return;
  }

  if (style.finish === "sparkle" || style.finish === "stars") {
    context.fillStyle = style.tipColor;
    drawStar(
      context,
      { x: halfWidth * 0.18, y: -halfHeight * 0.24 },
      detailSize,
    );
    context.fill();
    drawStar(
      context,
      { x: -halfWidth * 0.2, y: halfHeight * 0.12 },
      detailSize * 0.64,
    );
    context.fill();
    return;
  }

  if (style.finish === "floral" || style.finish === "rose") {
    context.fillStyle = style.tipColor;
    drawFlower(
      context,
      { x: halfWidth * 0.12, y: -halfHeight * 0.08 },
      detailSize * 1.15,
    );
    context.fillStyle = style.accentColor;
    context.beginPath();
    context.arc(
      halfWidth * 0.12,
      -halfHeight * 0.08,
      detailSize * 0.26,
      0,
      Math.PI * 2,
    );
    context.fill();
    return;
  }

  if (style.finish === "hearts" || style.finish === "charms") {
    context.fillStyle = style.accentColor;
    drawHeart(
      context,
      { x: halfWidth * 0.16, y: -halfHeight * 0.04 },
      detailSize * 0.92,
    );
    context.fill();
  }
};

const getOverlayStyle = (
  overlay: NailOverlay,
  style?: NailProductStyle,
): NailProductStyle => ({
  baseColor: style?.baseColor ?? overlay.color,
  accentColor: style?.accentColor ?? overlay.accentColor,
  tipColor: style?.tipColor ?? "#fff8fa",
  finish: style?.finish ?? "sparkle",
});

const drawNailAsset = (
  context: CanvasRenderingContext2D,
  overlay: NailOverlay,
  asset: HTMLImageElement,
): void => {
  const targetHeight = overlay.height * 1.16;
  const imageRatio =
    asset.naturalWidth > 0 && asset.naturalHeight > 0
      ? asset.naturalWidth / asset.naturalHeight
      : overlay.width / overlay.height;
  const targetWidth = Math.max(overlay.width * 0.82, targetHeight * imageRatio);

  context.shadowColor = "rgba(15, 38, 48, 0.22)";
  context.shadowBlur = 8;
  context.shadowOffsetY = 2;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    asset,
    -targetWidth / 2,
    -targetHeight / 2,
    targetWidth,
    targetHeight,
  );
};

export const drawNailOverlays = (
  context: CanvasRenderingContext2D,
  overlays: NailOverlay[],
  style?: NailProductStyle,
  assets?: NailAssetSet | null,
): void => {
  overlays.forEach((overlay) => {
    const overlayStyle = getOverlayStyle(overlay, style);
    const asset = assets?.[overlay.finger];

    context.save();
    context.translate(overlay.centerX, overlay.centerY);
    context.rotate(overlay.angle);

    if (asset) {
      context.rotate(Math.PI);
      drawNailAsset(context, overlay, asset);
      context.restore();
      return;
    }

    const radius = overlay.width / 2;
    const halfWidth = overlay.width / 2;
    const halfHeight = overlay.height / 2;

    context.shadowColor = "rgba(15, 38, 48, 0.28)";
    context.shadowBlur = 12;
    context.shadowOffsetY = 3;

    const gradient = context.createLinearGradient(
      0,
      -halfHeight,
      0,
      halfHeight,
    );
    gradient.addColorStop(0, overlayStyle.accentColor);
    gradient.addColorStop(0.46, overlayStyle.baseColor);
    gradient.addColorStop(1, overlayStyle.tipColor);

    context.fillStyle = gradient;
    context.strokeStyle = "rgba(255, 255, 255, 0.8)";
    context.lineWidth = 1.5;

    context.beginPath();
    context.moveTo(-halfWidth, halfHeight * 0.42);
    context.quadraticCurveTo(
      -halfWidth,
      -halfHeight * 0.35,
      -radius * 0.45,
      -halfHeight,
    );
    context.quadraticCurveTo(0, -halfHeight * 1.08, radius * 0.45, -halfHeight);
    context.quadraticCurveTo(
      halfWidth,
      -halfHeight * 0.35,
      halfWidth,
      halfHeight * 0.42,
    );
    context.quadraticCurveTo(
      0,
      halfHeight * 0.66,
      -halfWidth,
      halfHeight * 0.42,
    );
    context.closePath();
    context.fill();
    context.stroke();

    addFinishDetails(context, overlay, overlayStyle);

    context.shadowColor = "transparent";
    context.fillStyle = "rgba(255, 255, 255, 0.78)";
    context.beginPath();
    context.ellipse(
      -halfWidth * 0.16,
      -halfHeight * 0.2,
      2.4,
      halfHeight * 0.34,
      0.08,
      0,
      Math.PI * 2,
    );
    context.fill();

    context.restore();
  });
};
