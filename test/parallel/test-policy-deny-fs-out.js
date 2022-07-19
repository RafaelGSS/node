'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');
const fixtures = require('../common/fixtures');

const blockedFolder = fixtures.path('policy', 'deny', 'protected-folder');
const blockedFile = fixtures.path('policy', 'deny', 'protected-file.md');

const regularFolder = fixtures.path('policy', 'deny');
const regularFile = fixtures.path('policy', 'deny', 'regular-file.md');

{
  assert.ok(process.policy.deny('fs.out', blockedFolder));
  assert.ok(process.policy.deny('fs.out', blockedFile));
}

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

// fs.createWriteStream
{
  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createWriteStream(blockedFile);
      stream.on('error', reject);
    })
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createReadStream(blockedFolder + 'example');
      stream.on('error', reject);
    })
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.utimesSync
{
  assert.throws(() => {
    fs.utimesSync(blockedFile, new Date(), new Date());
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.utimesSync(blockedFile + 'anyfile', new Date(), new Date());
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.copyFileSync
{
  assert.throws(() => {
    fs.copyFileSync(blockedFile, blockedFolder + 'any-other-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  // TODO(rafaelgss): should it throw when copying (reading) from a
  // blockedFile (out) to a regular folder?
  assert.throws(() => {
    fs.copyFileSync(blockedFile, regularFolder + 'any-other-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.copyFileSync(regularFile, blockedFolder + 'any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.cpSync
{
  assert.throws(() => {
    fs.cpSync(blockedFile, blockedFolder + 'any-other-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  // TODO(rafaelgss): should it throw when copying (reading) from a
  // blockedFile (out) to a regular folder?
  assert.throws(() => {
    fs.cpSync(blockedFile, regularFolder + 'any-other-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.cpSync(regularFile, blockedFolder + 'any-file');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.mkdir
{
  assert.throws(() => {
    fs.mkdir(blockedFolder + 'any-folder', (err) => {
      if (err) throw err;
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
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.rename(blockedFile, regularFolder + 'renamed', (err) => {
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  assert.throws(() => {
    fs.rename(regularFile, blockedFolder + 'renamed', (err) => {
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

// fs.rmdir
{
  assert.throws(() => {
    fs.rmdir(blockedFolder, (err) => {
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  // TODO(rafaelgss): the user should be capable to rmdir of a non-protected
  // folder but that contains a protected file?
  // regularFolder contains a protected file
  assert.throws(() => {
    fs.rmdir(regularFolder, (err) => {
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}

{
  assert.throws(() => {
    fs.rm(blockedFolder, (err) => {
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));

  // regularFolder contains a protected file
  assert.throws(() => {
    fs.rm(regularFolder, (err) => {
      if (err) throw err;
    });
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemOut',
  }));
}
