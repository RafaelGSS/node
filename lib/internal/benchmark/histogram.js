const { validateNumber } = require("internal/validators");

const {
  MathMin,
  MathMax,
  MathCeil,
  MathSqrt,
  MathPow,
  MathFloor,
  MathRound,
  ArrayPrototypeSort,
  ArrayPrototypePush,
  ArrayPrototypeFilter,
  ArrayPrototypeReduce,
} = primordials;

const {
  codes: {
    ERR_BENCH_HISTOGRAM_FINISHED,
    ERR_BENCH_HISTOGRAM_NOT_FINISHED,
  },
} = require('internal/errors');

/**
 * Inspired by benchmark.js
 * T-Distribution two-tailed critical values for 95% confidence.
 * For more info see http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm.
 */
const tTable = {
  '1': 12.706, '2': 4.303, '3': 3.182, '4': 2.776, '5': 2.571, '6': 2.447,
  '7': 2.365, '8': 2.306, '9': 2.262, '10': 2.228, '11': 2.201, '12': 2.179,
  '13': 2.16, '14': 2.145, '15': 2.131, '16': 2.12, '17': 2.11, '18': 2.101,
  '19': 2.093, '20': 2.086, '21': 2.08, '22': 2.074, '23': 2.069, '24': 2.064,
  '25': 2.06, '26': 2.056, '27': 2.052, '28': 2.048, '29': 2.045, '30': 2.042,
  'infinity': 1.96
};

class StatisticalHistogram {
  /**
   * @type {number[]}
   * @default []
   */
  #all = [];
  /**
   * @type {number}
   */
  #min = undefined;
  /**
   * @type {number}
   */
  #max = undefined;
  /**
   * @type {number}
   */
  #mean = undefined;
  /**
   * @type {number}
   */
  #cv = undefined;
  /**
   * @type {number}
   */
  #stddev = undefined;
  /**
   * @type {number}
   */
  #rme = undefined;
  /**
   * @type {boolean}
   * @default false
   */
  #finish = false;

  /**
   * @returns {number[]}
   */
  get samples() {
    if (!this.#finish)
      throw new ERR_BENCH_HISTOGRAM_NOT_FINISHED();

    return this.#all.length;
  }

  /**
   * @returns {number}
   */
  get min() {
    if (!this.#finish)
      throw new ERR_BENCH_HISTOGRAM_NOT_FINISHED();

    return this.#min;
  }

  /**
   * @returns {number}
   */
  get max() {
    if (!this.#finish)
      throw new ERR_BENCH_HISTOGRAM_NOT_FINISHED();

    return this.#max;
  }

  /**
   * @returns {number}
   */
  get mean() {
    if (!this.#finish)
      throw new ERR_BENCH_HISTOGRAM_NOT_FINISHED();

    return this.#mean;
  }

  /**
   * @returns {number}
   */
  get error() {
    if (!this.#finish)
      throw new ERR_BENCH_HISTOGRAM_NOT_FINISHED();

    return this.#rme;
  }

  /**
   * @param {number} value
   */
  record(value) {
    validateNumber(value, 'value', 0);

    if (this.#finish)
      throw new ERR_BENCH_HISTOGRAM_FINISHED();

    ArrayPrototypePush(this.#all, value);
  }

  percentile(percentile) {
    if (!this.#finish)
      throw new ERR_BENCH_HISTOGRAM_NOT_FINISHED();

    validateNumber(percentile, 'percentile', 0, 100);

    return this.#all[MathCeil(this.#all.length * (percentile / 100)) - 1];
  }

  finish() {
    if (this.#finish)
      throw new ERR_BENCH_HISTOGRAM_FINISHED();

    this.#finish = true;
    this.#removeOutliers();

    this.#calculateMinMax();
    this.#calculateMean();
    this.#calculateStddev();
    this.#calculateRme();
  }

  #removeOutliers() {
    ArrayPrototypeSort(this.#all, (a, b) => a - b);

    const size = this.#all.length;

    if (size < 4)
      return;

    let q1, q3;

    if ((size - 1) / 4 % 1 === 0 || size / 4 % 1 === 0) {
      q1 = 1 / 2 * (this.#all[MathFloor(size / 4) - 1] + this.#all[MathFloor(size / 4)]);
      q3 = 1 / 2 * (this.#all[MathCeil(size * 3 / 4) - 1] + this.#all[MathCeil(size * 3 / 4)]);
    } else {
      q1 = this.#all[MathFloor(size / 4)];
      q3 = this.#all[MathFloor(size * 3 / 4)];
    }

    const iqr = (q3 - q1) * 1.5;
    const minValue = q1 - iqr * 1.5;
    const maxValue = q3 + iqr * 1.5;

    this.#all = ArrayPrototypeFilter(
      this.#all,
      (value) => (value <= maxValue) && (value >= minValue),
    );
  }

  #calculateMinMax() {
    this.#min = Infinity;
    this.#max = -Infinity;

    for (let i = 0; i < this.#all.length; i++) {
      this.#min = MathMin(this.#all[i], this.#min);
      this.#max = MathMax(this.#all[i], this.#max);
    }
  }

  #calculateMean() {
    if (this.#all.length === 0) {
      return 0;
    }

    if (this.#all.length === 1) {
      return this.#all[0];
    }

    this.#mean = ArrayPrototypeReduce(
      this.#all,
      (acc, value) => acc + value,
      0,
    ) / this.#all.length;
  }

  #calculateStddev() {
    const length = this.#all.length;

    if (!length || length === 1) {
      return 0;
    }

    // Inspired by benchmark.js
    // Compute the sample variance (estimate of the population variance).
    const variance = ArrayPrototypeReduce(
      this.#all,
      (acc, value) => acc + MathPow(value - this.#mean, 2),
    ) / (length - 1) || 0;

    // Compute the sample standard deviation (estimate of the population standard deviation).
    this.#stddev = MathSqrt(variance);
  }

  #calculateRme() {
    const length = this.#all.length;

    if (!length || length === 1) {
      return 0;
    }

    // Inspired by benchmark.js
    // Compute the standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean).
    const sem = this.#stddev / MathSqrt(length);
    // Compute the degrees of freedom.
    const df = length - 1;
    // Compute the critical value.
    const critical = tTable[MathRound(df) || 1] || tTable.infinity;
    // Compute the margin of error.
    const moe = sem * critical;
    // Compute the relative margin of error.
    const rme = (moe / this.#mean) * 100 || 0;

    this.#rme = rme;
  }
}

module.exports = {
  StatisticalHistogram,
}
