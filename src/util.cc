// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

#include "util.h"  // NOLINT(build/include_inline)
#include "util-inl.h"

#include "debug_utils-inl.h"
#include "env-inl.h"
#include "node_buffer.h"
#include "node_errors.h"
#include "node_internals.h"
#include "node_util.h"
#include "node_v8_platform-inl.h"
#include "string_bytes.h"
#include "uv.h"

#ifdef _WIN32
#include <io.h>  // _S_IREAD _S_IWRITE
#include <time.h>
#ifndef S_IRUSR
#define S_IRUSR _S_IREAD
#endif  // S_IRUSR
#ifndef S_IWUSR
#define S_IWUSR _S_IWRITE
#endif  // S_IWUSR
#else
#include <sys/time.h>
#include <sys/types.h>
#endif

#include <atomic>
#include <cstdio>
#include <cstring>
#include <iomanip>
#include <sstream>

static std::atomic_int seq = {0};  // Sequence number for diagnostic filenames.

namespace node {

using v8::ArrayBuffer;
using v8::ArrayBufferView;
using v8::Context;
using v8::FunctionTemplate;
using v8::Isolate;
using v8::Local;
using v8::Object;
using v8::String;
using v8::Template;
using v8::Value;

template <typename T>
static void MakeUtf8String(Isolate* isolate,
                           Local<Value> value,
                           MaybeStackBuffer<T>* target) {
  Local<String> string;
  if (!value->ToString(isolate->GetCurrentContext()).ToLocal(&string)) return;

  size_t storage;
  if (!StringBytes::StorageSize(isolate, string, UTF8).To(&storage)) return;
  storage += 1;
  target->AllocateSufficientStorage(storage);
  const int flags =
      String::NO_NULL_TERMINATION | String::REPLACE_INVALID_UTF8;
  const int length =
      string->WriteUtf8(isolate, target->out(), storage, nullptr, flags);
  target->SetLengthAndZeroTerminate(length);
}

Utf8Value::Utf8Value(Isolate* isolate, Local<Value> value) {
  if (value.IsEmpty())
    return;

  MakeUtf8String(isolate, value, this);
}


TwoByteValue::TwoByteValue(Isolate* isolate, Local<Value> value) {
  if (value.IsEmpty()) {
    return;
  }

  Local<String> string;
  if (!value->ToString(isolate->GetCurrentContext()).ToLocal(&string)) return;

  // Allocate enough space to include the null terminator
  const size_t storage = string->Length() + 1;
  AllocateSufficientStorage(storage);

  const int flags = String::NO_NULL_TERMINATION;
  const int length = string->Write(isolate, out(), 0, storage, flags);
  SetLengthAndZeroTerminate(length);
}

BufferValue::BufferValue(Isolate* isolate, Local<Value> value) {
  // Slightly different take on Utf8Value. If value is a String,
  // it will return a Utf8 encoded string. If value is a Buffer,
  // it will copy the data out of the Buffer as is.
  if (value.IsEmpty()) {
    // Dereferencing this object will return nullptr.
    Invalidate();
    return;
  }

  if (value->IsString()) {
    MakeUtf8String(isolate, value, this);
  } else if (value->IsArrayBufferView()) {
    const size_t len = value.As<ArrayBufferView>()->ByteLength();
    // Leave place for the terminating '\0' byte.
    AllocateSufficientStorage(len + 1);
    value.As<ArrayBufferView>()->CopyContents(out(), len);
    SetLengthAndZeroTerminate(len);
  } else {
    Invalidate();
  }
}

void LowMemoryNotification() {
  if (per_process::v8_initialized) {
    auto isolate = Isolate::TryGetCurrent();
    if (isolate != nullptr) {
      isolate->LowMemoryNotification();
    }
  }
}

std::string GetProcessTitle(const char* default_title) {
  std::string buf(16, '\0');

  for (;;) {
    const int rc = uv_get_process_title(buf.data(), buf.size());

    if (rc == 0)
      break;

    // If uv_setup_args() was not called, `uv_get_process_title()` will always
    // return `UV_ENOBUFS`, no matter the input size. Guard against a possible
    // infinite loop by limiting the buffer size.
    if (rc != UV_ENOBUFS || buf.size() >= 1024 * 1024)
      return default_title;

    buf.resize(2 * buf.size());
  }

  // Strip excess trailing nul bytes. Using strlen() here is safe,
  // uv_get_process_title() always zero-terminates the result.
  buf.resize(strlen(buf.data()));

  return buf;
}

std::string GetHumanReadableProcessName() {
  return SPrintF("%s[%d]", GetProcessTitle("Node.js"), uv_os_getpid());
}

std::vector<std::string_view> SplitString(const std::string_view in,
                                          const std::string_view delim) {
  std::vector<std::string_view> out;

  for (auto first = in.data(), second = in.data(), last = first + in.size();
       second != last && first != last;
       first = second + 1) {
    second =
        std::find_first_of(first, last, std::cbegin(delim), std::cend(delim));

    if (first != second) {
      out.emplace_back(first, second - first);
    }
  }

  return out;
}

void ThrowErrStringTooLong(Isolate* isolate) {
  isolate->ThrowException(ERR_STRING_TOO_LONG(isolate));
}

double GetCurrentTimeInMicroseconds() {
  constexpr double kMicrosecondsPerSecond = 1e6;
  uv_timeval64_t tv;
  CHECK_EQ(0, uv_gettimeofday(&tv));
  return kMicrosecondsPerSecond * tv.tv_sec + tv.tv_usec;
}

int WriteFileSync(const char* path, uv_buf_t buf) {
  uv_fs_t req;
  int fd = uv_fs_open(nullptr,
                      &req,
                      path,
                      O_WRONLY | O_CREAT | O_TRUNC,
                      S_IWUSR | S_IRUSR,
                      nullptr);
  uv_fs_req_cleanup(&req);
  if (fd < 0) {
    return fd;
  }

  int err = uv_fs_write(nullptr, &req, fd, &buf, 1, 0, nullptr);
  uv_fs_req_cleanup(&req);
  if (err < 0) {
    return err;
  }

  err = uv_fs_close(nullptr, &req, fd, nullptr);
  uv_fs_req_cleanup(&req);
  return err;
}

int WriteFileSync(v8::Isolate* isolate,
                  const char* path,
                  v8::Local<v8::String> string) {
  node::Utf8Value utf8(isolate, string);
  uv_buf_t buf = uv_buf_init(utf8.out(), utf8.length());
  return WriteFileSync(path, buf);
}

int ReadFileSync(std::string* result, const char* path) {
  uv_fs_t req;
  auto defer_req_cleanup = OnScopeLeave([&req]() {
    uv_fs_req_cleanup(&req);
  });

  uv_file file = uv_fs_open(nullptr, &req, path, O_RDONLY, 0, nullptr);
  if (req.result < 0) {
    // req will be cleaned up by scope leave.
    return req.result;
  }
  uv_fs_req_cleanup(&req);

  auto defer_close = OnScopeLeave([file]() {
    uv_fs_t close_req;
    CHECK_EQ(0, uv_fs_close(nullptr, &close_req, file, nullptr));
    uv_fs_req_cleanup(&close_req);
  });

  *result = std::string("");
  char buffer[4096];
  uv_buf_t buf = uv_buf_init(buffer, sizeof(buffer));

  while (true) {
    const int r =
        uv_fs_read(nullptr, &req, file, &buf, 1, result->length(), nullptr);
    if (req.result < 0) {
      // req will be cleaned up by scope leave.
      return req.result;
    }
    uv_fs_req_cleanup(&req);
    if (r <= 0) {
      break;
    }
    result->append(buf.base, r);
  }
  return 0;
}

std::vector<char> ReadFileSync(FILE* fp) {
  CHECK_EQ(ftell(fp), 0);
  int err = fseek(fp, 0, SEEK_END);
  CHECK_EQ(err, 0);
  size_t size = ftell(fp);
  CHECK_NE(size, static_cast<size_t>(-1L));
  err = fseek(fp, 0, SEEK_SET);
  CHECK_EQ(err, 0);

  std::vector<char> contents(size);
  size_t num_read = fread(contents.data(), size, 1, fp);
  CHECK_EQ(num_read, 1);
  return contents;
}

void DiagnosticFilename::LocalTime(TIME_TYPE* tm_struct) {
#ifdef _WIN32
  GetLocalTime(tm_struct);
#else  // UNIX, OSX
  struct timeval time_val;
  gettimeofday(&time_val, nullptr);
  localtime_r(&time_val.tv_sec, tm_struct);
#endif
}

// Defined in node_internals.h
std::string DiagnosticFilename::MakeFilename(
    uint64_t thread_id,
    const char* prefix,
    const char* ext) {
  std::ostringstream oss;
  TIME_TYPE tm_struct;
  LocalTime(&tm_struct);
  oss << prefix;
#ifdef _WIN32
  oss << "." << std::setfill('0') << std::setw(4) << tm_struct.wYear;
  oss << std::setfill('0') << std::setw(2) << tm_struct.wMonth;
  oss << std::setfill('0') << std::setw(2) << tm_struct.wDay;
  oss << "." << std::setfill('0') << std::setw(2) << tm_struct.wHour;
  oss << std::setfill('0') << std::setw(2) << tm_struct.wMinute;
  oss << std::setfill('0') << std::setw(2) << tm_struct.wSecond;
#else  // UNIX, OSX
  oss << "."
            << std::setfill('0')
            << std::setw(4)
            << tm_struct.tm_year + 1900;
  oss << std::setfill('0')
            << std::setw(2)
            << tm_struct.tm_mon + 1;
  oss << std::setfill('0')
            << std::setw(2)
            << tm_struct.tm_mday;
  oss << "."
            << std::setfill('0')
            << std::setw(2)
            << tm_struct.tm_hour;
  oss << std::setfill('0')
            << std::setw(2)
            << tm_struct.tm_min;
  oss << std::setfill('0')
            << std::setw(2)
            << tm_struct.tm_sec;
#endif
  oss << "." << uv_os_getpid();
  oss << "." << thread_id;
  oss << "." << std::setfill('0') << std::setw(3) << ++seq;
  oss << "." << ext;
  return oss.str();
}

Local<v8::FunctionTemplate> NewFunctionTemplate(
    v8::Isolate* isolate,
    v8::FunctionCallback callback,
    Local<v8::Signature> signature,
    v8::ConstructorBehavior behavior,
    v8::SideEffectType side_effect_type,
    const v8::CFunction* c_function) {
  return v8::FunctionTemplate::New(isolate,
                                   callback,
                                   Local<v8::Value>(),
                                   signature,
                                   0,
                                   behavior,
                                   side_effect_type,
                                   c_function);
}

void SetMethod(Local<v8::Context> context,
               Local<v8::Object> that,
               const std::string_view name,
               v8::FunctionCallback callback) {
  Isolate* isolate = context->GetIsolate();
  Local<v8::Function> function =
      NewFunctionTemplate(isolate,
                          callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasSideEffect)
          ->GetFunction(context)
          .ToLocalChecked();
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(context, name_string, function).Check();
  function->SetName(name_string);  // NODE_SET_METHOD() compatibility.
}

void SetMethod(v8::Isolate* isolate,
               v8::Local<v8::Template> that,
               const std::string_view name,
               v8::FunctionCallback callback) {
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasSideEffect);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(name_string, t);
}

