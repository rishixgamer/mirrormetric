export function normalizedMeanError(sample) {
  if (!sample.normalizedBy || sample.normalizedBy <= 0) {
    throw new Error(`${sample.id}: normalizedBy must be positive.`);
  }
  if (
    !Array.isArray(sample.groundTruth) ||
    sample.groundTruth.length !== sample.prediction?.length ||
    sample.groundTruth.length === 0
  ) {
    throw new Error(`${sample.id}: landmark arrays must be non-empty and equal.`);
  }
  const total = sample.groundTruth.reduce((sum, point, index) => {
    const prediction = sample.prediction[index];
    return sum + Math.hypot(point[0] - prediction[0], point[1] - prediction[1]);
  }, 0);
  return total / sample.groundTruth.length / sample.normalizedBy;
}

export function summarizeSamples(samples, failureThreshold = 0.1) {
  const errors = samples.map(normalizedMeanError);
  const nme = errors.reduce((sum, value) => sum + value, 0) / errors.length;
  const failures = errors.filter((value) => value > failureThreshold).length;
  const auc =
    errors.reduce(
      (sum, value) =>
        sum + Math.max(0, failureThreshold - value) / failureThreshold,
      0,
    ) / errors.length;
  return {
    sampleCount: samples.length,
    nme,
    auc,
    failureRate: failures / errors.length,
    failureThreshold,
  };
}

export function evaluateBenchmark(document) {
  if (!Array.isArray(document.samples) || document.samples.length === 0) {
    throw new Error("Benchmark input must contain at least one sample.");
  }
  const overall = summarizeSamples(document.samples, document.failureThreshold);
  const tags = [
    ...new Set(document.samples.flatMap((sample) => sample.tags ?? [])),
  ].sort();
  const subsets = Object.fromEntries(
    tags.map((tag) => [
      tag,
      summarizeSamples(
        document.samples.filter((sample) => sample.tags?.includes(tag)),
        document.failureThreshold,
      ),
    ]),
  );
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    dataset: document.dataset,
    normalization: document.normalization,
    overall,
    subsets,
  };
}

export function assertRegressionGate(report, baseline, tolerance = 0.05) {
  const nmeLimit = baseline.overall.nme * (1 + tolerance);
  const failureLimit =
    baseline.overall.failureRate === 0
      ? tolerance
      : baseline.overall.failureRate * (1 + tolerance);
  if (
    report.overall.nme > nmeLimit ||
    report.overall.failureRate > failureLimit
  ) {
    throw new Error(
      `Regression gate failed: NME ${report.overall.nme.toFixed(6)} (limit ${nmeLimit.toFixed(6)}), failure rate ${(report.overall.failureRate * 100).toFixed(2)}% (limit ${(failureLimit * 100).toFixed(2)}%).`,
    );
  }
}
