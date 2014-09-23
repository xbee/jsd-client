/*jslint browser: true, unparam: true, sloppy: true */
/*global SessionError, CallError */

(function () {
    var orcaStub, currentSessions = {}, previousCall = null, SessionStatus, CallStatus;

    SessionStatus = {};
    SessionStatus.CONNECTED = 'connected';
    SessionStatus.CONNECTING = 'connecting';
    SessionStatus.DISCONNECTED = 'disconnected';
    SessionStatus.INCOMINGCALL = 'incomingCall';

    CallStatus = {};
    CallStatus.CONNECTING = 'connecting';
    CallStatus.HOLD = 'hold';
    CallStatus.UNHOLD = 'unhold';
    CallStatus.REJECTED = 'rejected';
    CallStatus.CONNECTED = 'connected';
    CallStatus.DISCONNECTED = 'disconnected';
    CallStatus.ADDSTREAM = 'stream:add';

    function Call(to, mediaTypes, session, callback, isIncoming) {
        this.to = to;
        this.mediaTypes = mediaTypes;
        this.session = session;
        this.callback = callback;
        this.isIncoming = isIncoming;
        this.parallel = null;
        this.remoteStreamsList = [];
        this.localStreamsList = [];
        if (isIncoming) {
            this.status = CallStatus.CONNECTING;
            this.inStatus = CallStatus.CONNECTING;
        } else {
            this.status = undefined; // pre connect()
            this.inStatus = undefined;
        }
        if (previousCall) {
            previousCall = this;
        }

        this.triggerEvent = function (status, stream) {
            var eventInfo = {}, i;
            if (stream) {
                eventInfo.stream = stream;
                this.remoteStreamsList.push(stream);
            } else {
                this.status = status;
                this.inStatus = status;
                if (status === CallStatus.DISCONNECTED || status === CallStatus.REJECTED) {
                    this.session.removeCall(this);
                }
            }
            this.emitter.emit(status, eventInfo, this.callback);
        };

        this.remoteIdentities = function () {
            var result = [{id: this.to}];
            return result;
        };

        this.addStream = function (stream) {
            this.localStreamsList.push(stream);
        };

        this.connect = function () {
            var i, s, u;
            if (this.isIncoming) {
                this.callback.triggerEvent(CallStatus.CONNECTED);
                this.callback.parallel.triggerEvent(CallStatus.CONNECTED);
                s = this.callback.streams('local');
                for (i = 0; i < s.length; i += 1) {
                    this.callback.parallel.triggerEvent(CallStatus.ADDSTREAM, s[i]);
                }
                s = this.callback.parallel.streams('local');
                for (i = 0; i < s.length; i += 1) {
                    this.callback.triggerEvent(CallStatus.ADDSTREAM, s[i]);
                }
            } else {
                for (u in currentSessions) {
                    if (currentSessions.hasOwnProperty(u)) {
                        if (u === this.to && currentSessions[u] && currentSessions[u].callback &&
                            currentSessions[u].getStatus() === SessionStatus.CONNECTED) {
                            this.session.calls.push(this.callback);
                            this.callback.parallel = currentSessions[u].callback.triggerEvent(SessionStatus.INCOMINGCALL, this.session.userId, mediaTypes);
                            this.callback.parallel.parallel = this.callback;
                            this.callback.triggerEvent(CallStatus.CONNECTING);
                            return;
                        }
                    }
                }
                this.callback.triggerEvent(CallStatus.REJECTED);
            }
        };

        this.disconnect = function () {
            this.callback.triggerEvent(CallStatus.DISCONNECTED);
            if (this.callback.parallel) {
                this.callback.parallel.triggerEvent(CallStatus.DISCONNECTED);
            }
        };

        this.reject = function () {
            if (this.isIncoming && this.callback.parallel) {
                this.session.removeCall(this);
                this.callback.parallel.triggerEvent(CallStatus.REJECTED);
            }
        };

        this.remoteStreams = function () {
            return this.remoteStreamsList;
        };

        this.localStreams = function () {
            return this.localStreamsList;
        };

        this.getStatus = function () {
            return this.status;
        };

    }

    function Session(userId, token, config, callback) {
        this.userId = userId;
        this.callback = callback;
        this.status = SessionStatus.DISCONNECTED;
        this.inStatus = SessionStatus.DISCONNECTED;
        this.calls = [];
        currentSessions[userId] = this;

        this.triggerEvent = function (status, call) {
            var eventInfo = {}, i;
            if (call) {
                eventInfo.call = call;
                this.calls.push(call);
            } else {
                this.status = status;
                this.inStatus = status;
                if (status === SessionStatus.DISCONNECTED) {
                    for (i = 0; i < this.calls.length; i += 1) {
                        this.calls[i].parallel.triggerEvent(CallStatus.DISCONNECTED);
                        this.calls[i].triggerEvent(CallStatus.DISCONNECTED);
                    }
                }
            }
            this.emitter.emit(status, eventInfo, this.callback);
        };

        this.removeCall = function (call) {
            var i;
            if (call.callback !== 'undefined') {
                call = call.callback;
            }
            for (i = 0; i < this.calls.length; i += 1) {
                if (call.id() === this.calls[i].id()) {
                    this.calls.splice(i, 1);
                    break;
                }
            }
        };

        this.connect = function () {
            if (this.inStatus === SessionStatus.DISCONNECTED) {
                this.inStatus = SessionStatus.CONNECTING;
                var self = this;
                setTimeout(function () {
                    self.triggerEvent(SessionStatus.CONNECTING);
                }, 200);
                setTimeout(function () {
                    self.triggerEvent(SessionStatus.CONNECTED);
                    self.inStatus = SessionStatus.CONNECTED;
                }, 600);
            }
        };

        this.createCall = function (to, mediatypes, session, callback, isIncoming) {
            return new Call(to, mediatypes, session, callback, isIncoming);
        };

        this.disconnect = function () {
            this.inStatus = SessionStatus.DISCONNECTED;
            var self = this;
            setTimeout(function () {
                self.triggerEvent(SessionStatus.DISCONNECTED);
            }, 300);
        };

        this.getStatus = function () {
            return this.status;
        };

    }

    orcaStub = {

        createSession: function (userid, token, sessionConfig, callback) {
            return new Session(userid, token, sessionConfig, callback);
        }

    };

    this.orcaStub = orcaStub;

}());