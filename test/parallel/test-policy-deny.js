'use strict';

const common = require('../common');
const fs = require('fs');
const fsPromises = require('node:fs/promises');
const assert = require('assert');
const fixtures = require('../common/fixtures');


const protectedFolder = fixtures.path('policy', 'deny');
const protectedFile = fixtures.path('policy', 'deny', 'protected-file.md');
const regularFile = fixtures.path('policy', 'deny', 'regular-file.md');

// Assert check and deny exists
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

  // doesNotThrow
  fs.readFileSync(protectedFile);
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

  // doesNotThrow
  fs.openSync(regularFile, 'w');
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

  assert.throws(() => {
    fs.openSync(regularFile, 'w');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}
