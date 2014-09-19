/**
 * Created by michael on 14-9-18.
 */

class Singleton {

    private static instance : Singleton;

    public static getInstance() : Singleton {

        if(Singleton.instance === null) {
//            console.log("Santa Claus, THE only one !!!")
            Singleton.instance = new Singleton();
        } else  {
//            console.log("only one Santa Claus !!!")
        }
        return Singleton.instance;
    }
}

export = Singleton;