const {
  FunctionPrototypeBind,
  NumberPrototypeToFixed,
} = primordials;

const {
  codes: { ERR_BENCHMARK_INVALID_OPERATION }
} = require('internal/errors');
const { debugBench } = require('internal/benchmark/report');
const { validateInteger } = require('internal/validators');

const kUnmanagedTimerResult = Symbol('kUnmanagedTimerResult');

class Timer {
  constructor() {
    this.now = process.hrtime.bigint;
    this.scale = 1e9;
    this.resolution = 1 / this.scale;
  }

  /**
   * @param {number} timeInNs
   * @returns {string}
   */
  format(timeInNs) {
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
}

const timer = new Timer();

class ManagedTimer {
  /**
   * @type {BigInt}
   */
  #start;
  /**
   * @type {BigInt}
   */
  #end;
  /**
   * @type {number}
   */
  #iterations;
  /**
   * @type {number}
   */
  #recommendedCount;

  /**
   * @param {number} recommendedCount
   */
  constructor(recommendedCount) {
    this.#recommendedCount = recommendedCount;
  }

  /**
   * Returns the recommended value to be used to benchmark your code
   *
   * @returns {number}
   */
  get count() {
    return this.#recommendedCount;
  }

  /**
   * Starts the timer
   */
  start() {
    this.#start = timer.now();
  }

  /**
   * Stops the timer
   *
   * @param {number} [iterations=1] The amount of iterations that run
   */
  end(iterations = 1) {
    validateInteger(iterations, 'iterations', 1);

    this.#end = timer.now();
    this.#iterations = iterations;
  }

  [kUnmanagedTimerResult]() {
    if (this.#iterations === undefined)
      throw new ERR_BENCHMARK_INVALID_OPERATION('You forgot to call .end(count)');

    if (this.#start === undefined)
      throw new ERR_BENCHMARK_INVALID_OPERATION('You forgot to call .start()');

    return [Number(this.#end - this.#start), this.#iterations];
  }
}

function createRunUnmanagedBenchmark(awaitOrEmpty) {
  return `
const startedAt = timer.now();

for (let i = 0; i < count; i++)
  ${awaitOrEmpty}bench.fn();

const end = Number(timer.now() - startedAt);
return [end, count];
`
}

function createRunManagedBenchmark(awaitOrEmpty) {
  return `
${awaitOrEmpty}bench.fn(timer);

return timer[kUnmanagedTimerResult]();
  `;
}

const AsyncFunction = async function () { }.constructor;
const SyncFunction = function () { }.constructor;

/**
 * @param {number} recommendedCount
 * @returns {(count: number) => Promise<[durationInNs: number, count: number]> | [durationInNs: number, count: number]}
 */
function createRunner(bench, recommendedCount) {
  const isAsync = bench.fn.constructor === AsyncFunction;
  const hasArg = bench.fn.length >= 1;

  if (bench.fn.length > 1) {
    process.emitWarning(`The benchmark ${bench.name} should not have more than 1 argument.`);
  }

  const compiledFnStringFactory = hasArg ? createRunManagedBenchmark : createRunUnmanagedBenchmark;
  const compiledFnString = compiledFnStringFactory(isAsync ? 'await ' : '');
  const createFnPrototype = isAsync ? AsyncFunction : SyncFunction;
  const compiledFn = createFnPrototype('bench', 'timer', 'count', 'kUnmanagedTimerResult', compiledFnString);

  const selectedTimer = hasArg ? new ManagedTimer(recommendedCount) : timer;

  const runner = FunctionPrototypeBind(compiledFn, globalThis, bench, selectedTimer, recommendedCount, kUnmanagedTimerResult)

  debugBench(`Created compiled benchmark, hasArg=${hasArg}, isAsync=${isAsync}, recommendedCount=${recommendedCount}`);

  return runner;
}

/**
 * @param {number} recommendedCount
 * @returns {Promise<[durationInNs: number, iterations: number]>}
 */
async function clockBenchmark(bench, recommendedCount) {
  const runner = createRunner(bench, recommendedCount);
  const result = await runner();

  debugBench(`Took ${timer.format(result[0])} to execute ${result[1]} iterations`);

  return result;
}

module.exports = {
  timer,
  clockBenchmark,
}
