import { REQUIRED_METRIC_IDS } from "./features.mjs";

const DEFAULT_LAMBDAS = Object.freeze([0.001, 0.01, 0.1, 1, 10, 100]);

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

function shuffledIndices(length, seed) {
  const indices = Array.from({ length }, (_, index) => index);
  const random = seededRandom(seed);
  for (let index = indices.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [indices[index], indices[swap]] = [indices[swap], indices[index]];
  }
  return indices;
}

function foldsFor(length, count, seed) {
  const folds = Array.from({ length: count }, () => []);
  shuffledIndices(length, seed).forEach((index, order) => {
    folds[order % count].push(index);
  });
  return folds;
}

function solve(matrix, vector) {
  const size = vector.length;
  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (Math.abs(augmented[row][column]) > Math.abs(augmented[pivot][column])) {
        pivot = row;
      }
    }
    [augmented[column], augmented[pivot]] = [augmented[pivot], augmented[column]];
    if (Math.abs(augmented[column][column]) < 1e-12) {
      throw new Error("Ridge system is singular.");
    }
    for (let row = column + 1; row < size; row++) {
      const factor = augmented[row][column] / augmented[column][column];
      for (let item = column; item <= size; item++) {
        augmented[row][item] -= factor * augmented[column][item];
      }
    }
  }
  const output = Array(size).fill(0);
  for (let row = size - 1; row >= 0; row--) {
    let remainder = augmented[row][size];
    for (let column = row + 1; column < size; column++) {
      remainder -= augmented[row][column] * output[column];
    }
    output[row] = remainder / augmented[row][row];
  }
  return output;
}

export function fitRidge(rows, lambda) {
  if (rows.length < 2) throw new Error("At least two training rows are required.");
  const means = REQUIRED_METRIC_IDS.map(
    (id) => rows.reduce((sum, row) => sum + row.features[id], 0) / rows.length,
  );
  const standardDeviations = REQUIRED_METRIC_IDS.map((id, index) => {
    const variance =
      rows.reduce(
        (sum, row) => sum + (row.features[id] - means[index]) ** 2,
        0,
      ) / rows.length;
    const deviation = Math.sqrt(variance);
    if (deviation <= 1e-12) {
      throw new Error(`Feature has zero variance: ${id}.`);
    }
    return deviation;
  });
  const standardized = rows.map((row) =>
    REQUIRED_METRIC_IDS.map(
      (id, index) =>
        (row.features[id] - means[index]) / standardDeviations[index],
    ),
  );
  const intercept =
    rows.reduce((sum, row) => sum + row.score, 0) / rows.length;
  const centeredTargets = rows.map((row) => row.score - intercept);
  const size = REQUIRED_METRIC_IDS.length;
  const gram = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) =>
      standardized.reduce(
        (sum, values) => sum + values[row] * values[column],
        row === column ? lambda : 0,
      ),
    ),
  );
  const target = Array.from({ length: size }, (_, column) =>
    standardized.reduce(
      (sum, values, row) => sum + values[column] * centeredTargets[row],
      0,
    ),
  );
  const coefficients = solve(gram, target);
  return {
    lambda,
    intercept,
    features: REQUIRED_METRIC_IDS.map((measurementId, index) => ({
      measurementId,
      mean: means[index],
      standardDeviation: standardDeviations[index],
      coefficient: coefficients[index],
    })),
  };
}

export function predictRidge(model, features) {
  return (
    model.intercept +
    model.features.reduce(
      (sum, feature) =>
        sum +
        feature.coefficient *
          ((features[feature.measurementId] - feature.mean) /
            feature.standardDeviation),
      0,
    )
  );
}

function mae(predictions) {
  return (
    predictions.reduce(
      (sum, prediction) =>
        sum + Math.abs(prediction.predicted - prediction.actual),
      0,
    ) / predictions.length
  );
}

function crossValidatedMae(rows, lambda, seed, foldCount = 5) {
  const folds = foldsFor(rows.length, foldCount, seed);
  const predictions = [];
  for (const validationIndices of folds) {
    const validationSet = new Set(validationIndices);
    const training = rows.filter((_, index) => !validationSet.has(index));
    const model = fitRidge(training, lambda);
    for (const index of validationIndices) {
      predictions.push({
        actual: rows[index].score,
        predicted: predictRidge(model, rows[index].features),
      });
    }
  }
  return mae(predictions);
}

