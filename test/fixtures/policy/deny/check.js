const assert = require('assert')

assert(process.policy.check)

console.log(process.policy.check('fs'))
console.log(process.policy.check('fs.in'))
console.log(process.policy.check('fs.out'))
