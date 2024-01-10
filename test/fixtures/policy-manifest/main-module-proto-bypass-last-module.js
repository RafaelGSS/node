require('./valid-module');
console.log(process.mainModule.__proto__.require('os'));