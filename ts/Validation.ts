/// <reference path="typings/node-uuid/node-uuid.d.ts" />

//import nuuid = require('node-uuid');
module Validation {
    export interface StringValidator {
        isAcceptable(s: string): boolean;
    }

    export class Uuid {
        generate():string {
            return  '124455';
        }
    }
}