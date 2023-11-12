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
      throw new Error('You forgot to call .end(count)');

    if (this.#start === undefined)
      throw new Error('You forgot to call .start()');

    return [Number(this.#end - this.#start), this.#iterations];
  }
}

function createRunManagedBenchmark(awaitOrEmpty) {
  return `
const startedAt = timer.now();

for (let i = 0; i < count; i++)
  ${awaitOrEmpty}bench.fn();

const end = Number(timer.now() - startedAt);
return [end, count];
`
}

function createRunUnmanagedBenchmark(awaitOrEmpty) {
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
  const fnString = FunctionPrototypeToString(bench.fn);

  const isAsync = bench.fn.constructor === AsyncFunction;
  const hasArg = StringPrototypeIndexOf(fnString, ')') - StringPrototypeIndexOf(fnString, '(') > 1;

  const compiledFnStringFactory = hasArg ? createRunUnmanagedBenchmark : createRunManagedBenchmark;
  const compiledFnString = compiledFnStringFactory(isAsync ? 'await ' : '');
  const createFnPrototype = isAsync ? AsyncFunction : SyncFunction;
  const compiledFn = createFnPrototype('bench', 'timer', 'count', 'kUnmanagedTimerResult', compiledFnString);

  const selectedTimer = hasArg ? new UnmanagedTimer(recommendedCount) : timer;

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

  debugBench(`Took ${formatDuration(result[0])} to execute ${result[1]} iterations`);

  return result;
}

module.exports = {
  timer,
  UnmanagedTimer,
  clockBenchmark,
}
