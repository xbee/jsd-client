'use strict';
var express = require('express');
var cookieParser = require('cookie-parser');
var evercookieMiddleware = require('evercookie');
var serveStatic = require('serve-static');
//var evercookieMiddleware = require('../index');

var app = express();
app.use(cookieParser());
app.use(evercookieMiddleware.backend());
//app.use(express.static(__dirname + '/bower_components/evercookie')); // be careful, you may want to use path.join instead!
app.use(serveStatic('.', {'index': ['index.html', 'default.htm']}));


app.listen(8081,function(err){
  if(err){
    throw err;
  }
  console.info('Listening on %s', 8081);
});

