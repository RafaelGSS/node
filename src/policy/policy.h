#ifndef SRC_POLICY_POLICY_H_
#define SRC_POLICY_POLICY_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "node_options.h"
#include "v8.h"
#include "policy/policy_deny.h"
#include "policy/policy_deny_fs.h"

#include <map>
#include <iostream>

namespace node {

class Environment;

namespace policy {

#define THROW_IF_INSUFFICIENT_PERMISSIONS(env, perm_, resource_, ...)          \
  if (!node::policy::root_policy.is_granted(perm_, resource_)) {               \
    return node::policy::Policy::ThrowAccessDenied((env), perm_);                     \
  }

class Policy {
 public:
  // TODO(rafaelgss): release pointers
  Policy() {
    auto denyFs = new PolicyDenyFs();
#define V(Name, _, __) \
      deny_policies.insert(std::make_pair(Permission::k##Name, denyFs));
      FILESYSTEM_PERMISSIONS(V)
#undef V
  }

    inline bool is_granted(const Permission permission, const char* res) {
      auto policy = deny_policies.find(permission);
      if (policy != deny_policies.end()) {
        return policy->second->is_granted(permission, res);
      }
      return false;
    }

    inline bool is_granted(const Permission permission, std::string res) {
      return is_granted(permission, res.c_str());
    }

    static Permission StringToPermission(std::string perm);
    static const char* PermissionToString(Permission perm);
    static void ThrowAccessDenied(Environment* env, Permission perm);

    // CLI Call
    v8::Maybe<bool> Apply(const std::string& deny, Permission scope);
    // Policy.Deny API
    bool Deny(Permission scope, std::vector<std::string> params);

 private:
    std::map<Permission, PolicyDeny*> deny_policies;
};

extern policy::Policy root_policy;
}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_H_
