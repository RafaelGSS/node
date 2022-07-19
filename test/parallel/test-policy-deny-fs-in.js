// Flags: --policy-deny-fs=in:.gitignore:/tmp/
'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');

const assert = require('assert');
const fs = require('fs')

const blockedFile = '.gitignore';
const blockedFolder = '/tmp/';
const regularFile = __filename;

// fs.readFileSync
{
  assert.throws(() => {
    fs.readFileSync(blockedFile);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.readFileSync(blockedFolder + 'anyfile');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.readFileSync(regularFile);
  });
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

  assert.doesNotThrow(() => {
    fs.readFile(regularFile, () => {});
  });
}

// fs.createReadStream
{
  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createReadStream(blockedFile);
      stream.on('error', reject)
    })
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.rejects(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createReadStream(blockedFile);
      stream.on('error', reject)
    })
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotReject(() => {
    return new Promise((_resolve, reject) => {
      const stream = fs.createReadStream(regularFile);
      stream.on('error', reject)
    })
  });
}

// fs.statSync
{
  assert.throws(() => {
    fs.statSync(blockedFile);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.statSync(blockedFolder + 'anyfile');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.statSync(regularFile);
  });
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

  assert.doesNotThrow(() => {
    fs.stat(regularFile, () => {});
  });
}

// fs.accessSync
{
  assert.throws(() => {
    fs.accessSync(blockedFile, fs.constants.R_OK);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.accessSync(blockedFolder + 'anyfile', fs.constants.R_OK);
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.accessSync(regularFile, fs.constants.R_OK);
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

  assert.doesNotThrow(() => {
    fs.access(regularFile, fs.constants.R_OK, () => {});
  });
}

// fs.chmodSync (should not bypass)
{
  assert.throws(() => {
    // this operation will work fine
    fs.chmodSync(blockedFile, 0o400);
    fs.readFileSync(blockedFile)
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

// fs.chownSync (should not bypass)
{
  assert.throws(() => {
    // this operation will work fine
    fs.chownSync(blockedFile, process.getuid(), process.getgid());
    fs.readFileSync(blockedFile)
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));
}

// TODO(rafaelgss): mention possible workarounds (spawn('cp blockedFile regularFile'))
// copyFile (handle security concerns)
// cp (handle security concerns)

// fs.openSync
{
  assert.throws(() => {
    fs.openSync(blockedFile, 'r');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.throws(() => {
    fs.openSync(blockedFolder + 'anyfile', 'r');
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.openSync(regularFile, 'r');
  });
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

  assert.doesNotThrow(() => {
    fs.open(regularFile, 'r', () => {});
  });
}

// fs.opendir (TODO)
{
  assert.throws(() => {
    fs.opendir(blockedFolder, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.opendir(__dirname, () => {});
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

  assert.doesNotThrow(() => {
    fs.readdir(__dirname, () => {});
  });
}

// fs.watch (TODO)
{
  assert.throws(() => {
    fs.watch(blockedFile, () => {});
  }, common.expectsError({
    code: 'ERR_ACCESS_DENIED',
    permission: 'FileSystemIn',
  }));

  assert.doesNotThrow(() => {
    fs.readdir(__dirname, () => {});
  });
}
