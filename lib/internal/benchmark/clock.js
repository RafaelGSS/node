const { formatDuration, debugBench } = require('internal/benchmark/report');

const timer = {
  now: process.hrtime.bigint,
  unit: 'ns',
  resolution: 1 / 1e9,
};

const createManagedBenchmark = (awaitOrEmpty) => `
const startedAt = timer.now();

for (let i = 0; i < count; i++)
  ${awaitOrEmpty}bench.fn();

const end = Number(timer.now() - startedAt);
return [end, count];
`;

const createUnmanagedBenchmark = (awaitOrEmpty) => `
${awaitOrEmpty}bench.fn(timer);

return timer[kUnmanagedTimerResult]();
`;

const kUnmanagedTimerResult = Symbol('kUnmanagedTimerResult');

class UnmanagedTimer {
  #start;
  #end;
  #count;
  #recommendedCount;

  constructor(recommendedCount) {
    this.#recommendedCount = recommendedCount;
  }

  /**
   * Returns the recommended value to be used to benchmark your code
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
   */
  end(count = 1) {
    this.#end = timer.now();
    this.#count = count;
  }

  [kUnmanagedTimerResult]() {
    if (this.#count === undefined)
      throw new Error('You forgot to call .end()');

    return [Number(this.#end - this.#start), this.#count];
  }
}

const AsyncFunction = async function () { }.constructor;
const SyncFunction = function () { }.constructor;

/**
 * @param {import("./lifecycle.mjs").Benchmark} bench
 * @param {number} recommendedCount
 * @returns {(count: number) => Promise<[durationInNs: number, count: number]> | [durationInNs: number, count: number]}
 */
function createCompiled(bench, recommendedCount) {
  const fnString = bench.fn.toString();

  const hasArg = fnString.indexOf(')') - fnString.indexOf('(') > 1;
  const isAsync = fnString.startsWith('async');
  const awaitOrEmpty = isAsync ? 'await ' : '';

  const selectedTimer = hasArg ? new UnmanagedTimer(recommendedCount) : timer;
  const compiledString = hasArg ? createUnmanagedBenchmark(awaitOrEmpty) : createManagedBenchmark(awaitOrEmpty);
  const createFnPrototype = isAsync ? AsyncFunction : SyncFunction;

  const compiledFn = createFnPrototype('bench', 'timer', 'count', 'kUnmanagedTimerResult', compiledString)
    .bind(globalThis, bench, selectedTimer, recommendedCount, kUnmanagedTimerResult);

  debugBench(`Created compiled benchmark, isAsync=${isAsync}, hasArg=${hasArg}`)

  return compiledFn;
}

/**
 * @param {import("./lifecycle.mjs").Benchmark} bench
 * @param {number} recommendedCount
 * @returns {Promise<[durationInNs: number, count: number]>} The duration to clock this benchmark
 */
async function clockBenchmark(bench, recommendedCount) {
  const compiledFn = createCompiled(bench, recommendedCount);

  const result = await compiledFn();

  debugBench(`Took ${formatDuration(result[0])} to execute ${result[1]} times`);

  return result;
}

module.exports = {
  timer,
  UnmanagedTimer,
  clockBenchmark,
}
