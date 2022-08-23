#include "policy_deny_child_process.h"

#include <iostream>
#include <string>
#include <vector>

namespace node {

namespace policy {

// Currently, PolicyDenyChildProcess manage a single state
// Once denied, it's always denied
void PolicyDenyChildProcess::Apply(const std::string& deny) {}

bool PolicyDenyChildProcess::Deny(Permission perm,
                        const std::vector<std::string>& params) {
  deny_all = true;
  return true;
}

bool PolicyDenyChildProcess::is_granted(Permission perm,
                                        const std::string& param = "") {
  return deny_all == false;
}

}  // namespace policy
}  // namespace node
