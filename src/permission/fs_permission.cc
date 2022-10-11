#include "fs_permission.h"
#include "base_object-inl.h"
#include "v8.h"

#include <fcntl.h>
#include <limits.h>
#include <stdlib.h>
#include <filesystem>
#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

namespace node {

namespace permission {

// allow = 'read,write'
// allow = 'read:/tmp/'
// allow = 'read:/tmp/,out:./example.js'
void FSPermission::Apply(const std::string& allow) {
  for (const auto& name : SplitString(allow, ',')) {
    PermissionScope perm = PermissionScope::kPermissionsRoot;
    for (std::string& opt : SplitString(name, ':')) {
      if (perm == PermissionScope::kPermissionsRoot) {
        if (opt == "fs") {
          deny_all_in_ = false;
          deny_all_out_ = false;
          return;
        }
        if (opt == "read") {
          perm = PermissionScope::kFileSystemIn;
          deny_all_in_ = false;
        } else if (opt == "write") {
          perm = PermissionScope::kFileSystemOut;
          deny_all_out_ = false;
        } else {
          return;
        }
      } else {
        GrantAccess(perm, opt);
      }
    }
  }
}

bool FSPermission::Deny(PermissionScope perm,
                        const std::vector<std::string>& params) {
  if (perm == PermissionScope::kFileSystem) {
    deny_all_in_ = true;
    deny_all_out_ = true;
    return true;
  }

  bool deny_all = params.size() == 0;
  if (perm == PermissionScope::kFileSystemIn) {
    if (deny_all) deny_all_in_ = true;
    // when deny_all_in is already true permission.deny should be idempotent
    if (deny_all_in_) return true;

    for (auto& param : params)
      deny_in_fs_.Insert(param);
    return true;
  }

  if (perm == PermissionScope::kFileSystemOut) {
    if (deny_all) deny_all_out_ = true;
    // when deny_all_out is already true permission.deny should be idempotent
    if (deny_all_out_) return true;

    for (auto& param : params)
      deny_out_fs_.Insert(param);
    return true;
  }
  return false;
}

void FSPermission::GrantAccess(PermissionScope perm, std::string res) {
  std::filesystem::path path(res);
  const std::string original_path = res;
  if (std::filesystem::is_directory(path)) {
    // add wildcard when directory
    res = path / "*";
  }
  if (perm == PermissionScope::kFileSystemIn) {
    granted_in_fs_.Insert(res);
  } else if (perm == PermissionScope::kFileSystemOut) {
    granted_out_fs_.Insert(res);
  }
}

bool FSPermission::is_granted(PermissionScope perm, const std::string& param = "") {
  std::cout << "Is granted..." << param << " - deny_all_in: " << deny_all_in_;
  switch (perm) {
    case PermissionScope::kFileSystem:
      return !(deny_all_in_ && deny_all_out_);
    case PermissionScope::kFileSystemIn:
      return !deny_all_in_ &&
        (param.empty() || (!deny_in_fs_.Lookup(param) && granted_in_fs_.Lookup(param)));
    case PermissionScope::kFileSystemOut:
      return !deny_all_out_ &&
        (param.empty() || (!deny_out_fs_.Lookup(param) && granted_out_fs_.Lookup(param)));
    default:
      return false;
  }
}

void FreeRecursivelyNode(FSPermission::RadixTree::Node* node) {
  if (node == nullptr) {
    return;
  }

  if (node->children.size()) {
    for (auto& c : node->children) {
      FreeRecursivelyNode(c.second);
    }
  }

  if (node->wildcard_child != nullptr) {
    free(node->wildcard_child);
  }
  free(node);
}

FSPermission::RadixTree::RadixTree(): root_node_(new Node("")) { }

FSPermission::RadixTree::~RadixTree() {
  FreeRecursivelyNode(root_node_);
}

bool FSPermission::RadixTree::Lookup(const std::string& s) {
  FSPermission::RadixTree::Node* current_node = root_node_;
  if (current_node->children.size() == 0) {
    return false;
  }

  unsigned int parent_node_prefix_len = current_node->prefix.length();
  auto path_len = s.length();

  while (true) {
    if (parent_node_prefix_len == path_len) {
      return true;
    }

    auto node = current_node->NextNode(s, parent_node_prefix_len);
    if (node == nullptr) {
      return false;
    }

    current_node = node;
    parent_node_prefix_len += current_node->prefix.length();
    if (current_node->wildcard_child != nullptr &&
        path_len >= parent_node_prefix_len) {
      return true;
    }
  }
}

void FSPermission::RadixTree::Insert(const std::string& path) {
  std::cout << "Inserting..." << path << std::endl;
  FSPermission::RadixTree::Node* current_node = root_node_;

  unsigned int parent_node_prefix_len = current_node->prefix.length();
  int path_len = path.length();

  for (int i = 1; i <= path_len; ++i) {
    bool is_wildcard_node = path[i - 1] == '*';
    bool is_last_char = i == path_len;

    if (is_wildcard_node || is_last_char) {
      std::string node_path = path.substr(parent_node_prefix_len, i);
      current_node = current_node->CreateChild(node_path);
    }

    if (is_wildcard_node) {
      current_node = current_node->CreateWildcardChild();
      parent_node_prefix_len = i;
    }
  }
}

}  // namespace permission
}  // namespace node
