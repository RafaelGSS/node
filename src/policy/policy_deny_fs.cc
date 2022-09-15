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
#include <algorithm>

namespace node {

namespace policy {

// grant = 'in,out'
// grant = 'in:/tmp/'
// grant = 'in:/tmp/,out:./example.js'
void PolicyDenyFs::Apply(const std::string& deny) {
  // all the fs is blocked by default
  deny_all_in_ = true;
  deny_all_out_ = true;
  for (const auto& name : SplitString(deny, ',')) {
    Permission perm = Permission::kPermissionsRoot;
    for (std::string& opt : SplitString(name, ':')) {
      if (perm == Permission::kPermissionsRoot) {
        if (opt == "fs") {
          deny_all_in_ = false;
          deny_all_out_ = false;
          return;
        }
        if (opt == "in") {
          perm = Permission::kFileSystemIn;
          deny_all_in_ = false;
        } else if (opt == "out") {
          perm = Permission::kFileSystemOut;
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
    // when deny_all_in is already true permission.deny should be idempotent
    if (deny_all_in_) return true;

    RebuildTree(bkp_in_list_, granted_in_fs_, params);
    if (bkp_in_list_.size() == 0) deny_all_in_ = true;
    return true;
  }

  if (perm == Permission::kFileSystemOut) {
    if (deny_all) deny_all_out_ = true;
    // when deny_all_out is already true permission.deny should be idempotent
    if (deny_all_out_) return true;

    RebuildTree(bkp_out_list_, granted_out_fs_, params);
    if (bkp_out_list_.size() == 0) deny_all_out_ = true;
    return true;
  }
  return false;
}

void PolicyDenyFs::GrantAccess(Permission perm, std::string res) {
  std::filesystem::path path(res);
  const std::string original_path = res;
  if (std::filesystem::is_directory(path)) {
    // add wildcard when directory
    res = path / "*";
  }
  if (perm == Permission::kFileSystemIn) {
    granted_in_fs_.Insert(res);
    bkp_in_list_.push_back(original_path);
  } else if (perm == Permission::kFileSystemOut) {
    granted_out_fs_.Insert(res);
    bkp_out_list_.push_back(original_path);
  }
}

void PolicyDenyFs::RebuildTree(std::vector<std::string>& bkp_list, RadixTree& tree,
                                  const std::vector<std::string>& params) {
  // Rebuild the tree without the items
  bkp_list.erase(
      std::remove_if(
        bkp_list.begin(),
        bkp_list.end(),
        [params](const std::string& res) {
        return std::find(params.begin(), params.end(), res) != params.end();
        })
      );
  // TODO: make sure destructor was called
  RadixTree granted_fs;
  if (bkp_list.size() > 0) {
    for (auto& param : bkp_list) {
      granted_fs.Insert(param);
    }
  }
  tree = granted_fs;
}

bool PolicyDenyFs::is_granted(Permission perm, const std::string& param = "") {
  std::cout << "Is granted..." << param <<  deny_all_in_ << std::endl;
  switch (perm) {
    case Permission::kFileSystem:
      return !(deny_all_in_ && deny_all_out_);
    case Permission::kFileSystemIn:
      return !deny_all_in_ &&
        (param.empty() || granted_in_fs_.Lookup(param));
    case Permission::kFileSystemOut:
      return !deny_all_out_ &&
        (param.empty() || granted_out_fs_.Lookup(param));
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

PolicyDenyFs::RadixTree::RadixTree(): root_node_(new Node("")) { }

PolicyDenyFs::RadixTree::~RadixTree() {
  FreeRecursivelyNode(root_node_);
}

bool PolicyDenyFs::RadixTree::Lookup(const std::string& s) {
  PolicyDenyFs::RadixTree::Node* current_node = root_node_;
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

}  // namespace policy
}  // namespace node
