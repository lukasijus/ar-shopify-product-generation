import CameraAltIcon from "@mui/icons-material/CameraAlt";
import CenterFocusStrongIcon from "@mui/icons-material/CenterFocusStrong";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Stack,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { createHandTracker, type HandTracker } from "./ar/handTracker";
import {
  computeNailOverlaysWithVisibility,
  fingerConfigs,
} from "./ar/nailGeometry";
import { drawNailOverlays } from "./ar/drawNails";
import { loadNailAssets, type NailAssetSet } from "./ar/nailAssets";
import { CompositeNailPlacementModel } from "./ar/nailPlacement";
import { CompositeNailVisibilityModel } from "./ar/nailVisibility";
import { findPressOnProductByHandle } from "./app/pressOnProducts";

type CameraState =
  | "idle"
  | "starting"
  | "tracking"
  | "no-hand"
  | "blocked"
  | "error";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#164a5b",
    },
    secondary: {
      main: "#b35d7b",
    },
    background: {
      default: "#f7f3ef",
      paper: "rgba(255, 255, 255, 0.88)",
    },
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      fontWeight: 500,
    },
    h2: {
      fontFamily: '"Cormorant Garamond", Georgia, serif',
      fontWeight: 500,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

const cameraConstraints: MediaStreamConstraints = {
  video: {
    facingMode: "environment",
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

const getStatusLabel = (state: CameraState): string => {
  if (state === "tracking") {
    return "Hand detected";
  }

  if (state === "no-hand") {
    return "Place hand in view";
  }

  if (state === "starting") {
    return "Starting camera";
  }

  if (state === "blocked") {
    return "Camera blocked";
  }

  if (state === "error") {
    return "Demo unavailable";
  }

  return "Ready";
};

const getInitialProduct = () => {
  const params = new URLSearchParams(window.location.search);

  return findPressOnProductByHandle(params.get("product"));
};

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const visibilityModelRef = useRef<CompositeNailVisibilityModel | null>(null);
  const placementModelRef = useRef<CompositeNailPlacementModel | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const drawFrameRef = useRef<() => void>(() => undefined);
  const drawInFlightRef = useRef(false);

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [message, setMessage] = useState(
    "Start the camera and hold your hand flat with fingers slightly apart.",
  );
  const [product] = useState(getInitialProduct);
  const [nailAssets, setNailAssets] = useState<NailAssetSet | null>(null);
  const [visibilitySource, setVisibilitySource] = useState("loading");
  const [placementSource, setPlacementSource] = useState("loading");

  useEffect(() => {
    const visibilityModel = new CompositeNailVisibilityModel();
    const placementModel = new CompositeNailPlacementModel();
    visibilityModelRef.current = visibilityModel;
    placementModelRef.current = placementModel;

    void visibilityModel.initialize().then(() => {
      if (visibilityModelRef.current === visibilityModel) {
        setVisibilitySource("ready");
      }
    });
    void placementModel.initialize().then(() => {
      if (placementModelRef.current === placementModel) {
        setPlacementSource("ready");
      }
    });

    return () => {
      if (visibilityModelRef.current === visibilityModel) {
        visibilityModelRef.current = null;
      }
      if (placementModelRef.current === placementModel) {
        placementModelRef.current = null;
      }
    };
  }, []);

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

  const stopCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackerRef.current?.close();
    trackerRef.current = null;
    drawInFlightRef.current = false;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    drawFrameRef.current = () => {
      if (drawInFlightRef.current) {
        return;
      }

      drawInFlightRef.current = true;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const tracker = trackerRef.current;
      const visibilityModel = visibilityModelRef.current;
      const placementModel = placementModelRef.current;

      if (
        !video ||
        !canvas ||
        !tracker ||
        !visibilityModel ||
        !placementModel ||
        video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        drawInFlightRef.current = false;
        animationFrameRef.current = window.requestAnimationFrame(
          drawFrameRef.current,
        );
        return;
      }

      const displayWidth = video.videoWidth;
      const displayHeight = video.videoHeight;
      if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
        canvas.width = displayWidth;
        canvas.height = displayHeight;
      }

      const context = canvas.getContext("2d");
      if (!context) {
        drawInFlightRef.current = false;
        setCameraState("error");
        setMessage("Canvas rendering is not available in this browser.");
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);

      const result = tracker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks[0];

      if (landmarks) {
        let frameVisibilitySource = "model";
        let framePlacementSource = "model";
        void computeNailOverlaysWithVisibility(
          landmarks,
          {
            width: canvas.width,
            height: canvas.height,
          },
          async (config, currentLandmarks, size) => {
            const decision = await visibilityModel.predict(
              config,
              currentLandmarks,
              size,
            );
            frameVisibilitySource = decision.source;
            return decision.visible;
          },
        )
          .then(async (overlays) => {
            const refinedOverlays = [];
            for (const overlay of overlays) {
              const config = fingerConfigs.find(
                (candidate) => candidate.finger === overlay.finger,
              );
              if (!config) {
                refinedOverlays.push(overlay);
                continue;
              }

              const decision = await placementModel.predict(
                config,
                landmarks,
                {
                  width: canvas.width,
                  height: canvas.height,
                },
                overlay,
              );
              framePlacementSource = decision.source;
              refinedOverlays.push(decision.overlay);
            }

            drawNailOverlays(
              context,
              refinedOverlays,
              product.style,
              nailAssets,
            );
            setCameraState("tracking");
            setVisibilitySource(frameVisibilitySource);
            setPlacementSource(framePlacementSource);
            setMessage(
              `${product.title} is placed over ${refinedOverlays.length} visible nail bed${refinedOverlays.length === 1 ? "" : "s"}.`,
            );
          })
          .finally(() => {
            drawInFlightRef.current = false;
            if (streamRef.current) {
              animationFrameRef.current = window.requestAnimationFrame(
                drawFrameRef.current,
              );
            }
          });
        return;
      } else {
        setCameraState("no-hand");
        setMessage(
          "Place your hand flat under the camera with fingers slightly apart.",
        );
      }

      drawInFlightRef.current = false;
      animationFrameRef.current = window.requestAnimationFrame(
        drawFrameRef.current,
      );
    };
  }, [nailAssets, product]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraState("starting");
    setMessage("Loading the hand tracker and asking for camera access.");

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState("error");
        setMessage("This browser does not expose camera access to web apps.");
        return;
      }

      const [tracker, stream] = await Promise.all([
        createHandTracker(),
        navigator.mediaDevices.getUserMedia(cameraConstraints),
      ]);

      trackerRef.current = tracker;
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setCameraState("error");
        setMessage("The camera preview could not be initialized.");
        return;
      }

      video.srcObject = stream;
      await video.play();
      setCameraState("no-hand");
      setMessage(
        "Place your hand flat under the camera with fingers slightly apart.",
      );
      animationFrameRef.current = window.requestAnimationFrame(
        drawFrameRef.current,
      );
    } catch (error) {
      stopCamera();
      const isPermissionError =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");
      setCameraState(isPermissionError ? "blocked" : "error");
      setMessage(
        isPermissionError
          ? "Camera permission was blocked. Allow camera access in the browser to try the demo."
          : "The camera or hand tracker failed to start on this device.",
      );
    }
  }, [stopCamera]);

  useEffect(() => stopCamera, [stopCamera]);

  const showLoading = cameraState === "starting";
  const showPreviewHint =
    cameraState === "idle" ||
    cameraState === "blocked" ||
    cameraState === "error";

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app-shell">
        <Box className="tryon-stage">
          <video
            ref={videoRef}
            aria-label="Camera preview"
            className="camera-feed"
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            aria-label="Nail overlay"
            className="nail-overlay"
            data-testid="nail-overlay"
          />

          {showPreviewHint ? (
            <Box className="preview-placeholder">
              <CenterFocusStrongIcon aria-hidden="true" />
              <Typography variant="h2">Hand mirror preview</Typography>
              <Typography>
                Use a real camera to place the first Always Like press-on nail
                design on your hand.
              </Typography>
            </Box>
          ) : null}

          {showLoading ? (
            <Box className="loading-overlay">
              <CircularProgress color="inherit" size={34} />
              <Typography>Preparing camera</Typography>
            </Box>
          ) : null}
        </Box>

        <Box className="control-panel" component="main">
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" spacing={1}>
              <Chip label="Prototype" color="secondary" size="small" />
              <Chip
                label={getStatusLabel(cameraState)}
                color={cameraState === "tracking" ? "success" : "default"}
                size="small"
                variant={cameraState === "tracking" ? "filled" : "outlined"}
              />
            </Stack>
            <Chip
              label={`Visibility: ${visibilitySource}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Placement: ${placementSource}`}
              size="small"
              variant="outlined"
            />

            <Box>
              <Typography variant="h1" className="brand-title">
                Always Like
              </Typography>
              <Typography variant="h2" className="product-title">
                {product.title}
              </Typography>
              <Typography className="product-meta">
                {product.price} · Press on nails
              </Typography>
            </Box>

            <Alert
              severity={
                cameraState === "blocked" || cameraState === "error"
                  ? "warning"
                  : "info"
              }
            >
              {message}
            </Alert>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                startIcon={<CameraAltIcon />}
                onClick={startCamera}
              >
                Start camera
              </Button>
              <Button
                fullWidth
                size="large"
                variant="outlined"
                startIcon={<RestartAltIcon />}
                onClick={startCamera}
              >
                Reset
              </Button>
            </Stack>

            <Button
              href={product.productUrl}
              target="_blank"
              rel="noreferrer"
              size="large"
              variant="text"
              endIcon={<OpenInNewIcon />}
            >
              View product
            </Button>

            <Button
              href={`/?mode=annotate-nails&product=${product.handle}`}
              size="large"
              startIcon={<ContentCutIcon />}
              variant="outlined"
            >
              Extract nails
            </Button>
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
