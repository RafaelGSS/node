'use strict';

const {
  ObjectFreeze,
  ArrayPrototypePush,
} = primordials;

const permission = internalBinding('permission');
const { validateString, validateArray } = require('internal/validators');
const path = require('path');

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
    validateString(scope, 'scope');
    if (references == null) {
      return permission.deny(scope, references);
    }

    validateArray(references, 'references');
    // TODO(rafaelgss): change to call fs_permission.resolve when available
    const normalizedParams = [];
    for (let i = 0; i < references.length; ++i) {
      if (path.isAbsolute(references[i])) {
        ArrayPrototypePush(normalizedParams, references[i]);
      } else {
        ArrayPrototypePush(normalizedParams, path.resolve(references[i]));
      }
    }

    return permission.deny(scope, normalizedParams);
  },

  check(scope, reference) {
    validateString(scope, 'scope');
    if (reference != null) {
      validateString(reference, 'reference');
      if (!path.isAbsolute(reference)) {
        return permission.check(scope, path.resolve(reference));
      }
    }

    return permission.check(scope, reference);
  }
});
