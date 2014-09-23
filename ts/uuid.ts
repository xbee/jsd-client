
/// <reference path="typings/node-uuid/node-uuid.d.ts" />

import nuuid = require('node-uuid');

class Uuid {
    static _format:RegExp = new RegExp('/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i');

    /**
     * Generates an universally unique identifier
     *
     * @method generate
     * @return {String} An Universally unique identifier v4
     * @see http://en.wikipedia.org/wiki/Universally_unique_identifier
     */
    static generate():string {
        return  nuuid.v4();
    }

    /**
     * Test if a uuid is valid
     *
     * @method isValid
     * @param uuid
     * @returns {boolean}
     */
    static isValid(uuid:string):boolean {
        return Uuid._format.test(uuid);
    }

}

export = Uuid;
