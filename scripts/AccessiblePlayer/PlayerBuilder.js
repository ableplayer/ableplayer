import AccessiblePlayerFactory from "./AccessiblePlayerFactory.js";

export default class PlayerBuilder {
    static ablePlayers = [];
    constructor() {
        $(document).ready( async function () {
            let ablePlayer;
            $('video, audio').each( async function (index, element) {
                if ($(element).data('able-basePlayer') !== undefined) {
                    console.log("Build one instance of the ablePlayer");
                    ablePlayer = await AccessiblePlayerFactory.getInstance( $(this),$(element) );
                    PlayerBuilder.ablePlayers.push( ablePlayer );
                }
            });
        });

    }
}