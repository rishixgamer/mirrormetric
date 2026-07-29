import { useEffect, useMemo, useRef, useState } from "react";
import type { CaptureAnalysis } from "../domain/contracts";
import {
  FACE_INDEX,
  type FaceLandmarkName,
  type Landmark,
  type LandmarkSet,
} from "../domain/landmarks";
import { drawLandmarkOverlay } from "../lib/draw-overlay";
import { computeMeasurements } from "../lib/measurement-engine";

const anchorEntries = Object.entries(FACE_INDEX).filter(
  ([, index], position, entries) =>
    entries.findIndex(([, candidate]) => candidate === index) === position,
) as Array<[FaceLandmarkName, number]>;

const anchorSet = new Set(anchorEntries.map(([, index]) => index));

function humanize(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

interface LandmarkEditorProps {
  readonly capture: CaptureAnalysis;
  readonly file: File;
  readonly onApply: (capture: CaptureAnalysis) => void;
  readonly onClose: () => void;
}

export function LandmarkEditor({
  capture,
  file,
  onApply,
  onClose,
}: LandmarkEditorProps) {
  const [landmarks, setLandmarks] = useState<LandmarkSet>(capture.landmarks);
  const [undoStack, setUndoStack] = useState<LandmarkSet[]>([]);
  const [selected, setSelected] = useState(anchorEntries[0][1]);
  const [dragging, setDragging] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);

  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  useEffect(() => {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (image?.complete && canvas) {
      drawLandmarkOverlay(canvas, image, landmarks, {
        highlighted: anchorSet,
        selected,
        labels: false,
      });
    }
  }, [landmarks, selected]);

  function replacePoint(index: number, point: Landmark) {
    setLandmarks((current) =>
      current.map((candidate, candidateIndex) =>
        candidateIndex === index ? point : candidate,
      ),
    );
  }

  function saveUndo() {
    setUndoStack((stack) => [...stack.slice(-19), landmarks]);
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rectangle.left) / rectangle.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rectangle.top) / rectangle.height)),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = pointFromEvent(event);
    const rectangle = event.currentTarget.getBoundingClientRect();
    const nearest = anchorEntries
      .map(([, index]) => {
        const anchor = landmarks[index];
        return {
          index,
          distance: Math.hypot(
            (anchor.x - point.x) * rectangle.width,
            (anchor.y - point.y) * rectangle.height,
          ),
        };
      })
      .sort((a, b) => a.distance - b.distance)[0];
    if (!nearest || nearest.distance > 30) return;
    saveUndo();
    setSelected(nearest.index);
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    replacePoint(nearest.index, { ...landmarks[nearest.index], ...point });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    replacePoint(selected, {
      ...landmarks[selected],
      ...pointFromEvent(event),
    });
  }

  function stopDragging(event: React.PointerEvent<HTMLCanvasElement>) {
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function nudge(x: number, y: number) {
    saveUndo();
    const point = landmarks[selected];
    replacePoint(selected, {
      ...point,
      x: Math.min(1, Math.max(0, point.x + x)),
      y: Math.min(1, Math.max(0, point.y + y)),
    });
  }

  function undo() {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setLandmarks(previous);
    setUndoStack((stack) => stack.slice(0, -1));
  }

  function reset() {
    saveUndo();
    setLandmarks(capture.landmarks);
  }

  function apply() {
    onApply({
      ...capture,
      landmarks,
      measurements: computeMeasurements(
        landmarks,
        capture.assessment.confidence,
      ),
    });
    onClose();
  }

  const selectedName =
    anchorEntries.find(([, index]) => index === selected)?.[0] ?? "landmark";

  return (
    <section className="editor-card" aria-labelledby="editor-title">
      <div className="editor-heading">
        <div>
          <span className="eyebrow">Manual correction</span>
          <h2 id="editor-title">Inspect the points behind the numbers</h2>
        </div>
        <button className="button button-quiet" type="button" onClick={onClose}>
          Close editor
        </button>
      </div>
      <p className="lede-small">
        Drag a highlighted anchor, or select one and use the nudge controls.
        The original photo is held only in this tab.
      </p>
      <div className="editor-layout">
        <div className="image-stage">
          <div className="image-canvas-wrap">
            <img
              ref={imageRef}
              src={previewUrl}
              alt="Current scan with editable landmark anchors"
              onLoad={() => {
                if (imageRef.current && canvasRef.current) {
                  drawLandmarkOverlay(
                    canvasRef.current,
                    imageRef.current,
                    landmarks,
                    { highlighted: anchorSet, selected },
                  );
                }
              }}
            />
            <canvas
              ref={canvasRef}
              tabIndex={0}
              aria-label="Editable facial landmark canvas. Use the controls beside the image as a keyboard alternative to dragging."
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
            />
          </div>
        </div>
        <div className="editor-controls">
          <label htmlFor="landmark-select">Selected anchor</label>
          <select
            id="landmark-select"
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
          >
            {anchorEntries.map(([name, index]) => (
              <option value={index} key={index}>
                {humanize(name)} · {index}
              </option>
            ))}
          </select>
          <p className="control-status" aria-live="polite">
            Editing {humanize(selectedName)}.
          </p>
          <div className="nudge-grid" aria-label="Nudge selected anchor">
            <button type="button" onClick={() => nudge(0, -0.001)}>
              Up
            </button>
            <button type="button" onClick={() => nudge(-0.001, 0)}>
              Left
            </button>
            <button type="button" onClick={() => nudge(0.001, 0)}>
              Right
            </button>
            <button type="button" onClick={() => nudge(0, 0.001)}>
              Down
            </button>
          </div>
          <div className="editor-secondary-actions">
            <button type="button" disabled={!undoStack.length} onClick={undo}>
              Undo
            </button>
            <button type="button" onClick={reset}>
              Reset automatic points
            </button>
          </div>
          <button className="button button-primary" type="button" onClick={apply}>
            Apply corrections
          </button>
        </div>
      </div>
    </section>
  );
}
