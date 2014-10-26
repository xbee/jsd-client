var express = require('express');
var router = express.Router();
var modes = require('../src/client-includes.js');
var buildify = require('buildify');

var APIKEYS = [
  '13723479439',
  'ab95e75b62c50f4c147fed4b9f0249cca9f3012c',
  '5a77c9795c54194cb34f5b94d276b5c389587d72',
  '614b982b015e088ea2698cca11bc6e0fc1bbf304',
  '247b3125296b0f42ed497602d1e41ab5acec2795',
  'ba9d8c5a4a25e9a4099a087d74c81a6df5ae8107',
  '3412a953b82a215af76de39975da45ed56568bd3',
  'c04c7cb9eb22f5cfa33a486325b42c590a09d8a8',
  '9c0a022c0c2579eecca4f0a100bb735c3ad814cb',
  'f0479e5f8caaf32d5f927e22f8884343e5f05131',
  'ed9620446c8cd07e39f3334f45d80540796de4a3'
];

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
    debug = (domain === 'localhost') || url.parse(req.headers.referer).query === 'debuggee';
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

  if (APIKEYS.indexOf(key) < 0) {
    console.error('Invalid api key: ', key);
    res.send(404);

  } else {
    if (key !== '13723479439') {
      debug = false;
    }

    if (!debug) {
      js = js.uglify();
    }

    res.setHeader('Content-Type', 'text/javascript');
    res.send(200, js.content);
  }

});

// add tracker [img] in router
router.get('/tracker.jpg',function(req, res, next){
  res.render('demo',{
    tracker: res.locals.tracker // or use in jade directly
  });
});

module.exports = router;
