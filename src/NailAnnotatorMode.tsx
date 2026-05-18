import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Alert,
  Box,
  Button,
  Chip,
  CssBaseline,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import { useMemo, useRef, useState, type MouseEvent } from "react";

type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

type RoiBox = {
  finger: FingerName;
  x: number;
  y: number;
  width: number;
  height: number;
};

type DragState = {
  finger: FingerName;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
};

const fingers: FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];

const annotatorTheme = createTheme({
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

const getParams = () => {
  const params = new URLSearchParams(window.location.search);

  return {
    productHandle: params.get("product") ?? "example_1",
    sourceImage: params.get("source") ?? "/roi-sources/example_1.png",
  };
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

const normalizeBox = (
  finger: FingerName,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
): RoiBox => ({
  finger,
  x: Math.round(Math.min(startX, currentX)),
  y: Math.round(Math.min(startY, currentY)),
  width: Math.round(Math.abs(currentX - startX)),
  height: Math.round(Math.abs(currentY - startY)),
});

function NailAnnotatorMode() {
  const params = useMemo(() => getParams(), []);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [selectedFinger, setSelectedFinger] = useState<FingerName>("thumb");
  const [boxes, setBoxes] = useState<RoiBox[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [message, setMessage] = useState(
    "Draw one rectangle around each nail, then copy or download the ROI JSON.",
  );

  const getNaturalPoint = (
    event: MouseEvent<HTMLElement>,
  ): { x: number; y: number } => {
    const image = imageRef.current;
    if (!image) {
      return { x: 0, y: 0 };
    }

    const rect = image.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * image.naturalWidth;
    const y = ((event.clientY - rect.top) / rect.height) * image.naturalHeight;

    return {
      x: clamp(x, 0, image.naturalWidth),
      y: clamp(y, 0, image.naturalHeight),
    };
  };

  const upsertBox = (box: RoiBox): void => {
    if (box.width < 6 || box.height < 6) {
      setMessage("Draw a larger rectangle around the selected nail.");
      return;
    }

    setBoxes((current) => [
      ...current.filter((candidate) => candidate.finger !== box.finger),
      box,
    ]);
    const nextFinger = fingers.find(
      (finger) =>
        finger !== box.finger &&
        !boxes.some((candidate) => candidate.finger === finger),
    );
    if (nextFinger) {
      setSelectedFinger(nextFinger);
    }
    setMessage(`${box.finger} ROI saved.`);
  };

  const roiDocument = {
    productHandle: params.productHandle,
    sourceImage: params.sourceImage,
    coordinateSpace: imageSize,
    rois: fingers.flatMap((finger) => {
      const box = boxes.find((candidate) => candidate.finger === finger);
      return box
        ? [
            {
              finger,
              bbox: [box.x, box.y, box.width, box.height],
            },
          ]
        : [];
    }),
  };
  const roiJson = JSON.stringify(roiDocument, null, 2);
  const complete = boxes.length === fingers.length && imageSize.width > 0;

  const copyJson = async (): Promise<void> => {
    await navigator.clipboard.writeText(roiJson);
    setMessage("ROI JSON copied to clipboard.");
  };

  const downloadJson = (): void => {
    const blob = new Blob([roiJson + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${params.productHandle}-rois.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearSelected = (): void => {
    setBoxes((current) =>
      current.filter((candidate) => candidate.finger !== selectedFinger),
    );
    setMessage(`${selectedFinger} ROI cleared.`);
  };

  return (
    <ThemeProvider theme={annotatorTheme}>
      <CssBaseline />
      <Box className="annotator-shell">
        <Box className="annotator-header">
          <Box>
            <Typography variant="h4">Nail ROI Annotator</Typography>
            <Typography color="text.secondary">
              Draw five labeled rectangles in natural image coordinates.
            </Typography>
          </Box>
          <Chip
            color={complete ? "success" : "default"}
            label={`${boxes.length}/5 ROIs`}
          />
        </Box>

        <Alert severity={complete ? "success" : "info"}>{message}</Alert>

        <Box className="annotator-layout">
          <Box
            className="annotator-stage"
            data-testid="annotator-stage"
            onMouseDown={(event) => {
              event.preventDefault();
              const point = getNaturalPoint(event);
              setDrag({
                finger: selectedFinger,
                startX: point.x,
                startY: point.y,
                currentX: point.x,
                currentY: point.y,
              });
              dragRef.current = {
                finger: selectedFinger,
                startX: point.x,
                startY: point.y,
                currentX: point.x,
                currentY: point.y,
              };
            }}
            onMouseMove={(event) => {
              const activeDrag = dragRef.current;
              if (!activeDrag) {
                return;
              }
              const point = getNaturalPoint(event);
              const nextDrag = {
                ...activeDrag,
                currentX: point.x,
                currentY: point.y,
              };
              dragRef.current = nextDrag;
              setDrag(nextDrag);
            }}
            onMouseUp={() => {
              const activeDrag = dragRef.current;
              if (!activeDrag) {
                return;
              }
              upsertBox(
                normalizeBox(
                  activeDrag.finger,
                  activeDrag.startX,
                  activeDrag.startY,
                  activeDrag.currentX,
                  activeDrag.currentY,
                ),
              );
              dragRef.current = null;
              setDrag(null);
            }}
          >
            <img
              ref={imageRef}
              alt="Press-on nail package source"
              className="annotator-image"
              draggable={false}
              src={params.sourceImage}
              onLoad={(event) => {
                const image = event.currentTarget;
                setImageSize({
                  width: image.naturalWidth,
                  height: image.naturalHeight,
                });
              }}
            />
            <svg
              className="annotator-overlay"
              viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
            >
              {boxes.map((box) => (
                <g key={box.finger}>
                  <rect
                    className="annotator-box"
                    x={box.x}
                    y={box.y}
                    width={box.width}
                    height={box.height}
                  />
                  <text x={box.x + 6} y={Math.max(18, box.y - 8)}>
                    {box.finger}
                  </text>
                </g>
              ))}
              {drag ? (
                <rect
                  className="annotator-box annotator-box-draft"
                  x={
                    normalizeBox(
                      drag.finger,
                      drag.startX,
                      drag.startY,
                      drag.currentX,
                      drag.currentY,
                    ).x
                  }
                  y={
                    normalizeBox(
                      drag.finger,
                      drag.startX,
                      drag.startY,
                      drag.currentX,
                      drag.currentY,
                    ).y
                  }
                  width={
                    normalizeBox(
                      drag.finger,
                      drag.startX,
                      drag.startY,
                      drag.currentX,
                      drag.currentY,
                    ).width
                  }
                  height={
                    normalizeBox(
                      drag.finger,
                      drag.startX,
                      drag.startY,
                      drag.currentX,
                      drag.currentY,
                    ).height
                  }
                />
              ) : null}
            </svg>
          </Box>

          <Stack className="annotator-controls" spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="finger-select-label">Finger</InputLabel>
              <Select
                label="Finger"
                labelId="finger-select-label"
                value={selectedFinger}
                onChange={(event) =>
                  setSelectedFinger(event.target.value as FingerName)
                }
              >
                {fingers.map((finger) => (
                  <MenuItem key={finger} value={finger}>
                    {finger}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" flexWrap="wrap" gap={1}>
              {fingers.map((finger) => (
                <Chip
                  key={finger}
                  color={
                    boxes.some((candidate) => candidate.finger === finger)
                      ? "success"
                      : "default"
                  }
                  label={finger}
                  variant={finger === selectedFinger ? "filled" : "outlined"}
                  onClick={() => setSelectedFinger(finger)}
                />
              ))}
            </Stack>

            <Button
              startIcon={<DeleteIcon />}
              variant="outlined"
              onClick={clearSelected}
            >
              Clear selected
            </Button>

            <TextField
              multiline
              fullWidth
              minRows={14}
              label="ROI JSON"
              value={roiJson}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
            />

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                fullWidth
                startIcon={<ContentCopyIcon />}
                variant="contained"
                onClick={copyJson}
              >
                Copy JSON
              </Button>
              <Button
                fullWidth
                startIcon={<DownloadIcon />}
                variant="outlined"
                onClick={downloadJson}
              >
                Download
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default NailAnnotatorMode;
