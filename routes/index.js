var express = require('express');
var router = express.Router();
var modes = require('../src/client-includes.js');
var buildify = require('buildify');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

router.get('/client.js', function (req, res) {
  var ua = req.headers['user-agent'];
  var referer = req.headers.referer;
  var domain = 'localhost';
  if (referer) {
    try {
      domain = url.parse(req.headers.referer).hostname;
    } catch (e) {
      console.error(e);
      console.error('printing request headers');
      console.error(req.headers);
    }

  }

  console.log('/client.js requested. Parsing user agent ' + ua);

  var debug = false;
  try {
    debug = (domain == 'localhost') || url.parse(req.headers.referer).query == 'debuggee';
  } catch (err) {}

  //get info from IP
  var ip = null;
  ip = req.ip;
  console.log(ip + " has requested a connection");

  var key = req.param('key') || '0000';
  console.log('The api key: ', key);

  var mode = req.query["mode"] || modes.FULL; //default: full client
  var files = [];
  if (modes[mode]) {
    files = (modes[mode]);
  }

  var js = buildify().concat(files);
  //js = js.perform(function (content) {
  //    return content.replace(/jsd.config.BLOCK_SIZE/g, config.blockSize);
  //});
//
//        var port = req.query["port"] || process.env.WS_PORT;
//        if (port) {
//            js = js.perform(function (content) {
//                return content.replace(/jsd.config.WS_PORT/g, "\'" + port + "\'");
//            });
//        }
//        var server = req.query["server"] || process.env.WS_SERVER;
//        if (server) {
//            js = js.perform(function (content) {
//                return content.replace(/jsd.config.WS_SERVER/g, "\'" + server + "\'");
//            });
//        }

  if (key !== '13723479439') {
    debug = false;
  }

  if (!debug) {
    js = js.uglify();
  }

  res.setHeader('Content-Type', 'text/javascript');
  res.send(200, js.content);
});

// add tracker [img] in router
router.get('/tracker.jpg',function(req, res, next){
  res.render('demo',{
    tracker: res.locals.tracker // or use in jade directly
  });
});

module.exports = router;
