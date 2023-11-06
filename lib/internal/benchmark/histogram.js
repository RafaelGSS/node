const { validateNumber } = require('internal/validators');

const {
  MathMin,
  MathMax,
  MathCeil,
  MathSqrt,
  MathPow,
  MathFloor,
  ArrayPrototypeSort,
  ArrayPrototypePush,
  ArrayPrototypeFilter,
  ArrayPrototypeReduce,
} = primordials;

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
   * @type {boolean}
   * @default false
   */
  #finish = false;

  /**
   * @returns {number[]}
   */
  get samples() {
    return this.#all.length;
  }

  /**
   * @returns {number}
   */
  get min() {
    return this.#min;
  }

  /**
   * @returns {number}
   */
  get max() {
    return this.#max;
  }

  /**
   * @returns {number}
   */
  get mean() {
    return this.#mean;
  }

  /**
   * @returns {number}
   */
  get cv() {
    return this.#cv;
  }

  /**
   * @param {number} value
   */
  record(value) {
    validateNumber(value, 'value', 0);

    ArrayPrototypePush(this.#all, value);
  }

  percentile(percentile) {
    validateNumber(percentile, 'percentile', 0, 100);

    return this.#all[MathCeil(this.#all.length * (percentile / 100)) - 1];
  }

  finish() {
    this.#finish = true;
    this.#removeOutliers();

    this.#calculateMinMax();
    this.#calculateMean();
    this.#calculateCv();
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

  #calculateCv() {
    if (this.#all.length < 2) {
      this.#cv = 0;
      return;
    }

    const avgSquares = ArrayPrototypeReduce(
      this.#all,
      (acc, value) => MathPow(value, 2) + acc, 0
    ) * (1 / this.#all.length);

    const stddev = MathSqrt(this.#all.length / (this.#all.length - 1) * (avgSquares - (this.#mean * this.#mean)));

    this.#cv = stddev / this.#mean;
  }
}

module.exports = {
  StatisticalHistogram,
}
