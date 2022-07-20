#ifndef SRC_POLICY_POLICY_DENY_H_
#define SRC_POLICY_POLICY_DENY_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "v8.h"
#include <map>
#include <string>

namespace node {

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

class PolicyDeny {
 public:
  virtual v8::Maybe<bool> Apply(const std::string& deny) = 0;
  virtual bool Deny(Permission scope, std::vector<std::string> params) = 0;
  virtual bool is_granted(Permission perm, const std::string& param = "") = 0;
};

}  // namespace policy

}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS
#endif  // SRC_POLICY_POLICY_DENY_H_
