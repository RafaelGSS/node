// Example usage of the diagnostics_channel C++ API
// This file demonstrates how to use the C++ interface to publish
// messages to diagnostics channels from C++ code.

#include "node_diagnostics_channel.h"
#include "env-inl.h"
#include "v8.h"

namespace node {
namespace example {

using v8::Context;
using v8::HandleScope;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Value;

// Example 1: Simple publish with string message
void PublishSimpleMessage(Environment* env) {
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  // Check if channel has subscribers before publishing (optional optimization)
  if (diagnostics_channel::HasSubscribers(env, "my-channel")) {
    Local<String> message = String::NewFromUtf8(
        isolate, "Hello from C++").ToLocalChecked();
    diagnostics_channel::Publish(env, "my-channel", message);
  }
}

// Example 2: Publish with object message
void PublishObjectMessage(Environment* env) {
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  // Create an object to publish
  Local<Object> message = Object::New(isolate);
  message->Set(
      context,
      String::NewFromUtf8(isolate, "type").ToLocalChecked(),
      String::NewFromUtf8(isolate, "example").ToLocalChecked()
  ).Check();
  message->Set(
      context,
      String::NewFromUtf8(isolate, "timestamp").ToLocalChecked(),
      v8::Number::New(isolate, uv_hrtime())
  ).Check();
  
  diagnostics_channel::Publish(env, "my-channel", message);
}

// Example 3: Conditional publishing for performance
void ConditionalPublish(Environment* env, const char* channel_name) {
  // Only create the message object if there are subscribers
  // This avoids unnecessary work when no one is listening
  if (!diagnostics_channel::HasSubscribers(env, channel_name)) {
    return;
  }
  
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  // Now we know there are subscribers, so create and publish the message
  Local<Object> message = Object::New(isolate);
  message->Set(
      context,
      String::NewFromUtf8(isolate, "event").ToLocalChecked(),
      String::NewFromUtf8(isolate, "important_operation").ToLocalChecked()
  ).Check();
  
  diagnostics_channel::Publish(env, channel_name, message);
}

// Example 4: Using in a tracing scenario
class OperationTracer {
 public:
  explicit OperationTracer(Environment* env, const char* operation_name)
      : env_(env), operation_name_(operation_name) {
    // Publish start event
    if (diagnostics_channel::HasSubscribers(env_, "operation:start")) {
      Isolate* isolate = env_->isolate();
      HandleScope handle_scope(isolate);
      Local<Context> context = env_->context();
      
      Local<Object> message = Object::New(isolate);
      message->Set(
          context,
          String::NewFromUtf8(isolate, "operation").ToLocalChecked(),
          String::NewFromUtf8(isolate, operation_name_).ToLocalChecked()
      ).Check();
      message->Set(
          context,
          String::NewFromUtf8(isolate, "startTime").ToLocalChecked(),
          v8::Number::New(isolate, uv_hrtime())
      ).Check();
      
      diagnostics_channel::Publish(env_, "operation:start", message);
    }
  }
  
  ~OperationTracer() {
    // Publish end event
    if (diagnostics_channel::HasSubscribers(env_, "operation:end")) {
      Isolate* isolate = env_->isolate();
      HandleScope handle_scope(isolate);
      Local<Context> context = env_->context();
      
      Local<Object> message = Object::New(isolate);
      message->Set(
          context,
          String::NewFromUtf8(isolate, "operation").ToLocalChecked(),
          String::NewFromUtf8(isolate, operation_name_).ToLocalChecked()
      ).Check();
      message->Set(
          context,
          String::NewFromUtf8(isolate, "endTime").ToLocalChecked(),
          v8::Number::New(isolate, uv_hrtime())
      ).Check();
      
      diagnostics_channel::Publish(env_, "operation:end", message);
    }
  }
  
 private:
  Environment* env_;
  const char* operation_name_;
};

// Usage of the tracer:
void SomeImportantOperation(Environment* env) {
  OperationTracer tracer(env, "important_operation");
  
  // Do the actual work here
  // The tracer will automatically publish start/end events
}

}  // namespace example
}  // namespace node

// JavaScript side to subscribe to these channels:
/*
const diagnostics_channel = require('diagnostics_channel');

// Subscribe to the channel
diagnostics_channel.subscribe('my-channel', (message, name) => {
  console.log('Received message on', name, ':', message);
});

// Subscribe to operation tracing
diagnostics_channel.subscribe('operation:start', (data) => {
  console.log('Operation started:', data.operation, 'at', data.startTime);
});

diagnostics_channel.subscribe('operation:end', (data) => {
  console.log('Operation ended:', data.operation, 'at', data.endTime);
});
*/
