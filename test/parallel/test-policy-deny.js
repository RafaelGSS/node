// Flags: --policy-deny-fs=in:../fixtures/policy/deny/protected-file.md,out:../fixtures/policy/deny/
const common = require('../common');
const fs = require('fs');
const assert = require('assert');
const fixtures = require('../common/fixtures');


const protectedFolder = fixtures.path('policy', 'deny');
const protectedFile = fixtures.path('policy', 'deny', 'protected-file.md');
const regularFile = fixtures.path('policy', 'deny', 'regular-file.md');

// assert check and deny exists
{
  assert.ok(typeof process.policy.check === 'function');
  assert.ok(typeof process.policy.deny === 'function');
}

// Guarantee the input file is unreachable
{
  assert.ok(process.policy.check('fs.in'));
  assert.ok(process.policy.check('fs.out'));

  assert.ok(!process.policy.check('fs.in', protectedFile));
  assert.ok(!process.policy.check('fs.in', regularFile));

  assert.ok(!process.policy.check('fs.out', protectedFolder));
  assert.ok(process.policy.check('fs.out', regularFile));

  assert.throws(() => {
    fs.readFile(blockedFile, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

