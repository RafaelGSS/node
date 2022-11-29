'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');
const fixtures = require('../common/fixtures');

const blockedFolder = fixtures.path('permission', 'deny', 'protected-folder');
const blockedFile = fixtures.path('permission', 'deny', 'protected-file.md');

const regularFolder = fixtures.path('permission', 'deny');
const regularFile = fixtures.path('permission', 'deny', 'regular-file.md');

{
  assert.ok(process.permission.deny('fs.write', [blockedFolder]));
  assert.ok(process.permission.deny('fs.write', [blockedFile]));
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
    fs.writeFile(blockedFolder + '/anyfile', 'example', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.createWriteStream
{
  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createWriteStream(blockedFile);
      stream.on('error', reject);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createWriteStream(blockedFolder + '/example');
      stream.on('error', reject);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.utimes
{
  assert.throws(() => {
    fs.utimes(blockedFile, new Date(), new Date(), () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.utimes(blockedFolder + '/anyfile', new Date(), new Date(), () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.mkdir
{
  assert.throws(() => {
    fs.mkdir(blockedFolder + '/any-folder', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.rename
{
  assert.throws(() => {
    fs.rename(blockedFile, blockedFile + 'renamed', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.rename(blockedFile, regularFolder + '/renamed', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.rename(regularFile, blockedFolder + '/renamed', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.copyFile
{
  assert.throws(() => {
    fs.copyFileSync(regularFile, blockedFolder + '/any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.cp
{
  assert.throws(() => {
    fs.cpSync(regularFile, blockedFolder + '/any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.rm
{
  assert.throws(() => {
    fs.rmSync(blockedFolder, { recursive: true });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  // The user shouldn't be capable to rmdir of a non-protected folder
  // but that contains a protected file.
  // The regularFolder contains a protected file
  assert.throws(() => {
    fs.rmSync(regularFolder, { recursive: true });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}
