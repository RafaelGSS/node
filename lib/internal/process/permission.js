'use strict';

const {
  ObjectFreeze,
  ArrayIsArray,
} = primordials;

const permission = internalBinding('permission');
const path = require('path');

const {
  ERR_INVALID_ARG_TYPE,
} = require('internal/errors').codes;

let experimentalPermission;

module.exports = ObjectFreeze({
  __proto__: null,
  isEnabled() {
    if (experimentalPermission === undefined) {
      const { getOptionValue } = require('internal/options');
      experimentalPermission = getOptionValue('--experimental-permission');
    }
    return experimentalPermission;
  },
  deny(scope, references) {
    if (typeof scope !== 'string')
      throw new ERR_INVALID_ARG_TYPE('scope', 'string', scope);
    if (references && !ArrayIsArray(references))
      throw new ERR_INVALID_ARG_TYPE('references', 'array', references);

    if (!references) {
      return permission.deny(scope, references);
    }
    // TODO(rafaelgss): change to call fs_permission.resolve when available
    const normalizedParams = [];
    for (let i = 0; i < references.length; ++i) {
      if (path.isAbsolute(references[i])) {
        normalizedParams.push(references[i]);
      } else {
        normalizedParams.push(path.resolve(references[i]));
      }
    }

    return permission.deny(scope, normalizedParams);
  },

  check(scope, reference) {
    if (typeof scope !== 'string')
      throw new ERR_INVALID_ARG_TYPE('scope', 'string', scope);

    if (!reference || path.isAbsolute(reference)) {
      return permission.check(scope, reference);
    }
    return permission.check(scope, path.resolve(reference));
  }
});
