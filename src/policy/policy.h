#ifndef SRC_POLICY_POLICY_H_
#define SRC_POLICY_POLICY_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "node_options.h"
#include "v8.h"

#include <bitset>
#include <iostream>

namespace node {

class Environment;

namespace policy {

#define FILESYSTEM_PERMISSIONS(V)                                              \
  V(FileSystem, "fs", PermissionsRoot)                                         \
  V(FileSystemIn, "fs.in", FileSystem)                                         \
  V(FileSystemOut, "fs.out", FileSystem)

#define PERMISSIONS(V)                                                         \
  FILESYSTEM_PERMISSIONS(V)                                                    \

#define V(name, _, __) k##name,
enum class Permission {
  kPermissionsRoot = -1,
  PERMISSIONS(V)
  kPermissionsCount
};
#undef V

#define THROW_IF_INSUFFICIENT_PERMISSIONS(env, perm_, ...)                     \
    if (!node::policy::root_policy.is_granted(perm_)) {                                      \
      node::policy::Policy::ThrowAccessDenied((env), perm_);                                  \
    }

using PermissionSet =
    std::bitset<static_cast<size_t>(Permission::kPermissionsCount)>;

class Policy final {
  public:
    inline bool is_granted(const Permission perm) const {
      return !LIKELY(permissions_.test(static_cast<size_t>(perm)));
    }

    inline bool is_granted(const std::string& perm) const {
      return is_granted(Policy::PermissionFromName(perm));
    }

    static Permission PermissionFromName(const std::string& name);
    static const char* PermissionToString(Permission perm);

    static void ThrowAccessDenied(Environment* env, Permission perm);

    v8::Maybe<PermissionSet> Parse(const std::string& list);
    v8::Maybe<bool> Apply(const std::string& deny);
  private:
    void Apply(const PermissionSet& deny);

    PermissionSet permissions_;
};

extern policy::Policy root_policy;
}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_H_
