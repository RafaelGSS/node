'use strict';

const common = require('../common');
if (!common.hasCrypto)
  common.skip('missing crypto');
const assert = require('assert');
const http2 = require('http2');

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD,
  HTTP2_HEADER_STATUS,
  HTTP2_METHOD_HEAD,
} = http2.constants;

const server = http2.createServer();
server.on('stream', (stream, headers) => {

  assert.strictEqual(headers[HTTP2_HEADER_METHOD], HTTP2_METHOD_HEAD);

  stream.respond({ [HTTP2_HEADER_STATUS]: 200 });
  stream.on('error', common.mustNotCall());
  stream.end();
});


server.listen(0, () => {

  const client = http2.connect(`http://localhost:${server.address().port}`);

  const req = client.request({
    [HTTP2_HEADER_METHOD]: HTTP2_METHOD_HEAD,
    [HTTP2_HEADER_PATH]: '/'
  });

  req.on('response', common.mustCall((headers, flags) => {
    assert.strictEqual(headers[HTTP2_HEADER_STATUS], 200);
    assert.strictEqual(flags, 4);
  }));
  req.on('data', common.mustNotCall());
  req.on('end', common.mustCall(() => {
    server.close();
    client.close();
  }));
});
