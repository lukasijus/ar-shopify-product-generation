export type FixtureDifficulty = "baseline" | "moderate" | "hard";

export type HandFixture = {
  id: string;
  label: string;
  imagePath: string;
  targetImagePath?: string;
  expectedDifficulty: FixtureDifficulty;
  visibleNails: boolean;
  notes: string;
};

export const handFixtures = [
  {
    id: "back-hand-flat-good-light",
    label: "Flat hand, good light",
    imagePath: "/test-fixtures/hands/generated/back-hand-flat-good-light.png",
    targetImagePath:
      "/test-fixtures/hands/targets/back-hand-flat-good-light.png",
    expectedDifficulty: "baseline",
    visibleNails: true,
    notes: "Primary calibration pose with the back of the hand visible.",
  },
  {
    id: "back-hand-fingers-close",
    label: "Fingers close together",
    imagePath: "/test-fixtures/hands/generated/back-hand-fingers-close.png",
    targetImagePath: "/test-fixtures/hands/targets/back-hand-fingers-close.png",
    expectedDifficulty: "moderate",
    visibleNails: true,
    notes: "Checks overlap risk and whether overlays collide.",
  },
  {
    id: "back-hand-angled-left",
    label: "Angled left",
    imagePath: "/test-fixtures/hands/generated/back-hand-angled-left.png",
    targetImagePath: "/test-fixtures/hands/targets/back-hand-angled-left.png",
    expectedDifficulty: "moderate",
    visibleNails: true,
    notes: "Checks rotation and lateral perspective bias.",
  },
  {
    id: "back-hand-angled-right",
    label: "Angled right",
    imagePath: "/test-fixtures/hands/generated/back-hand-angled-right.png",
    targetImagePath: "/test-fixtures/hands/targets/back-hand-angled-right.png",
    expectedDifficulty: "moderate",
    visibleNails: true,
    notes: "Checks rotation and mirrored perspective bias.",
  },
  {
    id: "back-hand-close-camera",
    label: "Close to camera",
    imagePath: "/test-fixtures/hands/generated/back-hand-close-camera.png",
    targetImagePath: "/test-fixtures/hands/targets/back-hand-close-camera.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    notes: "Checks scale limits when the hand fills the frame.",
  },
  {
    id: "back-hand-far-camera",
    label: "Far from camera",
    imagePath: "/test-fixtures/hands/generated/back-hand-far-camera.png",
    targetImagePath: "/test-fixtures/hands/targets/back-hand-far-camera.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    notes: "Checks minimum overlay size and small hand detection.",
  },
  {
    id: "back-hand-warm-low-light",
    label: "Warm low light",
    imagePath: "/test-fixtures/hands/generated/back-hand-warm-low-light.png",
    targetImagePath:
      "/test-fixtures/hands/targets/back-hand-warm-low-light.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    notes: "Checks detection under less ideal indoor lighting.",
  },
  {
    id: "back-hand-busy-background",
    label: "Busy background",
    imagePath: "/test-fixtures/hands/generated/back-hand-busy-background.png",
    targetImagePath:
      "/test-fixtures/hands/targets/back-hand-busy-background.png",
    expectedDifficulty: "hard",
    visibleNails: true,
    notes: "Checks robustness against a cluttered exhibition-style scene.",
  },
  {
    id: "closed-fist-knuckles",
    label: "Closed fist, knuckles",
    imagePath: "/test-fixtures/hands/no-visible-nails/closed-fist-knuckles.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes:
      "Negative fixture: no nail beds are visible, so no overlay should be drawn.",
  },
  {
    id: "closed-fist-top",
    label: "Closed fist, top view",
    imagePath: "/test-fixtures/hands/no-visible-nails/closed-fist-top.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes: "Negative fixture: curled fingers hide the nails.",
  },
  {
    id: "closed-fist-side",
    label: "Closed fist, side view",
    imagePath: "/test-fixtures/hands/no-visible-nails/closed-fist-side.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes:
      "Negative fixture: side/knuckle view should not receive press-on overlays.",
  },
  {
    id: "sleeve-covered-fingertips",
    label: "Sleeve-covered fingertips",
    imagePath:
      "/test-fixtures/hands/no-visible-nails/sleeve-covered-fingertips.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes: "Negative fixture: fingertips are covered by clothing.",
  },
  {
    id: "mug-occluded-fingertips",
    label: "Mug-occluded fingertips",
    imagePath:
      "/test-fixtures/hands/no-visible-nails/mug-occluded-fingertips.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes: "Negative fixture: object occlusion hides the nail beds.",
  },
  {
    id: "phone-occluded-fingertips",
    label: "Phone-occluded fingertips",
    imagePath:
      "/test-fixtures/hands/no-visible-nails/phone-occluded-fingertips.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes: "Negative fixture: object occlusion hides the nail beds.",
  },
  {
    id: "pocket-covered-fingers",
    label: "Pocket-covered fingers",
    imagePath:
      "/test-fixtures/hands/no-visible-nails/pocket-covered-fingers.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes:
      "Negative fixture: fingers are covered and not eligible for overlays.",
  },
  {
    id: "fingertips-out-of-frame",
    label: "Fingertips out of frame",
    imagePath:
      "/test-fixtures/hands/no-visible-nails/fingertips-out-of-frame.png",
    expectedDifficulty: "hard",
    visibleNails: false,
    notes:
      "Negative fixture: hand is present, but nail targets are outside the useful view.",
  },
] as const satisfies readonly HandFixture[];

export const findFixtureById = (id: string | null): HandFixture =>
  handFixtures.find((fixture) => fixture.id === id) ?? handFixtures[0];

export const shouldRenderNailOverlay = (fixture: HandFixture): boolean =>
  fixture.visibleNails;
