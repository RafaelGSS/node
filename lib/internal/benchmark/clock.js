const {
  FunctionPrototypeBind,
  StringPrototypeIndexOf,
  FunctionPrototypeToString,
} = primordials;

const { formatDuration, debugBench } = require('internal/benchmark/report');

const kUnmanagedTimerResult = Symbol('kUnmanagedTimerResult');

class ManagedTimer {
  constructor() {
    this.now = process.hrtime.bigint;
    this.resolution = 1 / 1e9;
  }
}

const timer = new ManagedTimer();

class UnmanagedTimer {
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
    this.#end = timer.now();
    this.#iterations = iterations;
  }

  [kUnmanagedTimerResult]() {
    if (this.#iterations === undefined)
      throw new Error('You forgot to call .end()');

    return [Number(this.#end - this.#start), this.#iterations];
  }
}

async function runManagedBenchmark(bench, managedTimer, count) {
  const startedAt = managedTimer.now();

  for (let i = 0; i < count; i++)
    await bench.fn();

  const end = Number(managedTimer.now() - startedAt);
  return [end, count];
}

async function runUnmanagedBenchmark(bench, unmanagedTimer) {
  await bench.fn(unmanagedTimer);

  return unmanagedTimer[kUnmanagedTimerResult]();
}

/**
 * @param {number} recommendedCount
 * @returns {(count: number) => Promise<[durationInNs: number, count: number]> | [durationInNs: number, count: number]}
 */
function createRunner(bench, recommendedCount) {
  const fnString = FunctionPrototypeToString(bench.fn);

  const hasArg = StringPrototypeIndexOf(fnString, ')') - StringPrototypeIndexOf(fnString, '(') > 1;

  const runner = hasArg
    ? FunctionPrototypeBind(runUnmanagedBenchmark, globalThis, new UnmanagedTimer(recommendedCount))
    : FunctionPrototypeBind(runManagedBenchmark, globalThis, bench, timer, recommendedCount);

  debugBench(`Created compiled benchmark, hasArg=${hasArg}`)

  return runner;
}

/**
 * @param {number} recommendedCount
 * @returns {Promise<[durationInNs: number, iterations: number]>}
 */
async function clockBenchmark(bench, recommendedCount) {
  const runner = createRunner(bench, recommendedCount);
  const result = await runner();

  debugBench(`Took ${formatDuration(result[0])} to execute ${result[1]} iterations`);

  return result;
}

module.exports = {
  timer,
  UnmanagedTimer,
  clockBenchmark,
}
