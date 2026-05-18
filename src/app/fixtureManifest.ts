import type { FingerName } from "../ar/nailGeometry";

export type FixtureDifficulty = "baseline" | "moderate" | "hard";

export type HandFixture = {
  id: string;
  label: string;
  imagePath: string;
  targetProductHandles?: readonly string[];
  targetKind?: "reference" | "imagegen";
  expectedDifficulty: FixtureDifficulty;
  visibleNails: boolean;
  expectedVisibleFingers: FingerName[];
  notes: string;
};

const allFingers: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];

export const handFixtures = [
  {
    id: "back-hand-flat-good-light",
    label: "Flat hand, good light",
    imagePath: "/test-fixtures/hands/general/back-hand-flat-good-light.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "baseline",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Primary calibration pose with the back of the hand visible.",
  },
  {
    id: "back-hand-fingers-close",
    label: "Fingers close together",
    imagePath: "/test-fixtures/hands/general/back-hand-fingers-close.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks overlap risk and whether overlays collide.",
  },
  {
    id: "back-hand-angled-left",
    label: "Angled left",
    imagePath: "/test-fixtures/hands/general/back-hand-angled-left.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks rotation and lateral perspective bias.",
  },
  {
    id: "back-hand-angled-right",
    label: "Angled right",
    imagePath: "/test-fixtures/hands/general/back-hand-angled-right.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks rotation and mirrored perspective bias.",
  },
  {
    id: "back-hand-close-camera",
    label: "Close to camera",
    imagePath: "/test-fixtures/hands/general/back-hand-close-camera.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks scale limits when the hand fills the frame.",
  },
  {
    id: "back-hand-far-camera",
    label: "Far from camera",
    imagePath: "/test-fixtures/hands/general/back-hand-far-camera.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks minimum overlay size and small hand detection.",
  },
  {
    id: "back-hand-warm-low-light",
    label: "Warm low light",
    imagePath: "/test-fixtures/hands/general/back-hand-warm-low-light.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks detection under less ideal indoor lighting.",
  },
  {
    id: "back-hand-busy-background",
    label: "Busy background",
    imagePath: "/test-fixtures/hands/general/back-hand-busy-background.png",
    targetProductHandles: ["blush-sparkle"],
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Checks robustness against a cluttered exhibition-style scene.",
  },
  {
    id: "closed-fist-knuckles",
    label: "Closed fist, knuckles",
    imagePath: "/test-fixtures/hands/general/closed-fist-knuckles.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes:
      "Negative fixture: no nail beds are visible, so no overlay should be drawn.",
  },
  {
    id: "closed-fist-top",
    label: "Closed fist, top view",
    imagePath: "/test-fixtures/hands/general/closed-fist-top.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes: "Negative fixture: curled fingers hide the nails.",
  },
  {
    id: "closed-fist-side",
    label: "Closed fist, side view",
    imagePath: "/test-fixtures/hands/general/closed-fist-side.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes:
      "Negative fixture: side/knuckle view should not receive press-on overlays.",
  },
  {
    id: "sleeve-covered-fingertips",
    label: "Sleeve-covered fingertips",
    imagePath: "/test-fixtures/hands/general/sleeve-covered-fingertips.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes: "Negative fixture: fingertips are covered by clothing.",
  },
  {
    id: "mug-occluded-fingertips",
    label: "Mug-occluded fingertips",
    imagePath: "/test-fixtures/hands/general/mug-occluded-fingertips.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes: "Negative fixture: object occlusion hides the nail beds.",
  },
  {
    id: "phone-occluded-fingertips",
    label: "Phone-occluded fingertips",
    imagePath: "/test-fixtures/hands/general/phone-occluded-fingertips.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes: "Negative fixture: object occlusion hides the nail beds.",
  },
  {
    id: "pocket-covered-fingers",
    label: "Pocket-covered fingers",
    imagePath: "/test-fixtures/hands/general/pocket-covered-fingers.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes:
      "Negative fixture: fingers are covered and not eligible for overlays.",
  },
  {
    id: "fingertips-out-of-frame",
    label: "Fingertips out of frame",
    imagePath: "/test-fixtures/hands/general/fingertips-out-of-frame.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes:
      "Negative fixture: hand is present, but nail targets are outside the useful view.",
  },
  {
    id: "v2-thumb-index-visible",
    label: "V2 thumb and index visible",
    imagePath: "/test-fixtures/hands/general/thumb-index-visible.png",
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: ["thumb", "index"],
    notes: "Generated bare-hand fixture with only thumb and index eligible.",
  },
  {
    id: "v2-all-five-visible",
    label: "V2 all five visible",
    imagePath: "/test-fixtures/hands/general/all-five-visible.png",
    targetProductHandles: ["blush-sparkle"],
    targetKind: "imagegen",
    expectedDifficulty: "baseline",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Generated bare-hand fixture with all nail beds visible.",
  },
  {
    id: "v2-peace-index-middle",
    label: "V2 peace sign",
    imagePath: "/test-fixtures/hands/general/peace-index-middle.png",
    targetProductHandles: ["blush-sparkle"],
    targetKind: "imagegen",
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: ["index", "middle"],
    notes: "Generated bare-hand fixture with index and middle eligible.",
  },
  {
    id: "v2-thumb-only-visible",
    label: "V2 thumb only",
    imagePath: "/test-fixtures/hands/general/thumb-only-visible.png",
    targetProductHandles: ["blush-sparkle"],
    targetKind: "imagegen",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: ["thumb"],
    notes: "Generated bare-hand fixture with only the thumb nail bed visible.",
  },
  {
    id: "v2-index-middle-ring-visible",
    label: "V2 three central fingers",
    imagePath: "/test-fixtures/hands/general/index-middle-ring-visible.png",
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: ["index", "middle", "ring"],
    notes: "Generated bare-hand fixture with three central fingers eligible.",
  },
  {
    id: "v2-sideways-thumb-index",
    label: "V2 sideways hand",
    imagePath: "/test-fixtures/hands/general/sideways-thumb-index.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: ["thumb", "index"],
    notes:
      "Generated sideways hand with only thumb and index nail beds visible.",
  },
  {
    id: "v2-fingertips-cropped",
    label: "V2 fingertips cropped",
    imagePath: "/test-fixtures/hands/general/fingertips-cropped.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes: "Generated negative fixture where nail beds are cropped out.",
  },
  {
    id: "v2-no-visible-fist",
    label: "V2 fist, no visible nails",
    imagePath: "/test-fixtures/hands/general/no-visible-fist.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    expectedVisibleFingers: [],
    notes: "Generated negative fixture with knuckles visible but no nail beds.",
  },
  {
    id: "v2-mug-occluded-thumb-ring",
    label: "V2 mug occlusion",
    imagePath: "/test-fixtures/hands/general/mug-occluded-thumb-ring.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: ["thumb", "ring"],
    notes: "Generated object occlusion fixture with partial visible nails.",
  },
  {
    id: "v2-low-light-all-five",
    label: "V2 low light all five",
    imagePath: "/test-fixtures/hands/general/low-light-all-five.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Generated all-fingers fixture under warm low light.",
  },
  {
    id: "v2-busy-background-all-five",
    label: "V2 busy background",
    imagePath: "/test-fixtures/hands/general/busy-background-all-five.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Generated all-fingers fixture with exhibition-style clutter.",
  },
  {
    id: "v2-ring-pinky-visible",
    label: "V2 ring and pinky visible",
    imagePath: "/test-fixtures/hands/general/ring-pinky-visible.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: ["ring", "pinky"],
    notes: "Generated partial fixture with ring and pinky eligible.",
  },
  {
    id: "v2-close-fingers-all-five",
    label: "V2 close fingers",
    imagePath: "/test-fixtures/hands/general/close-fingers-all-five.png",
    expectedDifficulty: "moderate",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Generated all-fingers fixture with nail beds close together.",
  },
  {
    id: "v2-far-camera-all-five",
    label: "V2 far camera all five",
    imagePath: "/test-fixtures/hands/general/far-camera-all-five.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    expectedVisibleFingers: allFingers,
    notes: "Generated all-fingers fixture with small nail beds in frame.",
  },
] as const satisfies readonly HandFixture[];

export const findFixtureById = (id: string | null): HandFixture =>
  handFixtures.find((fixture) => fixture.id === id) ?? handFixtures[0];

export const getFixtureTargetImagePath = (
  fixture: HandFixture,
  productHandle: string,
): string | null => {
  if (!fixture.targetProductHandles?.includes(productHandle)) {
    return null;
  }

  const filename = fixture.id.replace(/^v2-/, "");

  return `/test-fixtures/hands/targets/${productHandle}/${filename}.png`;
};

export const shouldRenderNailOverlay = (fixture: HandFixture): boolean =>
  fixture.expectedVisibleFingers.length > 0;
