# Diagnostics Channel C++ API

This document describes the C++ interface for Node.js diagnostics channels, which allows C++ code to publish messages to channels that JavaScript code can subscribe to.

## Overview

The diagnostics channel C++ API provides a way for Node.js core C++ code to emit diagnostic events that can be consumed by JavaScript code using the `diagnostics_channel` module. This is useful for:

- Performance monitoring and tracing
- Debugging internal operations
- Instrumentation and observability
- Custom telemetry

## Files

- **`src/node_diagnostics_channel.h`**: Header file with the C++ API declarations
- **`src/node_diagnostics_channel.cc`**: Implementation of the C++ API
- **`src/node_diagnostics_channel_example.cc`**: Usage examples (reference only, not compiled)

## API Reference

### Namespace

All functions are in the `node::diagnostics_channel` namespace.

### Functions

#### `bool HasSubscribers(Environment* env, const char* channel_name)`
#### `bool HasSubscribers(Environment* env, v8::Local<v8::String> channel_name)`

Checks if a channel has active subscribers.

**Parameters:**
- `env`: The Node.js environment
- `channel_name`: Name of the channel to check

**Returns:** `true` if the channel exists and has subscribers, `false` otherwise

**Usage:**
```cpp
if (diagnostics_channel::HasSubscribers(env, "my-channel")) {
  // Only create expensive message objects if someone is listening
}
```

#### `void Publish(Environment* env, const char* channel_name, v8::Local<v8::Value> message)`
#### `void Publish(Environment* env, v8::Local<v8::String> channel_name, v8::Local<v8::Value> message)`

Publishes a message to a diagnostics channel.

**Parameters:**
- `env`: The Node.js environment
- `channel_name`: Name of the channel to publish to
- `message`: The message to publish (can be any JavaScript value)

**Usage:**
```cpp
Local<String> message = String::NewFromUtf8(isolate, "Hello").ToLocalChecked();
diagnostics_channel::Publish(env, "my-channel", message);
```

## How It Works

The C++ API works by interfacing with the JavaScript `diagnostics_channel` module:

1. **Channel Registration**: Channels are created and managed by the JavaScript side
2. **Subscription**: JavaScript code subscribes to channels using `diagnostics_channel.subscribe()`
3. **Publishing from C++**: C++ code can publish messages to these channels
4. **Message Delivery**: Messages are delivered to all JavaScript subscribers

### Architecture

```
┌─────────────────────┐
│   C++ Code          │
│  (Your code)        │
└──────────┬──────────┘
           │ Uses C++ API
           ▼
┌─────────────────────┐
│ node_diagnostics_   │
│ channel.cc          │
│ (C++ Interface)     │
└──────────┬──────────┘
           │ Calls
           ▼
┌─────────────────────┐
│ diagnostics_        │
│ channel.js          │
│ (JS Module)         │
└──────────┬──────────┘
           │ Notifies
           ▼
┌─────────────────────┐
│ JavaScript          │
│ Subscribers         │
└─────────────────────┘
```

## Usage Examples

### Example 1: Simple Message Publishing

```cpp
#include "node_diagnostics_channel.h"

void MyFunction(Environment* env) {
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  
  Local<String> message = String::NewFromUtf8(
      isolate, "Operation completed").ToLocalChecked();
  
  diagnostics_channel::Publish(env, "my-app:operation", message);
}
```

JavaScript subscriber:
```javascript
const diagnostics_channel = require('diagnostics_channel');

diagnostics_channel.subscribe('my-app:operation', (message) => {
  console.log('C++ says:', message);
});
```

### Example 2: Publishing Objects

```cpp
void PublishDetailedEvent(Environment* env) {
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  // Create an object with event details
  Local<Object> event = Object::New(isolate);
  event->Set(
      context,
      String::NewFromUtf8(isolate, "type").ToLocalChecked(),
      String::NewFromUtf8(isolate, "http_request").ToLocalChecked()
  ).Check();
  event->Set(
      context,
      String::NewFromUtf8(isolate, "method").ToLocalChecked(),
      String::NewFromUtf8(isolate, "GET").ToLocalChecked()
  ).Check();
  event->Set(
      context,
      String::NewFromUtf8(isolate, "timestamp").ToLocalChecked(),
      v8::Number::New(isolate, uv_hrtime())
  ).Check();
  
  diagnostics_channel::Publish(env, "http:request", event);
}
```

