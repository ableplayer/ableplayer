import WindowEvent from "./AccessiblePlayer/WindowEvent.js";
import PlayerBuilder from "./AccessiblePlayer/PlayerBuilder.js";
import AblePlayerFactory from "./AccessiblePlayer/AccessiblePlayerFactory.js";

const windowEvent = new WindowEvent().addEventToWindow().onYoutubeIframeAPIReady();

const start = () => {
    AblePlayerFactory.getInstancePlayerBuilder();
    setTimeout( function () {
        let apb = PlayerBuilder.ablePlayers[0].media ;
        console.log( apb );
    }, 2000)
}

start();




