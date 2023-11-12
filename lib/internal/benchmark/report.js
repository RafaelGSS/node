const {
  NumberPrototypeToFixed,
} = primordials;

const { timer } = require('internal/benchmark/clock');

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
    NumberPrototypeToFixed(result.histogram.cv, 2)),
  );
  process.stdout.write(`% (${result.histogram.samples} runs sampled)\t`);

  process.stdout.write('min..max=(');
  process.stdout.write(timer.format(result.histogram.min));
  process.stdout.write(' ... ');
  process.stdout.write(timer.format(result.histogram.max));
  process.stdout.write(') p75=');
  process.stdout.write(timer.format(result.histogram.percentile(75)));
  process.stdout.write(' p99=');
  process.stdout.write(timer.format(result.histogram.percentile(99)));
  process.stdout.write('\n');
}

module.exports = {
  reportConsoleBench,
};
