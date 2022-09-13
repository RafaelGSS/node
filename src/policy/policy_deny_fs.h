#ifndef SRC_POLICY_POLICY_DENY_FS_H_
#define SRC_POLICY_POLICY_DENY_FS_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "v8.h"

#include "policy/policy_deny.h"
#include <vector>

namespace node {

namespace policy {

class PolicyDenyFs final : public PolicyDeny {
 public:
  void Apply(const std::string& deny) override;
  bool Deny(Permission scope, const std::vector<std::string>& params) override;
  bool is_granted(Permission perm, const std::string& param) override;

  struct RadixTree {
    struct Node {
      std::string prefix;
      std::map<char, Node*> children;
      Node* wildcard_child;

      explicit Node(const std::string& pre):
        prefix(pre),
        wildcard_child(nullptr) {}

      Node(): wildcard_child(nullptr) {}

      Node* CreateChild(std::string prefix) {
        char label = prefix[0];

        Node* child = children[label];
        if (child == nullptr) {
          children[label] = new Node(prefix);
          return children[label];
        }

        // swap prefix
        unsigned int i = 0;
        unsigned int prefix_len = prefix.length();
        for (; i < child->prefix.length(); ++i) {
          if (i > prefix_len || prefix[i] != child->prefix[i]) {
            std::string parent_prefix = child->prefix.substr(0, i);
            std::string child_prefix = child->prefix.substr(i);

            child->prefix = child_prefix;
            Node* split_child = new Node(parent_prefix);
            split_child->children[child_prefix[0]] = child;
            children[parent_prefix[0]] = split_child;

            return split_child->CreateChild(prefix.substr(i));
          }
        }
        return child->CreateChild(prefix.substr(i));
      }

      Node* CreateWildcardChild() {
        if (wildcard_child != nullptr) {
          return wildcard_child;
        }
        wildcard_child = new Node();
        return wildcard_child;
      }

      Node* NextNode(std::string path, int idx) {
        auto child = children[path[idx]];
        if (!child) {
          return nullptr;
        }
        // match prefix
        unsigned int prefix_len = child->prefix.length();
        for (unsigned int i = 0; i < path.length(); ++i) {
          if (i >= prefix_len || child->prefix[i] == '*') {
            return child;
          }

          if (path[idx++] != child->prefix[i]) {
            return nullptr;
          }
        }
        return child;
      }
    };

    RadixTree();
    ~RadixTree();
    void Insert(const std::string& s);
    void Remove(const std::string& s);
    bool Lookup(const std::string& s);

   private:
    Node* root_node_;
  };

 private:
  void GrantAccess(Permission scope, std::string param);
  void RestrictAccess(Permission scope, std::string param);
  void RestrictAccess(Permission scope, const std::vector<std::string>& params);

  RadixTree granted_in_fs_;
  RadixTree granted_out_fs_;
  bool deny_all_in_;
  bool deny_all_out_;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_DENY_FS_H_
