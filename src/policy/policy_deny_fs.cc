#include "policy_deny_fs.h"
#include "base_object-inl.h"
#include "v8.h"

#include <fcntl.h>
#include <limits.h>
#include <stdlib.h>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>

using v8::Just;
using v8::Maybe;

namespace node {

namespace policy {

// deny = 'fs'
// deny = 'in:/tmp/'
// deny = 'in:/tmp/,out:./example.js'
Maybe<bool> PolicyDenyFs::Apply(const std::string& deny) {
  for (const auto& name : SplitString(deny, ',')) {
    Permission perm = Permission::kPermissionsRoot;
    for (std::string& opt : SplitString(name, ':')) {
      if (perm == Permission::kPermissionsRoot) {
        if (opt == "fs") {
          deny_all_in_ = true;
          deny_all_out_ = true;
          return Just(true);
        }
        if (opt == "in") {
          perm = Permission::kFileSystemIn;
          deny_all_in_ = true;
        } else if (opt == "out") {
          perm = Permission::kFileSystemOut;
          deny_all_out_ = true;
        } else {
          return Just(false);
        }
      } else {
        RestrictAccess(perm, opt);
      }
    }
  }

  return Just(true);
}

bool PolicyDenyFs::Deny(Permission perm, std::vector<std::string> params) {
  if (perm == Permission::kFileSystem) {
    deny_all_in_ = true;
    deny_all_out_ = true;
    return true;
  }

  bool deny_all = params.size() == 0;
  if (perm == Permission::kFileSystemIn) {
    if (deny_all) deny_all_in_ = true;
    // when deny_all_in is already true policy.deny should be idempotent
    if (deny_all_in_) return true;

    RestrictAccess(perm, params);
    return true;
  }

  if (perm == Permission::kFileSystemOut) {
    if (deny_all) deny_all_out_ = true;
    // when deny_all_out is already true policy.deny should be idempotent
    if (deny_all_out_) return true;

    RestrictAccess(perm, params);
    return true;
  }

  return false;
}

void PolicyDenyFs::RestrictAccess(Permission perm, const std::string& res) {
  char resolvedPath[PATH_MAX];
  // check the result
  realpath(res.c_str(), resolvedPath);

  std::filesystem::path path(resolvedPath);
  bool isDir = std::filesystem::is_directory(path);
  // when there are parameters deny_params_ is automatically
  // set to false
  if (perm == Permission::kFileSystemIn) {
    deny_all_in_ = false;
    deny_in_params_.push_back(std::make_pair(resolvedPath, isDir));
  } else if (perm == Permission::kFileSystemOut) {
    deny_all_out_ = false;
    deny_out_params_.push_back(std::make_pair(resolvedPath, isDir));
  }
}

void PolicyDenyFs::RestrictAccess(Permission perm,
                                  std::vector<std::string> params) {
  for (auto& param : params) {
    RestrictAccess(perm, param);
  }
}

bool PolicyDenyFs::is_granted(Permission perm, const std::string& param = "") {
  switch (perm) {
    case Permission::kFileSystem:
      return !(deny_all_in_ && deny_all_out_);
    case Permission::kFileSystemIn:
      return !deny_all_in_ &&
        (param.empty() || PolicyDenyFs::is_granted(deny_in_params_, param));
    case Permission::kFileSystemOut:
      return !deny_all_out_ &&
        (param.empty() || PolicyDenyFs::is_granted(deny_out_params_, param));
    default:
      return false;
  }
}

bool PolicyDenyFs::is_granted(Permission perm, unsigned fd) {
  // TODO(rafaelgss): FD to Filename
  return true;
}

bool PolicyDenyFs::is_granted(DenyFsParams params, const std::string& opt) {
  char resolvedPath[PATH_MAX];
  realpath(opt.c_str(), resolvedPath);
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

}  // namespace policy
}  // namespace node
