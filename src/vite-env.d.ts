/// <reference types="vite/client" />

interface Window {
  __alwaysLikeVisibilityTrainingSample?: {
    fixtureId: string;
    imagePath: string;
    detected: boolean;
    rows: Array<{
      finger: string;
      label: 0 | 1;
      features: number[];
      reasons: string[];
    }>;
  };
}
