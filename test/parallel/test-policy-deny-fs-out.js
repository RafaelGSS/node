// Flags: --policy-deny-fs=out:.gitignore:/tmp/
'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');

const blockedFile = '.gitignore';
const blockedFolder = '/tmp/';

// fs.writeFileSync
{
  assert.throws(() => {
    fs.writeFileSync(blockedFile, 'example');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.writeFileSync(blockedFolder + 'anyfile', 'example');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.writeFile
{
  assert.throws(() => {
    fs.writeFile(blockedFile, 'example', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.writeFile(blockedFolder + 'anyfile', 'example', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.writeSync
{
  assert.throws(() => {
    fs.writeSync(fs.openSync(blockedFile, 'w'), 'example')
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.writeSync(fs.openSync(blockedFolder + 'anyfile', 'w'), 'example');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// createWriteStream
// utimes
// copyFile
// cp
// mkdir
// mkdtemp
// rename
// rmdir
// rm
