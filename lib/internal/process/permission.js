'use strict';

const {
  ObjectFreeze,
  ArrayIsArray,
} = primordials;

const permission = internalBinding('permission');

const {
  ERR_INVALID_ARG_TYPE,
} = require('internal/errors').codes;

module.exports = ObjectFreeze({
  __proto__: null,
  deny(perm, params) {
    if (typeof perm !== 'string')
      throw new ERR_INVALID_ARG_TYPE('permission', 'string', perm);
    if (params && !ArrayIsArray(params))
      throw new ERR_INVALID_ARG_TYPE('permission', 'array', params);
    return permission.deny(perm, params);
  },

  check(perm, params) {
    if (typeof perm !== 'string')
      throw new ERR_INVALID_ARG_TYPE('permission', 'string', perm);
    return permission.check(perm, params);
  }
});
