import type { Landmark, NailOverlay } from "./nailGeometry";

export const drawLandmarkDebug = (
  context: CanvasRenderingContext2D,
  landmarks: Landmark[],
  overlays: NailOverlay[],
  width: number,
  height: number,
): void => {
  context.save();

  context.fillStyle = "rgba(22, 74, 91, 0.88)";
  landmarks.forEach((landmark) => {
    context.beginPath();
    context.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);
    context.fill();
  });

  context.strokeStyle = "rgba(255, 255, 255, 0.92)";
  context.lineWidth = 2;
  overlays.forEach((overlay) => {
    context.save();
    context.translate(overlay.centerX, overlay.centerY);
    context.rotate(overlay.angle);
    context.strokeRect(
      -overlay.width / 2,
      -overlay.height / 2,
      overlay.width,
      overlay.height,
    );
    context.restore();
  });

  context.restore();
};
