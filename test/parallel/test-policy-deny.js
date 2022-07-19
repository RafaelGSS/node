const common = require('../common');
const fs = require('fs');
const fsPromises = require('node:fs/promises');
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

// Guarantee the initial state when no flags
{
  assert.ok(process.policy.check('fs.in'));
  assert.ok(process.policy.check('fs.out'));

  assert.ok(process.policy.check('fs.in', protectedFile));
  assert.ok(process.policy.check('fs.in', regularFile));

  assert.ok(process.policy.check('fs.out', protectedFolder));
  assert.ok(process.policy.check('fs.out', regularFile));

  assert.doesNotReject(() => {
    return fsPromises.readFile(protectedFile);
  });
}

// Deny access to fs.in
{
  assert.ok(process.policy.deny('fs.in', [protectedFile]));
  assert.ok(process.policy.check('fs.in'));
  assert.ok(process.policy.check('fs.out'));

  assert.ok(!process.policy.check('fs.in', protectedFile));
  assert.ok(process.policy.check('fs.in', regularFile));

  assert.ok(process.policy.check('fs.out', protectedFolder));
  assert.ok(process.policy.check('fs.out', regularFile));

  assert.rejects(() => {
    return fsPromises.readFile(protectedFile);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.open(regularFile, () => {});
  });
}

// Deny access to fs.out
{
  assert.ok(process.policy.deny('fs.out', [protectedFolder]));
  assert.ok(process.policy.check('fs.in'));
  assert.ok(process.policy.check('fs.out'));

  assert.ok(!process.policy.check('fs.in', protectedFile));
  assert.ok(process.policy.check('fs.in', regularFile));

  assert.ok(!process.policy.check('fs.out', protectedFolder));
  assert.ok(!process.policy.check('fs.out', regularFile));

  assert.rejects(() => {
    return fsPromises
      .writeFile(protectedFolder + '/new-file', 'data');
   }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}
