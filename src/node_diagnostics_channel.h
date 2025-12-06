#ifndef SRC_NODE_DIAGNOSTICS_CHANNEL_H_
#define SRC_NODE_DIAGNOSTICS_CHANNEL_H_

#if defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#include "env.h"
#include "node.h"
#include "v8.h"

namespace node {
namespace diagnostics_channel {

// C++ API for publishing to diagnostics channels
// This allows C++ code to publish messages to channels that JavaScript
// code can subscribe to via diagnostics_channel.subscribe()

// Check if a channel has subscribers
// Returns true if the channel exists and has active subscribers
bool HasSubscribers(Environment* env, v8::Local<v8::String> channel_name);
bool HasSubscribers(Environment* env, const char* channel_name);

// Publish a message to a channel
// If the channel has no subscribers, this is a no-op
// The message can be any JavaScript value
void Publish(Environment* env,
             v8::Local<v8::String> channel_name,
             v8::Local<v8::Value> message);
void Publish(Environment* env,
             const char* channel_name,
             v8::Local<v8::Value> message);

// Initialize the diagnostics_channel binding
void Initialize(v8::Local<v8::Object> target,
                v8::Local<v8::Value> unused,
                v8::Local<v8::Context> context,
                void* priv);

// Register external references for snapshot support
void RegisterExternalReferences(ExternalReferenceRegistry* registry);

}  // namespace diagnostics_channel
}  // namespace node

#endif  // defined(NODE_WANT_INTERNALS) && NODE_WANT_INTERNALS

#endif  // SRC_NODE_DIAGNOSTICS_CHANNEL_H_
