#include "node_diagnostics_channel.h"
#include "env-inl.h"
#include "node_external_reference.h"
#include "util-inl.h"

namespace node {
namespace diagnostics_channel {

using v8::Context;
using v8::FunctionCallbackInfo;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

// Internal helper to get the diagnostics_channel module from JS
static MaybeLocal<Object> GetDiagnosticsChannelModule(Environment* env) {
  Isolate* isolate = env->isolate();
  Local<Context> context = env->context();
  
  // Get the diagnostics_channel module
  // This uses require('diagnostics_channel') internally
  Local<String> module_name = FIXED_ONE_BYTE_STRING(isolate, "diagnostics_channel");
  
  // Use the internal module loader to get the diagnostics_channel module
  Local<Value> module_exports;
  if (!env->builtin_module_require("diagnostics_channel").ToLocal(&module_exports)) {
    return MaybeLocal<Object>();
  }
  
  if (!module_exports->IsObject()) {
    return MaybeLocal<Object>();
  }
  
  return module_exports.As<Object>();
}

// C++ API: Check if a channel has subscribers
bool HasSubscribers(Environment* env, Local<String> channel_name) {
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  Local<Object> dc_module;
  if (!GetDiagnosticsChannelModule(env).ToLocal(&dc_module)) {
    return false;
  }
  
  // Get the hasSubscribers function
  Local<Value> has_subscribers_fn;
  if (!dc_module->Get(context, FIXED_ONE_BYTE_STRING(isolate, "hasSubscribers"))
          .ToLocal(&has_subscribers_fn)) {
    return false;
  }
  
  if (!has_subscribers_fn->IsFunction()) {
    return false;
  }
  
  // Call hasSubscribers(channel_name)
  Local<Value> argv[] = {channel_name};
  Local<Value> result;
  if (!has_subscribers_fn.As<v8::Function>()
          ->Call(context, dc_module, 1, argv)
          .ToLocal(&result)) {
    return false;
  }
  
  return result->IsTrue();
}

bool HasSubscribers(Environment* env, const char* channel_name) {
  Isolate* isolate = env->isolate();
  Local<String> name = String::NewFromUtf8(isolate, channel_name).ToLocalChecked();
  return HasSubscribers(env, name);
}

// C++ API: Publish a message to a channel
void Publish(Environment* env, Local<String> channel_name, Local<Value> message) {
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  Local<Object> dc_module;
  if (!GetDiagnosticsChannelModule(env).ToLocal(&dc_module)) {
    return;
  }
  
  // Get the channel function
  Local<Value> channel_fn;
  if (!dc_module->Get(context, FIXED_ONE_BYTE_STRING(isolate, "channel"))
          .ToLocal(&channel_fn)) {
    return;
  }
  
  if (!channel_fn->IsFunction()) {
    return;
  }
  
  // Call channel(channel_name) to get the channel object
  Local<Value> argv[] = {channel_name};
  Local<Value> channel_obj;
  if (!channel_fn.As<v8::Function>()
          ->Call(context, dc_module, 1, argv)
          .ToLocal(&channel_obj)) {
    return;
  }
  
  if (!channel_obj->IsObject()) {
    return;
  }
  
  // Get the publish method from the channel object
  Local<Value> publish_fn;
  if (!channel_obj.As<Object>()
          ->Get(context, FIXED_ONE_BYTE_STRING(isolate, "publish"))
          .ToLocal(&publish_fn)) {
    return;
  }
  
  if (!publish_fn->IsFunction()) {
    return;
  }
  
  // Call channel.publish(message)
  Local<Value> publish_argv[] = {message};
  USE(publish_fn.As<v8::Function>()
          ->Call(context, channel_obj, 1, publish_argv));
}

void Publish(Environment* env, const char* channel_name, Local<Value> message) {
  Isolate* isolate = env->isolate();
  Local<String> name = String::NewFromUtf8(isolate, channel_name).ToLocalChecked();
  Publish(env, name, message);
}

// JS-exposed function: hasSubscribers(channelName)
static void HasSubscribersFromJS(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  CHECK(args[0]->IsString());
  
  Local<String> channel_name = args[0].As<String>();
  bool has_subs = HasSubscribers(env, channel_name);
  args.GetReturnValue().Set(has_subs);
}

// JS-exposed function: publish(channelName, message)
static void PublishFromJS(const FunctionCallbackInfo<Value>& args) {
  Environment* env = Environment::GetCurrent(args);
  CHECK(args[0]->IsString());
  
  Local<String> channel_name = args[0].As<String>();
  Local<Value> message = args[1];
  
  Publish(env, channel_name, message);
}

void RegisterExternalReferences(ExternalReferenceRegistry* registry) {
  registry->Register(HasSubscribersFromJS);
  registry->Register(PublishFromJS);
}

void Initialize(Local<Object> target,
                Local<Value> unused,
                Local<Context> context,
                void* priv) {
  SetMethod(context, target, "hasSubscribers", HasSubscribersFromJS);
  SetMethod(context, target, "publish", PublishFromJS);
}

}  // namespace diagnostics_channel
}  // namespace node

NODE_BINDING_CONTEXT_AWARE_INTERNAL(diagnostics_channel,
                                    node::diagnostics_channel::Initialize)
NODE_BINDING_EXTERNAL_REFERENCE(diagnostics_channel,
                                node::diagnostics_channel::RegisterExternalReferences)