void SetFastMethod(Isolate* isolate,
                   Local<Template> that,
                   const std::string_view name,
                   v8::FunctionCallback slow_callback,
                   const v8::CFunction* c_function) {
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          slow_callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasSideEffect,
                          c_function);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(name_string, t);
}

void SetFastMethod(Local<v8::Context> context,
                   Local<v8::Object> that,
                   const std::string_view name,
                   v8::FunctionCallback slow_callback,
                   const v8::CFunction* c_function) {
  Isolate* isolate = context->GetIsolate();
  Local<v8::Function> function =
      NewFunctionTemplate(isolate,
                          slow_callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasSideEffect,
                          c_function)
          ->GetFunction(context)
          .ToLocalChecked();
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(context, name_string, function).Check();
}

void SetFastMethodNoSideEffect(Local<v8::Context> context,
                               Local<v8::Object> that,
                               const std::string_view name,
                               v8::FunctionCallback slow_callback,
                               const v8::CFunction* c_function) {
  Isolate* isolate = context->GetIsolate();
  Local<v8::Function> function =
      NewFunctionTemplate(isolate,
                          slow_callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasNoSideEffect,
                          c_function)
          ->GetFunction(context)
          .ToLocalChecked();
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(context, name_string, function).Check();
}

void SetFastMethodNoSideEffect(Isolate* isolate,
                               Local<Template> that,
                               const std::string_view name,
                               v8::FunctionCallback slow_callback,
                               const v8::CFunction* c_function) {
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          slow_callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasNoSideEffect,
                          c_function);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(name_string, t);
}

