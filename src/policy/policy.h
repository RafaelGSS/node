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

#define THROW_IF_INSUFFICIENT_PERMISSIONS(env, perm_, ...)                     \
    if (!node::policy::root_policy.is_granted(perm_)) {                                      \
      node::policy::Policy::ThrowAccessDenied((env), perm_);                                  \
    }

class Policy {
  public:
    Policy() {
      deny_policies.insert(std::make_pair(Permission::kFileSystem, new PolicyDenyFs()));
    }
    // TODO: release pointers

    inline bool is_granted(const Permission permission) {
      Permission perm = Policy::PermissionParent(permission);
      auto policy = deny_policies.find(perm);
      if (policy != deny_policies.end()) {
        return policy->second->is_granted(permission);
      }
      return false;
    }

    static const char* PermissionToString(Permission perm);
    static void ThrowAccessDenied(Environment* env, Permission perm);
    static Permission PermissionParent(Permission permission);

    v8::Maybe<bool> Apply(const std::string& deny, Permission scope);
  private:
    std::map<Permission, PolicyDeny*> deny_policies;
};

extern policy::Policy root_policy;
}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_H_
