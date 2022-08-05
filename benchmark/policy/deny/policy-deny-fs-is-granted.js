'use strict';
const common = require('../../common.js');
const fs = require('fs/promises');
const path = require('path');

const configs = {
  n: [1e5]
};

const options = {};

const bench = common.createBenchmark(main, configs, options);

const recursivelyDenyFiles = async (dir) => {
  const files = await fs.readdir(dir, { withFileTypes: true });
  for (const file of files) {
    if (file.isDirectory()) {
      await recursivelyDenyFiles(path.join(dir, file.name));
    } else if (file.isFile()) {
      process.policy.deny('fs.in', [path.join(dir, file.name)]);
    }
  }
};

async function main(conf) {
  const benchmarkDir = path.join(__dirname, '../..');
  // Get all the benchmark files and deny access to it
  await recursivelyDenyFiles(benchmarkDir);

  bench.start();

  for (let i = 0; i < conf.n; i++) {
    // Valid file in a sequence of denied files
    process.policy.check('fs.in', benchmarkDir + '/valid-file');
    // Denied file
    process.policy.check('fs.in', __filename);
    // Valid file a granted directory
    process.policy.check('fs.in', '/tmp/example');
  }

  bench.end(conf.n);
}