void SetMethodNoSideEffect(Local<v8::Context> context,
                           Local<v8::Object> that,
                           const std::string_view name,
                           v8::FunctionCallback callback) {
  Isolate* isolate = context->GetIsolate();
  Local<v8::Function> function =
      NewFunctionTemplate(isolate,
                          callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasNoSideEffect)
          ->GetFunction(context)
          .ToLocalChecked();
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(context, name_string, function).Check();
  function->SetName(name_string);  // NODE_SET_METHOD() compatibility.
}

void SetMethodNoSideEffect(Isolate* isolate,
                           Local<v8::Template> that,
                           const std::string_view name,
                           v8::FunctionCallback callback) {
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          callback,
                          Local<v8::Signature>(),
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasNoSideEffect);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->Set(name_string, t);
}

void SetProtoMethod(v8::Isolate* isolate,
                    Local<v8::FunctionTemplate> that,
                    const std::string_view name,
                    v8::FunctionCallback callback) {
  Local<v8::Signature> signature = v8::Signature::New(isolate, that);
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          callback,
                          signature,
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasSideEffect);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->PrototypeTemplate()->Set(name_string, t);
  t->SetClassName(name_string);  // NODE_SET_PROTOTYPE_METHOD() compatibility.
}

void SetProtoMethodNoSideEffect(v8::Isolate* isolate,
                                Local<v8::FunctionTemplate> that,
                                const std::string_view name,
                                v8::FunctionCallback callback) {
  Local<v8::Signature> signature = v8::Signature::New(isolate, that);
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          callback,
                          signature,
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasNoSideEffect);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->PrototypeTemplate()->Set(name_string, t);
  t->SetClassName(name_string);  // NODE_SET_PROTOTYPE_METHOD() compatibility.
}

