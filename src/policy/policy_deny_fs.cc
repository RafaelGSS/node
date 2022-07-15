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
using v8::Local;
using v8::Array;
using v8::String;

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
          deny_all_in = true;
          deny_all_out = true;
          return Just(true);
        }
        if (opt == "in") {
          perm = Permission::kFileSystemIn;
          deny_all_in = true;
        }
        if (opt == "out") {
          perm = Permission::kFileSystemOut;
          deny_all_out = true;
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
    deny_all_in = deny_all_out = true;
    return true;
  }

  bool denyAll = params.size() == 0;
  if (perm == Permission::kFileSystemIn) {
    if (denyAll) deny_all_in = true;
    // when deny_all_in is already true policy.deny should be idempotent
    if (deny_all_in) return true;

    RestrictAccess(perm, params);
    return true;
  }

  if (perm == Permission::kFileSystemOut) {
    if (denyAll) deny_all_out = true;
    // when deny_all_out is already true policy.deny should be idempotent
    if (deny_all_out) return true;

    RestrictAccess(perm, params);
    return true;
  }

  return false;
}

void PolicyDenyFs::RestrictAccess(Permission perm, std::string& res) {
  char resolvedPath[PATH_MAX];
  // check the result
  realpath(res.c_str(), resolvedPath);

  std::filesystem::path path(resolvedPath);
  bool isDir = std::filesystem::is_directory(path);
  if (perm == Permission::kFileSystemIn) {
    deny_in_params.push_back(std::make_pair(resolvedPath, isDir));
  } else if (perm == Permission::kFileSystemOut) {
    deny_out_params.push_back(std::make_pair(resolvedPath, isDir));
  }
}

void PolicyDenyFs::RestrictAccess(Permission perm, std::vector<std::string> params) {
  for (auto& param : params) {
    RestrictAccess(perm, param);
  }
}

bool PolicyDenyFs::is_granted(Permission perm, const std::string& param = "") {
  switch(perm) {
    case Permission::kFileSystem:
      return !deny_all_in && !deny_all_out;
    case Permission::kFileSystemIn:
      return !deny_all_in &&
        (param.empty() || PolicyDenyFs::is_granted(deny_in_params, param));
    case Permission::kFileSystemOut:
      return !deny_all_out &&
        (param.empty() || PolicyDenyFs::is_granted(deny_out_params, param));
    default:
      return false;
  }
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


} // namespace policy
} // namespace node
