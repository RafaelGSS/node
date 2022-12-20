// Flags: --experimental-permission --allow-fs=read,write
'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');
const fixtures = require('../common/fixtures');
const path = require('path');
const tmpdir = require('../common/tmpdir');
tmpdir.refresh();

const blockedFile = fixtures.path('permission', 'deny', 'protected-file.md');
const blockedFolder = tmpdir.path + '/';
const regularFile = __filename;
const symlinkFromBlockedFile = 'example-symlink.md';

{
  // Symlink previously created
  fs.symlinkSync(blockedFile, symlinkFromBlockedFile);
  assert.ok(process.permission.deny('fs.read', [blockedFile, blockedFolder]));
  assert.ok(process.permission.deny('fs.write', [blockedFile, blockedFolder]));
}

{
  // Previously created symlink are NOT affected by the permission model
  fs.readlink(symlinkFromBlockedFile, (err) => {
    assert.ifError(err);
  });
  // cleanup
  fs.unlink(symlinkFromBlockedFile, (err) => {
    assert.ifError(
      err,
      `Error while removing the symlink: ${symlinkFromBlockedFile}.
      You may need to remove it manually to re-run the tests`
    );
  });
}

{
  // App doesn’t have access to the BLOCKFOLDER
  assert.throws(() => {
    fs.opendir(blockedFolder, (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemRead',
  }));
  assert.throws(() => {
    fs.writeFile(blockedFolder + '/new-file', 'data', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
  }));

  // App doesn’t have access to the BLOCKEDFILE folder
  assert.throws(() => {
    fs.readFile(blockedFile, (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemRead',
  }));
  assert.throws(() => {
    fs.appendFile(blockedFile, 'data', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
  }));

  // App won't be able to symlink REGULARFILE to BLOCKFOLDER/asdf
  assert.throws(() => {
    fs.symlink(regularFile, blockedFolder + '/asdf', 'file', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemWrite',
  }));

  // App won't be able to symlink BLOCKEDFILE to REGULARDIR
  assert.throws(() => {
    fs.symlink(blockedFile, path.join(__dirname, '/asdf'), 'file', (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemRead',
  }));
}
