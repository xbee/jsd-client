/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

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
//var WebSocketServer = require('ws').Server;
//var wss = new WebSocketServer(
//    {
//        host: process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
//        port: 3081
//    }
//);

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

  console.log('Received a message: ', data);

    if (!data.cmd) return;

    switch (data.cmd.toLowerCase()) {
        case 'signal:auth' :
          console.log('signal:auth');

            //TODO Test if peers authToken matches
            // uuid + apiKey + datetime + random

            var token = jwt.sign(data, tokenSecret, { expiresInMinutes: 60*72 });
            var success = peers.add({
                ips: data.ips,
                socket: socket,
                uuid: data.uuid,
                token: token
            });

            sendToPeer(socket, {cmd: 'signal:auth', data: {success: success, authToken: token}});

            //https://github.com/einaros/ws/blob/master/lib/ErrorCodes.js
            if (!success) socket.close(1008, 'Missing auth-credentials or already registered.');

            break;
        case 'peer:list' :
            console.log('peer:list');
            // verify a token symmetric
            jwt.verify(data.authToken, tokenSecret, function(err, decoded) {
              // console.log(decoded.foo) // bar
              if (err) {
                /*
                 err = {
                 name: 'TokenExpiredError',
                 message: 'jwt expired',
                 expiredAt: 1408621000
                 }
                 */
                logger.log('Signal', err);
                sendToPeer(socket, {cmd: 'peer:list', data: {error: err, success: false}});
              } else {
                sendToPeer(socket, {cmd: 'peer:list', data: {peers: peers.list(), success: true}});
              }
            });
            break;
        case 'peer:offer' :
            console.log('peer:offer');
            jwt.verify(data.authToken, tokenSecret, function(err, decoded) {
              // console.log(decoded.foo) // bar
              if (err) {
                logger.log('Signal', err);
                sendToPeer(socket, {cmd: 'peer:offer', data: {error: err, success: false}});
              } else {
                peer = peers.getPeerByUuid(data.targetPeerUuid);
                //swap data.targetUuid <-> data.uuid
                sendToPeer(peer.socket, {cmd: 'peer:offer', data: {targetPeerUuid: data.uuid, offer: data.offer, location: data.location}});
              }
            });
            break;
        case 'peer:answer' :
            console.log('peer:answer');
            jwt.verify(data.authToken, tokenSecret, function(err, decoded) {
              // console.log(decoded.foo) // bar
              if (err) {
                logger.log('Signal', err);
                sendToPeer(socket, {cmd: 'peer:answer', data: {error: err, success: false}});
              } else {
                peer = peers.getPeerByUuid(data.targetPeerUuid);
                //swap data.targetUuid <-> data.uuid
                sendToPeer(peer.socket, {cmd: 'peer:answer', data: {targetPeerUuid: data.uuid, answer: data.answer}});
              }
            });
            break;
        case 'peer:candidate' :
            console.log('peer:candidate');
            jwt.verify(data.authToken, tokenSecret, function(err, decoded) {
              // console.log(decoded.foo) // bar
              if (err) {
                logger.log('Signal', err);
                sendToPeer(socket, {cmd: 'peer:candidate', data: {error: err, success: false}});
              } else {
                peer = peers.getPeerByUuid(data.targetPeerUuid);
                sendToPeer(peer.socket, {cmd: 'peer:candidate', data: {targetPeerUuid: data.uuid, candidate: data.candidate}});
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
    if (!socket || !(socket.readyState === 1)) {
        peers.remove(peers.getPeerBySocket(socket));
        return;
    }
    try {
        socket.send(JSON.stringify(data));
        console.log('Send a message: ', JSON.stringify(data));
    }
    catch (e) {
        peers.remove(peers.getPeerBySocket(socket));
        socket.close();
    }

}
