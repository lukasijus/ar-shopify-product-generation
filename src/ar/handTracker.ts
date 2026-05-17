import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type HandTracker = {
  detectForVideo: (
    video: HTMLVideoElement,
    startTimeMs: number,
  ) => HandLandmarkerResult;
  close: () => void;
};

export type HandImageTracker = {
  detect: (
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  ) => HandLandmarkerResult;
  close: () => void;
};

const createVisionFileset = () =>
  FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm",
  );

export const createHandTracker = async (): Promise<HandTracker> => {
  const vision = await createVisionFileset();

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
};

export const createHandImageTracker = async (): Promise<HandImageTracker> => {
  const vision = await createVisionFileset();

  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "IMAGE",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
};
