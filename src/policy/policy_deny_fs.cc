#include "policy_deny_fs.h"
#include "base_object-inl.h"
#include "v8.h"

#include <string>
#include <iostream>
#include <vector>

using v8::Maybe;
using v8::Just;

namespace node {

namespace policy {

Maybe<bool> PolicyDenyFs::Apply(const std::string& deny) {
  for (const auto& name : SplitString(deny, ',')) {
    Permission perm = Permission::kPermissionsRoot;
    for (const auto& opt : SplitString(name, ':')) {
      if (perm == Permission::kPermissionsRoot) {
        if (opt == "fs") {
          deny_all_in = true;
          deny_all_out = true;
          return Just(true);
        } else if (opt == "in") {
          perm = Permission::kFileSystemIn;
          deny_all_in = true;
        } else {
          perm = Permission::kFileSystemOut;
          deny_all_out = true;
        }
      } else {
        if (perm == Permission::kFileSystemIn) {
          deny_all_in = false;
          deny_in_params.push_back(opt);
        } else {
          deny_all_out = false;
          deny_out_params.push_back(opt);
        }
      }
    }
  }

  // TODO: remove it -- please god
  std::string strIn;
  std::string strOut;
  for (const auto &piece : deny_in_params) strIn += "|" + piece;
  for (const auto &piece : deny_out_params) strOut += "|" + piece;
  std::cout << "deny_in_params " << strIn << " is block " << deny_all_in << std::endl;
  std::cout << "deny_out_params " << strOut << " is block " << deny_all_out << std::endl;
  return Just(true);
}

bool PolicyDenyFs::is_granted(Permission perm, const std::string& param = "") {
  switch(perm) {
    case Permission::kFileSystemIn:
      return !deny_all_in &&
        (param.empty() || PolicyDenyFs::is_granted(deny_in_params, param));
    case Permission::kFileSystemOut:
      return !deny_all_out &&
        (param.empty() || PolicyDenyFs::is_granted(deny_out_params, param));
    default:
      // TODO: Throw?
      return false;
  }
}

// TODO: check folder
// TODO: handle realpath
bool PolicyDenyFs::is_granted(std::vector<std::string> params, const std::string& opt) {
  for (auto& param : params) {
    if (param == opt) return false;
  }
  return true;
}


} // namespace policy
} // namespace node
