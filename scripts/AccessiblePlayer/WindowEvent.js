import AccessiblePlayer from "./AccessiblePlayer.js";

export default class WindowEvent {


    addEventToWindow() {
        // If there is only one player on the page, dispatch global keydown events to it
        // Otherwise, keydowwn events are handled locally (see event.js > handleEventListeners())
        $(window).keydown(function (e) {
            if (AccessiblePlayer.nextIndex === 1) {
                AccessiblePlayer.customEvent.onPlayerKeyPress(e);
            }
        });
        return this;
    }

    onYoutubeIframeAPIReady(){
        // YouTube player support; pass ready event to jQuery so we can catch in player.
        window.onYouTubeIframeAPIReady = () => {
            AccessiblePlayer.youtubeIframeAPIReady = true;
            $('body').trigger('youtubeIframeAPIReady', []);
        };
    }
}
