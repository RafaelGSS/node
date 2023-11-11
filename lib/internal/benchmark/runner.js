const { ArrayPrototypePush } = primordials;
const { reportConsoleBench, debugBench } = require('internal/benchmark/report');
const { maxTime, minTime, runBenchmark } = require('internal/benchmark/lifecycle');
const { validateObject, validateNumber, validateString, validateFunction } = require('internal/validators');

class Suite {
  #name;
  #benchmarks;
  #reporter;

  constructor(name, options) {
    this.#name = name;
    this.#benchmarks = [];

    if (typeof options === 'object') {
      options.reporter ??= reportConsoleBench;

      validateFunction(options.reporter, 'options.reporter');

      this.#reporter = options.reportConsoleBench;
    } else {
      this.#reporter = reportConsoleBench;
    }
  }

  get name() {
    return this.#name;
  }

  add(name, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = { __proto__: null, minTime, maxTime };
    } else {
      validateObject(options, 'options');

      options.minTime ??= minTime;
      options.maxTime ??= maxTime;

      validateNumber(options.minTime, 'options.minTime', 1 / 1e7);
      validateNumber(options.maxTime, 'options.maxTime', 1 / 1e7);
    }

    validateString(name, 'name');
    validateFunction(fn, 'fn');

    const benchmark = new Benchmark(name, fn, options.minTime, options.maxTime);

    ArrayPrototypePush(this.#benchmarks, benchmark);

    return this;
  }

  async run() {
    for (const benchmark of this.#benchmarks) {
      debugBench(`Starting ${benchmark.name} with minTime=${benchmark.minTime}, maxTime=${benchmark.maxTime}`)
      const result = await runBenchmark(benchmark);

      this.#reporter(benchmark, result);
    }
  }
}

class Benchmark {
  #name;
  #fn;
  #minTime;
  #maxTime;

  constructor(name, fn, minTime, maxTime) {
    this.#name = name;
    this.#fn = fn;
    this.#minTime = minTime;
    this.#maxTime = maxTime;
  }

  get name() {
    return this.#name;
  }

  get fn() {
    return this.#fn;
  }

  get minTime() {
    return this.#minTime;
  }

  get maxTime() {
    return this.#maxTime;
  }
}

module.exports = {
  Suite,
};
