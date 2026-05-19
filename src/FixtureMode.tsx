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
import {
  evaluateFixtureRender,
  formatFixtureEvaluation,
} from "./ar/fixtureEvaluation";
import { loadNailAssets, type NailAssetSet } from "./ar/nailAssets";
import {
  createHandImageTracker,
  type HandImageTracker,
} from "./ar/handTracker";
import {
  computeNailOverlaysWithVisibility,
  fingerConfigs,
  type Landmark,
} from "./ar/nailGeometry";
import { summarizeOverlayBounds } from "./ar/overlayBounds";
import {
  CompositeNailPlacementModel,
  extractNailPlacementFeatures,
  getHeuristicVariantIndex,
  type NailPlacementComparison,
} from "./ar/nailPlacement";
import { compareFixtureRender } from "./ar/targetComparison";
import {
  CompositeNailVisibilityModel,
  extractNailVisibilityFeatures,
  type NailVisibilityComparison,
} from "./ar/nailVisibility";
import {
  findFixtureById,
  getFixtureTargetImagePath,
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
  const targetImageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const trackerRef = useRef<HandImageTracker | null>(null);
  const visibilityModelRef = useRef<CompositeNailVisibilityModel | null>(null);
  const placementModelRef = useRef<CompositeNailPlacementModel | null>(null);
  const renderInFlightRef = useRef(false);

  const [fixture, setFixture] = useState<HandFixture>(getInitialFixture);
  const [product, setProduct] = useState<PressOnProduct>(getInitialProduct);
  const [nailAssets, setNailAssets] = useState<NailAssetSet | null>(null);
  const [status, setStatus] = useState<FixtureStatus>("idle");
  const [debug, setDebug] = useState(false);
  const [message, setMessage] = useState(
    "Choose a fixture and render the current nail overlay algorithm.",
  );
  const [visibilityComparison, setVisibilityComparison] = useState<
    NailVisibilityComparison[]
  >([]);
  const [placementComparison, setPlacementComparison] = useState<
    NailPlacementComparison[]
  >([]);
  const targetImagePath = getFixtureTargetImagePath(fixture, product.handle);

  useEffect(() => {
    const visibilityModel = new CompositeNailVisibilityModel();
    const placementModel = new CompositeNailPlacementModel();
    visibilityModelRef.current = visibilityModel;
    placementModelRef.current = placementModel;

    return () => {
      if (visibilityModelRef.current === visibilityModel) {
        visibilityModelRef.current = null;
      }
      if (placementModelRef.current === placementModel) {
        placementModelRef.current = null;
      }
    };
  }, []);

  const renderFixture = useCallback(async () => {
    if (renderInFlightRef.current) {
      return;
    }

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
    renderInFlightRef.current = true;

    try {
      trackerRef.current ??= await createHandImageTracker();
      const visibilityModel = visibilityModelRef.current;
      const placementModel = placementModelRef.current;
      if (!visibilityModel || !placementModel) {
        setStatus("error");
        setMessage("The nail models could not be initialized.");
        return;
      }

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
        window.__alwaysLikeVisibilityTrainingSample = {
          fixtureId: fixture.id,
          imagePath: fixture.imagePath,
          detected: false,
          rows: [],
        };
        window.__alwaysLikePlacementTrainingSample = {
          fixtureId: fixture.id,
          imagePath: fixture.imagePath,
          detected: false,
          rows: [],
        };
        setStatus("no-hand");
        setMessage("MediaPipe did not detect a hand in this fixture.");
        setVisibilityComparison([]);
        setPlacementComparison([]);
        return;
      }

      window.__alwaysLikeVisibilityTrainingSample = {
        fixtureId: fixture.id,
        imagePath: fixture.imagePath,
        detected: true,
        rows: fingerConfigs.map((config) => {
          const features = extractNailVisibilityFeatures(config, landmarks, {
            width: canvas.width,
            height: canvas.height,
          });

          return {
            finger: config.finger,
            label: fixture.expectedVisibleFingers.includes(config.finger)
              ? 1
              : 0,
            features: features.values,
            reasons: features.reasons,
          };
        }),
      };

      const modelComparison = await visibilityModel.compare(landmarks, {
        width: canvas.width,
        height: canvas.height,
      });
      setVisibilityComparison(modelComparison);

      const overlays = shouldRenderNailOverlay(fixture)
        ? await computeNailOverlaysWithVisibility(
            landmarks,
            {
              width: canvas.width,
              height: canvas.height,
            },
            async (config, currentLandmarks, size) =>
              (await visibilityModel.predict(config, currentLandmarks, size))
                .visible,
          )
        : [];
      const refinedOverlays = [];
      for (const overlay of overlays) {
        const config = fingerConfigs.find(
          (candidate) => candidate.finger === overlay.finger,
        );
        if (!config) {
          refinedOverlays.push(overlay);
          continue;
        }

        const placement = await placementModel.predict(
          config,
          landmarks,
          {
            width: canvas.width,
            height: canvas.height,
          },
          overlay,
        );
        refinedOverlays.push(placement.overlay);
      }
      const placementModelComparison = await placementModel.compare(
        overlays,
        landmarks,
        {
          width: canvas.width,
          height: canvas.height,
        },
      );
      setPlacementComparison(placementModelComparison);

      window.__alwaysLikePlacementTrainingSample = {
        fixtureId: fixture.id,
        imagePath: fixture.imagePath,
        detected: true,
        rows: overlays.flatMap((overlay) => {
          const config = fingerConfigs.find(
            (candidate) => candidate.finger === overlay.finger,
          );
          if (!config) {
            return [];
          }

          return [
            {
              finger: config.finger,
              label: fixture.expectedVisibleFingers.includes(config.finger)
                ? 1
                : 0,
              features: extractNailPlacementFeatures(
                config,
                landmarks,
                {
                  width: canvas.width,
                  height: canvas.height,
                },
                overlay,
                modelComparison.find((item) => item.finger === config.finger)
                  ?.model.confidence ?? 1,
              ),
              heuristic: {
                centerX: overlay.centerX,
                centerY: overlay.centerY,
                width: overlay.width,
                height: overlay.height,
                angle: overlay.angle,
                variantIndex: getHeuristicVariantIndex(config, landmarks, {
                  width: canvas.width,
                  height: canvas.height,
                }),
              },
            },
          ];
        }),
      };
      const refinedBounds = summarizeOverlayBounds(refinedOverlays, {
        width: canvas.width,
        height: canvas.height,
      });

      if (shouldRenderNailOverlay(fixture)) {
        drawNailOverlays(context, refinedOverlays, product.style, nailAssets);
      }

      if (debug) {
        drawLandmarkDebug(
          context,
          landmarks,
          refinedOverlays,
          canvas.width,
          canvas.height,
        );
      }

      setStatus("detected");
      if (shouldRenderNailOverlay(fixture)) {
        const renderedFingers = refinedOverlays
          .map((overlay) => overlay.finger)
          .join(", ");
        const imageComparison =
          targetImagePath && targetImageRef.current
            ? compareFixtureRender(image, canvas, targetImageRef.current)
            : null;
        const evaluation = evaluateFixtureRender(
          fixture,
          refinedOverlays,
          refinedBounds,
          imageComparison,
        );
        const disagreementCount = modelComparison.filter(
          (item) => item.heuristic.visible !== item.model.visible,
        ).length;
        const source = modelComparison[0]?.model.source ?? "model";
        const placementSource =
          placementModelComparison[0]?.source ?? "heuristic";
        const comparisonText =
          imageComparison?.compared && fixture.targetKind === "imagegen"
            ? ` Target diff: ${imageComparison.averageDifference.toFixed(1)} avg, ${(imageComparison.changedPixelRatio * 100).toFixed(1)}% changed.`
            : "";
        setMessage(
          `Rendered ${refinedOverlays.length} overlays (${renderedFingers || "none"}) with visibility ${source}, placement ${placementSource}. Expected ${fixture.expectedVisibleFingers.length}. Heuristic/model disagreements: ${disagreementCount}. Finite: ${refinedBounds.finite}/${refinedBounds.total}. Mostly inside: ${refinedBounds.mostlyInside}/${refinedBounds.total}. ${formatFixtureEvaluation(evaluation)}.${comparisonText}`,
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
    } finally {
      renderInFlightRef.current = false;
    }
  }, [debug, fixture, nailAssets, product, targetImagePath]);

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

    void loadNailAssets(product.assetHandle ?? product.handle).then(
      (assets) => {
        if (!cancelled) {
          setNailAssets(assets);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [product.assetHandle, product.handle]);

  const selectFixture = (fixtureId: string): void => {
    setFixture(findFixtureById(fixtureId));
    setStatus("idle");
    setVisibilityComparison([]);
    setPlacementComparison([]);
    setMessage("Fixture changed. Render the overlay to review this pose.");
  };

  const selectProduct = (productHandle: string): void => {
    setProduct(findPressOnProductByHandle(productHandle));
    setStatus("idle");
    setVisibilityComparison([]);
    setPlacementComparison([]);
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
                label={
                  fixture.visibleNails
                    ? `${fixture.expectedVisibleFingers.length} expected`
                    : "no overlay"
                }
                variant={fixture.visibleNails ? "outlined" : "filled"}
              />
            </Stack>

            <Typography color="text.secondary">{fixture.notes}</Typography>

            {visibilityComparison.length > 0 ? (
              <Stack spacing={1}>
                <Typography fontWeight={700}>Visibility model</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {visibilityComparison.map((item) => (
                    <Chip
                      key={item.finger}
                      color={
                        item.model.visible
                          ? item.heuristic.visible === item.model.visible
                            ? "success"
                            : "warning"
                          : "default"
                      }
                      label={`${item.finger}: ${item.model.visible ? "show" : "hide"} ${Math.round(item.model.confidence * 100)}%`}
                      size="small"
                      variant={
                        item.heuristic.visible === item.model.visible
                          ? "outlined"
                          : "filled"
                      }
                    />
                  ))}
                </Stack>
              </Stack>
            ) : null}

            {placementComparison.length > 0 ? (
              <Stack spacing={1}>
                <Typography fontWeight={700}>Placement model</Typography>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {placementComparison.map((item) => (
                    <Chip
                      key={item.finger}
                      color={item.source === "onnx" ? "success" : "default"}
                      label={`${item.finger}: ${item.source}`}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Stack>
            ) : null}

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
                General input
              </Typography>
              <img
                alt={`${fixture.label} general input`}
                className="fixture-target-image"
                src={fixture.imagePath}
              />
            </Box>

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

            {targetImagePath ? (
              <Box className="fixture-panel">
                <Typography className="fixture-panel-label">
                  Target reference
                </Typography>
                <img
                  ref={targetImageRef}
                  alt={`${fixture.label} press-on target`}
                  className="fixture-target-image"
                  src={targetImagePath}
                  onLoad={renderFixture}
                />
              </Box>
            ) : fixture.expectedVisibleFingers.length > 0 ? (
              <Box className="fixture-panel fixture-negative-panel">
                <Typography className="fixture-panel-label">
                  Expected result
                </Typography>
                <Typography variant="h5">
                  {fixture.expectedVisibleFingers.join(", ")}
                </Typography>
                <Typography color="text.secondary">
                  Only these visible nail beds should receive overlays in this
                  generated fixture.
                </Typography>
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
