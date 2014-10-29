
var NUMERALS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_';

/*
 * Convert string of baseIn to an array of numbers of baseOut.
 * Eg. convertBase('255', 10, 16) returns [15, 15].
 * Eg. convertBase('ff', 16, 10) returns [2, 5, 5].
 */
function toBaseOut( str, baseIn, baseOut ) {
    var j,
        arr = [0],
        arrL,
        i = 0,
        strL = str.length;

    for ( ; i < strL; ) {

        for ( arrL = arr.length; arrL--; arr[arrL] *= baseIn );

        arr[ j = 0 ] += NUMERALS.indexOf( str.charAt( i++ ) );

        for ( ; j < arr.length; j++ ) {

            if ( arr[j] > baseOut - 1 ) {

                if ( arr[j + 1] == null ) {
                    arr[j + 1] = 0;
                }
                arr[j + 1] += arr[j] / baseOut | 0;
                arr[j] %= baseOut;
            }
        }
    }

    return arr.reverse();
}

// from base2 to base64
function convertBase(str, baseIn, baseOut) {
    var arr = toBaseOut(str, baseIn, baseOut);
    var xarr = arr.map(function(n) {
       return NUMERALS[n];
    });
    return xarr.join('');
}

