const { ArrayPrototypePush, ArrayPrototypeSlice } = primordials;
const { debugBench } = require('internal/benchmark/clock');
const { addDefaultBenchmarkReporter } = require('internal/benchmark/report');
const { maxTime, minTime, runBenchmark } = require('internal/benchmark/lifecycle');
const { validateObject, validateNumber, validateString, validateFunction, validateBoolean } = require('internal/validators');
const EventEmitter = require('events');

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

class Suite extends EventEmitter {
  #name;
  #benchmarks;

  constructor(name, options) {
    super();

    this.#name = name;
    this.#benchmarks = [];

    if (typeof options === 'object') {
      options.report ??= true;

      validateBoolean(options.reporter, 'options.reporter');

      if (options.report) {
        addDefaultBenchmarkReporter(this);
      }
    } else {
      addDefaultBenchmarkReporter(this);
    }
  }

  get name() {
    return this.#name;
  }

  get benchmarks() {
    return ArrayPrototypeSlice(this.#benchmarks);
  }

  add(name, options, fn) {
    if (typeof options === 'function') {
      fn = options;
      options = { __proto__: null, minTime, maxTime };
    } else {
      validateObject(options, 'options');

      options.minTime ??= minTime;
      options.maxTime ??= maxTime;

      validateNumber(options.minTime, 'options.minTime', 1 / (timer.resolution * 1e3));
      validateNumber(options.maxTime, 'options.maxTime', options.minTime);
    }

    validateString(name, 'name');
    validateFunction(fn, 'fn');

    const benchmark = new Benchmark(name, fn, options.minTime, options.maxTime);

    ArrayPrototypePush(this.#benchmarks, benchmark);

    return this;
  }

  async run() {
    this.emit('start', this);

    const results = [];

    for (const benchmark of this.#benchmarks) {
      debugBench(`Starting ${benchmark.name} with minTime=${benchmark.minTime}, maxTime=${benchmark.maxTime}`);

      const result = await runBenchmark(benchmark);
      ArrayPrototypePush(results, result);

      this.emit('cycle', result);
    }

    this.emit('complete');

    return results;
  }
}

module.exports = {
  Suite,
};
