let debugBench = require('internal/util/debuglog').debuglog('benchmark', (fn) => {
  debug = fn;
});

/**
 * @param {number} timeInNs
 * @returns {string}
 */
function formatDuration(timeInNs) {
  if (timeInNs > 1e9) {
    return `${(timeInNs / 1e9).toFixed(2)}s`;
  }

  if (timeInNs > 1e6) {
    return `${(timeInNs / 1e6).toFixed(2)}ms`;
  }

  if (timeInNs > 1e3) {
    return `${(timeInNs / 1e3).toFixed(2)}us`;
  }

  return `${timeInNs.toFixed(0)}ns`;
}

const formatter = Intl.NumberFormat(undefined, {
  notation: 'standard',
  maximumFractionDigits: 2,
});

/**
 * @param {import("./index.mjs").Benchmark} bench
 * @param {import("./lifecycle.mjs").BenchmarkResult} result
 */
function reportConsoleBench(bench, result) {
  console.log(`${bench.name} x ${formatter.format(result.opsSec)} ops/sec ± ${formatter.format(result.histogram.error.toFixed(2))}% (${result.histogram.samples} runs sampled)`);
  console.log(`\tmin-max=(${formatDuration(result.histogram.min)} … ${formatDuration(result.histogram.max)}) p75=${formatDuration(result.histogram.percentile(75))}  p99=${formatDuration(result.histogram.percentile(99))}`);
}

module.exports = {
  debugBench,
  reportConsoleBench,
  formatDuration,
}
