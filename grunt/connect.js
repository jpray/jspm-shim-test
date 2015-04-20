var rewriteModule = require('http-rewrite-middleware');

module.exports = {
  options: {},
  src: {
    options: {
      port: 8088, // change this value if connect server fails with port already in use error
      base: ['.'],
      open: true,
      keepalive : true,
    }
  }
};