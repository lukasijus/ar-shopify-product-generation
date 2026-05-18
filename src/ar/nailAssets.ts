import type { FingerName, NailAssetVariantName } from "./nailGeometry";

export type NailAssetFit = {
  widthScale: number;
  heightScale: number;
};

export type NailAssetImage = {
  image: HTMLImageElement;
  tipAnchor: [number, number];
  cuticleAnchor: [number, number];
  rotationRadians: number;
};

export type NailAsset = {
  variants: Partial<Record<NailAssetVariantName, NailAssetImage>>;
  fit: NailAssetFit;
};

export type NailAssetSet = Partial<Record<FingerName, NailAsset>>;

type NailAssetMetadata = {
  activeAssetSet?: string;
  assets?: Array<{
    finger: FingerName;
    path?: string;
    fit?: Partial<NailAssetFit>;
    tipAnchor?: [number, number];
    cuticleAnchor?: [number, number];
    rotationRadians?: number;
    variants?: Partial<
      Record<
        NailAssetVariantName,
        {
          path: string;
          tipAnchor?: [number, number];
          cuticleAnchor?: [number, number];
          rotationRadians?: number;
        }
      >
    >;
  }>;
};

type NailAssetVariantMetadata = {
  path: string;
  tipAnchor?: [number, number];
  cuticleAnchor?: [number, number];
  rotationRadians?: number;
};

const fingers: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];
const defaultTipAnchor: [number, number] = [0.5, 0.92];
const defaultCuticleAnchor: [number, number] = [0.5, 0.08];
const defaultActiveAssetSet = "extracted_roi_from_source_improved";
const defaultFit: NailAssetFit = {
  widthScale: 1.38,
  heightScale: 0.96,
};

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

const toAssetImage = async (
  path: string,
  metadata: {
    tipAnchor?: [number, number];
    cuticleAnchor?: [number, number];
    rotationRadians?: number;
  },
): Promise<NailAssetImage> => ({
  image: await loadImage(path),
  tipAnchor: metadata.tipAnchor ?? defaultTipAnchor,
  cuticleAnchor: metadata.cuticleAnchor ?? defaultCuticleAnchor,
  rotationRadians: metadata.rotationRadians ?? Math.PI,
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
        const frontPath =
          assetMetadata?.path ??
          `/nail-assets/${productHandle}/${fallbackAssetSet}/${finger}.png`;
        const variantEntries = Object.entries(
          assetMetadata?.variants ?? {},
        ) as Array<[NailAssetVariantName, NailAssetVariantMetadata]>;
        const loadedVariants = await Promise.all(
          variantEntries.map(async ([variant, variantMetadata]) => [
            variant,
            await toAssetImage(variantMetadata.path, {
              tipAnchor: variantMetadata.tipAnchor ?? assetMetadata?.tipAnchor,
              cuticleAnchor:
                variantMetadata.cuticleAnchor ?? assetMetadata?.cuticleAnchor,
              rotationRadians:
                variantMetadata.rotationRadians ??
                assetMetadata?.rotationRadians,
            }),
          ]),
        );
        const variants = Object.fromEntries(loadedVariants) as Partial<
          Record<NailAssetVariantName, NailAssetImage>
        >;
        variants.front ??= await toAssetImage(frontPath, assetMetadata ?? {});

        return {
          finger,
          asset: {
            variants,
            fit: {
              widthScale:
                assetMetadata?.fit?.widthScale ?? defaultFit.widthScale,
              heightScale:
                assetMetadata?.fit?.heightScale ?? defaultFit.heightScale,
            },
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
