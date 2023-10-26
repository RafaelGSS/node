function getMean(sample) {
  return (sample.reduce((a, b) => a + b, 0) / sample.length) || 0;
}

/**
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

/**
 * @param {number[]} list
 * @returns {number}
 */
function getMarginOfError(list) {
  const length = list.length;

  if (!length || length === 1) {
    return 0;
  }

  const mean = getMean(list);
  // from benchmark.js
  // Compute the sample variance (estimate of the population variance).
  const variance = list.reduce((acc, a) => acc + Math.pow(a - mean, 2)) / (length - 1) || 0;
  // Compute the sample standard deviation (estimate of the population standard deviation).
  const stddev = Math.sqrt(variance);
  // Compute the standard error of the mean (a.k.a. the standard deviation of the sampling distribution of the sample mean).
  const sem = stddev / Math.sqrt(length);
  // Compute the degrees of freedom.
  const df = length - 1;
  // Compute the critical value.
  const critical = tTable[Math.round(df) || 1] || tTable.infinity;
  // Compute the margin of error.
  const moe = sem * critical;
  // Compute the relative margin of error.
  const rme = (moe / mean) * 100 || 0;

  return rme;
}

class Histogram {
  #all = [];
  #min = Infinity;
  #max = -Infinity;
  #error = Infinity;
  #finish = false;

  get samples() {
    if (!this.#finish)
      throw new Error('The histogram is not finished.');

    return this.#all.length;
  }

  get min() {
    if (!this.#finish)
      throw new Error('The histogram is not finished.');

    return this.#min;
  }

  get max() {
    if (!this.#finish)
      throw new Error('The histogram is not finished.');

    return this.#max;
  }

  get error() {
    if (!this.#finish)
      throw new Error('The histogram is not finished.');

    return this.#error;
  }

  record(value) {
    if (this.#finish)
      throw new Error('Cannot add more items for a histogram that was finished.')

    this.#all.push(value);

    this.#min = Math.min(value, this.#min);
    this.#max = Math.max(value, this.#max);
  }

  percentile(percentile) {
    if (!this.#finish)
      throw new Error('You need to call .finish first.');

    if (percentile < 0 || percentile > 100)
      throw new Error('Wrong percentile percentage.');

    return this.#all[Math.ceil(this.#all.length * (percentile / 100)) - 1];
  }

  finish() {
    if (this.#finish) {
      return;
    }

    this.#finish = true;
    this.#removeOutliers();
    this.#error = getMarginOfError(this.#all);
  }

  #removeOutliers() {
    this.#all.sort((a, b) => a - b);

    const size = this.#all.length;

    if (size < 4)
      return;

    let q1, q3;

    if ((size - 1) / 4 % 1 === 0 || size / 4 % 1 === 0) {
      q1 = 1 / 2 * (this.#all[Math.floor(size / 4) - 1] + this.#all[Math.floor(size / 4)]);
      q3 = 1 / 2 * (this.#all[Math.ceil(size * 3 / 4) - 1] + this.#all[Math.ceil(size * 3 / 4)]);
    } else {
      q1 = this.#all[Math.floor(size / 4)];
      q3 = this.#all[Math.floor(size * 3 / 4)];
    }

    const iqr = (q3 - q1) * 1.5;
    const minValue = q1 - iqr * 1.5;
    const maxValue = q3 + iqr * 1.5;

    this.#all = this.#all.filter((value) => (value <= maxValue) && (value >= minValue));
  }
}

module.exports = {
  Histogram,
}
