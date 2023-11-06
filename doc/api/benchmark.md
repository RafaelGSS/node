# Benchmark

<!--introduced_in=REPLACEME-->

> Stability: 1.1 - Active Development

<!-- source_link=lib/benchmark.js -->

The `node:benchmark` module gives the ability to measure
performance of JavaScript code. To access it:

```mjs
import benchmark from 'node:benchmark';
```

```cjs
const benchmark = require('node:benchmark');
```

This module is only available under the `node:` scheme. The following will not
work:

```mjs
import benchmark from 'benchmark';
```

```cjs
const benchmark = require('benchmark');
```

The following example illustrates how benchmarks are written using the
`benchmark` module.

```mjs
import { bench } from 'node:benchmark';

bench('Using delete to remove property from object', function () {
  const data = { x: 1, y: 2, z: 3 }
  delete data.y

  data.x
  data.y
  data.z
});
```

## `bench(name[, options][, fn])`

<!-- YAML
added: REPLACEME
-->

* `name` {string} The name of the benchmark, which is displayed when reporting benchmark
  results.
* `options` {Object} Configuration options for the benchmark. The following
  properties are supported:
  * `minTime` {number} The minimum time a benchmark can run.
    **Default:** `0.05` seconds.
  * `maxTime` {number} The maximum time a benchmark can run.
    **Default:** `0.5` seconds.
  * `reporter` {Function} Callback function with results to be called after
    benchmark is concluded. The callback function should receive two arguments:
    `bench` - A {Benchmark} object and
    `result` - A object containing three properties:
    `opsSec` {String}, `iterations {Number}`, `histogram` {Histogram} instance.
* `fn` {Function|AsyncFunction}
* Returns: {Promise} Resolved with `undefined` once the benchmark completes.

The bench function is used for benchmarking purposes.
It measures the performance of a given function or async function and reports the results with the specified name.
If no `reporter` is provided, it will print to the console.

```console
$ node my-benchmark.js
(node:14165) ExperimentalWarning: The benchmark module is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
Using delete property x 5,853,505 ops/sec ± 0.01% (10 runs sampled)     min..max=(169ns ... 171ns) p75=170ns p99=171ns%
```

### Using custom reporter

```js
const { bench } = require('node:benchmark');

function reporter (bench, result) {
  console.log(`Benchmark: ${bench.name} - ${result.opsSec} ops/sec`);
}

bench('Using delete to remove property from object', { reporter }, () => {
  const data = { x: 1, y: 2, z: 3 }
  delete data.y

  data.x
  data.y
  data.z
});
```

```console
$ node my-benchmark.js
Benchmark: Using delete to remove property from object - 6032212 ops/sec
```
