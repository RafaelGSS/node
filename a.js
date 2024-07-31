const fs = require('node:fs')
const Mod = require('module');

const dir = fs.readdirSync('./lib')

const allModuleExports = {}

function getCallSite() {
  const originalStackFormatter = Error.prepareStackTrace;
  Error.prepareStackTrace = (err, stack) => `${stack[0].getFileName()}`;
  const err = new Error();
  // With the V8 Error API, the stack is not formatted until it is accessed
  err.stack;
  Error.prepareStackTrace = originalStackFormatter;
  return err.stack;
}

function fetchModules (allModuleExports) {
  for (const f of dir) {
    if (f.endsWith('.js') && !f.startsWith('_')) {
      const moduleName = `node:${f.slice(0, f.length - 3)}`
      const exports = require(moduleName);
      allModuleExports[moduleName] = Object.assign({}, exports);
      for (const fnKey of Object.keys(exports)) {
        if (typeof exports[fnKey] === 'function' && !fnKey.startsWith('_')) {
          const originalFn = exports[fnKey];
          allModuleExports[moduleName][fnKey] = function () {
            const callerStr = getCallSite();
            if (callerStr.includes('/home/rafaelgss/repos/os/node/benchmark')) {
              if (!this[fnKey]._called) this[fnKey]._called = 0;
              this[fnKey]._called++;

              if (!this[fnKey]._calls) this[fnKey]._calls = [];
              this[fnKey]._calls.push(callerStr);
            }
            return originalFn.apply(exports, arguments);
          }
        }
      }
    }
  }
}

fetchModules(allModuleExports);

const req = Mod.prototype.require;
// const req = Mod.prototype.require;
Mod.prototype.require = function (id) {
  // console.log('id', id)
  if (!id.startsWith('node:')) {
    const data = allModuleExports[`node:${id}`]
    if (!data) {
      return req.apply(this, arguments)
    }
    return data;
  }
  return allModuleExports[id];
};

process.on('beforeExit', () => {
  for (const module of Object.keys(allModuleExports)) {
    for (const fn of Object.keys(module)) {
      if (fn._called) {
        console.log(fn.toString(), 'has been called', fn._called);
        console.log(fn._calls)
      }
    }
  }
})
