const {
  MathMax,
  MathRound,
  NumberPrototypeToFixed,
} = primordials;

const { clockBenchmark, debugBench, timer } = require('internal/benchmark/clock');
const { StatisticalHistogram, kStatisticalHistogramRecord, kStatisticalHistogramFinish } = require('internal/benchmark/histogram');

// 0.05 - Arbitrary number used in some benchmark tools
const minTime = 0.05;

// 0.5s - Arbitrary number used in some benchmark tools
const maxTime = 0.5;

/**
 * @param {number} durationPerOp
 */
function getItersForOpDuration(durationPerOp, bench) {
  const totalOpsForMinTime = bench.minTime / (durationPerOp / timer.scale);

  return MathMax(10, MathRound(totalOpsForMinTime));
}

async function getInitialIterations(bench) {
  const [duration, realIterations] = await clockBenchmark(bench, 10);

  const durationPerOp = duration / realIterations;
  debugBench(`Duration per operation on initial count: ${timer.format(durationPerOp)}`);

  return getItersForOpDuration(durationPerOp, bench);
}

class BenchmarkResult {
  #opsSec;
  #iterations;
  #histogram;

  constructor(opsSec, iterations, histogram) {
    this.#opsSec = opsSec;
    this.#iterations = iterations;
    this.#histogram = histogram;
  }

  /**
   * @type {number}
   */
  get opsSec() {
    return this.#opsSec;
  }

  /**
   * @type {number}
   */
  get iterations() {
    return this.#iterations;
  }

  /**
   * @type {StatisticalHistogram}
   */
  get histogram() {
    return this.#histogram;
  }
}

async function runBenchmark(bench) {
  const histogram = new StatisticalHistogram();

  let initialIterations = await getInitialIterations(bench);

  let startClock;
  let benchTimeSpent = 0;
  let maxDuration = bench.maxTime * timer.scale;

  let iterations = 0;
  let timeSpent = 0;
  let durationPerOpInNs;

  while (benchTimeSpent < maxDuration) {
    startClock = timer.now();
    const [durationInNs, realIterations] = await clockBenchmark(bench, initialIterations);
    benchTimeSpent += Number(timer.now() - startClock);

    iterations += realIterations;
    timeSpent += durationInNs;
    durationPerOpInNs = durationInNs / realIterations;

    histogram[kStatisticalHistogramRecord](durationPerOpInNs);

    initialIterations = getItersForOpDuration(durationPerOpInNs, bench);
  }

  histogram[kStatisticalHistogramFinish]();

  const opsSec = iterations / (timeSpent / timer.scale);

  return new BenchmarkResult(opsSec, iterations, histogram);
};

module.exports = {
  minTime,
  maxTime,
  runBenchmark,
};
