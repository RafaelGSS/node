'use strict';
// Test the C++ diagnostics_channel API
// This test demonstrates how the C++ interface works with JavaScript subscribers

const common = require('../common');
const assert = require('assert');
const dc = require('diagnostics_channel');

// Test 1: Basic hasSubscribers and publish from internal binding
{
  const binding = process.binding('diagnostics_channel');
  
  // Initially no subscribers
  assert.strictEqual(binding.hasSubscribers('test-channel'), false);
  
  // Add a subscriber
  const messages = [];
  dc.subscribe('test-channel', common.mustCall((message, name) => {
    messages.push({ message, name });
  }));
  
  // Now should have subscribers
  assert.strictEqual(binding.hasSubscribers('test-channel'), true);
  
  // Publish from C++
  binding.publish('test-channel', 'Hello from C++');
  
  // Verify message was received
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0].message, 'Hello from C++');
  assert.strictEqual(messages[0].name, 'test-channel');
}

// Test 2: Publishing objects from C++
{
  const binding = process.binding('diagnostics_channel');
  
  const messages = [];
  dc.subscribe('test-object-channel', common.mustCall((message) => {
    messages.push(message);
  }));
  
  // Publish an object
  const testObj = { type: 'test', value: 42 };
  binding.publish('test-object-channel', testObj);
  
  assert.strictEqual(messages.length, 1);
  assert.deepStrictEqual(messages[0], testObj);
}

// Test 3: Multiple subscribers
{
  const binding = process.binding('diagnostics_channel');
  
  const messages1 = [];
  const messages2 = [];
  
  dc.subscribe('multi-channel', common.mustCall((message) => {
    messages1.push(message);
  }));
  
  dc.subscribe('multi-channel', common.mustCall((message) => {
    messages2.push(message);
  }));
  
  binding.publish('multi-channel', 'broadcast');
  
  assert.strictEqual(messages1.length, 1);
  assert.strictEqual(messages2.length, 1);
  assert.strictEqual(messages1[0], 'broadcast');
  assert.strictEqual(messages2[0], 'broadcast');
}

// Test 4: hasSubscribers returns false for non-existent channel
{
  const binding = process.binding('diagnostics_channel');
  assert.strictEqual(binding.hasSubscribers('non-existent-channel'), false);
}

// Test 5: Publishing to channel with no subscribers (should not throw)
{
  const binding = process.binding('diagnostics_channel');
  assert.doesNotThrow(() => {
    binding.publish('no-subscribers-channel', 'message');
  });
}

// Test 6: Unsubscribe behavior
{
  const binding = process.binding('diagnostics_channel');
  
  const messages = [];
  function subscriber(message) {
    messages.push(message);
  }
  
  dc.subscribe('unsub-channel', subscriber);
  assert.strictEqual(binding.hasSubscribers('unsub-channel'), true);
  
  binding.publish('unsub-channel', 'first');
  assert.strictEqual(messages.length, 1);
  
  dc.unsubscribe('unsub-channel', subscriber);
  assert.strictEqual(binding.hasSubscribers('unsub-channel'), false);
  
  binding.publish('unsub-channel', 'second');
  // Should still be 1, not 2
  assert.strictEqual(messages.length, 1);
}

// Test 7: Symbol channel names
{
  const binding = process.binding('diagnostics_channel');
  
  const channelSymbol = Symbol('test-symbol-channel');
  const messages = [];
  
  dc.subscribe(channelSymbol, common.mustCall((message) => {
    messages.push(message);
  }));
  
  // Note: C++ API currently only supports string channel names
  // This test verifies that symbol channels work from JS side
  dc.channel(channelSymbol).publish('symbol message');
  
  assert.strictEqual(messages.length, 1);
  assert.strictEqual(messages[0], 'symbol message');
}

// Test 8: Publishing different data types
{
  const binding = process.binding('diagnostics_channel');
  
  const messages = [];
  dc.subscribe('types-channel', (message) => {
    messages.push(message);
  });
  
  // String
  binding.publish('types-channel', 'string');
  assert.strictEqual(messages[messages.length - 1], 'string');
  
  // Number
  binding.publish('types-channel', 42);
  assert.strictEqual(messages[messages.length - 1], 42);
  
  // Boolean
  binding.publish('types-channel', true);
  assert.strictEqual(messages[messages.length - 1], true);
  
  // Null
  binding.publish('types-channel', null);
  assert.strictEqual(messages[messages.length - 1], null);
  
  // Undefined
  binding.publish('types-channel', undefined);
  assert.strictEqual(messages[messages.length - 1], undefined);
  
  // Array
  binding.publish('types-channel', [1, 2, 3]);
  assert.deepStrictEqual(messages[messages.length - 1], [1, 2, 3]);
  
  // Object
  binding.publish('types-channel', { a: 1, b: 2 });
  assert.deepStrictEqual(messages[messages.length - 1], { a: 1, b: 2 });
}

console.log('All tests passed!');
