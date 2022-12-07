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
  deny(perm, params) {
    if (typeof perm !== 'string')
      throw new ERR_INVALID_ARG_TYPE('permission', 'string', perm);
    if (params && !ArrayIsArray(params))
      throw new ERR_INVALID_ARG_TYPE('permission', 'array', params);

    if (!params) {
      return permission.deny(perm, params);
    }
    // TODO(rafaelgss): change to call fs_permission.resolve when available
    const normalizedParams = [];
    for (let i = 0; i < params.length; ++i) {
      if (path.isAbsolute(params[i])) {
        normalizedParams.push(params[i]);
      } else {
        normalizedParams.push(path.resolve(params[i]));
      }
    }

    return permission.deny(perm, normalizedParams);
  },

  check(perm, param) {
    if (typeof perm !== 'string')
      throw new ERR_INVALID_ARG_TYPE('permission', 'string', perm);

    if (!param || path.isAbsolute(param)) {
      return permission.check(perm, param);
    }
    return permission.check(perm, path.resolve(param));
  }
});
