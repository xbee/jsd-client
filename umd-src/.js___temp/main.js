define(['require', 'exports', 'module', './app', 'jquery'], function (require, exports, module, jsd, $) {
  

var app = new jsd.App($("body"));
  app.render();


})