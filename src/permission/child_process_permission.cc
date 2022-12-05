#include "child_process_permission.h"

#include <iostream>
#include <string>
#include <vector>

namespace node {

namespace permission {

// Currently, ChildProcess manage a single state
// Once denied, it's always denied
void ChildProcessPermission::Apply(const std::string& deny) {}

bool ChildProcessPermission::Deny(PermissionScope perm,
                        const std::vector<std::string>& params) {
  deny_all = true;
  return true;
}

bool ChildProcessPermission::is_granted(PermissionScope perm,
                                        const std::string& param = "") {
  return deny_all == false;
}

}  // namespace permission
}  // namespace node
