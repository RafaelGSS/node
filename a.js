const fs = require('node:fs')
const path = require('node:path');
const Mod = require('module');

const benchmarkFolder = path.join(__dirname, './benchmark');
const dir = fs.readdirSync('./lib');

const allModuleExports = {};

function getCallSite() {
  const originalStackFormatter = Error.prepareStackTrace;
  Error.prepareStackTrace = (err, stack) => {
    return `${stack[2].getFileName()}:${stack[2].getLineNumber()}`;
  }

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
            if (callerStr.startsWith(benchmarkFolder) &&
              callerStr.replace(benchmarkFolder, '').match(/^\/.+\/.+/)) {
              if (!allModuleExports[moduleName][fnKey]._called) {
                allModuleExports[moduleName][fnKey]._called = 0;
              }
              allModuleExports[moduleName][fnKey]._called++;


              if (!allModuleExports[moduleName][fnKey]._calls) {
                allModuleExports[moduleName][fnKey]._calls = [];
              }
              allModuleExports[moduleName][fnKey]._calls.push(callerStr);
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
  // console.log(allModuleExports['node:assert']['deepEqual'])
  for (const module of Object.keys(allModuleExports)) {
    for (const fn of Object.keys(allModuleExports[module])) {
      if (allModuleExports[module][fn]?._called) {
        const _fn = allModuleExports[module][fn];
        console.log(fn, 'has been called', _fn._called);
        console.log(_fn._calls)
      }
    }
  }
})
