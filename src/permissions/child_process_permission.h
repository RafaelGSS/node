#ifndef SRC_POLICY_POLICY_DENY_CHILD_PROCESS_H_
#define SRC_POLICY_POLICY_DENY_CHILD_PROCESS_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "permissions/permission.h"
#include <vector>

namespace node {

namespace permission {

class ChildProcessPermission final : public PermissionNode {
 public:
  void Apply(const std::string& deny) override;
  bool Deny(Permission scope, const std::vector<std::string>& params) override;
  bool is_granted(Permission perm, const std::string& param) override;

  bool deny_all;
};

}  // namespace permission

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_DENY_CHILD_PROCESS_H_
