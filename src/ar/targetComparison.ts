export type TargetComparisonSummary = {
  compared: boolean;
  averageDifference: number;
  changedPixelRatio: number;
};

export const summarizePixelDifference = (
  renderedData: Uint8ClampedArray,
  targetData: Uint8ClampedArray,
): Omit<TargetComparisonSummary, "compared"> => {
  const pixels = Math.floor(
    Math.min(renderedData.length, targetData.length) / 4,
  );
  if (pixels <= 0) {
    return { averageDifference: 0, changedPixelRatio: 0 };
  }

  let totalDifference = 0;
  let changedPixels = 0;

  for (let index = 0; index < pixels * 4; index += 4) {
    const difference =
      Math.abs(renderedData[index] - targetData[index]) +
      Math.abs(renderedData[index + 1] - targetData[index + 1]) +
      Math.abs(renderedData[index + 2] - targetData[index + 2]);
    totalDifference += difference / 3;

    if (difference > 36) {
      changedPixels += 1;
    }
  }

  return {
    averageDifference: totalDifference / pixels,
    changedPixelRatio: changedPixels / pixels,
  };
};

export const compareFixtureRender = (
  source: HTMLImageElement,
  overlay: HTMLCanvasElement,
  target: HTMLImageElement,
): TargetComparisonSummary => {
  if (
    source.naturalWidth <= 0 ||
    source.naturalHeight <= 0 ||
    overlay.width <= 0 ||
    overlay.height <= 0 ||
    target.naturalWidth <= 0 ||
    target.naturalHeight <= 0
  ) {
    return { compared: false, averageDifference: 0, changedPixelRatio: 0 };
  }

  const width = Math.min(
    source.naturalWidth,
    overlay.width,
    target.naturalWidth,
  );
  const height = Math.min(
    source.naturalHeight,
    overlay.height,
    target.naturalHeight,
  );
  const renderedCanvas = document.createElement("canvas");
  renderedCanvas.width = width;
  renderedCanvas.height = height;
  const targetCanvas = document.createElement("canvas");
  targetCanvas.width = width;
  targetCanvas.height = height;
  const renderedContext = renderedCanvas.getContext("2d");
  const targetContext = targetCanvas.getContext("2d");
  if (!renderedContext || !targetContext) {
    return { compared: false, averageDifference: 0, changedPixelRatio: 0 };
  }

  renderedContext.drawImage(source, 0, 0, width, height);
  renderedContext.drawImage(overlay, 0, 0, width, height);
  targetContext.drawImage(target, 0, 0, width, height);

  const renderedData = renderedContext.getImageData(0, 0, width, height).data;
  const targetData = targetContext.getImageData(0, 0, width, height).data;
  const summary = summarizePixelDifference(renderedData, targetData);

  return {
    compared: true,
    ...summary,
  };
};
