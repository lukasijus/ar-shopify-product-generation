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
  __alwaysLikePlacementTrainingSample?: {
    fixtureId: string;
    imagePath: string;
    detected: boolean;
    rows: Array<{
      finger: string;
      label: 0 | 1;
      features: number[];
      heuristic: {
        centerX: number;
        centerY: number;
        width: number;
        height: number;
        angle: number;
        variantIndex: number;
      };
    }>;
  };
}
