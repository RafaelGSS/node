'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const { spawnSync } = require('child_process');
const assert = require('assert');

const warnFlags = [
  '--allow-child-process',
  '--allow-worker',
];

for (const flag of warnFlags) {
  const { status, stderr } = spawnSync(
    process.execPath,
    [
      '--experimental-permission', flag, '-e',
      'setTimeout(() => {}, 1)',
    ]
  );

  const flagWarn = stderr.toString().split('\n')[2];
  assert.match(flagWarn, new RegExp(`SecurityWarning: The flag ${flag} must be used with extreme caution`));
  assert.strictEqual(status, 0);
}
