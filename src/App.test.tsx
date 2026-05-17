import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("renders the one-product try-on demo controls", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Always Like" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Blush Sparkle" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /start camera/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view product/i })).toHaveAttribute(
      "href",
      "https://alwayslikedesign.com/products/blush-sparkle",
    );
  });

  it("keeps a canvas layer available for the nail overlay", () => {
    render(<App />);

    expect(screen.getByTestId("nail-overlay")).toBeInTheDocument();
  });
});
