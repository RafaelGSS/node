#include "policy_deny_fs.h"
#include "base_object-inl.h"
#include "v8.h"

#include <string>
#include <iostream>
#include <vector>
#include <stdlib.h>
#include <filesystem>

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
        // TODO: maybe use internal fs.resolve?
        char resolvedPath[PATH_MAX];
        realpath(opt.c_str(), resolvedPath);
        if (resolvedPath == nullptr) {
          return Just(false);
        }

        std::filesystem::path path(resolvedPath);
        bool isDir = std::filesystem::is_directory(path);
        if (perm == Permission::kFileSystemIn) {
          deny_all_in = false;
          deny_in_params.push_back(std::make_pair(resolvedPath, isDir));
        } else {
          deny_all_out = false;
          deny_out_params.push_back(std::make_pair(resolvedPath, isDir));
        }
      }
    }
  }

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

bool PolicyDenyFs::is_granted(DenyFsParams params, const std::string& opt) {
  char resolvedPath[PATH_MAX];
  realpath(opt.c_str(), resolvedPath);
  if (resolvedPath == nullptr) {
    return false;
  }

  for (auto& param : params) {
    // is folder
    if (param.second) {
      if (strstr(resolvedPath, param.first.c_str()) == resolvedPath) {
        return false;
      }
    } else if (param.first == resolvedPath) {
      return false;
    }
  }
  return true;
}


} // namespace policy
} // namespace node
