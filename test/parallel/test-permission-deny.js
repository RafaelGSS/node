// Flags: --experimental-permission --allow-fs=read,write
'use strict';

const common = require('../common');

const fs = require('fs');
const fsPromises = require('node:fs/promises');
const assert = require('assert');
const fixtures = require('../common/fixtures');

const protectedFolder = fixtures.path('permission', 'deny');
const protectedFile = fixtures.path('permission', 'deny', 'protected-file.md');
const regularFile = fixtures.path('permission', 'deny', 'regular-file.md');

// Assert check and deny exists
{
  assert.ok(typeof process.permission.check === 'function');
  assert.ok(typeof process.permission.deny === 'function');
}

// Guarantee the initial state when no flags
{
  assert.ok(process.permission.check('fs.read'));
  assert.ok(process.permission.check('fs.write'));

  assert.ok(process.permission.check('fs.read', protectedFile));
  assert.ok(process.permission.check('fs.read', regularFile));

  assert.ok(process.permission.check('fs.write', protectedFolder));
  assert.ok(process.permission.check('fs.write', regularFile));

  // doesNotThrow
  fs.readFileSync(protectedFile);
}

// Deny access to fs.read
{
  assert.ok(process.permission.deny('fs.read', [protectedFile]));
  assert.ok(process.permission.check('fs.read'));
  assert.ok(process.permission.check('fs.write'));

  assert.ok(process.permission.check('fs.read', regularFile));
  assert.ok(!process.permission.check('fs.read', protectedFile));

  assert.ok(process.permission.check('fs.write', protectedFolder));
  assert.ok(process.permission.check('fs.write', regularFile));

  assert.rejects(() => {
    return fsPromises.readFile(protectedFile);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.openSync(regularFile, 'w');
}

// Deny access to fs.write
{
  assert.ok(process.permission.deny('fs.write', [protectedFolder]));
  assert.ok(process.permission.check('fs.read'));
  assert.ok(process.permission.check('fs.write'));

  assert.ok(!process.permission.check('fs.read', protectedFile));
  assert.ok(process.permission.check('fs.read', regularFile));

  assert.ok(!process.permission.check('fs.write', protectedFolder));
  assert.ok(!process.permission.check('fs.write', regularFile));

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

// Should not crash if wrong parameter is provided
{
  // Array is expected as second parameter
  assert.throws(() => {
    process.permission.deny('fs.read', protectedFolder);
  }, common.expectsError({
    code: 'ERR_INVALID_ARG_TYPE',
  }));
}
