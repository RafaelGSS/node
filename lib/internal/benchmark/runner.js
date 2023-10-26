const { reportConsoleBench, debugBench } = require('internal/benchmark/report');
const { minTime, runBenchmark } = require('internal/benchmark/lifecycle');

const globalBenchmarks = [];

function bench(name, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = { __proto__: null };
  } else {
    assertIsObject(options, 'options');
  }

  globalBenchmarks.push({
    name,
    fn,
    minTime: Math.max(options?.minTime || 0, minTime),
    maxTime: Math.max(options?.maxTime || 0, 0.5),
  });
}

async function run(options) {
  const results = [];

  for (const bench of globalBenchmarks) {
    debugBench(`Starting ${bench.name} with minTime=${bench.minTime}, maxTime=${bench.maxTime}`)

    const result = await runBenchmark(bench, options);
    results.push(result);

    reportConsoleBench(bench, result);
  }

  return results;
}

module.exports = {
  bench,
  run,
};
