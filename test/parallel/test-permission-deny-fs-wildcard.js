'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs');

{
  assert.ok(process.permission.deny('fs.read', [
    '/tmp/',
    '/example/foo*',
    '/example/bar*',
    '/folder/*',
    '/show',
    '/slower',
    '/slown',
  ]));

  assert.ok(process.permission.check('fs.read', '/slow'))
  assert.ok(process.permission.check('fs.read', '/slows'))
  assert.ok(process.permission.check('fs.read', '/slown'))
}

{
  assert.throws(() => {
    fs.readFile('/tmp/foo/file', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  // doesNotThrow
  fs.readFile('/test.txt', () => {});
  fs.readFile('/tmpd', () => {});
}

{
  assert.throws(() => {
    fs.readFile('/example/foo/file', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  assert.throws(() => {
    fs.readFile('/example/foo2/file', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  assert.throws(() => {
    fs.readFile('/example/foo2', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.readFile('/example/fo/foo2.js', () => {});
  fs.readFile('/example/for', () => {});
}

{
  assert.throws(() => {
    fs.readFile('/example/bar/file', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  assert.throws(() => {
    fs.readFile('/example/bar2/file', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  assert.throws(() => {
    fs.readFile('/example/bar', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  // doesNotThrow
  fs.readFile('/example/ba/foo2.js', () => {});
}

{
  assert.throws(() => {
    fs.readFile('/folder/a/subfolder/b', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  assert.throws(() => {
    fs.readFile('/folder/a/subfolder/b/c.txt', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
  assert.throws(() => {
    fs.readFile('/folder/a/foo2.js', () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}
