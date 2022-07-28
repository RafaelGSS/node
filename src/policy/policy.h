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
  if (!env->policy()->is_granted(perm_, resource_)) {               \
    return node::policy::Policy::ThrowAccessDenied((env), perm_);              \
  }

class Policy {
 public:
  Policy() {
    std::shared_ptr<PolicyDeny> deny_fs = std::make_shared<PolicyDenyFs>();
#define V(Name, _, __)                                                         \
  deny_policies.insert(std::make_pair(Permission::k##Name, deny_fs));
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

    static Permission StringToPermission(const std::string& perm);
    static const char* PermissionToString(Permission perm);
    static void ThrowAccessDenied(Environment* env, Permission perm);

    // CLI Call
    v8::Maybe<bool> Apply(const std::string& deny, Permission scope);
    // Policy.Deny API
    bool Deny(Permission scope, const std::vector<std::string>& params);

 private:
    std::map<Permission, std::shared_ptr<PolicyDeny>> deny_policies;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_H_
