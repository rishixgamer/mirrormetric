import { FACE_INDEX, type LandmarkSet } from "../domain/landmarks";

const defaultHighlighted = new Set<number>(Object.values(FACE_INDEX));

export interface OverlayOptions {
  readonly highlighted?: ReadonlySet<number>;
  readonly selected?: number;
  readonly labels?: boolean;
}

export function drawLandmarkOverlay(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  landmarks: LandmarkSet,
  options: OverlayOptions = {},
): void {
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create the overlay canvas.");

  const highlighted = options.highlighted ?? defaultHighlighted;
  const scale = Math.max(1, canvas.width / 900);
  context.clearRect(0, 0, canvas.width, canvas.height);

  landmarks.forEach((point, index) => {
    const isHighlighted = highlighted.has(index);
    const isSelected = options.selected === index;
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;
    const radius = isSelected ? 8 * scale : isHighlighted ? 4.5 * scale : 1 * scale;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = isSelected
      ? "#ffd166"
      : isHighlighted
        ? "rgba(239, 78, 51, 0.96)"
        : "rgba(15, 23, 42, 0.2)";
    context.fill();
    if (isSelected || isHighlighted) {
      context.lineWidth = Math.max(1, 1.5 * scale);
      context.strokeStyle = isSelected ? "#161916" : "rgba(255,255,255,.9)";
      context.stroke();
    }
    if (options.labels && isHighlighted) {
      context.font = `${Math.max(11, 12 * scale)}px ui-monospace, monospace`;
      context.fillStyle = "#161916";
      context.fillText(String(index), x + 7 * scale, y - 7 * scale);
    }
  });
}
