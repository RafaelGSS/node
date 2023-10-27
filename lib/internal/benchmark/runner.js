const { reportConsoleBench, debugBench } = require('internal/benchmark/report');
const { maxTime, minTime, runBenchmark } = require('internal/benchmark/lifecycle');

async function bench(name, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = { __proto__: null };
  } else {
    assertIsObject(options, 'options');
  }

  const bench = {
    name,
    fn,
    minTime: Math.max(options?.minTime || 0, minTime),
    maxTime: Math.max(options?.maxTime || 0, maxTime),
  };

  debugBench(`Starting ${bench.name} with minTime=${bench.minTime}, maxTime=${bench.maxTime}`)
  const result = await runBenchmark(bench, options);

  if (options?.report !== false) {
    reportConsoleBench(bench, result);
  }
}

module.exports = {
  bench,
};
