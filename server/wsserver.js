/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */
var fs = require("fs");
var Buffer = require("buffer").Buffer;
//var Png = require("png").Png;

var _ = require('underscore');
var peers = require('./peermanager');
var crypto = require('crypto');
// sign with default (HMAC SHA256)
var jwt = require('jsonwebtoken');
var tokenSecret = 'c7d182da589$b011d79%22ee5@c_18*8(553)5f@!85ea~3_301-2ceb2345b09f7';
//var WebSocket = require('ws');
//var ws = new WebSocket('ws://localhost:3081');

var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({port: 3081});

console.log('listening on 3081 ... ');

var HEARTBEAT_INTERVAL = 1000 * 60; //1m

//Global Exception Handling
process.on('uncaughtException', function (err) {
  console.error(err.stack);
});


wss.on('connection', function (socket) {

  console.log('a client connected ...');
//  peers.add(socket);

//    var heartbeat = setInterval(function () {
//            sendToPeer(socket, {cmd: 'signal:heartbeat'});
//        }, HEARTBEAT_INTERVAL
//    );

  socket.on('message', function (data) {
    console.log('received: %s', data);
    messageHandler(socket, JSON.parse(data));
  });

  socket.on('close', function (e) {
    console.log('client disconnected!');
    peers.remove(peers.getPeerBySocket(socket));
//        clearInterval(heartbeat);
  });

});


function messageHandler(socket, data) {
  var peer;

//  console.log('Received a message: ', data);

  if (!data.cmd) return;
  console.log(data.cmd);

  switch (data.cmd.toLowerCase()) {
    case 'signal:auth' :

      //TODO Test if peers apiKey and host matches
      // from + apiKey + datetime + random
      var client = socket._socket.remoteAddress+':'+socket._socket.remotePort;
      console.log('Client from: ', client);

      var token = jwt.sign(data, tokenSecret, { expiresInMinutes: 60 * 72 });
      var expiresAt = Date.now() + 1000 * 3600 * 72;
      var success = peers.add({
        eip: socket._socket.remoteAddress,
        ips: data.ips,
        socket: socket,
        uuid: data.from,
        host: data.host,
        token: token
      });

      if (success) {
          // TODO: need to broadcast it to client peers
          // peers.publish
      }

      sendToPeer(socket, {cmd: 'signal:auth', data: {success: success, authToken: token, expiresAt: expiresAt}});

      //https://github.com/einaros/ws/blob/master/lib/ErrorCodes.js
      if (!success) socket.close(1008, 'Missing auth-credentials or already registered.');

      break;
    case 'peer:list' :
      // verify a token symmetric
      jwt.verify(data.authToken, tokenSecret, function (err, decoded) {
        // console.log(decoded.foo) // bar
        if (err) {
          /*
           err = {
           name: 'TokenExpiredError',
           message: 'jwt expired',
           expiredAt: 1408621000
           }
           */
          console.log('Signal', err);
          sendToPeer(socket, {cmd: 'peer:list', data: {error: err, success: false}});
        } else {
          peer = peers.getPeerByUuid(data.from);
          sendToPeer(socket, {cmd: 'peer:list', data: {peers: peers.filter(peer), success: true}});
        }
      });
      break;
    case 'peer:sdp':
      jwt.verify(data.authToken, tokenSecret, function (err, decoded) {
        // console.log(decoded.foo) // bar
        if (err) {
          console.log('Signal', err);
          sendToPeer(socket, {
            cmd: 'peer:sdp',
            data: {
              error: err,
              success: false
            }
          });
        } else {
          peer = peers.getPeerByUuid(data.to);
          //do not need to swap data.to <-> data.from !!!
          sendToPeer(peer.socket, {
            cmd: 'peer:sdp',
            data: {
              to: data.to,
              from: data.from,
              sdp: data.sdp
            }
          });
        }
      });
      break;
    case 'peer:offer' :
      jwt.verify(data.authToken, tokenSecret, function (err, decoded) {
        // console.log(decoded.foo) // bar
        if (err) {
          console.log('Signal', err);
          sendToPeer(socket, {cmd: 'peer:offer', data: {error: err, success: false}});
        } else {
          peer = peers.getPeerByUuid(data.to);
          //swap data.to <-> data.from
          sendToPeer(peer.socket, {cmd: 'peer:offer', data: {to: data.from, offer: data.offer}});
        }
      });
      break;
    case 'peer:answer' :
      jwt.verify(data.authToken, tokenSecret, function (err, decoded) {
        // console.log(decoded.foo) // bar
        if (err) {
          console.log('Signal', err);
          sendToPeer(socket, {cmd: 'peer:answer', data: {error: err, success: false}});
        } else {
          peer = peers.getPeerByUuid(data.to);
          //swap data.to <-> data.from
          sendToPeer(peer.socket, {
            cmd: 'peer:answer',
            data: {
              to: data.from,
              answer: data.answer
            }
          });
        }
      });
      break;
    case 'peer:candidate' :
      jwt.verify(data.authToken, tokenSecret, function (err, decoded) {
        // console.log(decoded.foo) // bar
        if (err) {
          console.log('Signal', err);
          sendToPeer(socket, {
            cmd: 'peer:candidate',
            data: {
              error: err,
              success: false
            }
          });
        } else {
          peer = peers.getPeerByUuid(data.to);
          sendToPeer(peer.socket, {
            cmd: 'peer:candidate',
            data: {
              to: data.to,
              from: data.from,
              candidate: data.candidate.candidate
            }
          });
        }
      });
      break;
    case 'peer:participant':
      jwt.verify(data.authToken, tokenSecret, function (err, decoded) {
        // console.log(decoded.foo) // bar
        if (err) {
          console.log('Signal', err);
          sendToPeer(socket, {cmd: 'peer:participant', data: {error: err, success: false}});
        } else {
          peer = peers.getPeerByUuid(data.to);
          sendToPeer(peer.socket, {cmd: 'peer:participant', data: {to: data.to, from: data.from}});
        }
      });
      break;
    default:
      console.log(data);
      break;

  }
}


function sendToPeer(socket, data) {
  //state 1 = ready
  //  Transport.CONNECTING = 0;
  //
  //  Transport.OPEN = 1;
  //
  //  Transport.CLOSING = 2;
  //
  //  Transport.CLOSED = 3;
  if (!socket || !(socket.readyState === 1)) {
    peers.remove(peers.getPeerBySocket(socket));
    return;
  }
  try {

    socket.send(JSON.stringify(data));
    console.log('Send a message: ', JSON.stringify(data));

  } catch (e) {
    console.error(e);
    peers.remove(peers.getPeerBySocket(socket));
    socket.close();
  }

}

//function createCookiePng(xd) {
//  var IMAGE_WIDTH = 200;
//  var IMAGE_HEIGHT = 1;
//
//  var bf = new Buffer(xd, 'hex');
//  var rgb = new Buffer(IMAGE_WIDTH * IMAGE_HEIGHT * 3);
//  // rgb.fill(0); // better to keep it random
//  bf.copy(rgb, 0);
//  var png = new Png(rgb, IMAGE_WIDTH, IMAGE_HEIGHT, "rgb");
//
//  fs.writeFile("cookie.png", png.encodeSync().toString("binary"),
//      "binary");
//}
