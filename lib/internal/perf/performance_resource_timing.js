// https://github.com/nodejs/undici/issues/952
// https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming

const { InternalPerformanceEntry } = require('internal/perf/performance_entry');
const { SymbolToStringTag } = primordials;

class PerformanceResourceTiming extends InternalPerformanceEntry {
  constructor(name, start, duration, detail) {
    super(name, 'resource', start, duration, detail);
    ObjectDefineProperties(this, {
      name: {
        enumerable: true,
        configurable: true,
        value: 'node'
      },
    });
  }

  get [SymbolToStringTag]() {
    return 'PerformanceResourceTiming';
  }
}

module.exports = {
  PerformanceResourceTiming,
};
