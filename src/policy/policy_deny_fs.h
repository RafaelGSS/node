#ifndef SRC_POLICY_POLICY_DENY_FS_H_
#define SRC_POLICY_POLICY_DENY_FS_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "v8.h"

#include "policy/policy_deny.h"
#include <vector>

namespace node {

namespace policy {

// TODO: implement radix-tree algorithm
// Benchmark it
class PolicyDenyFs : public PolicyDeny {
  public:
    v8::Maybe<bool> Apply(const std::string& deny);
    bool is_granted(Permission perm, const std::string& param);
  private:
    static bool is_granted(std::vector<std::string> params, const std::string& opt);

    std::vector<std::string> deny_in_params;
    std::vector<std::string> deny_out_params;
    bool deny_all_in;
    bool deny_all_out;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_DENY_FS_H_
