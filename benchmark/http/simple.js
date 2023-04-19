'use strict';
const common = require('../common.js');

const bench = common.createBenchmark(main, {
  // Unicode confuses ab on os x.
  type: ['bytes', 'buffer'],
  len: [1024],
  chunks: [4],
  c: [100],
  chunkedEnc: [0],
  duration: 10,
});

function main({ type, len, chunks, c, chunkedEnc, duration }) {
  const server = require('../fixtures/simple-http-server.js')
  .listen(0)
  .on('listening', () => {
    const path = `/${type}/${len}/${chunks}/normal/${chunkedEnc}`;

    bench.http({
      path,
      connections: c,
      duration,
      port: server.address().port,
    }, () => {
      server.close();
    });
  });
}
