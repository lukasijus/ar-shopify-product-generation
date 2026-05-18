import type { FingerName } from "./nailGeometry";

export type NailAsset = {
  image: HTMLImageElement;
  tipAnchor: [number, number];
  cuticleAnchor: [number, number];
  rotationRadians: number;
};

export type NailAssetSet = Partial<Record<FingerName, NailAsset>>;

type NailAssetMetadata = {
  activeAssetSet?: string;
  assets?: Array<{
    finger: FingerName;
    path?: string;
    tipAnchor?: [number, number];
    cuticleAnchor?: [number, number];
    rotationRadians?: number;
  }>;
};

const fingers: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];
const defaultTipAnchor: [number, number] = [0.5, 0.92];
const defaultCuticleAnchor: [number, number] = [0.5, 0.08];
const defaultActiveAssetSet = "extracted_roi_from_source_improved";

export const getNailAssetUrl = (productHandle: string, finger: FingerName) =>
  `/nail-assets/${productHandle}/${defaultActiveAssetSet}/${finger}.png`;

export const getNailAssetMetadataUrl = (productHandle: string) =>
  `/nail-assets/${productHandle}/metadata.json`;

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
    const metadata = (await fetch(getNailAssetMetadataUrl(productHandle))
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)) as NailAssetMetadata | null;
    const metadataByFinger = new Map(
      (metadata?.assets ?? []).map((asset) => [asset.finger, asset]),
    );
    const loaded = await Promise.all(
      fingers.map(async (finger) => {
        const assetMetadata = metadataByFinger.get(finger);
        const fallbackAssetSet =
          metadata?.activeAssetSet ?? defaultActiveAssetSet;
        const image = await loadImage(
          assetMetadata?.path ??
            `/nail-assets/${productHandle}/${fallbackAssetSet}/${finger}.png`,
        );

        return {
          finger,
          asset: {
            image,
            tipAnchor: assetMetadata?.tipAnchor ?? defaultTipAnchor,
            cuticleAnchor: assetMetadata?.cuticleAnchor ?? defaultCuticleAnchor,
            rotationRadians: assetMetadata?.rotationRadians ?? Math.PI,
          },
        };
      }),
    );

    return Object.fromEntries(
      loaded.map(({ finger, asset }) => [finger, asset]),
    ) as NailAssetSet;
  } catch {
    return null;
  }
};
