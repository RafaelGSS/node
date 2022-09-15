// Flags: --policy-deny-fs=in:/home/rafaelgss/repos/os/node/
'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');
const fixtures = require('../common/fixtures');

const blockedFile = fixtures.path('policy', 'deny', 'protected-file.md');
const blockedFolder = '/tmp/';
const regularFile = __filename;

{
  assert.ok(process.policy.deny('fs.in', [blockedFile]));
}

// fs.readFile
{
  assert.throws(() => {
    fs.readFile(blockedFile, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.readFile(blockedFolder + 'anyfile', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.readFile(regularFile, () => {});
}

// fs.createReadStream
{
  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createReadStream(blockedFile);
      stream.on('error', reject);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createReadStream(blockedFile);
      stream.on('error', reject);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

// fs.stat
{
  assert.throws(() => {
    fs.stat(blockedFile, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.stat(blockedFolder + 'anyfile', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.stat(regularFile, (err) => {
    assert.ifError(err);
  });
}

// fs.access
{
  assert.throws(() => {
    fs.access(blockedFile, fs.constants.R_OK, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.access(blockedFolder + 'anyfile', fs.constants.R_OK, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.access(regularFile, fs.constants.R_OK, (err) => {
    assert.ifError(err);
  });
}

// fs.chownSync (should not bypass)
{
  assert.throws(() => {
    // This operation will work fine
    fs.chownSync(blockedFile, process.getuid(), process.getgid());
    fs.readFileSync(blockedFile);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

// fs.copyFile
{
  assert.throws(() => {
    fs.copyFile(blockedFile, blockedFolder + 'any-other-file', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.copyFile(blockedFile, `${__dirname}/any-other-file`, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

// fs.cp
{
  assert.throws(() => {
    fs.cpSync(blockedFile, blockedFolder + 'any-other-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.cpSync(blockedFile, `${__dirname}/any-other-file`);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

// fs.open
{
  assert.throws(() => {
    fs.open(blockedFile, 'r', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.open(blockedFolder + 'anyfile', 'r', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.open(regularFile, 'r', (err) => {
    assert.ifError(err);
  });
}

// fs.opendir
{
  assert.throws(() => {
    fs.opendir(blockedFolder, (err) => {
      assert.ifError(err);
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.opendir(__dirname, (err) => {
    assert.ifError(err);
  });
}

// fs.readdir
{
  assert.throws(() => {
    fs.readdir(blockedFolder, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.readdir(__dirname, (err) => {
    assert.ifError(err);
  });
}

// fs.watch
{
  assert.throws(() => {
    fs.watch(blockedFile, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.readdir(__dirname, (err) => {
    assert.ifError(err);
  });
}

// fs.rename
{
  assert.throws(() => {
    fs.rename(blockedFile, 'newfile', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}
