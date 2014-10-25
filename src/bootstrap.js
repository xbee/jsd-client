

try {
    var logger = jsd.util.logger;

    var app = new jsd.App();
    app.init();
    app.start();

    window.jsdapp = app;
    window.jsd = jsd;

    /**
     * Event-Handler, called when Network state changes
     *
     * @private
     * @method networkConnectivityStateChangeHandler
     * @param {Object} e
     */
    function networkConnectivityStateChangeHandler(e) {
        if (e.type === 'online') {
            logger.log('Network', 'online!');
            logger.log('Network', 'try to reconnecting ...');
            app.start();
        }
        else {
            logger.warn('Network', 'offline!');
            app.stop();
        }
    }

    window.addEventListener('offline', networkConnectivityStateChangeHandler);
    window.addEventListener('online', networkConnectivityStateChangeHandler);

} catch(ex) {
    console.log(ex.stack);
}