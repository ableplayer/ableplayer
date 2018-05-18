import AblePlayer from './ableplayer-base.js';
// Adds prototype functions to AblePlayer
import './initialize.js';
import './preference.js';
import './webvtt.js';
import './buildplayer.js';
import './track.js';
import './youtube.js';
import './volume.js';
import './misc.js';
import './description.js';
import './browser.js';
import './control.js';
import './caption.js';
import './chapters.js';
import './metadata.js';
import './transcript.js';
import './search.js';
import './event.js';
import './dragdrop.js';
import './sign.js';
import './langs.js';
import './translation.js';

// Adds doWhen function to jquery
import './JQuery.doWhen.js';


(function ($) {
  $(document).ready(function () {
    $('video, audio').each(function (index, element) {
      if ($(element).data('able-player') !== undefined) {
        new AblePlayer($(this),$(element));
      }
    });
  });

  // YouTube player support; pass ready event to jQuery so we can catch in player.
  window.onYouTubeIframeAPIReady = function() {
    AblePlayer.youtubeIframeAPIReady = true;
    $('body').trigger('youtubeIframeAPIReady', []);
  };

  // If there is only one player on the page, dispatch global keydown events to it
  // Otherwise, keydowwn events are handled locally (see event.js > handleEventListeners())
  $(window).keydown(function(e) {
    if (AblePlayer.nextIndex === 1) {
      AblePlayer.lastCreated.onPlayerKeyPress(e);
    }
  });
})(jQuery);

export {
  AblePlayer as default
};