;(function (exports) {

    var MAX_MESSAGES = 100;

    var output = document.getElementById('log'),
        htmlLogging = true,
        consoleLogging = true,
        msgAmount = 0;

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


    function print(type, args) {

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

        //Console
        if (consoleLogging) {
            console[type].apply(console, [getPrettyTimeStamp(), '|', 'JSD', '-', origin, ':'].concat(data));
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