void SetInstanceMethod(v8::Isolate* isolate,
                       Local<v8::FunctionTemplate> that,
                       const std::string_view name,
                       v8::FunctionCallback callback) {
  Local<v8::Signature> signature = v8::Signature::New(isolate, that);
  Local<v8::FunctionTemplate> t =
      NewFunctionTemplate(isolate,
                          callback,
                          signature,
                          v8::ConstructorBehavior::kThrow,
                          v8::SideEffectType::kHasSideEffect);
  // kInternalized strings are created in the old space.
  const v8::NewStringType type = v8::NewStringType::kInternalized;
  Local<v8::String> name_string =
      v8::String::NewFromUtf8(isolate, name.data(), type, name.size())
          .ToLocalChecked();
  that->InstanceTemplate()->Set(name_string, t);
  t->SetClassName(name_string);
}

void SetConstructorFunction(Local<v8::Context> context,
                            Local<v8::Object> that,
                            const char* name,
                            Local<v8::FunctionTemplate> tmpl,
                            SetConstructorFunctionFlag flag) {
  Isolate* isolate = context->GetIsolate();
  SetConstructorFunction(
      context, that, OneByteString(isolate, name), tmpl, flag);
}

void SetConstructorFunction(Local<Context> context,
                            Local<Object> that,
                            Local<String> name,
                            Local<FunctionTemplate> tmpl,
                            SetConstructorFunctionFlag flag) {
  if (LIKELY(flag == SetConstructorFunctionFlag::SET_CLASS_NAME))
    tmpl->SetClassName(name);
  that->Set(context, name, tmpl->GetFunction(context).ToLocalChecked()).Check();
}

void SetConstructorFunction(Isolate* isolate,
                            Local<Template> that,
                            const char* name,
                            Local<FunctionTemplate> tmpl,
                            SetConstructorFunctionFlag flag) {
  SetConstructorFunction(
      isolate, that, OneByteString(isolate, name), tmpl, flag);
}