function bestLambda(rows, seed, lambdas) {
  return lambdas
    .map((lambda) => ({
      lambda,
      mae: crossValidatedMae(rows, lambda, seed),
    }))
    .sort((left, right) => left.mae - right.mae || left.lambda - right.lambda)[0]
    .lambda;
}

function quantile(values, probability) {
  const sorted = [...values].sort((left, right) => left - right);
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

function pearson(predictions) {
  const actualMean =
    predictions.reduce((sum, item) => sum + item.actual, 0) /
    predictions.length;
  const predictedMean =
    predictions.reduce((sum, item) => sum + item.predicted, 0) /
    predictions.length;
  const numerator = predictions.reduce(
    (sum, item) =>
      sum +
      (item.actual - actualMean) * (item.predicted - predictedMean),
    0,
  );
  const actualVariance = predictions.reduce(
    (sum, item) => sum + (item.actual - actualMean) ** 2,
    0,
  );
  const predictedVariance = predictions.reduce(
    (sum, item) => sum + (item.predicted - predictedMean) ** 2,
    0,
  );
  const denominator = Math.sqrt(actualVariance * predictedVariance);
  return denominator <= Number.EPSILON ? 0 : numerator / denominator;
}

export function evaluatePredictions(predictions) {
  const absoluteErrors = predictions.map((item) =>
    Math.abs(item.predicted - item.actual),
  );
  const squaredErrors = predictions.map(
    (item) => (item.predicted - item.actual) ** 2,
  );
  const subsetMae = (subgroup) => {
    const subset = predictions.filter((item) => item.subgroup === subgroup);
    if (!subset.length) throw new Error(`Missing validation subgroup: ${subgroup}.`);
    return mae(subset);
  };
  return {
    sampleCount: predictions.length,
    pearson: pearson(predictions),
    mae: absoluteErrors.reduce((sum, value) => sum + value, 0) / predictions.length,
    rmse: Math.sqrt(
      squaredErrors.reduce((sum, value) => sum + value, 0) /
        predictions.length,
    ),
    absoluteErrorQuantile90: quantile(absoluteErrors, 0.9),
    asianMaleMae: subsetMae("Asian male"),
    caucasianMaleMae: subsetMae("Caucasian male"),
  };
}

export function passesReleaseGates(metrics) {
  return (
    metrics.pearson >= 0.6 &&
    metrics.mae <= 0.45 &&
    metrics.rmse <= 0.6 &&
    metrics.asianMaleMae <= metrics.mae * 1.5 &&
    metrics.caucasianMaleMae <= metrics.mae * 1.5
  );
}

export function trainNestedRidge(
  inputRows,
  { seed = 20260729, lambdas = DEFAULT_LAMBDAS } = {},
) {
  if (inputRows.length < 25) {
    throw new Error("Nested five-fold validation requires at least 25 rows.");
  }
  const rows = [...inputRows].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const outerFolds = foldsFor(rows.length, 5, seed);
  const predictions = [];
  const selectedLambdas = [];
  outerFolds.forEach((validationIndices, outerIndex) => {
    const validationSet = new Set(validationIndices);
    const training = rows.filter((_, index) => !validationSet.has(index));
    const lambda = bestLambda(training, seed + outerIndex + 1, lambdas);
    selectedLambdas.push(lambda);
    const model = fitRidge(training, lambda);
    validationIndices.forEach((index) => {
      const row = rows[index];
      predictions.push({
        id: row.id,
        actual: row.score,
        predicted: predictRidge(model, row.features),
        subgroup: row.subgroup,
      });
    });
  });
  predictions.sort((left, right) => left.id.localeCompare(right.id));
  const validation = evaluatePredictions(predictions);
  const finalLambda = bestLambda(rows, seed + 1000, lambdas);
  return {
    model: fitRidge(rows, finalLambda),
    selectedLambdas,
    finalLambda,
    predictions,
    validation: {
      ...validation,
      folds: 5,
      nested: true,
      seed,
      releaseEligible: passesReleaseGates(validation),
    },
  };
}
