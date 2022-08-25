#include "policy_deny_worker.h"

#include <iostream>
#include <string>
#include <vector>

namespace node {

namespace policy {

// Currently, PolicyDenyWorker manage a single state
// Once denied, it's always denied
void PolicyDenyWorker::Apply(const std::string& deny) {}

bool PolicyDenyWorker::Deny(Permission perm,
                            const std::vector<std::string>& params) {
  deny_all = true;
  return true;
}

bool PolicyDenyWorker::is_granted(Permission perm,
                                  const std::string& param = "") {
  return deny_all == false;
}

}  // namespace policy
}  // namespace node
