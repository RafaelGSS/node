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

```js

```

## `bench(name[, options][, fn])`

<!-- YAML
added: REPLACEME
-->

* `name` {string} The name of the benchmark, which is displayed when reporting benchmark
  results.
* `options` {Object} Configuration options for the benchmark. The following
  properties are supported:
  * `minTime` {number}
    **Default:** `0.05` seconds.
  * `maxTime` {number}
    **Default:** `0.5` seconds.
* `fn` {Function|AsyncFunction}
* Returns: {Promise} Resolved with `undefined` once the benchmark completes.

// TODO
