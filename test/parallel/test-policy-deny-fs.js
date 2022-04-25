'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const fixtures = require('../common/fixtures');

const { spawnSync } = require('child_process');
const assert = require('assert')

const dep = fixtures.path('policy', 'deny', 'fs', 'read-file.js');
// policy.check
{
  const { status, stderr } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs', dep
    ]
  );

  assert.strictEqual(status, 1);
  assert(
    stderr.toString()
    .includes('Error: Access to this API has been restricted')
  );
}

{
  const { status, stderr } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs.in', dep
    ]
  );

  assert.strictEqual(status, 1);
  assert(
    stderr.toString()
    .includes('Error: Access to this API has been restricted')
  );
}

{
  const { status, stderr } = spawnSync(
    process.execPath,
    [
      '--policy-deny', 'fs.out', dep
    ]
  );

  assert.strictEqual(status, 0);
}
