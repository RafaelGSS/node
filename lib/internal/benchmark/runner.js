const { reportConsoleBench, debugBench } = require('internal/benchmark/report');
const { maxTime, minTime, runBenchmark } = require('internal/benchmark/lifecycle');
const { validateObject, validateNumber, validateString, validateFunction } = require('internal/validators');

async function bench(name, options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = { __proto__: null, minTime, maxTime, reporter: reportConsoleBench };
  } else {
    validateObject(options, 'options');

    options.minTime ??= minTime;
    options.maxTime ??= maxTime;
    options.reporter ??= reportConsoleBench;

    validateNumber(options.minTime, 'options.minTime', 1 / 1e7);
    validateNumber(options.maxTime, 'options.maxTime', 1 / 1e7);
    validateFunction(options.reporter, 'options.reporter');
  }

  validateString(name, 'name');
  validateFunction(fn, 'fn');

  const bench = {
    __proto__: null,
    name,
    fn,
    minTime: options.minTime,
    maxTime: options.maxTime,
  };

  debugBench(`Starting ${bench.name} with minTime=${bench.minTime}, maxTime=${bench.maxTime}`)
  const result = await runBenchmark(bench, options);

  options.reporter(bench, result);
}

module.exports = {
  bench,
};
