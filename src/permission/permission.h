#ifndef SRC_PERMISSION_PERMISSION_H_
#define SRC_PERMISSION_PERMISSION_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "node_options.h"
#include "permission/permission_node.h"
#include "permission/child_process_permission.h"
#include "permission/fs_permission.h"
#include "permission/worker_permission.h"
#include "v8.h"

#include <map>
#include <iostream>

namespace node {

class Environment;

namespace permission {

#define THROW_IF_INSUFFICIENT_PERMISSIONS(env, perm_, resource_, ...)          \
  do {                                                                         \
    if (UNLIKELY(!(env)->permission()->is_granted(perm_, resource_))) {        \
      node::permission::Permission::ThrowAccessDenied((env), perm_);           \
      return __VA_ARGS__;                                                      \
    }                                                                          \
  } while (0)

class Permission {
 public:
  Permission(): enabled_(false) {
    std::shared_ptr<PermissionNode> fs = std::make_shared<FSPermission>();
    std::shared_ptr<PermissionNode> child_p =
        std::make_shared<ChildProcessPermission>();
    std::shared_ptr<PermissionNode> worker_t =
        std::make_shared<WorkerPermission>();
#define V(Name, _, __)                                                         \
  nodes_.insert(std::make_pair(PermissionScope::k##Name, fs));
    FILESYSTEM_PERMISSIONS(V)
#undef V
#define V(Name, _, __)                                                         \
  nodes_.insert(std::make_pair(PermissionScope::k##Name, child_p));
    CHILD_PROCESS_PERMISSIONS(V)
#undef V
#define V(Name, _, __)                                                         \
  nodes_.insert(std::make_pair(PermissionScope::k##Name, worker_t));
    WORKER_THREADS_PERMISSIONS(V)
#undef V
  }

    inline bool is_granted(const PermissionScope permission, const char* res) {
      if (!enabled_) return true;
      auto perm_node = nodes_.find(permission);
      if (perm_node != nodes_.end()) {
        return perm_node->second->is_granted(permission, res);
      }
      return false;
    }

    inline bool is_granted(const PermissionScope permission,
        const std::string& res = "") {
      return is_granted(permission, res.c_str());
    }

    static PermissionScope StringToPermission(const std::string& perm);
    static const char* PermissionToString(PermissionScope perm);
    static void ThrowAccessDenied(Environment* env, PermissionScope perm);

    // CLI Call
    void Apply(const std::string& deny, PermissionScope scope);
    // Permission.Deny API
    bool Deny(PermissionScope scope, const std::vector<std::string>& params);
    void EnablePermissions();

 private:
    std::map<PermissionScope, std::shared_ptr<PermissionNode>> nodes_;
    bool enabled_;
};

}  // namespace permission

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_PERMISSION_PERMISSION_H_
