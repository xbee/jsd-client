
require.config({
    paths: {
        'domready': '../lib/requirejs-domready/domReady',
        'lodash': '../lib/lodash/dist/lodash',
        'eventemitter2': '../lib/eventemitter2/lib/eventemitter2',
        'idbwrapper': '../lib/idbwrapper/idbstore',
        'node-uuid': '../lib/node-uuid/uuid',
        'observe-js': '../lib/observe-js/src/observe',
        'q': '../lib/q/q',
        'jquery': '../lib/jquery',
        'sockjs': '../lib/sockjs/sockjs'
    },
    shim: {}
});

define(['jquery', 'app'], function ($, jsd) {

    try {
        var app = new jsd.App($('#content'));
        app.render();

        app.init();
        app.start();

        window.jsdapp = app;
        window.jsd = jsd;

    } catch(e) {
        console.error(e);
    }

});



