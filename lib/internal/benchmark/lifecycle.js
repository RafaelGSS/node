const {
  MathMax,
  MathRound,
  NumberPrototypeToFixed,
} = primordials;

const { formatDuration, debugBench } = require('internal/benchmark/report');
const { clockBenchmark, timer } = require('internal/benchmark/clock');
const { StatisticalHistogram } = require('internal/benchmark/histogram');

// Inspired by benchmark.js
// Resolve time span required to achieve a percent uncertainty of at most 1%.
// For more information see http://spiff.rit.edu/classes/phys273/uncert/uncert.html.
const minTime = MathMax(timer.resolution / 2 / 0.01, 0.05);

// 5s - arbitrary number used in some benchmark tools
const maxTime = 0.5;

async function getInitialIterations(bench) {
  const [durationInNs, realIterations] = await clockBenchmark(bench, 10);

  const durationPerOpInNs = durationInNs / realIterations;
  debugBench(`Duration per operation on initial count: ${formatDuration(durationPerOpInNs)}`);

  return getItersForOpDuration(durationPerOpInNs, bench);
}

/**
 * @param {number} durationPerOpInNs
 */
function getItersForOpDuration(durationPerOpInNs, bench) {
  const totalOpsForMinTime = bench.minTime / (durationPerOpInNs / 1e9);

  return MathMax(10, MathRound(totalOpsForMinTime));
}

async function runBenchmark(bench) {
  const histogram = new StatisticalHistogram();

  let initialIterations = await getInitialIterations(bench);

  let startClock;
  let benchTimeSpentInNs = 0;
  let maxDurationInNs = bench.maxTime * 1e9 * (bench?.repetitions ?? 1);

  let iterations = 0;
  let timeSpentInNs = 0;
  let durationPerOpInNs;

  while (benchTimeSpentInNs < maxDurationInNs) {
    debugBench(`Starting cycle with ${initialIterations} iterations`);

    startClock = timer.now();
    const [durationInNs, realIterations] = await clockBenchmark(bench, initialIterations);
    benchTimeSpentInNs += Number(timer.now() - startClock);

    iterations += realIterations;
    timeSpentInNs += durationInNs;
    durationPerOpInNs = durationInNs / realIterations;

    histogram.record(durationPerOpInNs);

    initialIterations = getItersForOpDuration(durationPerOpInNs, bench);
  }

  histogram.finish();

  const opsSec = iterations / (timeSpentInNs / 1e9);

  return {
    __proto__: null,
    opsSec: opsSec < 100
      ? NumberPrototypeToFixed(opsSec, 2)
      : NumberPrototypeToFixed(opsSec, 0),
    iterations,
    histogram,
  };
};

module.exports = {
  minTime,
  maxTime,
  runBenchmark,
};
