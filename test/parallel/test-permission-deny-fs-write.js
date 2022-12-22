// Flags: --experimental-permission --allow-fs-read=* --allow-fs-write=*
'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fixtures = require('../common/fixtures');

const blockedFolder = fixtures.path('permission', 'deny', 'protected-folder');
const blockedFile = fixtures.path('permission', 'deny', 'protected-file.md');
const relativeProtectedFile = './test/fixtures/permission/deny/protected-file.md';
const relativeProtectedFolder = './test/fixtures/permission/deny/protected-folder';
const absoluteProtectedFile = path.resolve(relativeProtectedFile);
const absoluteProtectedFolder = path.resolve(relativeProtectedFolder);

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
    permission: 'FileSystemWrite',
    resource: blockedFile,
  }));
  assert.throws(() => {
    fs.writeFile(relativeProtectedFile, 'example', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFile,
  }));

  assert.throws(() => {
    fs.writeFile(blockedFolder + '/anyfile', 'example', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/anyfile',
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
    permission: 'FileSystemWrite',
    resource: blockedFile,
  }));
  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createWriteStream(relativeProtectedFile);
      stream.on('error', reject);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFile,
  }));

  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createWriteStream(blockedFolder + '/example');
      stream.on('error', reject);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/example',
  }));
}

// fs.utimes
{
  assert.throws(() => {
    fs.utimes(blockedFile, new Date(), new Date(), () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFile,
  }));
  assert.throws(() => {
    fs.utimes(relativeProtectedFile, new Date(), new Date(), () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFile,
  }));

  assert.throws(() => {
    fs.utimes(blockedFolder + '/anyfile', new Date(), new Date(), () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/anyfile',
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
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/any-folder',
  }));
  assert.throws(() => {
    fs.mkdir(relativeProtectedFolder + '/any-folder', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFolder + '/any-folder',
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
    permission: 'FileSystemWrite',
    resource: blockedFile,
  }));
  assert.throws(() => {
    fs.rename(relativeProtectedFile, relativeProtectedFile + 'renamed', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFile,
  }));
  assert.throws(() => {
    fs.rename(blockedFile, regularFolder + '/renamed', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFile,
  }));

  assert.throws(() => {
    fs.rename(regularFile, blockedFolder + '/renamed', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/renamed',
  }));
}

// fs.copyFile
{
  assert.throws(() => {
    fs.copyFileSync(regularFile, blockedFolder + '/any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/any-file',
  }));
  assert.throws(() => {
    fs.copyFileSync(regularFile, relativeProtectedFolder + '/any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFolder + '/any-file',
  }));
}

// fs.cp
{
  assert.throws(() => {
    fs.cpSync(regularFile, blockedFolder + '/any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/any-file',
  }));
  assert.throws(() => {
    fs.cpSync(regularFile, relativeProtectedFolder + '/any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFolder + '/any-file',
  }));
}

// fs.rm
{
  assert.throws(() => {
    fs.rmSync(blockedFolder, { recursive: true });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFolder + '/protected-file.md',
  }));
  assert.throws(() => {
    fs.rmSync(relativeProtectedFolder, { recursive: true });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: absoluteProtectedFolder + '/protected-file.md',
  }));

  // The user shouldn't be capable to rmdir of a non-protected folder
  // but that contains a protected file.
  // The regularFolder contains a protected file
  assert.throws(() => {
    fs.rmSync(regularFolder, { recursive: true });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
    resource: blockedFile,
  }));
}
