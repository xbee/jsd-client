// help compatibility with node.js require
// let's do var x = require('./x.js') || jsd.z.y.x
// without checking if require is defined
function require() { return null; }