JavaScript subscriber:
```javascript
diagnostics_channel.subscribe('http:request', (event) => {
  console.log(`${event.type}: ${event.method} at ${event.timestamp}`);
});
```

### Example 3: Performance-Conscious Publishing

```cpp
void ExpensiveOperation(Environment* env) {
  // Check for subscribers first to avoid unnecessary work
  if (!diagnostics_channel::HasSubscribers(env, "perf:trace")) {
    // No subscribers, skip creating the trace object
    return;
  }
  
  // Only create the trace object if someone is listening
  Isolate* isolate = env->isolate();
  HandleScope handle_scope(isolate);
  Local<Context> context = env->context();
  
  Local<Object> trace = Object::New(isolate);
  // ... populate trace with expensive-to-compute data ...
  
  diagnostics_channel::Publish(env, "perf:trace", trace);
}
```

### Example 4: Operation Tracing

```cpp
class OperationTracer {
 public:
  OperationTracer(Environment* env, const char* op_name)
      : env_(env), op_name_(op_name), start_time_(uv_hrtime()) {
    PublishEvent("start");
  }
  
  ~OperationTracer() {
    PublishEvent("end");
  }
  
 private:
  void PublishEvent(const char* event_type) {
    std::string channel = std::string("trace:") + op_name_ + ":" + event_type;
    
    if (!diagnostics_channel::HasSubscribers(env_, channel.c_str())) {
      return;
    }
    
    Isolate* isolate = env_->isolate();
    HandleScope handle_scope(isolate);
    Local<Context> context = env_->context();
    
    Local<Object> data = Object::New(isolate);
    data->Set(
        context,
        String::NewFromUtf8(isolate, "operation").ToLocalChecked(),
        String::NewFromUtf8(isolate, op_name_).ToLocalChecked()
    ).Check();
    data->Set(
        context,
        String::NewFromUtf8(isolate, "time").ToLocalChecked(),
        v8::Number::New(isolate, uv_hrtime())
    ).Check();
    
    diagnostics_channel::Publish(env_, channel.c_str(), data);
  }
  
  Environment* env_;
  const char* op_name_;
  uint64_t start_time_;
};

// Usage:
void DoWork(Environment* env) {
  OperationTracer tracer(env, "database_query");
  // Work happens here
  // Tracer automatically publishes start/end events
}
```

## Integration with Node.js Core

The diagnostics channel C++ API is registered as an internal binding in Node.js core:

1. **Registration**: Added to `NODE_BUILTIN_STANDARD_BINDINGS` in `src/node_binding.cc`
2. **Initialization**: Uses `NODE_BINDING_CONTEXT_AWARE_INTERNAL` macro
3. **External References**: Registered for snapshot support via `NODE_BINDING_EXTERNAL_REFERENCE`

## Best Practices

1. **Check for Subscribers**: Always check `HasSubscribers()` before creating expensive message objects
2. **Use Meaningful Channel Names**: Use namespaced names like `module:event:type`
3. **Keep Messages Simple**: Avoid complex objects that are expensive to create
4. **Handle Errors Gracefully**: The API is designed to fail silently if the JS module isn't available
5. **Use RAII for Tracing**: Use constructor/destructor patterns for automatic event publishing

## Channel Naming Conventions

Follow these conventions for channel names:

- Use lowercase with colons as separators: `module:category:event`
- Examples:
  - `http:request:start`
  - `http:request:end`
  - `fs:read:start`
  - `fs:read:end`
  - `net:connection:open`
  - `net:connection:close`

## Performance Considerations

- **Zero Cost When Unused**: If no JavaScript code subscribes to a channel, the overhead is minimal (just a check)
- **Lazy Message Creation**: Use `HasSubscribers()` to avoid creating message objects when not needed
- **Efficient Publishing**: The C++ API directly calls into the JavaScript module without unnecessary copies

## Compatibility

This API is designed for use within Node.js core C++ code. It requires:

- Access to `Environment*` pointer
- V8 isolate and context
- The `diagnostics_channel` JavaScript module to be available

## Future Enhancements

Potential future improvements:

1. **Direct C++ Subscribers**: Allow C++ code to subscribe to channels
2. **Channel Caching**: Cache channel objects for better performance
3. **Typed Messages**: Support for structured message types
4. **Async Publishing**: Support for publishing from non-V8 threads

## Related Documentation

- [Diagnostics Channel JavaScript API](https://nodejs.org/api/diagnostics_channel.html)
- [Node.js C++ Bindings](src/README.md)
- [Node.js Tracing](https://nodejs.org/api/tracing.html)
