export interface BenchmarkSample {
  id: string;
  normalizedBy: number;
  groundTruth: number[][];
  prediction: number[][];
  tags?: string[];
}

export interface BenchmarkSummary {
  sampleCount: number;
  nme: number;
  auc: number;
  failureRate: number;
  failureThreshold: number;
}

export function normalizedMeanError(sample: BenchmarkSample): number;
export function evaluateBenchmark(document: {
  dataset: string;
  normalization: string;
  failureThreshold: number;
  samples: BenchmarkSample[];
}): {
  overall: BenchmarkSummary;
  subsets: Record<string, BenchmarkSummary>;
};
export function assertRegressionGate(
  report: { overall: { nme: number; failureRate: number } },
  baseline: { overall: { nme: number; failureRate: number } },
  tolerance?: number,
): void;
