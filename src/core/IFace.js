/*
 iFace.js - A simple interface-like thing.
 Copyright (c) 2009 Thomas Peri - http://www.tumuski.com/

 Permission is hereby granted, free of charge, to any person obtaining a
 copy of this software and associated documentation files (the
 "Software"), to deal in the Software without restriction, including
 without limitation the rights to use, copy, modify, merge, publish,
 distribute, sublicense, and/or sell copies of the Software, and to
 permit persons to whom the Software is furnished to do so, subject to
 the following conditions:

 The above copyright notice and this permission notice shall be included
 in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
 TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Good Parts plus Browser:
/*jslint
 white: true, undef: true, nomen: true, eqeqeq: true, plusplus: true,
 bitwise: true, regexp: true, onevar: true, newcap: true,
 browser: true
 */

/**
 * version 2009-11-18
 *
 * http://www.tumuski.com/2009/10/simple-interfaciness-in-javascript/
 */
var iFace = function (name, members) {
    var iF, fromCons, consName, quote;
    iF = function (n, fn) {
        var c;
        if (typeof n === 'function') {
            fn = n;
            n = fn.$iFaceConstructorName;
        }
        c = function () {
            fn.apply(this, arguments);
            consName = n;
            fromCons = true;
            iF.verify(this);
            fromCons = false;
        };
        c.$iFaceConstructorName = n;
        return c;
    };
    iF.verify = function (obj, objName) {
        var i, m;
        for (i = 0; i < members.length; i += 1) {
            m = members[i];
            if (!obj.hasOwnProperty(m)) {
                throw "The " + (fromCons ?
                quote(consName) + "constructor assigns" :
                quote(objName) + "object has") +
                " no '" + m + "' member, required by the iFace '" + name + "'.";
            }
        }
    };
    quote = function (n) {
        return n ? ("'" + n + "' ") : "";
    };
    return iF;
};
