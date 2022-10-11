#ifndef SRC_PERMISSIONS_WORKER_PERMISSION_H_
#define SRC_PERMISSIONS_WORKER_PERMISSION_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include <vector>
#include "permission/permission_node.h"

namespace node {

namespace permission {

class WorkerPermission final : public PermissionNode {
 public:
  void Apply(const std::string& deny) override;
  bool Deny(PermissionScope scope, const std::vector<std::string>& params) override;
  bool is_granted(PermissionScope perm, const std::string& param) override;

  bool deny_all;
};

}  // namespace permission

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_PERMISSIONS_WORKER_PERMISSION_H_
