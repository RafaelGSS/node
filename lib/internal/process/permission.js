'use strict';

const {
  ObjectFreeze,
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
    return permission.deny(perm, params);
  },

  check(perm, params) {
    if (typeof perm !== 'string')
      throw new ERR_INVALID_ARG_TYPE('permission', 'string', perm);

    return permission.check(perm, params);
  }
});
