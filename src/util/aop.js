
(function(exports) {

    // Created by Fredrik Appelberg: http://fredrik.appelberg.me/2010/05/07/aop-js.html
    // Modified to support prototypes by Dave Clayton
    // https://raw.githubusercontent.com/davedx/aop/master/aop.js

    // usage:
    //    js> function plus(a, b) { return a + b; }
    //    js> plus(2, 2)
    //    4
    //    js> Aop.around('plus', function(f) { return Aop.next(f) + 1; })
    //    js> plus(2, 2)
    //    5
    //    js>
    Aop = {
        // Apply around advice to all matching functions in the given namespaces
        around: function(pointcut, advice, namespaces) {
            // if no namespaces are supplied, use a trick to determine the global ns
            if (namespaces == undefined || namespaces.length == 0)
                namespaces = [ (function(){return this;}).call() ];
            // loop over all namespaces
            for(var i in namespaces) {
                var ns = namespaces[i];
                for(var member in ns) {
                    if(typeof ns[member] == 'function' && member.match(pointcut)) {
                        (function(fn, fnName, ns) {
                            // replace the member fn slot with a wrapper which calls
                            // the 'advice' Function
                            ns[fnName] = function() {
                                return advice.call(this, { fn: fn,
                                    fnName: fnName,
                                    arguments: arguments });
                            };
                        })(ns[member], member, ns);
                    }
                }
            }
        },

        next: function(f) {
            return f.fn.apply(this, f.arguments);
        }
    };

    Aop.before = function(pointcut, advice, namespaces) {
        Aop.around(pointcut,
            function(f) {
                advice.apply(this, f.arguments);
                return Aop.next.call(this, f);
            },
            namespaces);
    };

    Aop.after = function(pointcut, advice, namespaces) {
        Aop.around(pointcut,
            function(f) {
                var ret = Aop.next.call(this, f);
                advice.apply(this, f.arguments);
                return ret;
            },
            namespaces);
    };

    exports.Aop = Aop;

})(typeof exports === 'undefined' ? jsd.util : exports);