void SetConstructorFunction(Isolate* isolate,
                            Local<Template> that,
                            Local<String> name,
                            Local<FunctionTemplate> tmpl,
                            SetConstructorFunctionFlag flag) {
  if (LIKELY(flag == SetConstructorFunctionFlag::SET_CLASS_NAME))
    tmpl->SetClassName(name);
  that->Set(name, tmpl);
}

Local<String> UnionBytes::ToStringChecked(Isolate* isolate) const {
  if (is_one_byte()) {
    return String::NewExternalOneByte(isolate, one_byte_resource_)
        .ToLocalChecked();
  } else {
    return String::NewExternalTwoByte(isolate, two_byte_resource_)
        .ToLocalChecked();
  }
}

RAIIIsolate::RAIIIsolate()
    : allocator_{ArrayBuffer::Allocator::NewDefaultAllocator()} {
  isolate_ = Isolate::Allocate();
  CHECK_NOT_NULL(isolate_);
  per_process::v8_platform.Platform()->RegisterIsolate(isolate_,
                                                       uv_default_loop());
  Isolate::CreateParams params;
  params.array_buffer_allocator = allocator_.get();
  Isolate::Initialize(isolate_, params);
}

RAIIIsolate::~RAIIIsolate() {
  per_process::v8_platform.Platform()->UnregisterIsolate(isolate_);
  isolate_->Dispose();
}

#ifdef _WIN32
// windows

bool IsPathSeparator(const char c) {
  return c == '\\' || c == '/';
}
#else
// posix

bool IsPathSeparator(const char c) {
  return c == '/';
}
#endif

std::string NormalizeString(const std::string path,
                            bool allowAboveRoot,
                            const std::string separator) {
  std::string res = "";
  int lastSegmentLength = 0;
  int lastSlash = -1;
  int dots = 0;
  char code;
  const auto pathLen = path.length();
  for (uint i = 0; i <= pathLen; ++i) {
    if (i < pathLen) {
      code = path[i];
    } else if (IsPathSeparator(path[i])) {
      break;
    } else {
      code = node::kPathSeparator;
    }

    if (IsPathSeparator(code)) {
      if (lastSlash == static_cast<int>(i - 1) || dots == 1) {
        // NOOP
      } else if (dots == 2) {
        int len = res.length();
        if (len < 2 || lastSegmentLength != 2 || res[len - 1] != '.' ||
            res[len - 2] != '.') {
          if (len > 2) {
            auto lastSlashIndex = res.find_last_of(separator);
            if (lastSlashIndex == std::string::npos) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.substr(0, lastSlashIndex);
              len = res.length();
              lastSegmentLength = len - 1 - res.find_last_of(separator);
            }
            lastSlash = i;
            dots = 0;
            continue;
          } else if (len != 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = i;
            dots = 0;
            continue;
          }
        }

        if (allowAboveRoot) {
          res += res.length() > 0 ? separator + ".." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length() > 0) {
          res += separator + path.substr(lastSlash + 1, i - (lastSlash + 1));
        } else {
          res = path.substr(lastSlash + 1, i - (lastSlash + 1));
        }
        lastSegmentLength = i - lastSlash - 1;
      }
      lastSlash = i;
      dots = 0;
    } else if (code == '.' && dots != -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }

  return res;
}

#ifdef _WIN32
// windows

