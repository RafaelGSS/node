#ifndef SRC_POLICY_POLICY_H_
#define SRC_POLICY_POLICY_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "node_options.h"
#include "permissions/permission.h"
#include "permissions/child_process_permission.h"
#include "permissions/fs_permission.h"
#include "permissions/worker_permission.h"
#include "v8.h"

#include <map>
#include <iostream>

namespace node {

class Environment;

namespace permission {

#define THROW_IF_INSUFFICIENT_PERMISSIONS(env, perm_, resource_, ...)          \
  do {                                                                         \
    if (UNLIKELY(!(env)->permission()->is_granted(perm_, resource_))) {            \
      node::permission::PermissionHandler::ThrowAccessDenied((env), perm_);                   \
      return __VA_ARGS__;                                                      \
    }                                                                          \
  } while (0)

class PermissionHandler {
 public:
  PermissionHandler(): enabled_(false) {
    std::shared_ptr<PermissionNode> fs = std::make_shared<FSPermission>();
    std::shared_ptr<PermissionNode> child_p = std::make_shared<ChildProcessPermission>();
    std::shared_ptr<PermissionNode> worker_t = std::make_shared<WorkerPermission>();
#define V(Name, _, __)                                                         \
  perm.insert(std::make_pair(Permission::k##Name, fs));
    FILESYSTEM_PERMISSIONS(V)
#undef V
#define V(Name, _, __)                                                         \
  perm.insert(std::make_pair(Permission::k##Name, child_p));
    CHILD_PROCESS_PERMISSIONS(V)
#undef V
#define V(Name, _, __)                                                         \
  perm.insert(std::make_pair(Permission::k##Name, worker_t));
    WORKER_THREADS_PERMISSIONS(V)
#undef V
  }

    inline bool is_granted(const Permission permission, const char* res) {
      std::cout << "Checking... " << PermissionToString(permission) << " " << res << std::endl;
      if (!enabled_) return true;
      auto policy = perm.find(permission);
      if (policy != perm.end()) {
        auto ret = policy->second->is_granted(permission, res);
        std::cout << " R: " << ret << std::endl;
        return ret;
      }
      return false;
    }

    inline bool is_granted(const Permission permission,
        const std::string& res = "") {
      return is_granted(permission, res.c_str());
    }

    static Permission StringToPermission(const std::string& perm);
    static const char* PermissionToString(Permission perm);
    static void ThrowAccessDenied(Environment* env, Permission perm);

    // CLI Call
    void Apply(const std::string& deny, Permission scope);
    // Policy.Deny API
    bool Deny(Permission scope, const std::vector<std::string>& params);
    void EnablePermissions();

 private:
    std::map<Permission, std::shared_ptr<PermissionNode>> perm;
    bool enabled_;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_H_
