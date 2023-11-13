'use strict';

require('../../common');
const assert = require('assert');
const { Suite } = require('node:benchmark');
const { setTimeout } = require('timers/promises');

(async () => {
  {
    const suite = new Suite('my bench');
    const results = await suite.run();

    assert.ok(Array.isArray(results));
    assert.equal(results.length, 0);
  }

  {
    const suite = new Suite('sample bench');

    suite.add('wait 50ms', async () => {
      await setTimeout(10);
    });

    const results = await suite.run();

    assert.ok(Array.isArray(results));
    assert.equal(results.length, 1);

    const firstResult = results[0];

    assert.equal(typeof firstResult.opsSec, 'number');
    assert.equal(typeof firstResult.iterations, 'number');
    assert.equal(typeof firstResult.histogram, 'object');
    assert.equal(typeof firstResult.histogram.cv, 'number');
    assert.equal(typeof firstResult.histogram.min, 'number');
    assert.equal(typeof firstResult.histogram.max, 'number');
    assert.equal(typeof firstResult.histogram.mean, 'number');
    assert.equal(typeof firstResult.histogram.percentile, 'function');
    assert.equal(typeof firstResult.histogram.percentile(0.1), 'number');
    assert.equal(firstResult.histogram.percentile(0.1), firstResult.histogram.samples[0]);
    assert.equal(firstResult.histogram.percentile(100), firstResult.histogram.samples[firstResult.histogram.samples.length]);
    assert.ok(Array.isArray(firstResult.histogram.samples));
    // TODO: can be flacky?
    assert.ok(firstResult.histogram.samples.length, 5);
    assert.ok(firstResult.opsSec >= 95 && firstResult.opsSec <= 105);
  }

  {
    const suite = new Suite('async and sync bench');

    suite.add('async empty', async () => { });
    suite.add('sync empty', () => { });

    const results = await suite.run();

    assert.equal(results.length, 2);
  }

  {
    // TODO: Test reporter
  }
})();
