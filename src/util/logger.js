;(function (exports) {

    var MAX_MESSAGES = 100;

    var output = document.getElementById('log');
    var htmlLogging = true;
    var consoleLogging = true;
    var msgAmount = 0;

    var flat = true;
    var logLevel = jsd.config.LOG_LEVEL; // by default we allow warnings and error
    var friendly = ['0', 'error', "warn", "info", "log", "debug"];
    var Levels = {
        'error' : 1,
        'warn' : 2,
        'info' : 3,
        'log' : 4,
        'debug' : 5
    };

    /**
     * Create a timestamp ( format : HH::MM:SS )
     *
     * @private
     * @method getPrettyTimeStamp
     * @return {String}
     */
    function getPrettyTimeStamp() {
        var current = new Date(),
            date = [],
            hours = current.getHours() < 10 ? ('0' + current.getHours()) : current.getHours(),
            minutes = current.getMinutes() < 10 ? ('0' + current.getMinutes()) : current.getMinutes(),
            seconds = current.getSeconds() < 10 ? ('0' + current.getSeconds()) : current.getSeconds();
        mseconds = current.getMilliseconds() ;

        date.push(hours);
        date.push(minutes);
        date.push(seconds);
        date.push(mseconds);

        return date.join(':');
    }

    var internal_log = function (level, object, title) {
        if (level > logLevel) return; // our current log level is not verbose enough
        // just a plain object to hold the log message which prints out nice on the console
        function jdlog(object, title) {
            this.title = title;
            this.severity = friendly[level];
            this.time = getPrettyTimeStamp();
            this.content = object;
            if (level < 3) {
                var stack = new Error().stack;
                this.stack = (stack)?new Error().stack.replace("Error\n", ""):'';
            }
        }

        jdlog.prototype.toString = function () {
            var arr;
            if (this.content.stack) { //good for errors
                arr = [this.title, this.severity, this.time, this.content, this.content.stack];
            } else {
                arr = [this.title, this.severity, this.time, JSON.stringify(this.content) , this.stack];
            }
            return arr.join('\t');
        };

        object = (flat) ? new jdlog(object).toString() : new jdlog(object);
//        logFunction[level](object);
        switch (level) {
            case 1:
                console.error(object);
                break;
            case 2:
                console.warn(object);
                break;
            case 3:
                console.info(object);
                break;
            case 4:
            case 5:
                console.log(object);
                break;
            case 6:
                console.debug(object);
                break;
        }
    };

    // level maybe string: error, warn, info, log, debug
    //       maybe number: 1..5
    function print(level, args) {
        var type;
        if (typeof level === 'number') {
            // convert it to number
            //level = Number(Levels[level])
            type = friendly[level];
        }
        if (typeof level === 'string') {
            type = level;
            level = Number(Levels[level])
        }
        // now level is an number
        if (level > logLevel) return; // our current log level is not verbose enough

        if (!jsd.config.DEBUG) {
            return;
        }

        if (!output) {
            htmlLogging = false;
        }

        if (msgAmount >= MAX_MESSAGES) {
            if (htmlLogging)
                output.innerHTML = '';
            console.clear();
            msgAmount = 0;
        }

        var origin = args[0],
            data = Array.prototype.slice.call(args, 1),
            dataAsString = _.clone(data);

        var object = [getPrettyTimeStamp(), '|', 'JSD', '-', origin, ':'].concat(data);
        //Console
        if (consoleLogging) {
            console[type].apply(console, object);
        }

        //DOM
        if (htmlLogging) {

            dataAsString.forEach(function (el, id) {
                if (_.isObject(el)) {
                    dataAsString[id] = '<em style="color:blue">' + JSON.stringify(el) + '</em>';
                }
            });

            // output.innerHTML += getPrettyTimeStamp() + ' ' + '<strong style="color:red">' + origin + '</strong> : ' + dataAsString.join(' ') + '<br/>';
            output.innerHTML = getPrettyTimeStamp() + ' ' + '<strong style="color:red">' + origin + '</strong> : ' + dataAsString.join(' ') + '<br/>' + output.innerHTML;
        }
        msgAmount++;
    }

    function logger() {}

    logger.prototype = {

        setLogFlat : function (b) {
            flat = b
        },

        setLogLevel : function (newLevel) {
            logLevel = newLevel;
        },

        isVerbose : function () {
            return (logLevel > 2);
        },

        isDebug : function () {
            return (logLevel == 6);
        },

        /**
         * @method disableHTMLLog
         */
        disableHTMLLog: function () {
            htmlLogging = false;
        },


        /**
         * @method enableHTMLLog
         */
        enableHTMLLog: function () {
            htmlLogging = true;
        },

        /**
         * @method disableConsoleLog
         */
        disableConsoleLog: function () {
            consoleLogging = false;
        },

        /**
         * @method enableConsoleLog
         */
        enableConsoleLog: function () {
            consoleLogging = true;
        },

        /**
         * @method disable
         */
        disable: function () {
            this.disableHTMLLog();
            this.disableConsoleLog();
        },

        /**
         * @method enable
         */
        enable: function () {
            this.enableHTMLLog();
            this.enableConsoleLog();
        },

        /**
         * Log some information
         *
         * @method log
         *
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        log: function (msg, desc, data) {
            print('log', arguments);
        },

        debug: function(msg, desc, data) {
            print('debug', arguments);
        },

        info: function (msg, desc, data) {
            print('info', arguments);
        },

        /**
         * Log a warning
         *
         * @method warn
         *
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        warn: function (msg, desc, data) {
            print('warn', arguments);
        },

        /**
         * Log an error
         *
         * @method error
         *
         * @param {*} msg
         * @param {*} [desc]
         * @param {*} [data]
         */
        error: function (msg, desc, data) {
            print('error', arguments);
        }
    };

    exports.logger = new logger();

})(typeof exports === 'undefined' ? jsd.util : exports);

//var logger = jsd.util.logger;
