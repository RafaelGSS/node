const fs = require('fs');

const data = fs.readFileSync(__filename, { encoding: 'utf8' });
console.log(data);
