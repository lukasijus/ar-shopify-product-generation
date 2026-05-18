import type { FingerName } from "./nailGeometry";

export type NailAssetSet = Partial<Record<FingerName, HTMLImageElement>>;

const fingers: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];

export const getNailAssetUrl = (productHandle: string, finger: FingerName) =>
  `/nail-assets/${productHandle}/${finger}.png`;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });

export const loadNailAssets = async (
  productHandle: string,
): Promise<NailAssetSet | null> => {
  try {
    const loaded = await Promise.all(
      fingers.map(async (finger) => ({
        finger,
        image: await loadImage(getNailAssetUrl(productHandle, finger)),
      })),
    );

    return Object.fromEntries(
      loaded.map(({ finger, image }) => [finger, image]),
    ) as NailAssetSet;
  } catch {
    return null;
  }
};
