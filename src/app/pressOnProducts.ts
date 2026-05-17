import products from "./pressOnProducts.json";

export type NailFinish =
  | "charms"
  | "chrome"
  | "floral"
  | "gloss"
  | "hearts"
  | "monochrome"
  | "rose"
  | "sparkle"
  | "stars";

export type NailProductStyle = {
  baseColor: string;
  accentColor: string;
  tipColor: string;
  finish: NailFinish;
};

export type PressOnProduct = {
  title: string;
  handle: string;
  price: string;
  productUrl: string;
  imageUrl: string;
  localImagePath: string;
  style: NailProductStyle;
};

export const pressOnProducts = products as PressOnProduct[];

export const defaultPressOnProduct = pressOnProducts[1] ?? pressOnProducts[0];

export const findPressOnProductByHandle = (
  handle: string | null,
): PressOnProduct =>
  pressOnProducts.find((product) => product.handle === handle) ??
  defaultPressOnProduct;
