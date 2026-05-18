import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import FixtureMode from "./FixtureMode";
import NailAnnotatorMode from "./NailAnnotatorMode";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const mode = params.get("mode");
const RootComponent =
  mode === "fixtures"
    ? FixtureMode
    : mode === "annotate-nails"
      ? NailAnnotatorMode
      : App;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
