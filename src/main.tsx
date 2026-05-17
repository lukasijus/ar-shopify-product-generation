import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import FixtureMode from "./FixtureMode";
import "./styles.css";

const params = new URLSearchParams(window.location.search);
const RootComponent = params.get("mode") === "fixtures" ? FixtureMode : App;

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>,
);
