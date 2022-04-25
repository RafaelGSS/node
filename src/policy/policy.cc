#include "policy.h"
#include "base_object-inl.h"
#include "env-inl.h"
#include "memory_tracker-inl.h"
#include "node.h"
#include "node_external_reference.h"
#include "node_errors.h"

#include "v8.h"

#include <string>
#include <vector>
#include <iostream>

namespace node {

using v8::Context;
using v8::FunctionCallbackInfo;
using v8::Local;
using v8::Maybe;
using v8::Object;
using v8::Value;
using v8::Nothing;
using v8::Just;
using v8::String;

namespace policy {

// The root policy is establish at process start using
// the --policy-grant and --policy-deny command line
// arguments.
Policy root_policy;

namespace {

static void Deny(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  CHECK(args[0]->IsString());
  Utf8Value list(env->isolate(), args[0]);
  if (root_policy.Apply(*list).IsJust())
    return args.GetReturnValue().Set(true);
}

static void Check(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  CHECK(args[0]->IsString());
  const std::string permString = *String::Utf8Value(env->isolate(), args[0]);
  args.GetReturnValue()
    .Set(root_policy.is_granted(permString));
}

#define V(name, _, parent)                                                     \
  if (permission == Permission::k##parent)                                     \
    SetRecursively(set, Permission::k##name);
void SetRecursively(PermissionSet* set, Permission permission) {
  if (permission != Permission::kPermissionsRoot)
    set->set(static_cast<size_t>(permission));
  PERMISSIONS(V)
}
#undef V

}  // namespace

#define V(Name, label, _)                                                      \
  if (strcmp(name.c_str(), label) == 0) return Permission::k##Name;
Permission Policy::PermissionFromName(const std::string& name) {
  if (strcmp(name.c_str(), "*") == 0) return Permission::kPermissionsRoot;
  PERMISSIONS(V)
  return Permission::kPermissionsCount;
}
#undef V

#define V(Name, label, _)                                                      \
  if (perm == Permission::k##Name) return #Name;
const char* Policy::PermissionToString(const Permission perm) {
  PERMISSIONS(V)
  return nullptr;
}
#undef V

void Policy::ThrowAccessDenied(Environment* env, Permission perm) {
  Local<Value> err = ERR_ACCESS_DENIED(env->isolate());
  CHECK(err->IsObject());
  err.As<Object>()->Set(
      env->context(),
      env->permission_string(),
      v8::String::NewFromUtf8(env->isolate(),
        PermissionToString(perm),
        v8::NewStringType::kNormal).ToLocalChecked())
    .FromMaybe(false);  // Nothing to do about an error at this point.
  env->isolate()->ThrowException(err);
}

Maybe<PermissionSet> Policy::Parse(const std::string& list) {
  PermissionSet set;
  for (const auto& name : SplitString(list, ',')) {
    Permission permission = PermissionFromName(name);
    if (permission == Permission::kPermissionsCount)
      return Nothing<PermissionSet>();
    SetRecursively(&set, permission);
  }
  return Just(set);
}

Maybe<bool> Policy::Apply(const std::string& deny) {
  Maybe<PermissionSet> deny_set = Parse(deny);

  if (deny_set.IsNothing()) return Nothing<bool>();
  Apply(deny_set.FromJust());
  return Just(true);
}

void Policy::Apply(const PermissionSet& deny) {
  permissions_ |= deny;
}

void Initialize(Local<Object> target,
                       Local<Value> unused,
                       Local<Context> context,
                       void* priv) {
  Environment* env = Environment::GetCurrent(context);
  env->SetMethod(target, "deny", Deny);
  env->SetMethodNoSideEffect(target, "check", Check);

  target->SetIntegrityLevel(context, v8::IntegrityLevel::kFrozen).FromJust();
}

void RegisterExternalReferences(
    ExternalReferenceRegistry* registry) {
  registry->Register(Deny);
  registry->Register(Check);
}

}  // namespace policy
}  // namespace node

NODE_MODULE_CONTEXT_AWARE_INTERNAL(policy, node::policy::Initialize)
NODE_MODULE_EXTERNAL_REFERENCE(policy, node::policy::RegisterExternalReferences)
