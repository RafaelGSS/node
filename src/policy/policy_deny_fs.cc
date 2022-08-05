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

namespace node {

namespace policy {

// deny = 'fs'
// deny = 'in:/tmp/'
// deny = 'in:/tmp/,out:./example.js'
void PolicyDenyFs::Apply(const std::string& deny) {
  for (const auto& name : SplitString(deny, ',')) {
    Permission perm = Permission::kPermissionsRoot;
    for (std::string& opt : SplitString(name, ':')) {
      if (perm == Permission::kPermissionsRoot) {
        if (opt == "fs") {
          deny_all_in_ = true;
          deny_all_out_ = true;
          return;
        }
        if (opt == "in") {
          perm = Permission::kFileSystemIn;
          deny_all_in_ = true;
        } else if (opt == "out") {
          perm = Permission::kFileSystemOut;
          deny_all_out_ = true;
        } else {
          return;
        }
      } else {
        RestrictAccess(perm, opt);
      }
    }
  }
}

bool PolicyDenyFs::Deny(Permission perm,
                        const std::vector<std::string>& params) {
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

void PolicyDenyFs::RestrictAccess(Permission perm, std::string res) {
  std::filesystem::path path(res);
  if (std::filesystem::is_directory(path)) {
    // add wildcard when directory
    res = path / "*";
  }
  // when there are parameters deny_params_ is automatically
  // set to false
  if (perm == Permission::kFileSystemIn) {
    deny_all_in_ = false;
    deny_in_params_.Insert(res);
  } else if (perm == Permission::kFileSystemOut) {
    deny_all_out_ = false;
    deny_out_params_.Insert(res);
  }
}

void PolicyDenyFs::RestrictAccess(Permission perm,
                                  const std::vector<std::string>& params) {
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
        (param.empty() || !deny_in_params_.Lookup(param));
    case Permission::kFileSystemOut:
      return !deny_all_out_ &&
        (param.empty() || !deny_out_params_.Lookup(param));
    default:
      return false;
  }
}

void FreeRecursivelyNode(PolicyDenyFs::RadixTree::Node* node) {
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

PolicyDenyFs::RadixTree::RadixTree(): root_node_(new Node("/")) { }

PolicyDenyFs::RadixTree::~RadixTree() {
  FreeRecursivelyNode(root_node_);
}

bool PolicyDenyFs::RadixTree::Lookup(const std::string& s) {
  PolicyDenyFs::RadixTree::Node* current_node = root_node_;
  unsigned int parent_node_prefix_len = current_node->prefix.length();
  auto path_len = s.length();

  while (true) {
    if (parent_node_prefix_len == path_len &&
        s.substr(path_len - current_node->prefix.length()) ==
            current_node->prefix) {
      return true;
    }

    auto node = current_node->NextNode(s, parent_node_prefix_len);
    if (node == nullptr) {
      return false;
    }

    current_node = node;
    if (current_node->wildcard_child != nullptr) {
      return true;
    }
    parent_node_prefix_len += current_node->prefix.length();
  }
}

void PolicyDenyFs::RadixTree::Insert(const std::string& path) {
  PolicyDenyFs::RadixTree::Node* current_node = root_node_;

  unsigned int parent_node_prefix_len = current_node->prefix.length();
  int path_len = path.length();

  for (int i = 0; i < path_len; ++i) {
    bool is_wildcard_node = path[i] == '*';
    bool is_last_char = i + 1 == path_len;

    if (is_wildcard_node || is_last_char) {
      std::string node_path = path.substr(parent_node_prefix_len, i);
      current_node = current_node->CreateChild(node_path);
    }

    if (is_wildcard_node) {
      current_node = current_node->CreateWildcardChild();
      parent_node_prefix_len = i + i;
    }
  }
}

}  // namespace policy
}  // namespace node
