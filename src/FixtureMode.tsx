import BugReportIcon from "@mui/icons-material/BugReport";
import ImageSearchIcon from "@mui/icons-material/ImageSearch";
import {
  Alert,
  Box,
  Button,
  Chip,
  CssBaseline,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { drawLandmarkDebug } from "./ar/debugDraw";
import { drawNailOverlays } from "./ar/drawNails";
import { loadNailAssets, type NailAssetSet } from "./ar/nailAssets";
import {
  createHandImageTracker,
  type HandImageTracker,
} from "./ar/handTracker";
import { computeNailOverlays, type Landmark } from "./ar/nailGeometry";
import { summarizeOverlayBounds } from "./ar/overlayBounds";
import {
  findFixtureById,
  handFixtures,
  shouldRenderNailOverlay,
  type HandFixture,
} from "./app/fixtureManifest";
import {
  findPressOnProductByHandle,
  pressOnProducts,
  type PressOnProduct,
} from "./app/pressOnProducts";

type FixtureStatus = "idle" | "loading" | "detected" | "no-hand" | "error";

const fixtureTheme = createTheme({
  palette: {
    primary: {
      main: "#164a5b",
    },
    secondary: {
      main: "#b35d7b",
    },
    background: {
      default: "#f7f3ef",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },
});

const getInitialFixture = (): HandFixture => {
  const params = new URLSearchParams(window.location.search);

  return findFixtureById(params.get("fixture"));
};

const getInitialProduct = (): PressOnProduct => {
  const params = new URLSearchParams(window.location.search);

  return findPressOnProductByHandle(params.get("product"));
};

const getFixtureStatusLabel = (status: FixtureStatus): string => {
  if (status === "loading") {
    return "Running MediaPipe";
  }

  if (status === "detected") {
    return "Hand detected";
  }

  if (status === "no-hand") {
    return "No hand detected";
  }

  if (status === "error") {
    return "Fixture failed";
  }

  return "Ready";
};

function FixtureMode() {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<HandImageTracker | null>(null);

  const [fixture, setFixture] = useState<HandFixture>(getInitialFixture);
  const [product, setProduct] = useState<PressOnProduct>(getInitialProduct);
  const [nailAssets, setNailAssets] = useState<NailAssetSet | null>(null);
  const [status, setStatus] = useState<FixtureStatus>("idle");
  const [debug, setDebug] = useState(false);
  const [message, setMessage] = useState(
    "Choose a fixture and render the current nail overlay algorithm.",
  );

  const renderFixture = useCallback(async () => {
    const image = imageRef.current;
    const canvas = canvasRef.current;

    if (
      !image ||
      !canvas ||
      image.naturalWidth === 0 ||
      image.naturalHeight === 0
    ) {
      return;
    }

    setStatus("loading");
    setMessage("Running the hand detector against this still fixture.");

    try {
      trackerRef.current ??= await createHandImageTracker();
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        setStatus("error");
        setMessage("Canvas rendering is not available in this browser.");
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      const result = trackerRef.current.detect(image);
      const landmarks = result.landmarks[0] as Landmark[] | undefined;

      if (!landmarks) {
        setStatus("no-hand");
        setMessage("MediaPipe did not detect a hand in this fixture.");
        return;
      }

      const overlays = shouldRenderNailOverlay(fixture)
        ? computeNailOverlays(landmarks, {
            width: canvas.width,
            height: canvas.height,
          })
        : [];
      const bounds = summarizeOverlayBounds(overlays, {
        width: canvas.width,
        height: canvas.height,
      });

      if (shouldRenderNailOverlay(fixture)) {
        drawNailOverlays(context, overlays, product.style, nailAssets);
      }

      if (debug) {
        drawLandmarkDebug(
          context,
          landmarks,
          overlays,
          canvas.width,
          canvas.height,
        );
      }

      setStatus("detected");
      if (shouldRenderNailOverlay(fixture)) {
        setMessage(
          `Rendered ${overlays.length} overlays. Finite: ${bounds.finite}/${bounds.total}. Mostly inside: ${bounds.mostlyInside}/${bounds.total}.`,
        );
      } else {
        setMessage(
          "No visible nail beds in this fixture. Overlay intentionally suppressed.",
        );
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "The fixture detector failed to render this image.",
      );
    }
  }, [debug, fixture, nailAssets, product]);

  useEffect(() => {
    return () => trackerRef.current?.close();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("mode", "fixtures");
    params.set("fixture", fixture.id);
    params.set("product", product.handle);
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [fixture, product]);

  useEffect(() => {
    let cancelled = false;

    void loadNailAssets(product.handle).then((assets) => {
      if (!cancelled) {
        setNailAssets(assets);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [product.handle]);

  const selectFixture = (fixtureId: string): void => {
    setFixture(findFixtureById(fixtureId));
    setStatus("idle");
    setMessage("Fixture changed. Render the overlay to review this pose.");
  };

  const selectProduct = (productHandle: string): void => {
    setProduct(findPressOnProductByHandle(productHandle));
    setStatus("idle");
    setMessage("Product changed. Render the overlay to review this nail set.");
  };

  return (
    <ThemeProvider theme={fixtureTheme}>
      <CssBaseline />
      <Box className="fixture-shell">
        <Box className="fixture-header" component="header">
          <Stack spacing={1}>
            <Stack
              alignItems={{ xs: "flex-start", sm: "center" }}
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={1}
            >
              <Box>
                <Typography variant="h4">Synthetic Hand Fixtures</Typography>
                <Typography color="text.secondary">
                  Repeatable overlay checks for the Always Like nail try-on.
                </Typography>
              </Box>
              <Chip
                color={status === "detected" ? "success" : "default"}
                label={getFixtureStatusLabel(status)}
              />
            </Stack>

            <Alert
              data-testid="fixture-status-message"
              severity={
                status === "error" || status === "no-hand" ? "warning" : "info"
              }
            >
              {message}
            </Alert>
          </Stack>
        </Box>

        <Box className="fixture-layout">
          <Stack className="fixture-controls" spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="fixture-select-label">Fixture</InputLabel>
              <Select
                label="Fixture"
                labelId="fixture-select-label"
                value={fixture.id}
                onChange={(event) => selectFixture(event.target.value)}
              >
                {handFixtures.map((candidate) => (
                  <MenuItem key={candidate.id} value={candidate.id}>
                    {candidate.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="product-select-label">Nail set</InputLabel>
              <Select
                label="Nail set"
                labelId="product-select-label"
                value={product.handle}
                onChange={(event) => selectProduct(event.target.value)}
              >
                {pressOnProducts.map((candidate) => (
                  <MenuItem key={candidate.handle} value={candidate.handle}>
                    {candidate.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={1}>
              <Chip label={fixture.expectedDifficulty} variant="outlined" />
              <Chip label="synthetic" color="secondary" variant="outlined" />
              <Chip label={product.style.finish} variant="outlined" />
              <Chip
                color={fixture.visibleNails ? "success" : "warning"}
                label={fixture.visibleNails ? "visible nails" : "no overlay"}
                variant={fixture.visibleNails ? "outlined" : "filled"}
              />
            </Stack>

            <Typography color="text.secondary">{fixture.notes}</Typography>

            <Box className="fixture-product-card">
              <Box
                alt=""
                className="fixture-product-swatch"
                component="img"
                src={product.localImagePath}
              />
              <Box minWidth={0}>
                <Typography fontWeight={700}>{product.title}</Typography>
                <Typography color="text.secondary" fontSize="0.88rem">
                  {product.price} · Shopify reference image
                </Typography>
              </Box>
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={debug}
                  onChange={(event) => setDebug(event.target.checked)}
                />
              }
              label="Show landmarks and boxes"
            />

            <Button
              fullWidth
              size="large"
              startIcon={<ImageSearchIcon />}
              variant="contained"
              onClick={renderFixture}
            >
              Render overlay
            </Button>

            <Button
              fullWidth
              href="/"
              startIcon={<BugReportIcon />}
              variant="outlined"
            >
              Back to live demo
            </Button>
          </Stack>

          <Box className="fixture-stage">
            <Box className="fixture-panel">
              <Typography className="fixture-panel-label">
                Overlay result
              </Typography>
              <Box className="fixture-image-wrap">
                <img
                  ref={imageRef}
                  alt={`${fixture.label} bare hand`}
                  className="fixture-image"
                  src={fixture.imagePath}
                  onLoad={renderFixture}
                />
                <canvas
                  ref={canvasRef}
                  aria-label="Fixture nail overlay"
                  className="fixture-canvas"
                  data-testid="fixture-overlay"
                />
              </Box>
            </Box>

            {fixture.targetImagePath ? (
              <Box className="fixture-panel">
                <Typography className="fixture-panel-label">
                  Target reference
                </Typography>
                <img
                  alt={`${fixture.label} press-on target`}
                  className="fixture-target-image"
                  src={fixture.targetImagePath}
                />
              </Box>
            ) : (
              <Box className="fixture-panel fixture-negative-panel">
                <Typography className="fixture-panel-label">
                  Expected result
                </Typography>
                <Typography variant="h5">No overlay</Typography>
                <Typography color="text.secondary">
                  Fingernails are hidden or outside the useful view. These
                  fixtures guard against placing nails on fists, covered
                  fingers, or occluded hands.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default FixtureMode;
