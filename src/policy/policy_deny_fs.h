#ifndef SRC_POLICY_POLICY_DENY_FS_H_
#define SRC_POLICY_POLICY_DENY_FS_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "v8.h"

#include "policy/policy_deny.h"
#include <vector>

namespace node {

namespace policy {

using DenyFsParams = std::vector<std::pair<std::string, bool /* is_folder */>>;

// TODO(rafaelgss): implement radix-tree algorithm
class PolicyDenyFs final : public PolicyDeny {
 public:
  void Apply(const std::string& deny) override;
  bool Deny(Permission scope, const std::vector<std::string>& params) override;
  bool is_granted(Permission perm, const std::string& param) override;

 private:
  static bool is_granted(DenyFsParams params, const std::string& opt);
  void RestrictAccess(Permission scope, const std::string& param);
  void RestrictAccess(Permission scope, const std::vector<std::string>& params);

  DenyFsParams deny_in_params_;
  DenyFsParams deny_out_params_;
  bool deny_all_in_;
  bool deny_all_out_;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_DENY_FS_H_
