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

using v8::Array;
using v8::Context;
using v8::FunctionCallbackInfo;
using v8::Integer;
using v8::Just;
using v8::Local;
using v8::Maybe;
using v8::Nothing;
using v8::Object;
using v8::String;
using v8::Value;

namespace policy {

// The root policy is establish at process start using
// the --policy-deny-* command line arguments.
Policy root_policy;

namespace {

// policy.deny('fs.in', ['/tmp/'])
// policy.deny('fs.in')
static void Deny(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  v8::Isolate* isolate = env->isolate();

  CHECK(args[0]->IsString());
  CHECK(args.Length() >= 2 || args[1]->IsArray());

  std::string denyScope = *String::Utf8Value(isolate, args[0]);
  Permission scope = Policy::StringToPermission(denyScope);
  if (scope == Permission::kPermissionsRoot) {
    return args.GetReturnValue().Set(false);
  }

  Local<Array> jsParams = Local<Array>::Cast(args[1]);
  std::vector<std::string> params;
  for (uint32_t i = 0; i < jsParams->Length(); ++i) {
    Local<Value> arg(
        jsParams
          ->Get(isolate->GetCurrentContext(), Integer::New(isolate, i))
          .ToLocalChecked());

    String::Utf8Value utf8_arg(isolate, arg);
    params.push_back(*utf8_arg);
  }

  return args.GetReturnValue()
    .Set(root_policy.Deny(scope, params));
}

// policy.check('fs.in', '/tmp/')
// policy.check('fs.in')
static void Check(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  v8::Isolate* isolate = env->isolate();
  CHECK(args[0]->IsString());
  CHECK(args.Length() >= 2 || args[1]->IsString());

  std::string denyScope = *String::Utf8Value(isolate, args[0]);
  Permission scope = Policy::StringToPermission(denyScope);
  if (scope == Permission::kPermissionsRoot) {
    // TODO(rafaelgss): throw?
    return args.GetReturnValue().Set(false);
  }

  return args.GetReturnValue()
    .Set(root_policy.is_granted(scope, *String::Utf8Value(isolate, args[1])));
}

}  // namespace

#define V(Name, label, _)                                                      \
  if (perm == Permission::k##Name) return #Name;
const char* Policy::PermissionToString(const Permission perm) {
  PERMISSIONS(V)
  return nullptr;
}
#undef V

#define V(Name, label, _)                                                      \
  if (perm == label) return Permission::k##Name;
Permission Policy::StringToPermission(std::string perm) {
  PERMISSIONS(V)
  return Permission::kPermissionsRoot;
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

Maybe<bool> Policy::Apply(const std::string& deny, Permission scope) {
  auto policy = deny_policies.find(scope);
  if (policy != deny_policies.end()) {
    return policy->second->Apply(deny);
  }
  return Just(false);
}

bool Policy::Deny(Permission scope, std::vector<std::string> params) {
  auto policy = deny_policies.find(scope);
  if (policy != deny_policies.end()) {
    return policy->second->Deny(scope, params);
  }
  return false;
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
