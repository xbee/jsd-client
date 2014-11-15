
(function(sa){

    // initialize the application
    var init = function(){

        // creata new Core instance
        var core = new sa.Core();

        // JdyModule: import from jdyModule.js
        // register the module
        core.register("jdyModule", JdyModule);

        core.start("jdyModule", function(err){
            if(err) return console.log(err.message);
            console.log("started 'jdyModule' module");
        });
    };

    // return public API
    window.app = {
        init: init
    };

})(window.scaleApp);



