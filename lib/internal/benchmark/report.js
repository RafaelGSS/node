const {
  NumberPrototypeToFixed,
} = primordials;

let debugBench = require('internal/util/debuglog').debuglog('benchmark', (fn) => {
  debug = fn;
});

/**
 * @param {number} timeInNs
 * @returns {string}
 */
function formatDuration(timeInNs) {
  if (timeInNs > 1e9) {
    return `${NumberPrototypeToFixed(timeInNs / 1e9, 2)}s`;
  }

  if (timeInNs > 1e6) {
    return `${NumberPrototypeToFixed(timeInNs / 1e6, 2)}ms`;
  }

  if (timeInNs > 1e3) {
    return `${NumberPrototypeToFixed(timeInNs / 1e3, 2)}us`;
  }

  return `${NumberPrototypeToFixed(timeInNs, 0)}ns`;
}

const formatter = Intl.NumberFormat(undefined, {
  notation: 'standard',
  maximumFractionDigits: 2,
});

function reportConsoleBench(bench, result) {
  process.stdout.write(bench.name);
  process.stdout.write(' x ');
  process.stdout.write(formatter.format(result.opsSec));
  process.stdout.write(' ops/sec ± ');
  process.stdout.write(formatter.format(
    NumberPrototypeToFixed(result.histogram.error, 2)),
  );
  process.stdout.write('% (');
  process.stdout.write(result.histogram.samples);
  process.stdout.write(' runs sampled)');
  process.stdout.write('\t');

  process.stdout.write('min..max=(');
  process.stdout.write(formatDuration(result.histogram.min));
  process.stdout.write(' ... ');
  process.stdout.write(formatDuration(result.histogram.max));
  process.stdout.write(') p75=');
  process.stdout.write(formatDuration(result.histogram.percentile(75)));
  process.stdout.write(' p99=');
  process.stdout.write(formatDuration(result.histogram.percentile(99)));
}

module.exports = {
  debugBench,
  reportConsoleBench,
  formatDuration,
};
