'use strict';
const common = require('../../common.js');

const configs = {
  n: [1e5]
};

const options = {};

const bench = common.createBenchmark(main, configs, options);

async function main(conf) {
  bench.start();
  for (let i = 0; i < conf.n; i++) {
    process.policy.deny('fs.in', ['/home/example-file-' + i]);
  }
  bench.end(conf.n);
}