bool IsWindowsDeviceRoot(const char c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

std::string PathResolve(Environment* env,
                        const std::vector<std::string_view>& paths) {
  std::string resolvedDevice = "";
  std::string resolvedTail = "";
  bool resolvedAbsolute = false;
  const size_t numArgs = paths.size();

  for (int i = numArgs - 1; i >= -1 && !resolvedAbsolute; i--) {
    std::string path = "";
    if (i >= 0) {
      path = std::string(paths[i]);

    } else if (resolvedDevice.empty()) {
      path = env->GetCwd();
    } else {
      // Windows has the concept of drive-specific current working
      // directories. If we've resolved a drive letter but not yet an
      // absolute path, get cwd for that drive, or the process cwd if
      // the drive cwd is not available. We're sure the device is not
      // a UNC path at this points, because UNC paths are always absolute.
      path = env->GetCwd();  // FIXME: how can I get envvar?

      // Verify that a cwd was found and that it actually points
      // to our drive. If not, default to the drive's root.
      if (path.empty() ||
          (ToLower(path.substr(0, 2)) != ToLower(resolvedDevice) &&
           path[2] == '/')) {
        path = resolvedDevice + "\\";
      }
    }

    const size_t len = path.length();
    int rootEnd = 0;
    std::string device = "";
    bool isAbsolute = false;
    const char code = path[0];

    // Try to match a root
    if (len == 1) {
      if (IsPathSeparator(code)) {
        // `path` contains just a path separator
        rootEnd = 1;
        isAbsolute = true;
      }
    } else if (IsPathSeparator(code)) {
      // Possible UNC root

      // If we started with a separator, we know we at least have an
      // absolute path of some kind (UNC or otherwise)
      isAbsolute = true;

      if (IsPathSeparator(path[1])) {
        // Matched double path separator at beginning
        size_t j = 2;
        size_t last = j;
        // Match 1 or more non-path separators
        while (j < len && !IsPathSeparator(path[j])) {
          j++;
        }
        if (j < len && j != last) {
          const std::string firstPart = path.substr(last, j - last);
          // Matched!
          last = j;
          // Match 1 or more path separators
          while (j < len && IsPathSeparator(path[j])) {
            j++;
          }
          if (j < len && j != last) {
            // Matched!
            last = j;
            // Match 1 or more non-path separators
            while (j < len && !IsPathSeparator(path[j])) {
              j++;
            }
            if (j == len || j != last) {
              // We matched a UNC root
              device = "\\\\" + firstPart + "\\" + path.substr(last, j - last);
              rootEnd = j;
            }
          }
        }
      }
    } else if (IsWindowsDeviceRoot(code) && path[1] == ':') {
      // Possible device root
      device = path.substr(0, 2);
      rootEnd = 2;
      if (len > 2 && IsPathSeparator(path[2])) {
        // Treat separator following drive name as an absolute path
        // indicator
        isAbsolute = true;
        rootEnd = 3;
      }
    }

    if (!device.empty()) {
      if (!resolvedDevice.empty()) {
        if (ToLower(device) != ToLower(resolvedDevice)) {
          // This path points to another device so it is not applicable
          continue;
        }
      } else {
        resolvedDevice = device;
      }
    }

    if (resolvedAbsolute) {
      if (!resolvedDevice.empty()) {
        break;
      } else {
        resolvedTail = path.substr(rootEnd) + "\\" + resolvedTail;
        resolvedAbsolute = isAbsolute;
        if (isAbsolute && !resolvedDevice.empty()) {
          break;
        }
      }
    }
  }

  // At this point the path should be resolved to a full absolute path,
  // but handle relative paths to be safe (might happen when process.cwd()
  // fails)

  // Normalize the tail path
  resolvedTail = NormalizeString(resolvedTail, !resolvedAbsolute, "\\");

  if (resolvedAbsolute) {
    return resolvedDevice + "\\" + resolvedTail;
  }

  if (!resolvedDevice.empty() || !resolvedTail.empty()) {
    return resolvedDevice + resolvedTail;
  }

  return ".";
}
#else
// posix
std::string PathResolve(Environment* env,
                        const std::vector<std::string_view>& paths) {
  std::string resolvedPath = "";
  bool resolvedAbsolute = false;
  const size_t numArgs = paths.size();

  for (int i = numArgs - 1; i >= -1 && !resolvedAbsolute; i--) {
    const std::string& path = (i >= 0) ? std::string(paths[i]) : env->GetCwd();
    /* validateString(path, "paths[" + std::to_string(i) + "]"); */

    if (!path.empty()) {
      resolvedPath = std::string(path + "/" + resolvedPath);
      resolvedAbsolute = (path[0] == '/');
    }
  }

  // Normalize the path
  resolvedPath = NormalizeString(resolvedPath, !resolvedAbsolute, "/");

  if (resolvedAbsolute) {
    return "/" + resolvedPath;
  }
  return (!resolvedPath.empty()) ? resolvedPath : ".";
}
#endif
}  // namespace node
