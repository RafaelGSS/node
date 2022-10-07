#include "permissions/worker_permission.h"

#include <iostream>
#include <string>
#include <vector>

namespace node {

namespace permission {

// Currently, PolicyDenyWorker manage a single state
// Once denied, it's always denied
void WorkerPermission::Apply(const std::string& deny) {}

bool WorkerPermission::Deny(Permission perm,
                            const std::vector<std::string>& params) {
  deny_all = true;
  return true;
}

bool WorkerPermission::is_granted(Permission perm,
                                  const std::string& param = "") {
  return deny_all == false;
}

}  // namespace permission
}  // namespace node
