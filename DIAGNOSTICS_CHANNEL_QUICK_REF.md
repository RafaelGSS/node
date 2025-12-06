# Diagnostics Channel C++ API - Quick Reference

## Include
```cpp
#include "node_diagnostics_channel.h"
```

## Namespace
```cpp
using node::diagnostics_channel;
```

## API Functions

### Check for Subscribers
```cpp
bool HasSubscribers(Environment* env, const char* channel_name);
bool HasSubscribers(Environment* env, v8::Local<v8::String> channel_name);
```

### Publish Message
```cpp
void Publish(Environment* env, const char* channel_name, v8::Local<v8::Value> message);
void Publish(Environment* env, v8::Local<v8::String> channel_name, v8::Local<v8::Value> message);
```

## Quick Examples

### 1. Simple String Message
```cpp
diagnostics_channel::Publish(env, "my-channel", 
    String::NewFromUtf8(isolate, "Hello").ToLocalChecked());
```

### 2. Check Before Publishing
```cpp
if (diagnostics_channel::HasSubscribers(env, "my-channel")) {
    diagnostics_channel::Publish(env, "my-channel", message);
}
```

### 3. Publish Object
```cpp
Local<Object> data = Object::New(isolate);
data->Set(context, 
    String::NewFromUtf8(isolate, "key").ToLocalChecked(),
    String::NewFromUtf8(isolate, "value").ToLocalChecked()
).Check();

diagnostics_channel::Publish(env, "my-channel", data);
```

### 4. RAII Tracing Pattern
```cpp
class Tracer {
public:
    Tracer(Environment* env, const char* name) : env_(env), name_(name) {
        if (diagnostics_channel::HasSubscribers(env_, name_)) {
            // Publish start event
        }
    }
    ~Tracer() {
        if (diagnostics_channel::HasSubscribers(env_, name_)) {
            // Publish end event
        }
    }
private:
    Environment* env_;
    const char* name_;
};

void MyFunction(Environment* env) {
    Tracer t(env, "my-function");
    // Do work
}
```

## JavaScript Subscriber
```javascript
const dc = require('diagnostics_channel');

dc.subscribe('my-channel', (message, name) => {
    console.log('Received:', message);
});
```

## Channel Naming Convention
```
module:category:event
```

Examples:
- `http:request:start`
- `http:request:end`
- `fs:read:start`
- `fs:read:end`

## Performance Tips

✅ **DO**: Check for subscribers before creating expensive objects
```cpp
if (diagnostics_channel::HasSubscribers(env, "channel")) {
    Local<Object> expensive = CreateExpensiveObject();
    diagnostics_channel::Publish(env, "channel", expensive);
}
```

❌ **DON'T**: Always create objects even when no one is listening
```cpp
Local<Object> expensive = CreateExpensiveObject();  // Wasteful!
diagnostics_channel::Publish(env, "channel", expensive);
```

## Common Use Cases

### HTTP Request Tracing
```cpp
void OnRequest(Environment* env, const char* method, const char* url) {
    if (!diagnostics_channel::HasSubscribers(env, "http:request")) return;
    
    Local<Object> data = Object::New(isolate);
    // ... populate data ...
    diagnostics_channel::Publish(env, "http:request", data);
}
```

### File System Operations
```cpp
void OnFileRead(Environment* env, const char* path, size_t bytes) {
    if (!diagnostics_channel::HasSubscribers(env, "fs:read")) return;
    
    Local<Object> data = Object::New(isolate);
    // ... populate data ...
    diagnostics_channel::Publish(env, "fs:read", data);
}
```

### Error Reporting
```cpp
void OnError(Environment* env, const char* error_msg) {
    diagnostics_channel::Publish(env, "error", 
        String::NewFromUtf8(isolate, error_msg).ToLocalChecked());
}
```

## Files
- **Header**: `src/node_diagnostics_channel.h`
- **Implementation**: `src/node_diagnostics_channel.cc`
- **Examples**: `src/node_diagnostics_channel_example.cc`
- **Tests**: `test/parallel/test-diagnostics-channel-cpp.js`
- **Docs**: `DIAGNOSTICS_CHANNEL_CPP_API.md`
