export interface QualityCheck {
  readonly label: string;
  readonly passed: boolean;
  readonly detail: string;
}

export interface ImageQualityResult {
  readonly score: number;
  readonly width: number;
  readonly height: number;
  readonly brightness: number;
  readonly contrast: number;
  readonly edgeStrength: number;
  readonly checks: ReadonlyArray<QualityCheck>;
}

function standardDeviation(values: Float32Array, mean: number): number {
  let variance = 0;
  for (const value of values) variance += (value - mean) ** 2;
  return Math.sqrt(variance / Math.max(values.length, 1));
}

export async function assessImageQuality(
  file: File,
): Promise<ImageQualityResult> {
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const maxSide = 256;
  const scale = Math.min(1, maxSide / Math.max(originalWidth, originalHeight));
  const width = Math.max(1, Math.round(originalWidth * scale));
  const height = Math.max(1, Math.round(originalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    bitmap.close();
    throw new Error("This browser could not create an image analysis canvas.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const luminance = new Float32Array(width * height);
  let sum = 0;

  for (let pixel = 0, sample = 0; pixel < pixels.length; pixel += 4, sample++) {
    const value =
      pixels[pixel] * 0.2126 +
      pixels[pixel + 1] * 0.7152 +
      pixels[pixel + 2] * 0.0722;
    luminance[sample] = value;
    sum += value;
  }

  const brightness = sum / luminance.length;
  const contrast = standardDeviation(luminance, brightness);
  let edgeTotal = 0;
  let edgeSamples = 0;

  for (let y = 1; y < height; y++) {
    for (let x = 1; x < width; x++) {
      const index = y * width + x;
      edgeTotal += Math.abs(luminance[index] - luminance[index - 1]);
      edgeTotal += Math.abs(luminance[index] - luminance[index - width]);
      edgeSamples += 2;
    }
  }

  const edgeStrength = edgeTotal / Math.max(edgeSamples, 1);
  bitmap.close();

  const shortestSide = Math.min(originalWidth, originalHeight);
  const checks: QualityCheck[] = [
    {
      label: "Resolution",
      passed: shortestSide >= 720,
      detail: `${originalWidth} × ${originalHeight}; aim for at least 720 px on the shortest side.`,
    },
    {
      label: "Exposure",
      passed: brightness >= 55 && brightness <= 210,
      detail:
        brightness < 55
          ? "The image appears too dark."
          : brightness > 210
            ? "The image appears overexposed."
            : "Brightness is within the working range.",
    },
    {
      label: "Contrast",
      passed: contrast >= 28,
      detail:
        contrast >= 28
          ? "Facial edges should be distinguishable."
          : "Use more even, directional light so facial edges are clearer.",
    },
    {
      label: "Sharpness cue",
      passed: edgeStrength >= 7,
      detail:
        edgeStrength >= 7
          ? "The image contains usable edge detail."
          : "The image may be blurred or excessively smoothed.",
    },
  ];
  const score =
    (checks.filter((check) => check.passed).length / checks.length) * 100;

  return {
    score,
    width: originalWidth,
    height: originalHeight,
    brightness,
    contrast,
    edgeStrength,
    checks,
  };
}
