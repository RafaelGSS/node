#ifndef SRC_POLICY_POLICY_DENY_FS_H_
#define SRC_POLICY_POLICY_DENY_FS_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "v8.h"

#include "policy/policy_deny.h"
#include <vector>

using v8::Maybe;

namespace node {

namespace policy {

using DenyFsParams = std::vector<std::pair<std::string, bool /* is_folder */>>;

// TODO: implement radix-tree algorithm
class PolicyDenyFs : public PolicyDeny {
  public:
    Maybe<bool> Apply(const std::string& deny);
    bool is_granted(Permission perm, const std::string& param);
  private:
    static bool is_granted(DenyFsParams params, const std::string& opt);

    DenyFsParams deny_in_params;
    DenyFsParams deny_out_params;
    bool deny_all_in;
    bool deny_all_out;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_DENY_FS_H_
