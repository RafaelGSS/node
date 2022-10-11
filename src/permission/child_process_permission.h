#ifndef SRC_PERMISSIONS_CHILD_PROCESS_PERMISSION_H
#define SRC_PERMISSIONS_CHILD_PROCESS_PERMISSION_H

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "permission/permission_node.h"
#include <vector>

namespace node {

namespace permission {

class ChildProcessPermission final : public PermissionNode {
 public:
  void Apply(const std::string& deny) override;
  bool Deny(PermissionScope scope, const std::vector<std::string>& params) override;
  bool is_granted(PermissionScope perm, const std::string& param) override;

  bool deny_all;
};

}  // namespace permission

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_PERMISSIONS_CHILD_PROCESS_PERMISSION_H
