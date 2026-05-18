import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import TerminalIcon from "@mui/icons-material/Terminal";
import UploadFileIcon from "@mui/icons-material/UploadFile";
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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from "react";

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

type JsonWritableFileStream = {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
};

type JsonFileHandle = {
  createWritable: () => Promise<JsonWritableFileStream>;
};

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<JsonFileHandle>;
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
    sourceImage: params.get("source") ?? "",
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

const toLocalPublicPath = (source: string): string => {
  if (source.startsWith("/")) {
    return `public${source}`;
  }

  return source;
};

function NailAnnotatorMode() {
  const params = useMemo(() => getParams(), []);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadedUrlRef = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [sourceImage, setSourceImage] = useState(params.sourceImage);
  const [sourceImageName, setSourceImageName] = useState(
    params.sourceImage || "Upload a package image",
  );
  const [sourceKind, setSourceKind] = useState<"url" | "upload">(
    params.sourceImage ? "url" : "upload",
  );
  const [selectedFinger, setSelectedFinger] = useState<FingerName>("thumb");
  const [boxes, setBoxes] = useState<RoiBox[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [message, setMessage] = useState(
    "Upload a package image, draw one rectangle around each nail, then save the ROI JSON.",
  );

  useEffect(
    () => () => {
      if (uploadedUrlRef.current) {
        URL.revokeObjectURL(uploadedUrlRef.current);
      }
    },
    [],
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

  const uploadImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (uploadedUrlRef.current) {
      URL.revokeObjectURL(uploadedUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    uploadedUrlRef.current = url;
    setSourceImage(url);
    setSourceImageName(file.name);
    setSourceKind("upload");
    setImageSize({ width: 0, height: 0 });
    setBoxes([]);
    setDrag(null);
    dragRef.current = null;
    setMessage("Package image loaded. Draw the thumb ROI first.");
  };

  const roiSourceImage =
    sourceKind === "upload" ? sourceImageName : sourceImage;

  const roiDocument = {
    productHandle: params.productHandle,
    sourceImage: roiSourceImage,
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
  const hasSource = sourceImage.length > 0;
  const complete = boxes.length === fingers.length && imageSize.width > 0;
  const roiSavePath = `private/extraction-work/${params.productHandle}/rois.json`;
  const sourceImagePath =
    sourceKind === "upload"
      ? "<original-package-image-path>"
      : toLocalPublicPath(sourceImage);
  const extractionCommand = `npm run nails:extract-roi -- --roi ${roiSavePath} --source-image ${sourceImagePath}`;
  const approveCommand = `npm run nails:approve -- --proposal private/extraction-work/${params.productHandle}/proposal.json`;
  const nextCommands = `${extractionCommand}\n${approveCommand}`;

  const copyJson = async (): Promise<void> => {
    await navigator.clipboard.writeText(roiJson);
    setMessage("ROI JSON copied to clipboard.");
  };

  const copyNextCommands = async (): Promise<void> => {
    await navigator.clipboard.writeText(nextCommands);
    setMessage("Next terminal commands copied to clipboard.");
  };

  const downloadJson = (): void => {
    const blob = new Blob([roiJson + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${params.productHandle}-rois.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("ROI JSON saved to your downloads.");
  };

  const saveJson = async (): Promise<void> => {
    const suggestedName = `${params.productHandle}-rois.json`;
    const picker = (window as SavePickerWindow).showSaveFilePicker;

    if (!picker) {
      downloadJson();
      return;
    }

    try {
      const fileHandle = await picker({
        suggestedName,
        types: [
          {
            description: "ROI JSON",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
      });
      const writable = await fileHandle.createWritable();
      await writable.write(
        new Blob([roiJson + "\n"], { type: "application/json" }),
      );
      await writable.close();
      setMessage("ROI JSON saved.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setMessage("Save cancelled.");
        return;
      }
      downloadJson();
    }
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
              Upload a package photo and draw five labeled rectangles in natural
              image coordinates.
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
              if (!hasSource) {
                return;
              }
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
              if (!hasSource) {
                return;
              }
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
              if (!hasSource) {
                return;
              }
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
            {hasSource ? (
              <>
                <img
                  ref={imageRef}
                  alt="Press-on nail package source"
                  className="annotator-image"
                  draggable={false}
                  src={sourceImage}
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
              </>
            ) : (
              <Box className="annotator-empty-state">
                <UploadFileIcon aria-hidden="true" />
                <Typography variant="h5">Upload a package image</Typography>
                <Typography color="text.secondary">
                  Use a clear PNG, JPEG, or WebP photo of one press-on nail
                  package.
                </Typography>
                <Button
                  startIcon={<UploadFileIcon />}
                  variant="contained"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose image
                </Button>
              </Box>
            )}
          </Box>

          <Stack className="annotator-controls" spacing={2}>
            <Box className="annotator-source-card">
              <input
                ref={fileInputRef}
                data-testid="annotator-file-input"
                hidden
                accept="image/png,image/jpeg,image/webp"
                type="file"
                onChange={uploadImage}
              />
              <Button
                fullWidth
                startIcon={<UploadFileIcon />}
                variant="contained"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload package image
              </Button>
              <Typography className="annotator-source-name">
                {sourceImageName}
              </Typography>
              {sourceKind === "upload" ? (
                <Typography color="text.secondary" variant="body2">
                  Browser uploads are previews. Use the original local image
                  path with <code>nails:extract-roi -- --source-image</code>
                  after saving this JSON.
                </Typography>
              ) : null}
            </Box>

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
                onClick={saveJson}
              >
                Save JSON
              </Button>
            </Stack>

            <Box className="annotator-next-step">
              <Stack direction="row" alignItems="center" spacing={1}>
                <TerminalIcon color="primary" />
                <Typography variant="h6">Next step</Typography>
              </Stack>
              <Typography color="text.secondary" variant="body2">
                Save the ROI JSON as <code>{roiSavePath}</code>, then run these
                commands from the project root.
              </Typography>
              {sourceKind === "upload" ? (
                <Alert severity="warning">
                  Replace <code>{sourceImagePath}</code> with the original file
                  path, for example{" "}
                  <code>
                    public/extract-press-on-nails/example_1/IMG_1943.HEIC
                  </code>
                  .
                </Alert>
              ) : null}
              <TextField
                multiline
                fullWidth
                minRows={4}
                label="Next terminal commands"
                value={nextCommands}
                slotProps={{
                  input: {
                    readOnly: true,
                  },
                }}
              />
              <Button
                startIcon={<ContentCopyIcon />}
                variant="outlined"
                onClick={copyNextCommands}
              >
                Copy commands
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default NailAnnotatorMode;
