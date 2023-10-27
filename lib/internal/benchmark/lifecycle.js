const { formatDuration, debugBench } = require('internal/benchmark/report');
const { clockBenchmark, timer } = require('internal/benchmark/clock');
const { Histogram } = require('internal/benchmark/histogram');

// inspired by benchmark.js
// Resolve time span required to achieve a percent uncertainty of at most 1%.
// For more information see http://spiff.rit.edu/classes/phys273/uncert/uncert.html.
const minTime = Math.max(timer.resolution / 2 / 0.01, 0.05);

// 5s - arbitrary number used in some benchmark tools
const maxTime = 0.5;

async function getInitialCount(bench) {
  const [durationInNs, realCount] = await clockBenchmark(bench, 10);

  const durationPerOpInNs = durationInNs / realCount;
  debugBench(`Duration per operation on initial count: ${formatDuration(durationPerOpInNs)}`);

  return getIdealCountForOpDuration(durationPerOpInNs, bench);
}

/**
 * @param {number} durationPerOpInNs
 * @param {Benchmark} bench
 */
function getIdealCountForOpDuration(durationPerOpInNs, bench) {
  const totalOpsForMinTime = bench.minTime / (durationPerOpInNs / 1e9);

  // TODO: check for infinity or other possible issues
  return Math.max(10, Math.round(totalOpsForMinTime) || 0);
}

/**
 * @param {Benchmark} bench
 *
 * @returns {Promise<BenchmarkResult>}
 */
async function runBenchmark(bench) {
  const histogram = new Histogram();

  let initialCount = await getInitialCount(bench);

  let startClock;
  let benchTimeSpentInNs = 0;
  let maxDurationInNs = bench.maxTime * 1e9 * (bench?.repetitions ?? 1);

  let totalCount = 0;
  let timeSpentInNs = 0;
  let durationPerOpInNs;

  let samples = 0;

  while (benchTimeSpentInNs < maxDurationInNs) {
    debugBench(`Starting cycle with ${initialCount} count`);

    samples++;

    startClock = timer.now();
    const [durationInNs, realCount] = await clockBenchmark(bench, initialCount);
    benchTimeSpentInNs += Number(timer.now() - startClock);

    totalCount += realCount;
    timeSpentInNs += durationInNs;
    durationPerOpInNs = durationInNs / realCount;

    histogram.record(durationPerOpInNs);

    initialCount = getIdealCountForOpDuration(durationPerOpInNs, bench);
  }

  histogram.finish();

  return {
    // TODO: handle when op is too slow
    opsSec: (totalCount / (timeSpentInNs / 1e9)).toFixed(0),
    // TODO: Improve samples report when is managed
    samples,
    histogram,
  };
};

module.exports = {
  minTime,
  maxTime,
  runBenchmark,
};
