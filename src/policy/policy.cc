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
// the --policy-deny-* command line arguments.
Policy root_policy;

namespace {

static void Deny(const FunctionCallbackInfo<Value>& args) {
  // TODO
  /* Environment* env = Environment::GetCurrent(args); */
  /* CHECK(args[0]->IsString()); */
  /* Utf8Value list(env->isolate(), args[0]); */
  /* if (root_policy.Apply(*list).IsJust()) */
  return args.GetReturnValue().Set(true);
}

static void Check(const FunctionCallbackInfo<Value>& args) {
  // TODO
  /* Environment* env = Environment::GetCurrent(args); */
  /* CHECK(args[0]->IsString()); */
  /* const std::string permString = *String::Utf8Value(env->isolate(), args[0]); */
  /* args.GetReturnValue() */
  /*   .Set(root_policy.is_granted(permString)); */
  return args.GetReturnValue().Set(true);
}

}  // namespace

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

#define V(name, _, parent)                                                     \
  if (permission == Permission::k##name)                                     \
    return Permission::k##parent;
Permission Policy::PermissionParent(Permission permission) {
  PERMISSIONS(V)
    // TODO: warn
}
#undef V

Maybe<bool> Policy::Apply(const std::string& deny, Permission scope) {
  auto policy = deny_policies.find(scope);
  if (policy != deny_policies.end()) {
    return policy->second->Apply(deny);
  }
  return Just(false);
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
