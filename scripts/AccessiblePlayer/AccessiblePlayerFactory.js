import AccessiblePlayer from "./AccessiblePlayer.js";
import PlayerBuilder from "./PlayerBuilder.js";

export default class AccessiblePlayerFactory {

    constructor() {
        console.log("Build a static instance of the AccessiblePlayer");
    }

    static getInstance( media ){
        console.log("Get a static Instance of the AccessiblePlayer");
        return new AccessiblePlayer( media );
    }

    static getInstancePlayerBuilder(){
        return new PlayerBuilder();
    }


}