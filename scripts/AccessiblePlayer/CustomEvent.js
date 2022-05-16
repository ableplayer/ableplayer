import AccessiblePlayer from "./AccessiblePlayer.js";

export default class CustomEvent{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    onMediaUpdateTime () {
        var currentTime = this.ablePlayer.control.getElapsed();
        if (this.ablePlayer.swappingSrc && (typeof this.ablePlayer.swapTime !== 'undefined')) {
            if (this.ablePlayer.swapTime === currentTime) {
                // described version been swapped and media has scrubbed to time of previous version
                if (this.ablePlayer.playing) {
                    // resume playback
                    this.ablePlayer.control.playMedia();
                    // reset vars
                    this.ablePlayer.swappingSrc = false;
                    this.ablePlayer.swapTime = null;
                }
            }
        } else if (this.ablePlayer.startedPlaying) {
            // do all the usual time-sync stuff during playback
            if (this.ablePlayer.prefHighlight === 1) {
                this.ablePlayer.transcript.highlightTranscript(currentTime);
            }
            this.ablePlayer.caption.updateCaption();
            this.ablePlayer.description.showDescription(currentTime);
            this.ablePlayer.chapter.updateChapter(currentTime);
            this.ablePlayer.metadata.updateMeta();
            this.ablePlayer.control.refreshControls();
        }
    }

    onMediaPause () {
        if (this.ablePlayer.controlsHidden) {
            this.ablePlayer.control.fadeControls('in');
            this.ablePlayer.controlsHidden = false;
        }
        if (this.ablePlayer.hidingControls) { // a timeout is actively counting
            window.clearTimeout(this.ablePlayer.hideControlsTimeout);
            this.ablePlayer.hidingControls = false;
        }
    };

    onMediaComplete () {
        //spec OrangeLab
        $('#copy-play').removeClass('pause');
        $('#copy-play').text('');
        $('#copy-play').value = this.tt.play;
        $('#copy-play').attr('aria-label', this.tt.play);
        //$('#copy-play').append("<i class=\"play\"></i><span id=\"copy-play\">"+this.tt.play+"</span>");
        $('#copy-play').children('svg').remove();
        $('#copy-play').append("<svg style='float:left;margin-left:" + $('#show-volume').find('svg').css('margin-left') + "' viewBox='0 0 20 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'></path></svg><span id=\"copy-play\" style='margin-left:-25%'>" + this.ablePlayer.tt.play + "</span>");

        this.ablePlayer.control.refreshControls();
    };

    onMediaNewSourceLoad () {
        if (this.ablePlayer.swappingSrc === true) {
            if (this.ablePlayer.swapTime > 0) {
                this.ablePlayer.control.seekTo(this.ablePlayer.swapTime);
            }
            else {
                if (this.ablePlayer.playing) {
                    // should be able to resume playback
                    if (this.ablePlayer.player === 'jw') {
                        var player = this.ablePlayer.jwPlayer;
                        // Seems to be a bug in JW player, where this doesn't work when fired immediately.
                        // Thus have to use a setTimeout
                        setTimeout(function () {
                            player.play(true);
                        }, 500);
                    } else {
                        this.ablePlayer.control.playMedia();
                    }
                }
                this.ablePlayer.swappingSrc = false; // swapping is finished
                this.ablePlayer.control.refreshControls();
            }
        }

    };

    onWindowResize () {

        if ( this.ablePlayer.control.isFullscreen() ) {
            var newWidth, newHeight;
            newWidth = $(window).width();
            if (this.ablePlayer.browser.isUserAgent('Firefox') || this.ablePlayer.browser.isUserAgent('Trident') || this.ablePlayer.browser.isUserAgent('Edge')) {
                newHeight = window.innerHeight - this.ablePlayer.$playerDiv.outerHeight() - 20;
            }
            else if (window.outerHeight >= window.innerHeight) {
                newHeight = window.innerHeight - this.ablePlayer.$playerDiv.outerHeight();
            }
            else {
                newHeight = window.outerHeight;
            }
            if (!this.ablePlayer.$descDiv.is(':hidden')) {
                newHeight -= this.ablePlayer.$descDiv.height();
            }
            this.ablePlayer.caption.positionCaptions('overlay');
        }
        else {
            if (this.ablePlayer.restoringAfterFullScreen) {
                newWidth = this.ablePlayer.preFullScreenWidth;
                newHeight = this.ablePlayer.preFullScreenHeight;
            }
            else {
                newWidth = this.ablePlayer.$ableWrapper.width();
                if (typeof this.ablePlayer.aspectRatio !== 'undefined') {
                    newHeight = Math.round(newWidth / this.ablePlayer.aspectRatio);
                }
                else {
                    newHeight = this.ablePlayer.$ableWrapper.height();
                }
                this.ablePlayer.caption.positionCaptions(); // reset with this.prefCaptionsPosition
            }
        }
        this.ablePlayer.control.resizePlayer(newWidth, newHeight);
    }

    addSeekbarListeners () {

        var thisObj = this;
        // Handle seek bar events.
        this.ablePlayer.seekBar.bodyDiv
            .on('startTracking', (e) => {
                console.log("start tracking");
                this.ablePlayer.pausedBeforeTracking = this.ablePlayer.paused;
                this.ablePlayer.control.pauseMedia();
            })
            .on('tracking',  (e, position) => {
                // Scrub transcript, captions, and metadata.
                console.log("tracking");
                this.ablePlayer.transcript.highlightTranscript(position);
                this.ablePlayer.caption.updateCaption(position);
                this.ablePlayer.description.showDescription(position);
                this.ablePlayer.chapter.updateChapter(this.ablePlayer.chapter.convertChapterTimeToVideoTime(position));
                this.ablePlayer.metadata.updateMeta(position);
                this.ablePlayer.control.refreshControls();
            })
            .on('stopTracking',  (e, position) => {
                console.log("stop tracking");
                if (this.ablePlayer.useChapterTimes) {
                    this.ablePlayer.control.seekTo(this.ablePlayer.chapter.convertChapterTimeToVideoTime(position));
                }
                else {
                    console.log("Seek to Position", position)
                    this.ablePlayer.control.seekTo(position);
                }
                if (!this.ablePlayer.pausedBeforeTracking) {
                    setTimeout(() => {
                        this.ablePlayer.control.playMedia();
                    }, 200);
                }
            });
    };

    onClickPlayerButton (el) {
        console.log( el );
        var whichButton, prefsPopup;
        whichButton = $(el).attr('class').split(' ')[0].substr(20);
        if (whichButton === 'play') {
            this.ablePlayer.clickedPlay = true;
            this.ablePlayer.control.handlePlay();
        }
        else if (whichButton === 'restart') {
            this.ablePlayer.seekTrigger = 'restart';
            this.ablePlayer.control.handleRestart();
        }
        else if (whichButton === 'rewind') {
            this.ablePlayer.seekTrigger = 'rewind';
            this.ablePlayer.control.handleRewind();
        }
        else if (whichButton === 'forward') {
            this.ablePlayer.seekTrigger = 'forward';
            this.ablePlayer.control.handleFastForward();
        }
        else if (whichButton === 'mute') {
            this.ablePlayer.volumeI.handleMute();
        }
        else if (whichButton === 'volume') {
            this.ablePlayer.volumeI.handleVolume();
        }
        else if (whichButton === 'faster') {
            this.ablePlayer.control.handleRateIncrease();
        }
        else if (whichButton === 'slower') {
            this.ablePlayer.control.handleRateDecrease();
        }
        else if (whichButton === 'captions') {
            this.ablePlayer.control.handleCaptionToggle();
        } else if (whichButton === 'accmenu') {
            this.ablePlayer.control.handleAccessToggle();
        } else if (whichButton === 'chapters') {
            this.ablePlayer.control.handleChapters();
        }
        else if (whichButton === 'descriptions') {
            this.ablePlayer.control.handleDescriptionToggle();
        }
        else if (whichButton === 'sign') {
            this.ablePlayer.control.handleSignToggle();
        }
        else if (whichButton === 'preferences') {
            this.ablePlayer.control.handlePrefsClick();
        }
        else if (whichButton === 'help') {
            this.ablePlayer.control.handleHelpClick();
        }
        else if (whichButton === 'transcript') {
            this.ablePlayer.control.handleTranscriptToggle();
        }
        else if (whichButton === 'fullscreen') {
            $('#fullscreen').click();
        }
    };

    // returns true unless user's focus is on a UI element
    okToHandleKeyPress () {
        var activeElement = AccessiblePlayer.getActiveDOMElement();
        if ($(activeElement).prop('tagName') === 'INPUT') {
            return false;
        }
        else {
            return true;
        }
    };

    onPlayerKeyPress(e) {
        if (!this.okToHandleKeyPress()) {
            return false;
        }
        // Convert to lower case.
        var which = e.which;

        if (which >= 65 && which <= 90) {
            which += 32;
        }
        if (which === 27) {
            this.ablePlayer.closePopups();
        } else if (which === 32) { // spacebar = play/pause
            if (this.ablePlayer.$ableWrapper.find('.able-controller button:focus').length === 0) {
                // only toggle play if a button does not have focus
                // if a button has focus, space should activate that button
                this.ablePlayer.control.handlePlay();
            }
        } else if (which === 112) { // p = play/pause
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handlePlay();
            }
        } else if (which === 115) { // s = stop (now restart)
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleRestart();
            }
        } else if (which === 109) { // m = mute
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleMute();
            }
        } else if (which === 118) { // v = volume
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleVolume();
            }
        } else if (which >= 49 && which <= 57) { // set volume 1-9
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleVolume(which);
            }
        } else if (which === 99) { // c = caption toggle
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleCaptionToggle();
            }
        } else if (which === 100) { // d = description
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleDescriptionToggle();
            }
        } else if (which === 102) { // f = forward
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleFastForward();
            }
        } else if (which === 114) { // r = rewind
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handleRewind();
            }
        } else if (which === 101) { // e = preferences
            if (this.ablePlayer.preference.usingModifierKeys(e)) {
                this.ablePlayer.control.handlePrefsClick();
            }
        } else if (which === 13) { // Enter
            var thisElement = $(document.activeElement);
            if (thisElement.prop('tagName') === 'SPAN') {
                // register a click on this SPAN
                // if it's a transcript span the transcript span click handler will take over
                thisElement.click();
            } else if (thisElement.prop('tagName') === 'LI') {
                thisElement.click();
            }
        }
    };

    addHtml5MediaListeners () {

        var thisObj = this;
        this.ablePlayer.$media
            .on('emptied',function() {
                // do something
            })
            .on('loadedmetadata',function() {
                //thisObj.ablePlayer.duration = thisObj.ablePlayer.media.duration;
                thisObj.onMediaNewSourceLoad();
            })
            .on('canplay',function() {
                // previously handled seeking to startTime here
                // but it's probably safer to wait for canplaythrough
                // so we know basePlayer can seek ahead to anything
            })
            .on('canplaythrough',function() {
                if (thisObj.ablePlayer.playbackRate) {
                    // user has set playbackRate on a previous src or track
                    // use that setting on the new src or track too
                    thisObj.ablePlayer.control.setPlaybackRate(thisObj.ablePlayer.playbackRate);
                }
                if (thisObj.ablePlayer.userClickedPlaylist) {
                    if (!thisObj.ablePlayer.startedPlaying) {
                        // start playing; no further user action is required
                        thisObj.ablePlayer.control.playMedia();
                    }
                    thisObj.ablePlayer.userClickedPlaylist = false; // reset
                }
                if (thisObj.ablePlayer.seekTrigger == 'restart' ||
                    thisObj.ablePlayer.seekTrigger == 'chapter' ||
                    thisObj.ablePlayer.seekTrigger == 'transcript' ||
                    thisObj.ablePlayer.seekTrigger == 'search'
                ) {
                    // by clicking on any of these elements, user is likely intending to play
                    // Not included: elements where user might click multiple times in succession
                    // (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
                    thisObj.ablePlayer.control.playMedia();
                }
                else if (!thisObj.ablePlayer.startedPlaying) {
                    if (thisObj.ablePlayer.startTime) {
                        if (thisObj.ablePlayer.seeking) {
                            // a seek has already been initiated
                            // since canplaythrough has been triggered, the seek is complete
                            thisObj.ablePlayer.seeking = false;
                            if (thisObj.ablePlayer.autoplay) {
                                thisObj.ablePlayer.control.playMedia();
                            }
                        }
                        else {
                            // haven't started seeking yet
                            thisObj.ablePlayer.control.seekTo(thisObj.ablePlayer.startTime);
                        }
                    }
                    else if (thisObj.ablePlayer.defaultChapter && typeof thisObj.ablePlayer.selectedChapters !== 'undefined') {
                        thisObj.ablePlayer.chapter.seekToChapter(thisObj.ablePlayer.defaultChapter);
                    }
                    else {
                        // there is no startTime, therefore no seeking required
                        if (thisObj.ablePlayer.autoplay) {
                            thisObj.ablePlayer.control.playMedia();
                        }
                    }
                }
                else if (thisObj.ablePlayer.hasPlaylist) {
                    if ((thisObj.ablePlayer.playlistIndex !== thisObj.ablePlayer.$playlist.length) || thisObj.ablePlayer.loop) {
                        // this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
                        thisObj.ablePlayer.control.playMedia();
                    }
                }
                else {
                    /*thisObj.ablePlayer.control.getPlayerState().then(function(currentState) {
                        if (thisObj.ablePlayer.swappingSrc && (currentState === 'stopped' || currentState === 'paused')) {
                            thisObj.ablePlayer.startedPlaying = false;
                            if (thisObj.ablePlayer.swapTime > 0) {
                                thisObj.ablePlayer.control.seekTo(thisObj.ablePlayer.swapTime);
                            }
                            else {
                                thisObj.ablePlayer.control.playMedia();
                            }
                        }
                    });*/
                }
            })
            .on('playing',function() {
                thisObj.ablePlayer.playing = true;
                thisObj.ablePlayer.control.refreshControls();
            })
            .on('ended',function() {
                thisObj.ablePlayer.playing = false;
                thisObj.onMediaComplete();
            })
            .on('progress', function() {
                thisObj.ablePlayer.control.refreshControls();
            })
            .on('waiting',function() {
                // do something
                // previously called refreshControls() here but this event probably doesn't warrant a refresh
                thisObj.ablePlayer.control.refreshControls();
            })
            .on('durationchange',function() {
                // Display new duration.
                thisObj.ablePlayer.control.refreshControls();
            })
            .on('timeupdate',function() {
                thisObj.onMediaUpdateTime(); // includes a call to refreshControls()
            })
            .on('play', function () {
                if (thisObj.ablePlayer.debug) {
                    console.log('media play event');
                }
            })
            .on('pause',function() {
                if (!thisObj.ablePlayer.clickedPlay) {
                    if (thisObj.ablePlayer.hasPlaylist) {
                    }
                    else {
                        thisObj.ablePlayer.playing = false;
                    }
                }
                else {
                    thisObj.ablePlayer.playing = false;
                }
                thisObj.ablePlayer.clickedPlay = false;
                thisObj.onMediaPause();
            })
            .on('ratechange',function() {
                // do something
            })
            .on('volumechange',function() {
                thisObj.ablePlayer.volume = thisObj.ablePlayer.volumeI.getVolume();
                if (thisObj.ablePlayer.debug) {
                    console.log('media volume change to ' + thisObj.ablePlayer.volume + ' (' + thisObj.ablePlayer.volumeButton + ')');
                }
            })
            .on('error',function() {
                if (thisObj.ablePlayer.debug) {
                    switch (thisObj.ablePlayer.media.error.code) {
                        case 1:
                            console.log('HTML5 Media Error: MEDIA_ERR_ABORTED');
                            break;
                        case 2:
                            console.log('HTML5 Media Error: MEDIA_ERR_NETWORK ');
                            break;
                        case 3:
                            console.log('HTML5 Media Error: MEDIA_ERR_DECODE ');
                            break;
                        case 4:
                            console.log('HTML5 Media Error: MEDIA_ERR_SRC_NOT_SUPPORTED ');
                            break;
                    }
                }
            });
    };

    addEventListeners () {
        var thisObj, whichButton, thisElement;
        // Save the current object context in thisObj for use with inner functions.
        thisObj = this;

        // Appropriately resize media player for full screen.
        $(window).resize(function () {
            thisObj.onWindowResize();
        });

        // Refresh player if it changes from hidden to visible
        // There is no event triggered by a change in visibility
        // but MutationObserver works in most browsers (but NOT in IE 10 or earlier)
        // http://caniuse.com/#feat=mutationobserver
        if (window.MutationObserver) {
            var target = this.ablePlayer.$ableDiv[0];
            var observer = new MutationObserver(function (mutations) {
                mutations.forEach(function (mutation) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                        // the player's style attribute has changed. Check to see if it's visible
                        if (thisObj.ablePlayer.$ableDiv.is(':visible')) {
                            thisObj.ablePlayer.control.refreshControls();
                        }
                    }
                });
            });
            var config = {attributes: true, childList: true, characterData: true};
            observer.observe(target, config);
        } else {
            // browser doesn't support MutationObserver
            // TODO: Figure out an alternative solution for this rare use case in older browsers
            // See example in buildplayer.js > useSvg()
        }

        this.addSeekbarListeners();

        // handle clicks on player buttons
        this.ablePlayer.$controllerDiv.find('button').on('click', function (event) {
            event.stopPropagation();
            thisObj.onClickPlayerButton(this);
        });

        //spec linearisation player OrangeLab

        $('#copy-play').on('click', function (event) {
            event.stopPropagation();
            thisObj.onClickPlayerButton(this);
        });
        $('#copy-seek').on('keyup', function (event) {
            if (event.keyCode === 13) {
                event.stopPropagation();
                if ($('#setTimeOrange').css('display') == 'none') {
                    $('#able-seekbar-acc').attr("style", "display:none");
                    $('#setTimeOrange').attr("style", "display:block");
                    $('#setTimeOrange').focus();
                } else {
                    var str = $('#setTimeOrange').val();
                    var newPosition = 0;
                    if (str.includes(":")) {
                        var res = str.split(":");
                        newPosition = parseInt(res[0]) * 60 + parseInt(res[1]);
                    } else if (str.includes("min")) {
                        var res = str.split("min");
                        newPosition = parseInt(res[0]) * 60 + parseInt(res[1]);
                    } else {
                        newPosition = parseInt(str);
                    }
                    if (newPosition != "NaN" && newPosition < thisObj.ablePlayer.seekBarOrange.duration) {
                        thisObj.ablePlayer.control.seekTo(newPosition);
                    } else if (newPosition >= thisObj.ablePlayer.seekBarOrange.duration) {
                        thisObj.seekTo(thisObj.ablePlayer.seekBarOrange.lastTrackPosition);
                    }
                    $('#able-seekbar-acc').attr("style", "display:block,width:50%");
                    $('#able-seekbar-acc').css("width", "50%");
                    $('#setTimeOrange').attr("style", "display:none");
                    $('#able-seekbar-acc').focus();
                }

            }
        });
        $('#acc-menu-id').on('click', function (event) {
            event.stopPropagation();
            //console.log(thisObj.$mediaContainer.find('video').find('source')[0].src);
            //console.log(thisObj.$sources.first().attr('data-sign-src'));
            if ($('#acc-menu-id').text() === thisObj.ablePlayer.tt.showAccMenu) {
                thisObj.ablePlayer.prefAccessMenu = "true";
                $('#' + thisObj.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('true');
                thisObj.ablePlayer.preference.updateCookie('prefAccessMenu');
                if (thisObj.ablePlayer.$mediaContainer.find('video').find('source')[0].src != thisObj.ablePlayer.$sources.first().attr('data-sign-src') && thisObj.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 1) {
                    //save Time
                    var elapsed = thisObj.ablePlayer.control.getElapsed();
                    thisObj.ablePlayer.$ableDiv.css('width', '67%');
                    thisObj.ablePlayer.$signWindow.css('width', '33%');
                    thisObj.ablePlayer.$signWindow.css('left', '67%');
                    thisObj.ablePlayer.$signWindow.css('position', 'absolute');
                    thisObj.ablePlayer.$signWindow.css('top', '0px');
                    thisObj.ablePlayer.$signWindow.css('margin', '0px');
                    var svgVideoSrc = thisObj.ablePlayer.$mediaContainer.find('video').find('source')[0].src;
                    thisObj.ablePlayer.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
                    thisObj.ablePlayer.$mediaContainer.find('video')[0].load();
                    //put video in the second containre
                    thisObj.ablePlayer.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.ablePlayer.$signWindow.find('video')[0].load();
                    thisObj.ablePlayer.swappingSrc = true;
                    thisObj.ablePlayer.swapTime = elapsed;
                    if (thisObj.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 1) {
                        var takePadding = 0;
                        if (parseInt(thisObj.ablePlayer.$signToolbar.css('padding').replace('px', ''))) {
                            takePadding = parseInt(thisObj.ablePlayer.$signToolbar.css('padding').replace('px', ''));
                        }
                        thisObj.ablePlayer.$transcriptArea.css('top', (thisObj.ablePlayer.$signWindow.height() + thisObj.ablePlayer.$signToolbar.height() + takePadding) + 'px');
                        thisObj.ablePlayer.$transcriptArea.css('left', '33%');
                    }
                }
                if (thisObj.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 1 && thisObj.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 0) {

                    thisObj.ablePlayer.$transcriptArea.css('top', '0px');
                    // thisObj.$transcriptArea.css('left','33%');
                    // thisObj.$transcriptArea.css('width','66%');
                    // thisObj.$ableDiv.css('width','33%');
                    console.log('here transcript again');
                    thisObj.ablePlayer.$ableDiv.css('width', 100 - parseInt(thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
                    thisObj.ablePlayer.$transcriptArea.css('width', thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                    thisObj.ablePlayer.$transcriptArea.css('left', 100 - parseInt(thisObj.preference.getCookie()['preferences']['prefVidSize']) + '%');
                    var heightTranscriptArea = thisObj.ablePlayer.$mediaContainer.css('height').split("px")[0] - thisObj.ablePlayer.$transcriptToolbar.css('min-height').split("px")[0];
                    thisObj.ablePlayer.$transcriptArea.css('height', heightTranscriptArea + 'px');
                    thisObj.ablePlayer.control.resizeAccessMenu();
                }
                $('#acc-menu-id').text(thisObj.ablePlayer.tt.maskAccMenu);
                //$('.able-controller').attr("style","display:none");
                $('.controller-orange-main').attr("style", "display:block");
                thisObj.ablePlayer.control.resizeAccessMenu();
            } else {
                $('#' + thisObj.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('false');
                thisObj.ablePlayer.prefAccessMenu = "false";
                thisObj.ablePlayer.preference.updateCookie('prefAccessMenu');
                $('.able').css("width", "100%");
                if (thisObj.ablePlayer.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.ablePlayer.$sources.first().attr('data-sign-src')) && thisObj.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 1) {
                    var elapsed = thisObj.ablePlayer.control.getElapsed();
                    if (thisObj.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] === 0) {
                        thisObj.ablePlayer.$ableDiv.css('width', '100%');
                    } else {
                        thisObj.ablePlayer.$transcriptArea.css('top', '0px');
                    }
                    var svgVideoSrc = thisObj.ablePlayer.$signWindow.find('video').find('source')[0].src;
                    //put video sign in the second container
                    thisObj.ablePlayer.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.ablePlayer.$mediaContainer.find('video')[0].load();
                    //put video in the first containre
                    thisObj.ablePlayer.$signWindow.find('video').find('source')[0].src = thisObj.ablePlayer.$sources.first().attr('data-sign-src');
                    thisObj.ablePlayer.$signWindow.find('video')[0].load();
                    thisObj.ablePlayer.swappingSrc = true;
                    thisObj.ablePlayer.swapTime = elapsed;
                }
                $('#acc-menu-id').text(thisObj.ablePlayer.tt.showAccMenu);
                //$('.able-controller').attr("style","display:block");
                $('.controller-orange-main').attr("style", "display:none");
                $('.controller-orange-volume').attr("style", "display:none");
                $('.controller-orange-settings').attr("style", "display:none");
                $('.controller-orange-subtitles').attr("style", "display:none");
                $('.controller-orange-preferences').attr("style", "display:none");
                $('.controller-orange-perception').attr("style", "display:none");
                $('.controller-orange-textcolor').attr("style", "display:none");
                $('.controller-orange-bgcolor').attr("style", "display:none");
                $('.controller-orange-followcolor').attr("style", "display:none");
                $('.controller-orange-fontsize').attr("style", "display:none");
                $('.controller-orange-outfont').attr("style", "display:none");
                $('.controller-orange-font').attr("style", "display:none");
                $('.controller-orange-butcol').attr("style", "display:none");
                $('.controller-orange-reglages').attr("style", "display:none");
            }
            //console.log(thisObj.getCookie().preferences.prefAccessMenu);
        });
        $('#show-volume').on('click', function (event) {
            $('.controller-orange-main').attr("style", "display:none");
            $('.controller-orange-volume').toggle("slide");
            $('.controller-orange-volume').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-volume').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-volume').offset().top}, 'speed');
        });
        $('#hide-volume').on('click', function (event) {
            $('.controller-orange-volume').hide("slide", {direction: "right"});
            $('.controller-orange-main').toggle("slide");
            $('.controller-orange-main').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
        });
        $('#hide-settings').on('click', function (event) {
            $('.controller-orange-settings').hide("slide", {direction: "right"});
            $('.controller-orange-main').toggle("slide");
            $('.controller-orange-main').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
        });
        $('#hide-prefT').on('click', function (event) {
            $('.controller-orange-preferences').hide("slide", {direction: "right"});
            $('.controller-orange-main').toggle("slide");
            $('.controller-orange-main').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
        });
        $('#allParams').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-main').attr("style", "display:none");
            $('.controller-orange-settings').toggle("slide");
            $('.controller-orange-settings').find('span').css('display', 'inline-block');
            $('.controller-orange-settings').find('span').focus();
            thisObj.resizeAccessMenu();
            console.log('allPArams click');
            $('body, html').animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
        });
        $('#show-settings').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-main').attr("style", "display:none");
            $('.controller-orange-preferences').toggle("slide");
            $('.controller-orange-preferences').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-preferences').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-preferences').offset().top}, 'speed');
        });
        $('#subtitles').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-main').attr("style", "display:none");
            $('.controller-orange-subtitles').toggle("slide");
            $('.controller-orange-subtitles').find('span').css('display', 'inline-block');
            $('.controller-orange-subtitles').addClass('prevMain');
            $('.controller-orange-subtitles').removeClass('prevParam');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-subtitles').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-subtitles').offset().top}, 'speed');
        });
        $('#subtitlesParam').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-settings').attr("style", "display:none");
            $('.controller-orange-subtitles').toggle("slide");
            $('.controller-orange-subtitles').find('span').css('display', 'inline-block');
            $('.controller-orange-subtitles').addClass('prevParam');
            $('.controller-orange-subtitles').removeClass('prevMain');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-subtitles').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-subtitles').offset().top}, 'speed');
        });
        $('#hide-subT').on('click', function (event) {
            if ($('.controller-orange-subtitles').hasClass('prevParam')) {
                $('.controller-orange-subtitles').hide("slide", {direction: "right"});
                $('.controller-orange-settings').toggle("slide");
                $('.controller-orange-settings').find('span').css('display', 'inline-block');
                $('html, body').animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
                thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
            } else if ($('.controller-orange-subtitles').hasClass('prevMain')) {
                $('.controller-orange-subtitles').hide("slide", {direction: "right"});
                $('.controller-orange-main').toggle("slide");
                $('.controller-orange-main').find('span').css('display', 'inline-block');
                $('html, body').animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
                thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-main').offset().top}, 'speed');
            }
            thisObj.resizeAccessMenu();


        });
        $('#hide-perception').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            //$('.controller-orange-perception').attr("style","display:none");
            $('.controller-orange-perception').hide("slide", {direction: "right"});
            $('.controller-orange-settings').toggle("slide");
            $('.controller-orange-settings').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
        });
        $('#perceptionParam').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-settings').attr("style", "display:none");
            $('.controller-orange-perception').toggle("slide");
            $('.controller-orange-perception').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-perception').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-preception').offset().top}, 'speed');
        });
        $('#reglageParam').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-settings').attr("style", "display:none");
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-reglages').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').hide("slide", {direction: "right"});
            $('.controller-orange-settings').toggle("slide");
            $('.controller-orange-settings').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-settings').offset().top}, 'speed');
        });
        $('#hide-textColor').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-textcolor').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-bgColor').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-bgcolor').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-followColor').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-followcolor').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-fontsize').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-fontsize').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-out').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-outfont').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-font').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-font').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.ablePlayer.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#hide-butcol').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-butcol').hide("slide", {direction: "right"});
            $('.controller-orange-reglages').toggle("slide");
            $('.controller-orange-reglages').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-reglages').offset().top}, 'speed');
        });
        $('#textColor').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-textcolor').toggle("slide");
            $('.controller-orange-textcolor').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-textcolor').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-textcolor').offset().top}, 'speed');
        });
        $('#bgColor').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-bgcolor').toggle("slide");
            $('.controller-orange-bgcolor').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-bgcolor').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-bgcolor').offset().top}, 'speed');
        });
        $('#followColor').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-followcolor').toggle("slide");
            $('.controller-orange-followcolor').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-followcolor').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-followcolor').offset().top}, 'speed');
        });
        $('#fontSize').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-fontsize').toggle("slide");
            $('.controller-orange-fontsize').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-fontsize').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-fontsize').offset().top}, 'speed');
        });
        $('#outText').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-outfont').toggle("slide");
            $('.controller-orange-outfont').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-outfont').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-outfont').offset().top}, 'speed');
        });
        $('#textStyle').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-font').toggle("slide");
            $('.controller-orange-font').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-font').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-font').offset().top}, 'speed');
        });
        $('#reglagesSettings').on('click', function (event) {
            //$('.controller-orange-main').toggle( "slide");
            $('.controller-orange-reglages').attr("style", "display:none");
            $('.controller-orange-butcol').toggle("slide");
            $('.controller-orange-butcol').find('span').css('display', 'inline-block');
            thisObj.resizeAccessMenu();
            $('html, body').animate({scrollTop: $('.controller-orange-butcol').offset().top}, 'speed');
            thisObj.$ableWrapper.animate({scrollTop: $('.controller-orange-butcol').offset().top}, 'speed');
        });
        $('#blackTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('black');
        });
        $('#whiteTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('white');
        });
        $('#redTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('red');
        });
        $('#greenTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('green');
        });
        $('#blueTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('blue');
        });
        $('#yellowTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('yellow');
        });
        $('#magentaTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('magenta');
        });
        $('#cyanTextColor').on('click', function () {
            thisObj.changeCaptionsTranscrColor('cyan');
        });

        $('#blackBGColor').on('click', function () {
            thisObj.changeBGColor('black');
        });
        $('#whiteBGColor').on('click', function () {
            thisObj.changeBGColor('white');
        });
        $('#redBGColor').on('click', function () {
            thisObj.changeBGColor('red');
        });
        $('#greenBGColor').on('click', function () {
            thisObj.changeBGColor('green');
        });
        $('#blueBGColor').on('click', function () {
            thisObj.changeBGColor('blue');
        });
        $('#yellowBGColor').on('click', function () {
            thisObj.changeBGColor('yellow');
        });
        $('#magentaBGColor').on('click', function () {
            thisObj.changeBGColor('magenta');
        });
        $('#cyanBGColor').on('click', function () {
            thisObj.changeBGColor('cyan');
        });

        $('#blackFollowColor').on('click', function () {
            thisObj.changeFollowColor('black');
        });
        $('#whiteFollowColor').on('click', function () {
            thisObj.changeFollowColor('white');
        });
        $('#redFollowColor').on('click', function () {
            thisObj.changeFollowColor('red');
        });
        $('#greenFollowColor').on('click', function () {
            thisObj.changeFollowColor('green');
        });
        $('#blueFollowColor').on('click', function () {
            thisObj.changeFollowColor('blue');
        });
        $('#yellowFollowColor').on('click', function () {
            thisObj.changeFollowColor('yellow');
        });
        $('#magentaFollowColor').on('click', function () {
            thisObj.changeFollowColor('magenta');
        });
        $('#cyanFollowColor').on('click', function () {
            thisObj.changeFollowColor('cyan');
        });

        $('#button50').on('click', function () {
            thisObj.changeSize('50%');
        });
        $('#button75').on('click', function () {
            thisObj.changeSize('75%');
        });
        $('#button100').on('click', function () {
            thisObj.changeSize('100%');
        });
        $('#button125').on('click', function () {
            thisObj.changeSize('125%');
        });
        $('#button150').on('click', function () {
            thisObj.changeSize('150%');
        });
        $('#button175').on('click', function () {
            thisObj.changeSize('175%');
        });
        $('#button200').on('click', function () {
            thisObj.changeSize('200%');
        });
        $('#button300').on('click', function () {
            thisObj.changeSize('300%');
        });
        $('#button400').on('click', function () {
            thisObj.changeSize('400%');
        });
        $('#button400').on('click', function () {
            thisObj.changeSize('400%');
        });

        $('#outNo').on('click', function () {
            thisObj.changeOutFont($(this).text());
        });
        $('#outHigh').on('click', function () {
            thisObj.changeOutFont($(this).text());
        });
        $('#outEnforce').on('click', function () {
            thisObj.changeOutFont($(this).text());
        });
        $('#outUniform').on('click', function () {
            thisObj.changeOutFont($(this).text());
        });
        $('#outShadow').on('click', function () {
            thisObj.changeOutFont($(this).text());
        });

        $('#helvet').on('click', function () {
            thisObj.changeFont($(this).text());
        });
        $('#consola').on('click', function () {
            thisObj.changeFont($(this).text());
        });
        $('#accessDFA').on('click', function () {
            thisObj.changeFont($(this).text());
        });
        $('#comic').on('click', function () {
            thisObj.changeFont($(this).text());
        });
        $('#arial').on('click', function () {
            thisObj.changeFont($(this).text());
        });

        $('#blackwhite').on('click', function () {
            thisObj.changeColorButton($(this));
        });
        $('#whiteblack').on('click', function () {
            thisObj.changeColorButton($(this));
        });
        $('#blueyellow').on('click', function () {
            thisObj.changeColorButton($(this));
        });
        $('#yellowblue').on('click', function () {
            thisObj.changeColorButton($(this));
        });
        $('#bluewhite').on('click', function () {
            thisObj.changeColorButton($(this));
        });
        $('#whiteblue').on('click', function () {
            thisObj.changeColorButton($(this));
        });
        $('#colordef').on('click', function () {
            thisObj.changeColorButton($(this));
        });

        $('#bPlus').on('click', function () {
            //$('.resizeWidthInput').val((parseInt($('.resizeWidthInput').val())+1))
            $(thisObj.signResizeDialog.modal[0].getElementsByClassName("resizeWidthInput")[0]).val((parseInt($('.resizeWidthInput').val()) + 1))
        });
        $('#bMoins').on('click', function () {
            if (parseInt($('.resizeWidthInput').val()) >= 1) {
                //$('.resizeWidthInput').val((parseInt($('.resizeWidthInput').val())-1))
                $(thisObj.signResizeDialog.modal[0].getElementsByClassName("resizeWidthInput")[0]).val((parseInt($('.resizeWidthInput').val()) - 1))
            }

        });
//Orange gloabl buttons of main

        $('#sound-up').on('click', function (event) {//mettre le niveau de volume dans la barre de retour
            thisObj.handleVolume('up');
            setTimeout(function () {
                $('.able-volume-slider').css('display', 'block');
            }, 300);
            setTimeout(function () {
                $('.able-volume-slider').css('display', 'none');
            }, 3000);
        });
        $('#sound-down').on('click', function (event) {
            thisObj.handleVolume('down');
            setTimeout(function () {
                $('.able-volume-slider').css('display', 'block');
            }, 300);
            setTimeout(function () {
                $('.able-volume-slider').css('display', 'none');
            }, 3000);
        });
        $('#sound-mute').on('click', function (event) {
            thisObj.handleMute();
        });

        $('#copy-forward').on('click', function (event) {
            event.stopPropagation();
            thisObj.onClickPlayerButton(this);
            if (parseInt($('#copy-forward').val().split("+")[1]) === "NaN") {
                $('#copy-forward').val(Date.now());
            } else {
                $('#copy-forward').val(Date.now() + "+" + parseInt($('#copy-forward').val().split("+")[1]));
            }

        });
        $('#copy-rewind').on('click', function (event) {
            event.stopPropagation();
            thisObj.onClickPlayerButton(this);
            if (parseInt($('#copy-rewind').val().split("+")[1]) === "NaN") {
                $('#copy-rewind').val(Date.now());
            } else {
                $('#copy-rewind').val(Date.now() + "+" + parseInt($('#copy-rewind').val().split("+")[1]));
            }
        });
        $('#fullscreen').on('click', function (event) {
            // thisObj.setFullscreen(true);
            // //mask buttons and sho able-controller
            // $('.able-player').attr('style','margin-top:-15px');
            // $('.controller-orange-main').attr('style','display:none');
            // $('.able-controller').attr('style','display:block');
            // $('.able').css('width','100%');
            console.log('fullscreen event');
            //New version 03/04/2020
            if ($('.able-wrapper').css('position') != 'fixed') {
                thisObj.playerMaxWidth = $('.able-wrapper').width();
                $('.able-wrapper').css('position', 'fixed');
                $('.able-wrapper').css('width', '100%');
                $('.able-wrapper').css('height', '100%');
                $('.able-wrapper').css('padding', '0');
                $('.able-wrapper').css('margin', '0');
                $('.able-wrapper').css('top', '0');
                $('.able-wrapper').css('left', '0');
                $('.able-wrapper').css('max-width', '100%');
                $('.able-wrapper').css('background', 'white');
                $('.able-wrapper').css('overflow', 'auto');
                $('.able-big-play-button').css('height', $('.video-accessible').height() + 'px');
                $('.able-big-play-button').css('width', $('.video-accessible').width() + 'px');
                //if LSF
                //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
                //if transcrpit
                if (thisObj.getCookie().preferences.prefSign == 1) {
                    $('.video-accessible-sign').css('height', $('.video-accessible').height() + 5 + 'px');
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', $('.video-accessible').height() + 5 + 'px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                } else {
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', '0px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                }
                if (thisObj.getCookie().preferences.prefTranscript == 1 && thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                    thisObj.$playerDiv.css('width', ('width', thisObj.$mediaContainer.width() + 'px'));
                    //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
                } else {
                    thisObj.$playerDiv.css('width', ('width', $('.able-wrapper').width() + 'px'));
                    //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
                }

                //thisObj.refreshControls();
                //thisObj.setFullscreen(true);
                //show collapse icon
                thisObj.refreshControls();
                var newSvgData = thisObj.getSvgData('fullscreen-collapse');
                console.log(newSvgData);
                $('.able-button-handler-fullscreen').find('svg').attr('viewBox', newSvgData[0]);
                $('.able-button-handler-fullscreen').find('path').attr('d', newSvgData[1]);

                // var elem = document.getElementsByClassName("able-wrapper");
                // console.log(elem);
                // if (elem[0].webkitRequestFullscreen) {
                //   elem[0].webkitRequestFullscreen();
                // }
                // console.log("request fullscreen");
                // $('.able-wrapper').webkitRequestFullscreen();

                //save min height when return to screen
                thisObj.$mediaContainer.css('min-height', thisObj.$mediaContainer.css('height'));
                //find which menu was show
                var wasShow = $('[class^="controller-orange"]').filter(":visible");
                thisObj.$wasShow = wasShow;
                $('[class^="controller-orange"]').filter(":visible").attr('style', 'display:none');
                var $el = thisObj.$ableWrapper;
                var elem = $el[0];
                console.log(elem);

                if (elem.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen();
                } else if (elem.requestFullscreen()) {
                    elem.requestFullscreen()();
                } else if (elem.mozRequestFullScreen) {
                    elem.mozRequestFullScreen();
                } else if (elem.msRequestFullscreen) {
                    elem.msRequestFullscreen();
                }
                //Now timeout only if fullscreenchange is confirmed
                // setTimeout(function(){
                //   console.log('is FS ? '+thisObj.isFullscreen());
                //   console.log('is FS ? '+thisObj.getCookie()['preferences']['prefModeUsage']);
                //   if(thisObj.getCookie()['preferences']['prefModeUsage'] != 'profDef'){
                //     wasShow.attr('style','display:block');
                //   }
                //   //thisObj.checkContextVidTranscr();
                //   thisObj.resizeAccessMenu();
                // }, 1000);


                console.log('fin du passage en plein écran ' + thisObj.$mediaContainer.css('min-height'));
                console.log('fin du passage en plein écran');
            } else {
                $('.able-wrapper').css('position', '');
                $('.able-wrapper').css('width', '');
                $('.able-wrapper').css('height', '');
                $('.able-wrapper').css('padding', '');
                $('.able-wrapper').css('margin', '');
                $('.able-wrapper').css('top', '');
                $('.able-wrapper').css('left', '');
                $('.able-wrapper').css('max-width', thisObj.playerMaxWidth + 'px');
                $('.able-wrapper').css('background', '');
                $('.able-wrapper').css('overflow', '');
                $('.able-big-play-button').css('height', $('.video-accessible').height() + 'px');
                $('.able-big-play-button').css('width', $('.video-accessible').width() + 'px');
                //if LSF
                //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
                //if transcript
                if (thisObj.getCookie().preferences.prefSign == 1) {
                    $('.video-accessible-sign').css('height', $('.video-accessible').height() + 5 + 'px');
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', $('.video-accessible').height() + 5 + 'px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                } else {
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', '0px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                }
                if (thisObj.getCookie().preferences.prefTranscript == 1 && thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                    thisObj.$playerDiv.css('width', ('width', thisObj.$mediaContainer.width() + 'px'));
                    //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
                } else {
                    thisObj.$playerDiv.css('width', ('width', $('.able-wrapper').width() + 'px'));
                    //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
                }

                thisObj.refreshControls();
                thisObj.setFullscreen(false);
            }

        });
        document.body.addEventListener('keydown', function (e) {
            if (e.key === "Escape" && $('.able-wrapper').css('position') === 'fixed') {
                // write your logic here.
                $('.able-wrapper').css('position', '');
                $('.able-wrapper').css('width', '');
                $('.able-wrapper').css('height', '');
                $('.able-wrapper').css('padding', '');
                $('.able-wrapper').css('margin', '');
                $('.able-wrapper').css('top', '');
                $('.able-wrapper').css('left', '');
                $('.able-wrapper').css('background', '');
                $('.able-wrapper').css('overflow', '');
                $('.able-big-play-button').css('height', $('.video-accessible').height() + 'px');
                $('.able-big-play-button').css('width', $('.video-accessible').width() + 'px');
                //if LSF
                //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
                //if transcript
                //if transcrpit
                if (thisObj.getCookie().preferences.prefSign == 1) {
                    $('.video-accessible-sign').css('height', $('.video-accessible').height() + 5 + 'px');
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', $('.video-accessible').height() + 5 + 'px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                } else {
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', '0px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                }

                thisObj.refreshControls();
            }
        });
        document.body.addEventListener('keypress', function (e) {
            if (e.key === "Escape" && $('.able-wrapper').css('position') === 'fixed') {
                // write your logic here.
                $('.able-wrapper').css('position', '');
                $('.able-wrapper').css('width', '');
                $('.able-wrapper').css('height', '');
                $('.able-wrapper').css('padding', '');
                $('.able-wrapper').css('margin', '');
                $('.able-wrapper').css('top', '');
                $('.able-wrapper').css('left', '');
                $('.able-wrapper').css('background', '');
                $('.able-wrapper').css('overflow', '');
                $('.able-wrapper').css('overflow', '');
                $('.able-big-play-button').css('height', $('.video-accessible').height() + 'px');
                $('.able-big-play-button').css('width', $('.video-accessible').width() + 'px');
                //if LSF
                //$('.video-accessible-sign').css('height',$('.video-accessible').height()+'px');
                //if transcript
                if (thisObj.getCookie().preferences.prefSign == 1) {
                    $('.video-accessible-sign').css('height', $('.video-accessible').height() + 'px');
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', $('.video-accessible').height() + 'px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                } else {
                    if (thisObj.getCookie().preferences.prefTranscriptOrientation == 'horizontal') {
                        $('.able-transcript-area').css('top', '0px');
                    } else {
                        $('.able-transcript-area').css('top', $('.able').height() + 'px');
                    }
                }
                thisObj.refreshControls();
            }
        });
        $('#speedp').on('click', function (event) {
            thisObj.handleRateIncrease();
        });
        $('#speedm').on('click', function (event) {
            thisObj.handleRateDecrease();
        });
//$('#speed').on('click',function(event){
//    thisObj.setPlaybackRate(1);
//  });
        $('#speed').on('click', function (event) {
            var mgLeft = $('#copy-play').find('svg').css('margin-left');
            if ($('.able-speed').text().indexOf(': 1.50x') != -1) {
                thisObj.setPlaybackRate(1);
                /*$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
  $('#speed').removeClass("rabbitIcon");
  $('#speedMain').removeClass("rabbitIcon");
  $('#speed').removeClass("rabbitIcon");
  $('#speedMain').removeClass("rabbitIcon");
  $('#speed').addClass("normalIcon");
  $('#speedMain').addClass("normalIcon");*/
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('i').remove();
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " normale</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();
            } else if ($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] != 'conPlus') {
                thisObj.setPlaybackRate(1.5)
                $('#alertspeed').remove();
                //$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
                //$('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
                //$('#speed').addClass("rabbitIcon");
                //$('#speedMain').addClass("rabbitIcon");
                //$('#speed').removeClass("turtleIcon");
                //$('#speedMain').removeClass("turtleIcon");

                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('p').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('p').remove();
                $('#speedMain').children('i').remove();
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " rapide</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            } else if ($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] === 'conPlus') {
                thisObj.setPlaybackRate(1)
                /*$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speed').removeClass("turtleIcon");
    $('#speedMain').removeClass("turtleIcon");
    $('#speed').addClass("normalIcon");
    $('#speedMain').addClass("normalIcon");*/
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('i').remove();
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speed').append("<svg style='float:left;margin-left:" + mgLEft + "' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " normale</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            } else if (($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] != 'sansVisionPlus') {
                thisObj.setPlaybackRate(0.5);
                //$('#speed').children('span').text(thisObj.tt.speed+ ' ralentie');
                //$('#speedMain').children('span').text(thisObj.tt.speed+ ' ralentie');
                //$('#speed').removeClass("normalIcon");
                //$('#speedMain').removeClass("normalIcon");
                //$('#speed').addClass("turtleIcon");
                //$('#speedMain').addClass("turtleIcon");
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('p').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('p').remove();
                $('#speedMain').children('i').remove();
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " ralentie</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            } else if (($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] === 'sansVisionPlus') {
                thisObj.setPlaybackRate(1.5);
                /*$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speed').removeClass("normalIcon");
  $('#speedMain').removeClass("normalIcon");
  $('#speed').addClass("rabbitIcon");
  $('#speedMain').addClass("rabbitIcon");*/
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('p').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('p').remove();
                $('#speedMain').children('i').remove();
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " rapide</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();
            }
        });

        $('#speedMain').on('click', function (event) {
            var mgLeft = $('#copy-play').find('svg').css('margin-left');
            console.log(thisObj.getCookie()['preferences']['prefModeUsage']);
            if ($('.able-speed').text().indexOf(': 1.50x') != -1) {
                thisObj.setPlaybackRate(1);
                //$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
                //$('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('i').remove();
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' class=\"normalIcon\"></svg><span id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speed').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                //$('#speed').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'</svg><path d=''></path><span id=\"\">"+this.tt.speed+" normale</span>");
                $('#speed').removeClass("rabbitIcon");
                $('#speedMain').removeClass("rabbitIcon");
                $('#speed').removeClass("rabbitIcon");
                $('#speedMain').removeClass("rabbitIcon");
                $('#speed').addClass("normalIcon");
                $('#speedMain').addClass("normalIcon");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " normale</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            } else if ($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] != 'conPlus') {
                thisObj.setPlaybackRate(1.5)
                //$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
                //$('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
                //$('#speed').addClass("rabbitIcon");
                //$('#speedMain').addClass("rabbitIcon");
                //$('#speed').removeClass("turtleIcon");
                //$('#speedMain').removeClass("turtleIcon");
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('i').remove();
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " rapide</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();
            } else if ($('.able-speed').text().indexOf(': 0.50x') != -1 && thisObj.getCookie()['preferences']['prefModeUsage'] === 'conPlus') {
                thisObj.setPlaybackRate(1)
                /*$('#speed').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speedMain').children('span').text(thisObj.tt.speed+ ' normale');
    $('#speed').removeClass("turtleIcon");
    $('#speedMain').removeClass("turtleIcon");
    $('#speed').addClass("normalIcon");
    $('#speedMain').addClass("normalIcon");*/
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('i').remove();
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' class=\"normalIcon\"></svg><span id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speed').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span id=\"\">" + thisObj.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " normale</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            } else if (($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] != 'sansVisionPlus') {
                thisObj.setPlaybackRate(0.5);
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('p').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('p').remove();
                $('#speedMain').children('i').remove();
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " ralentie</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            } else if (($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) && thisObj.getCookie()['preferences']['prefModeUsage'] === 'sansVisionPlus') {
                thisObj.setPlaybackRate(1.5);
                /*$('#speed').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speedMain').children('span').text(thisObj.tt.speed+ ' rapide');
  $('#speed').removeClass("normalIcon");
  $('#speedMain').removeClass("normalIcon");
  $('#speed').addClass("rabbitIcon");
  $('#speedMain').addClass("rabbitIcon");*/
                $('#speed').children('svg').remove();
                $('#speed').children('span').remove();
                $('#speed').children('p').remove();
                $('#speed').children('i').remove();
                $('#speedMain').children('svg').remove();
                $('#speedMain').children('span').remove();
                $('#speedMain').children('p').remove();
                $('#speedMain').children('i').remove();
                $('#speed').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#speedMain').append("<svg style='float:left;margin-left:" + mgLeft + "' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + thisObj.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.speed + " rapide</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();

            }
        });


        $('#subt').on('click', function (event) {
            console.log(thisObj.selectedCaptions.language);
            if ($('#subt').attr('aria-pressed') == 'true') {
                //Finally for Orange we copied handlcaption method for On/Off switch in control.js -> handleCaptionToggle
                thisObj.handleCaptionToggleOnOffOrange();
            } else {
                if ($('.able-button-handler-captions').length != 0) {
                    //Finally for Orange we copied handlcaption method for On/Off switch in control.js -> handleCaptionToggle
                    thisObj.handleCaptionToggleOnOffOrange();
                }
            }

        });

        $('#subtitlesFR').on('click', function (event) {
            console.log('subtitlesFR clicked ' + $('#subtitlesFR').attr('aria-pressed') + '/' + $('#subt').attr('aria-pressed'));
            console.log(thisObj.selectedCaptions);

            if ($('#subtitlesFR').attr('aria-pressed') == 'false') {
                if ($('#subt').attr('aria-pressed') == 'false') {
                    thisObj.handleCaptionToggleOnOffOrange();
                    $('#subt').attr('aria-pressed', 'true');
                    $('#subt').attr('aria-label', thisObj.tt.de_act_st_label);
                    $('#subt').addClass('aria-no-checked');
                    $('#subt').text('');
                    //$('#subt').addClass('subtno')
                    $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");
                }

                $('#subtitlesML').attr('aria-pressed', 'false');
                $('#subtitlesML').removeClass('aria-no-checked');
                $('#subtitlesML').removeClass('subtno');
                $('#subtitlesML').text('');
                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
                $('#subtitlesML').attr('aria-label', thisObj.tt.act_st_ml_label);

                // $('#subtitlesFR').attr('aria-pressed','true');
                // $('#subtitlesFR').addClass('aria-no-checked');
                // $('#subtitlesFR').addClass('subtno');
                // $('#subtitlesFR').text(thisObj.tt.de_act_st_fr);
                // $('#subtitlesFR').attr('aria-label',thisObj.tt.de_act_st_fr_label);

                $('#subtitlesEN').attr('aria-pressed', 'false');
                $('#subtitlesEN').removeClass('aria-no-checked');
                $('#subtitlesEN').removeClass('subtno');
                $('#subtitlesEN').text(thisObj.tt.act_st_en);
                $('#subtitlesEN').attr('aria-label', thisObj.tt.act_st_en_label);

                $('#subtitlesPL').attr('aria-pressed', 'false');
                $('#subtitlesPL').removeClass('aria-no-checked');
                $('#subtitlesPL').removeClass('subtno');
                $('#subtitlesPL').text(thisObj.tt.act_st_pl);
                $('#subtitlesPL').attr('aria-label', thisObj.tt.act_st_pl_label);

                $('#subtitlesES').attr('aria-pressed', 'false');
                $('#subtitlesES').removeClass('aria-no-checked');
                $('#subtitlesES').removeClass('subtno');
                $('#subtitlesES').text(thisObj.tt.act_st_es);
                $('#subtitlesES').attr('aria-label', thisObj.tt.act_st_es_label);

            } else {
                console.log('sup FR ELSE');
            }

        });

        $('#subtitlesEN').on('click', function (event) {
            console.log('sup EN');

            if ($('#subtitlesEN').attr('aria-pressed') == 'false') {
                if ($('#subt').attr('aria-pressed') == 'false') {
                    thisObj.handleCaptionToggleOnOffOrange();
                    $('#subt').attr('aria-pressed', 'true');
                    $('#subt').attr('aria-label', thisObj.tt.de_act_st_label);
                    $('#subt').addClass('aria-no-checked');
                    $('#subt').text('');
                    //$('#subt').addClass('subtno')
                    $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");

                }
                // $('#subtitlesEN').attr('aria-pressed','true');
                //   $('#subtitlesEN').addClass('aria-no-checked');
                //   $('#subtitlesEN').addClass('subtno');
                //   $('#subtitlesEN').text(thisObj.tt.de_act_st_en);
                // $('#subtitlesEN').attr('aria-label',thisObj.tt.de_act_st_en_label);
                // //thisObj.selectedCaptions.language = 'en';

                $('#subtitlesFR').attr('aria-pressed', 'false');
                $('#subtitlesFR').removeClass('aria-no-checked');
                $('#subtitlesFR').removeClass('subtno');
                $('#subtitlesFR').text(thisObj.tt.act_st_fr);
                $('#subtitlesFR').attr('aria-label', thisObj.tt.act_st_fr_label);

                $('#subtitlesML').attr('aria-pressed', 'false');
                $('#subtitlesML').removeClass('aria-no-checked');
                $('#subtitlesML').removeClass('subtno');
                $('#subtitlesML').text('');
                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
                $('#subtitlesML').attr('aria-label', thisObj.tt.act_st_ml_label);

                $('#subtitlesPL').attr('aria-pressed', 'false');
                $('#subtitlesPL').removeClass('aria-no-checked');
                $('#subtitlesPL').removeClass('subtno');
                $('#subtitlesPL').text(thisObj.tt.act_st_pl);
                $('#subtitlesPL').attr('aria-label', thisObj.tt.act_st_pl_label);

                $('#subtitlesES').attr('aria-pressed', 'false');
                $('#subtitlesES').removeClass('aria-no-checked');
                $('#subtitlesES').removeClass('subtno');
                $('#subtitlesES').text(thisObj.tt.act_st_es);
                $('#subtitlesES').attr('aria-label', thisObj.tt.act_st_es_label);
            } else {


            }

        });

        $('#subtitlesES').on('click', function (event) {
            if ($('#subtitlesES').attr('aria-pressed') == 'false') {
                if ($('#subt').attr('aria-pressed') == 'false') {
                    thisObj.handleCaptionToggleOnOffOrange();
                    $('#subt').attr('aria-pressed', 'true');
                    $('#subt').attr('aria-label', thisObj.tt.de_act_st_label);
                    $('#subt').addClass('aria-no-checked');
                    $('#subt').text('');
                    //$('#subt').addClass('subtno')
                    $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");

                }


                $('#subtitlesML').attr('aria-pressed', 'false');
                $('#subtitlesML').removeClass('aria-no-checked');
                $('#subtitlesML').removeClass('subtno');
                $('#subtitlesML').text('');
                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
                $('#subtitlesML').attr('aria-label', thisObj.tt.act_st_ml_label);

                $('#subtitlesFR').attr('aria-pressed', 'false');
                $('#subtitlesFR').removeClass('aria-no-checked');
                $('#subtitlesFR').removeClass('subtno');
                $('#subtitlesFR').text(thisObj.tt.act_st_fr);
                $('#subtitlesFR').attr('aria-label', thisObj.tt.act_st_fr_label);

                $('#subtitlesEN').attr('aria-pressed', 'false');
                $('#subtitlesEN').removeClass('aria-no-checked');
                $('#subtitlesEN').removeClass('subtno');
                $('#subtitlesEN').text(thisObj.tt.act_st_en);
                $('#subtitlesEN').attr('aria-label', thisObj.tt.act_st_en_label);

                $('#subtitlesPL').attr('aria-pressed', 'false');
                $('#subtitlesPL').removeClass('aria-no-checked');
                $('#subtitlesPL').removeClass('subtno');
                $('#subtitlesPL').text(thisObj.tt.act_st_pl);
                $('#subtitlesPL').attr('aria-label', thisObj.tt.act_st_pl_label);

            } else {

            }

        });

        $('#subtitlesPL').on('click', function (event) {
            if ($('#subtitlesPL').attr('aria-pressed') == 'false') {
                if ($('#subt').attr('aria-pressed') == 'false') {
                    thisObj.handleCaptionToggleOnOffOrange();
                    $('#subt').attr('aria-pressed', 'true');
                    $('#subt').attr('aria-label', thisObj.tt.de_act_st_label);
                    $('#subt').addClass('aria-no-checked');
                    $('#subt').text('');
                    //$('#subt').addClass('subtno')
                    $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");

                }

                $('#subtitlesML').attr('aria-pressed', 'false');
                $('#subtitlesML').removeClass('aria-no-checked');
                $('#subtitlesML').removeClass('subtno');
                $('#subtitlesML').text('');
                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + thisObj.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                //$('#subtitlesML').append("<span id=\"\">"+thisObj.tt.act_st_ml+"</span><i class=\"captions\"></i>");
                $('#subtitlesML').attr('aria-label', thisObj.tt.act_st_ml_label);


                $('#subtitlesFR').attr('aria-pressed', 'false');
                $('#subtitlesFR').removeClass('aria-no-checked');
                $('#subtitlesFR').removeClass('subtno');
                $('#subtitlesFR').text(thisObj.tt.act_st_fr);
                $('#subtitlesFR').attr('aria-label', thisObj.tt.act_st_fr_label);

                $('#subtitlesEN').attr('aria-pressed', 'false');
                $('#subtitlesEN').removeClass('aria-no-checked');
                $('#subtitlesEN').removeClass('subtno');
                $('#subtitlesEN').text(thisObj.tt.act_st_en);
                $('#subtitlesEN').attr('aria-label', thisObj.tt.act_st_en_label);

                $('#subtitlesES').attr('aria-pressed', 'false');
                $('#subtitlesES').removeClass('aria-no-checked');
                $('#subtitlesES').removeClass('subtno');
                $('#subtitlesES').text(thisObj.tt.act_st_es);
                $('#subtitlesES').attr('aria-label', thisObj.tt.act_st_es_label);

            } else {
            }

        });

        $('#subtitlesML').on('click', function (event) {
            if ($('#subtitlesML').attr('aria-pressed') == 'false') {
                if ($('#subt').attr('aria-pressed') == 'false') {
                    thisObj.handleCaptionToggleOnOffOrange();
                    $('#subt').attr('aria-pressed', 'true');
                    $('#subt').attr('aria-label', thisObj.tt.de_act_st_label);
                    $('#subt').addClass('aria-no-checked');
                    $('#subt').text('');
                    //$('#subt').addClass('subtno')
                    $('#subt').append("<span id=\"\">" + thisObj.tt.de_act_st_general + "</span>");

                }

                $('#subtitlesPL').attr('aria-pressed', 'false');
                $('#subtitlesPL').removeClass('aria-no-checked');
                $('#subtitlesPL').removeClass('subtno');
                $('#subtitlesPL').text(thisObj.tt.act_st_pl);
                $('#subtitlesPL').attr('aria-label', thisObj.tt.act_st_pl_label);


                $('#subtitlesFR').attr('aria-pressed', 'false');
                $('#subtitlesFR').removeClass('aria-no-checked');
                $('#subtitlesFR').removeClass('subtno');
                $('#subtitlesFR').text(thisObj.tt.act_st_fr);
                $('#subtitlesFR').attr('aria-label', thisObj.tt.act_st_fr_label);

                $('#subtitlesEN').attr('aria-pressed', 'false');
                $('#subtitlesEN').removeClass('aria-no-checked');
                $('#subtitlesEN').removeClass('subtno');
                $('#subtitlesEN').text(thisObj.tt.act_st_en);
                $('#subtitlesEN').attr('aria-label', thisObj.tt.act_st_en_label);

                $('#subtitlesES').attr('aria-pressed', 'false');
                $('#subtitlesES').removeClass('aria-no-checked');
                $('#subtitlesES').removeClass('subtno');
                $('#subtitlesES').text(thisObj.tt.act_st_es);
                $('#subtitlesES').attr('aria-label', thisObj.tt.act_st_es_label);

            } else {
            }

        });
        this.$ableWrapper.bind('webkitfullscreenchange mozfullscreenchange fullscreenchange', function (e) {
            var state = document.fullScreen || document.mozFullScreen || document.webkitIsFullScreen;
            var event = state ? 'FullscreenOn' : 'FullscreenOff';

            // Now do something interesting
            console.log('Event: ' + event);
            if (thisObj.isFullscreen() == false) {//exit fullscreen
                $('.able-wrapper').css('position', '');
                $('.able-wrapper').css('width', '');
                $('.able-wrapper').css('height', '');
                $('.able-wrapper').css('padding', '');
                $('.able-wrapper').css('margin', '');
                $('.able-wrapper').css('top', '');
                $('.able-wrapper').css('left', '');
                $('.able-wrapper').css('max-width', thisObj.playerMaxWidth + 'px');
                $('.able-wrapper').css('background', '');
                $('.able-wrapper').css('overflow', '');
                $('.able-big-play-button').css('height', $('.video-accessible').height() + 'px');
                $('.able-big-play-button').css('width', $('.video-accessible').width() + 'px');
                thisObj.restoringAfterFullScreen = true;
                thisObj.resizePlayer(thisObj.preFullScreenWidth, thisObj.preFullScreenHeight);
                var wasShow = $('[class^="controller-orange"]').filter(":visible");
                if (wasShow.length > 1) {
                    thisObj.$controllerOrangeDiv.css('display', 'none');
                }

                thisObj.checkContextVidTranscr();
                thisObj.resizePlayer();
            } else {
                setTimeout(function () {
                    if (thisObj.getCookie()['preferences']['prefModeUsage'] != 'profDef') {
                        thisObj.$wasShow.attr('style', 'display:block');
                    }
                    //thisObj.checkContextVidTranscr();
                    thisObj.resizeAccessMenu();
                }, 300);
            }

        });

        document.addEventListener("fullscreenchange webkitfullscreenchange", function () {
            console.log("fullscreenchange");
            thisObj.resizePlayer();
            if (thisObj.isFullscreen() == true) {
                //enter
            } else {
                //exit with escape
                $('#acc-menu-id').css('display', 'initial');
                if (thisObj.getCookie()['preferences']['prefSign'] === 1 && thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true') {

                    thisObj.$ableDiv.css('width', '67%');
                    thisObj.$signWindow.css('width', '33%');
                    thisObj.$signWindow.css('left', '67%');
                    thisObj.$signWindow.css('position', 'absolute');
                    thisObj.$signWindow.css('top', '0px');
                    thisObj.$signWindow.css('margin', '0px');
                    if (thisObj.getCookie()['preferences']['prefTranscript'] === 1) {
                        var takePadding = 0;
                        if (parseInt(thisObj.$signToolbar.css('padding').replace('px', ''))) {
                            takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px', ''));
                        }
                        thisObj.$transcriptArea.css('top', (thisObj.$signWindow.height() + thisObj.$signToolbar.height() + takePadding) + 'px');
                        thisObj.$transcriptArea.css('width', '66%');
                        thisObj.$transcriptArea.css('left', '33%');
                    }
                } else if (thisObj.getCookie()['preferences']['prefTranscript'] === 1 && thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                    thisObj.$transcriptArea.css('top', '0px');
                    thisObj.$transcriptArea.css('width', '66%');
                    thisObj.$transcriptArea.css('left', '33%');
                    thisObj.$ableDiv.css('width', '33%');
                }
            }
        });

        $('#lsf').on('click', function (event) {
            console.log('lsf click button');
            if ($('#lsf').attr('aria-checked') == 'true') {

                //new version 06/08/2020
                $('#lsf').attr('aria-checked', 'false');
                $('#lsf').removeClass('aria-no-checked');
                $('#lsf').children('span').text(thisObj.tt.lsfact);
                $('#lsf').children('svg').children('line').css('display', 'block');
                //thisObj.setDefaultPref();
                console.log(thisObj.$mediaContainer.find('video'));
                if (thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src'))) {
                    console.log('ok on entre là dedans');
                    //save time video
                    var elapsed = thisObj.getElapsed();
                    if (thisObj.getCookie()['preferences']['prefTranscript'] === 0) {
                        thisObj.$ableDiv.css('width', '100%');
                    } else {
                        thisObj.$transcriptArea.css('top', '0px');
                    }
                    var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src;
                    //put video sign in the second container
                    thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.$mediaContainer.find('video')[0].load();
                    //put video in the first containre
                    thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
                    thisObj.$signWindow.find('video')[0].load();
                    thisObj.$signWindow.hide();
                    thisObj.swappingSrc = true;
                    thisObj.swapTime = elapsed;
                }
                if (thisObj.isMuted() === true) {
                    thisObj.handleMute();
                }
                $('#vidcontr2').css('display', 'none');
                if (thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src'))) {
                    //save time video
                    var elapsed = thisObj.getElapsed();
                    if (thisObj.getCookie()['preferences']['prefTranscript'] === 0) {
                        thisObj.$ableDiv.css('width', '100%');
                    } else {
                        thisObj.$transcriptArea.css('top', '0px');
                    }
                    var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src;
                    //put video sign in the second container
                    thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.$mediaContainer.find('video')[0].load();
                    //put video in the first containre
                    thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
                    thisObj.$signWindow.find('video')[0].load();
                    thisObj.swappingSrc = true;
                    thisObj.swapTime = elapsed;
                }
                thisObj.prefSign = 0;
                thisObj.updateCookie('prefSign');
            } else {

                //new version 06/08/2020
                $('#speedMain').css('display', 'none');
                //thisObj.setDefaultPref();
                $('#lsf').attr('aria-checked', 'true');
                $('#lsf').addClass('aria-no-checked');
                $('#lsf').children('span').text(thisObj.tt.lsfno);
                thisObj.positionDraggableWindow('sign');
                $('#lsf').children('svg').children('line').css('display', 'none');
                thisObj.$signWindow.show();
                if (thisObj.$signButton != undefined) {
                    thisObj.$signButton.removeClass('buttonOff').attr('aria-label', thisObj.tt.hideSign);
                    thisObj.$signButton.find('span.able-clipped').text(thisObj.tt.hideSign);
                }
                thisObj.prefSign = 1;
                if (thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) === false) {
                    //save time video
                    var elapsed = thisObj.getElapsed();
                    // thisObj.$ableDiv.css('width','67%');
                    // thisObj.$signWindow.css('width','33%');
                    // thisObj.$signWindow.css('left','67%');
                    thisObj.$ableDiv.css('width', 100 - thisObj.getCookie()['preferences']['prefVidSize'] + '%');
                    thisObj.$signWindow.css('width', thisObj.getCookie()['preferences']['prefVidSize'] + '%');
                    thisObj.$signWindow.css('left', 100 - thisObj.getCookie()['preferences']['prefVidSize'] + '%');
                    thisObj.$signWindow.css('position', 'absolute');
                    thisObj.$signWindow.css('top', '0px');
                    thisObj.$signWindow.css('margin', '0px');
                    //put video sign in the first container
                    var svgVideoSrc = thisObj.$mediaContainer.find('video').find('source')[0].src;
                    thisObj.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
                    console.log(thisObj.$mediaContainer);
                    console.log(thisObj.$mediaContainer.find('video'));
                    thisObj.$mediaContainer.find('video')[0].load();
                    //put video in the second containre
                    thisObj.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.$signWindow.find('video')[0].load();
                    thisObj.swappingSrc = true;
                    thisObj.swapTime = elapsed;
                }
                thisObj.updateCookie('prefSign');
                if (thisObj.isMuted() === false) {
                    thisObj.handleMute();
                }
                $('#vidcontr2').css('display', 'block');
                thisObj.$playerDiv.css('width', (thisObj.$ableWrapper.width()) + 'px');
//}
            }
//test
            thisObj.checkContextVidTranscr();
        });

        $('#audiodesc').on('click', function (event) {
            if ($('#audiodesc').attr('aria-checked') === 'false') {
                thisObj.handleDescriptionToggle();
            } else {
                ///if($('.able-button-handler-descriptions').length != 0){
                thisObj.handleDescriptionToggle();
            }
        });

        $('#transcr').on('click', function (event) {
            console.log('detec click on transcr button');
            console.log('detec click on transcr button');
            if ($('#transcr').attr('aria-checked') === 'false') {
                thisObj.handleTranscriptToggle();
            } else {
                thisObj.handleTranscriptToggle();
            }
        });

        $('.vidcontr').on('click', function (event) {
            if (thisObj.isPaused())
                thisObj.playing = false;
            console.log('vidcontr click is true ?');
            console.log($('.vidcontr').attr('aria-checked'));
            if ($('.vidcontr').attr('aria-checked') == 'true' || $('#vidcontr').attr('aria-checked') == 'true') {
                $('.vidcontr').attr('aria-checked', 'false');
                $('.vidcontr').attr('aria-label', thisObj.tt.vidcontrno);
                var vids = $(document.getElementsByTagName('video'));
                for (var i = 0; i < vids.length; i++) {
                    $(vids[i]).css('filter', '');
                    $(vids[i]).css('filter', '');
                    $(vids[i]).css('background-color', 'transparent');
                    if ($(vids[i]).hasClass('video-accessible-sign')) {
                        $(vids[i]).css('background-color', 'black');
                    } else {
                        $(vids[i]).css('background-color', 'lightgray');
                    }

                }
                $('.vidcontr').text('');
                $('.vidcontr').removeClass('vidcontrno')
                $('.vidcontr').append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">" + thisObj.tt.vidcontrno + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.vidcontrno + " activée</p>").appendTo(document.body);

            } else {
                $('.vidcontr').attr('aria-checked', 'true');
                var vids = $(document.getElementsByTagName('video'));
                for (var i = 0; i < vids.length; i++) {
                    $(vids[i]).css('filter', 'grayscale(100%) contrast(150%)');
                    $(vids[i]).css('filter', 'grayscale(100%) contrast(150%)');
                    $(vids[i]).css('background-color', 'black');
                }
                $('.vidcontr').addClass('vidcontrno');
                $('.vidcontr').attr('aria-label', thisObj.tt.vidcontr);
                $('.vidcontr').text('');
                $('.vidcontr').append("<svg class=\"captions\" style='box-shadow:1px 1px 0px #aaa;margin-left:" + $('#copy-play').find('svg').css('margin-left') + "'></svg><span id=\"\" class='spanButton'>" + thisObj.tt.vidcontr + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.vidcontr + " activée</p>").appendTo(document.body);
                thisObj.resizeAccessMenu();
            }
        });

//New settings preferences events
        $('.vplus').on('click', function (event) {
            thisObj.handleChangeProfil('vplus')
        });
        $('.svplus').on('click', function (event) {
            thisObj.handleChangeProfil('svplus')
        });
        $('.lsfplus').on('click', function (event) {
            thisObj.handleChangeProfil('lsfplus')
        });
        $('.conplus').on('click', function (event) {
            thisObj.handleChangeProfil('conplus')
        });
        $('.audplus').on('click', function (event) {
            thisObj.handleChangeProfil('audplus')
        });
        $('.profdef').on('click', function (event) {
            thisObj.handleChangeProfil('profdef')
        });
        $('#visionPlus').on('click', function (event) {
            console.log('#visionPlus onclick');
            console.log($('#visionPlus'));
            if ($('#visionPlus').attr('aria-pressed') === 'true') {
            } else {
                for (var q = 0; q < thisObj.accessPopup.find('input:radio').length; q++) {
                    thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked', false)
                    thisObj.accessPopup.find('li').removeClass('able-focus')
                }
                thisObj.accessPopup.find('input:radio[value=' + 0 + ']').prop('checked', true)
                $('#vidcontr2').css('display', 'none');
                thisObj.setDefaultPref();
                $('#visionPlus').attr('aria-pressed', 'true');
                $('#visionPlus').addClass('aria-no-checked');
                thisObj.prefCaptionsFont = 'Arial';
                thisObj.prefCaptionsColor = 'white';
                thisObj.prefCaptionsSize = '100%';
                thisObj.prefModeUsage = 'visionPlus';
                $('#' + thisObj.mediaId + '_' + 'prefCaptionsFont').val('Arial');
                $('#' + thisObj.mediaId + '_' + 'prefCaptionsColor').val('white');
                $('#' + thisObj.mediaId + '_' + 'prefCaptionsSize').val('100%');
                thisObj.updateCookie('prefCaptionsFont');
                thisObj.updateCookie('prefCaptionsColor');
                thisObj.updateCookie('prefCaptionsSize');
                thisObj.updateCookie('prefModeUsage');
                $('.able-captions').css('font-family', thisObj.prefCaptionsFont);
                $('.able-captions').css('color', thisObj.prefCaptionsColor);
                $('.able-captions').css('font-size', thisObj.prefCaptionsSize);
                $('.able-descriptions').css('font-family', thisObj.prefCaptionsFont);
                $('.able-descriptions').css('color', thisObj.prefCaptionsColor);
                $('.able-descriptions').css('font-size', thisObj.prefCaptionsSize);

                //mettre le contraste
                var vids = $(document.getElementsByTagName('video'));
                for (var i = 0; i < vids.length; i++) {
                    $(vids[i]).css('filter', 'grayscale(100%) contrast(150%)');
                    $(vids[i]).css('filter', 'grayscale(100%) contrast(150%)');
                    $(vids[i]).css('background-color', 'black');
                }
                $('.vidcontr').text('');
                $('.vidcontr').append("<svg class=\"captions\" style='box-shadow:1px 1px 0px #aaa;margin-left:" + $('#copy-play').find('svg').css('margin-left') + "'></svg><span id=\"\" '>" + thisObj.tt.vidcontr + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                $('#alertspeed').remove();
                $("<p id='alertspeed' style='color:transparent' role='alert'>" + thisObj.tt.vidcontr + " activée</p>").appendTo(document.body);
                $('.vidcontr').addClass('vidcontrno');
                $('.vidcontr').attr('aria-label', thisObj.tt.vidcontr);
                $('.vidcontr').attr('aria-checked', true);
                //Attention faire aussi apparaitre le bouton bacule de vitesse de la vidéo
                $('#speedMain').css('display', 'block');

                if (thisObj.getCookie()['preferences']['prefCaptions'] == '0') {//si ss pas activer, les activer
                    thisObj.getCaptionOffFunction();
                    thisObj.handleCaptionToggleOnOffOrange();
                }

            }

            thisObj.checkContextVidTranscr();

        });

        $('#sansVisionPlus').on('click', function (event) {
            if ($('#sansVisionPlus').attr('aria-pressed') === 'true') {
                console.log('here sansVisionPlus');
            } else {
                console.log('else sansVisionPlus');
                for (var q = 0; q < thisObj.accessPopup.find('input:radio').length; q++) {
                    thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked', false)
                    thisObj.accessPopup.find('li').removeClass('able-focus')
                }
                thisObj.accessPopup.find('input:radio[value=' + 1 + ']').prop('checked', true)
                $('#vidcontr2').css('display', 'none');
                thisObj.setDefaultPref();
                $('#sansVisionPlus').attr('aria-pressed', 'true');
                $('#sansVisionPlus').addClass('aria-no-checked');
                $('#audiodesc').attr('aria-pressed', 'true');
                $('#audiodesc').addClass('aria-no-checked');
                $('#audiodesc').children('span').text(thisObj.tt.audiodescno);
                $('#audiodesc').children('svg').children('line').css('display', 'none');
                if ($('#audiodesc').attr('aria-pressed') == 'false') {
                    thisObj.handleDescriptionToggle();
                } else {
                    $('#audiodesc').attr('aria-pressed', 'true');
                    $('#audiodesc').addClass('aria-no-checked');
                    $('#audiodesc').children('span').text(thisObj.tt.audiodescno);
                    $('#audiodesc').children('svg').children('line').css('display', 'none');
                }

                thisObj.prefDesc = 1;
                thisObj.prefModeUsage = 'sansVisionPlus';
                thisObj.updateCookie('prefDesc');
                thisObj.updateCookie('prefModeUsage');
                thisObj.refreshingDesc = true;
                thisObj.initDescription();
                thisObj.refreshControls();
                $('#speedMain').css('display', 'block');
                if (thisObj.getCookie()['preferences']['prefCaptions'] == '1') {//si ss activer, les désactiver
                    console.log('getCaptionOffFunction event sansVisionPlus');
                    thisObj.handleCaptionToggleOnOffOrange();
                    thisObj.getCaptionOffFunction();
                    thisObj.captionsPopup.find('input').last().prop('checked', true);
                }
            }
            thisObj.checkContextVidTranscr();

        });
        $('#auditionPlus').on('click', function (event) {
            if ($('#auditionPlus').attr('aria-pressed') === 'true') {
            } else {
                console.log('numb profil =' + thisObj.accessPopup.find('input:radio').length);
                for (var q = 0; q < thisObj.accessPopup.find('input:radio').length; q++) {
                    thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked', false)
                    thisObj.accessPopup.find('li').removeClass('able-focus')
                }
                thisObj.accessPopup.find('input:radio[value=' + 4 + ']').prop('checked', true)
                $('#vidcontr2').css('display', 'none');
                $('#speedMain').css('display', 'none');
                thisObj.setDefaultPref();
                $('#auditionPlus').attr('aria-pressed', 'true');
                $('#auditionPlus').addClass('aria-no-checked');
                thisObj.prefModeUsage = 'auditionPlus';
                thisObj.updateCookie('prefModeUsage');
                $('.able-captions').addClass('audplus');
                $('.translateLg').addClass('audplus');
                if (thisObj.getCookie()['preferences']['prefCaptions'] == '0') {//si ss pas activer, les activer
                    thisObj.getCaptionOffFunction();
                    thisObj.handleCaptionToggleOnOffOrange();
                }
            }
            thisObj.checkContextVidTranscr();

        });
        $('#lsfPlus').on('click', function (event) {
            if ($('#lsfPlus').attr('aria-pressed') === 'true') {
            } else {
                for (var q = 0; q < thisObj.accessPopup.find('input:radio').length; q++) {
                    thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked', false)
                    thisObj.accessPopup.find('li').removeClass('able-focus')
                }
                thisObj.accessPopup.find('input:radio[value=' + 2 + ']').prop('checked', true)
                $('#speedMain').css('display', 'none');
                thisObj.setDefaultPref();
                $('#lsfPlus').attr('aria-pressed', 'true');
                $('#lsfPlus').addClass('aria-no-checked');
                $('#lsf').attr('aria-checked', 'true');
                $('#lsf').addClass('aria-no-checked');
                $('#lsf').children('span').text(thisObj.tt.lsfno);
                thisObj.prefModeUsage = 'lsfPlus';
                thisObj.updateCookie('prefModeUsage');
                thisObj.positionDraggableWindow('sign');
                $('#lsf').children('svg').children('line').css('display', 'none');
                thisObj.$signWindow.show();
                if (thisObj.$signButton != undefined) {
                    thisObj.$signButton.removeClass('buttonOff').attr('aria-label', thisObj.tt.hideSign);
                    thisObj.$signButton.find('span.able-clipped').text(thisObj.tt.hideSign);
                }
                thisObj.prefSign = 1;
                if (thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) === false) {
                    //save Time
                    var elapsed = thisObj.getElapsed();
                    thisObj.$ableDiv.css('width', '67%');
                    thisObj.$signWindow.css('width', '33%');
                    thisObj.$signWindow.css('left', '67%');
                    thisObj.$signWindow.css('position', 'absolute');
                    thisObj.$signWindow.css('top', '0px');
                    thisObj.$signWindow.css('margin', '0px');
                    //put video sign in the first container
                    var svgVideoSrc = thisObj.$mediaContainer.find('video').find('source')[0].src;
                    thisObj.$mediaContainer.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
                    thisObj.$mediaContainer.find('video')[0].load();
                    //put video in the second containre
                    thisObj.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.$signWindow.find('video')[0].load();
                    thisObj.swappingSrc = true;
                    thisObj.swapTime = elapsed;
                }
                thisObj.updateCookie('prefSign');
                if (thisObj.isMuted() === false) {
                    thisObj.handleMute();
                }
                if (thisObj.getCookie()['preferences']['prefCaptions'] == '1') {//si sous tittre activé, les désactiver
                    console.log('getCaptionOffFunction event du to ' + thisObj.getCookie()['preferences']['prefCaptions']);
                    thisObj.handleCaptionToggleOnOffOrange();
                    thisObj.getCaptionOffFunction();
                    thisObj.captionsPopup.find('input').last().prop('checked', true);
                }
                thisObj.$playerDiv.css('width', (thisObj.$ableWrapper.width()) + 'px');
                $('#vidcontr2').css('display', 'block');
                thisObj.checkContextVidTranscr();

            }

        });
        $('#profDef').on('click', function (event) {
            console.log('is button pressed ?');
            console.log($('#profDef').attr('aria-pressed'));
            if ($('#profDef').attr('aria-pressed') === 'true') {
                $('#profDef').attr('aria-pressed', 'false');
                $('#profDef').removeClass('aria-no-checked');
            } else {
                thisObj.setDefaultPref();
                //reload all pref to def
                thisObj.$buttonOutNo.click();
                thisObj.$button100.click();
                thisObj.$buttonArial.click();
                $('.able-captions').css('color', 'white');
                $('#profDef').attr('aria-pressed', 'true');
                $('#profDef').addClass('aria-no-checked');
                thisObj.setCaptionsOn(false, thisObj.captionLang);
                for (var q = 0; q < thisObj.accessPopup.find('input:radio').length; q++) {
                    console.log("remove ");
                    console.log(thisObj.accessPopup.find('li'));
                    thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked', false)
                    thisObj.accessPopup.find('li').removeClass('able-focus');
                }
                thisObj.accessPopup.find('input:radio[value=' + 5 + ']').prop('checked', true)
                if (thisObj.prefAccessMenu == "true") {
                    thisObj.prefAccessMenu = "false";
                    thisObj.updateCookie('prefAccessMenu');
                }
                //$('#acc-menu-id').click();
                $('#' + thisObj.mediaId + '_' + 'prefAccessMenu').val('false');
                $('#acc-menu-id').text(thisObj.tt.showAccMenu);
                thisObj.prefModeUsage = 'profDef';
                thisObj.updateCookie('prefModeUsage');
                $('.able').css("width", "100%");
                if (thisObj.$mediaContainer.find('video').find('source')[0].src.includes(thisObj.$sources.first().attr('data-sign-src')) && thisObj.getCookie()['preferences']['prefSign'] == 1) {
                    //save Time
                    var elapsed = thisObj.getElapsed();
                    if (thisObj.getCookie()['preferences']['prefTranscript'] === 0) {
                        thisObj.$ableDiv.css('width', '100%');
                    } else {
                        thisObj.$transcriptArea.css('top', '0px');
                    }
                    var svgVideoSrc = thisObj.$signWindow.find('video').find('source')[0].src;
                    //put video sign in the second container
                    thisObj.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
                    thisObj.$mediaContainer.find('video')[0].load();
                    //put video in the first containre
                    thisObj.$signWindow.find('video').find('source')[0].src = thisObj.$sources.first().attr('data-sign-src');
                    thisObj.$signWindow.find('video')[0].load();
                    thisObj.swappingSrc = true;
                    thisObj.swapTime = elapsed;
                }
                $('.controller-orange-main').attr("style", "display:none");
                $('.controller-orange-volume').attr("style", "display:none");
                $('.controller-orange-settings').attr("style", "display:none");
                $('.controller-orange-subtitles').attr("style", "display:none");
                $('.controller-orange-preferences').attr("style", "display:none");
                $('.controller-orange-perception').attr("style", "display:none");
                $('.controller-orange-textcolor').attr("style", "display:none");
                $('.controller-orange-bgcolor').attr("style", "display:none");
                $('.controller-orange-followcolor').attr("style", "display:none");
                $('.controller-orange-fontsize').attr("style", "display:none");
                $('.controller-orange-outfont').attr("style", "display:none");
                $('.controller-orange-font').attr("style", "display:none");
                $('.controller-orange-butcol').attr("style", "display:none");
                $('.controller-orange-reglages').attr("style", "display:none");
                thisObj.checkContextVidTranscr();
                //.css('display','none');

            }
        });
        $('#defPlus').on('click', function (event) {
            if ($('#defPlus').attr('aria-pressed') === 'true') {
                $('#defPlus').attr('aria-pressed', 'false');
                $('#defPlus').removeClass('aria-no-checked');
                $('#defPlus').removeClass('firstTime');
                thisObj.setDefaultPref();
                if (thisObj.isMuted() === true) {
                    thisObj.handleMute();
                }
                $('#vidcontr2').css('display', 'none');
            } else {
                $('#vidcontr2').css('display', 'none');
                $('#speedMain').css('display', 'none');
                if ($('#defPlus').hasClass('firstTime') === false) {// this.$buttonDefPlus.addClass('firstTime');
                    thisObj.setDefaultPref();
                }
                $('#defPlus').attr('aria-pressed', 'true');
                $('#defPlus').removeClass('firstTime');
                $('#defPlus').addClass('aria-no-checked');
                thisObj.prefModeUsage = 'defPlus';
                thisObj.updateCookie('prefModeUsage');

                thisObj.$timerOrange = setInterval(myTimer, 1000);

                thisObj.checkContextVidTranscr();

            }

        });

        $('#conPlus').on('click', function (event) {
            if ($('#conPlus').attr('aria-pressed') === 'true') {
            } else {
                thisObj.setDefaultPref();
                for (var q = 0; q < thisObj.accessPopup.find('input:radio').length; q++) {
                    thisObj.accessPopup.find('input:radio[value=' + q + ']').prop('checked', false)
                    thisObj.accessPopup.find('li').removeClass('able-focus')
                }
                thisObj.accessPopup.find('input:radio[value=' + 3 + ']').prop('checked', true)
                $('#vidcontr2').css('display', 'none');
                $('#conPlus').attr('aria-pressed', 'true');
                $('#conPlus').addClass('aria-no-checked');
                $('#transcr').attr('aria-checked', 'true');
                $('#transcr').addClass('aria-no-checked');
                $('#transcr').children('span').text(thisObj.tt.transcrno);
                $('#transcr').children('svg').children('line').css('display', 'none');
                thisObj.prefModeUsage = 'conPlus';
                thisObj.updateCookie('prefModeUsage');
                console.log(thisObj.$transcriptDiv.is(':visible'));
                if (thisObj.$transcriptDiv.is(':visible') === false) {
                    thisObj.handleTranscriptToggle();
                    //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
                }

                if (thisObj.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                    //Orange 30/10/2020 USELESS
                    console.log(thisObj.$signToolbar.css('padding').replace('px', ''));
                    console.log(thisObj.getCookie()['preferences']['prefSign'] === 1);
                    console.log("check prefAccessMenu :" + thisObj.$playerDiv.width());
                    console.log("check prefAccessMenu :" + thisObj.$ableDiv.width());

                    if (thisObj.getCookie()['preferences']['prefSign'] === 1) {
                        var takePadding = 0;
                        if (parseInt(thisObj.$signToolbar.css('padding').replace('px', ''))) {
                            takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px', ''));
                        }
                        thisObj.$transcriptArea.css('top', (thisObj.$signWindow.height() + thisObj.$signToolbar.height() + takePadding) + 'px');
                        thisObj.$playerDiv.css('width', ('width', thisObj.$mediaContainer.width() + 'px'));
                        //$('.able-captions-wrapper').css('width',(thisObj.$playerDiv.width())+'px');
                        //$('.able-descriptions').css('width',(thisObj.$playerDiv.width())+'px');
                    } else {
                        thisObj.$ableDiv.css('width', 100 - parseInt(thisObj.getCookie()['preferences']['prefVidSize']) + '%');
                        thisObj.$transcriptToolbar.css('min-height', '28px');
                        thisObj.$transcriptArea.css('width', thisObj.getCookie()['preferences']['prefVidSize'] + '%');
                        thisObj.$transcriptArea.css('left', 100 - parseInt(thisObj.getCookie()['preferences']['prefVidSize']) + '%');
                        thisObj.$transcriptArea.css('top', '0px');
                        var heightTranscriptArea = thisObj.$mediaContainer.css('height').split("px")[0] - thisObj.$transcriptToolbar.css('min-height').split("px")[0];
                        thisObj.$transcriptArea.css('height', thisObj.$mediaContainer.css('height').split("px")[0] + 'px');
                        thisObj.$transcriptDiv.css('height', heightTranscriptArea - 5 + 'px');
                    }
                    if (thisObj.getCookie()['preferences']['prefCaptions'] == '1') {//si sous tittre activé, les désactiver
                        console.log('getCaptionOffFunction event du to ' + thisObj.getCookie()['preferences']['prefCaptions']);
                        thisObj.handleCaptionToggleOnOffOrange();
                        thisObj.getCaptionOffFunction();
                        thisObj.captionsPopup.find('input').last().prop('checked', true);
                    }
                    thisObj.checkContextVidTranscr();
                }

                $('#speedMain').css('display', 'block');
                thisObj.checkContextVidTranscr();
                thisObj.resizeAccessMenu();

            }

        });


        function myTimer() {
            if ($('.controller-orange-preferences').is(':visible')) {
                if (document.activeElement === document.getElementById("allParams")) {
                    document.getElementById("hide-prefT").focus();
                } else if (document.activeElement === document.getElementById("hide-prefT")) {
                    document.getElementById("visionPlus").focus();
                } else if (document.activeElement === document.getElementById("visionPlus")) {
                    document.getElementById("sansVisionPlus").focus();
                } else if (document.activeElement === document.getElementById("sansVisionPlus")) {
                    document.getElementById("auditionPlus").focus();
                } else if (document.activeElement === document.getElementById("auditionPlus")) {
                    document.getElementById("lsfPlus").focus();
                } else if (document.activeElement === document.getElementById("lsfPlus")) {
                    document.getElementById("defPlus").focus();
                } else if (document.activeElement === document.getElementById("defPlus")) {
                    document.getElementById("conPlus").focus();
                } else {
                    document.getElementById("allParams").focus();
                }
            }
            if ($('.controller-orange-main').is(':visible')) {
                if (document.activeElement === document.getElementById("copy-play")) {
                    document.getElementById("copy-forward").focus();
                } else if (document.activeElement === document.getElementById("copy-forward")) {
                    document.getElementById("copy-rewind").focus();
                } else if (document.activeElement === document.getElementById("copy-rewind")) {
                    document.getElementById("show-volume").focus();
                } else if (document.activeElement === document.getElementById("show-volume")) {
                    document.getElementById("fullscreen").focus();
                } else if (document.activeElement === document.getElementById("fullscreen")) {
                    document.getElementById("subtitles").focus();
                } else if (document.activeElement === document.getElementById("subtitles")) {
                    if ($('#vidcontr2').css('display') != 'none') {
                        document.getElementById("vidcontr2").focus();
                    } else {
                        document.getElementById("show-settings").focus();
                    }
                } else if (document.activeElement === document.getElementById("show-settings")) {
                    document.getElementById("copy-play").focus();
                } else {
                    document.getElementById("copy-play").focus();
                }
            }
            if ($('.controller-orange-volume').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-volume")) {
                    document.getElementById("sound-up").focus();
                } else if (document.activeElement === document.getElementById("sound-up")) {
                    document.getElementById("sound-down").focus();
                } else if (document.activeElement === document.getElementById("sound-down")) {
                    document.getElementById("sound-mute").focus();
                } else if (document.activeElement === document.getElementById("sound-mute")) {
                    document.getElementById("hide-volume").focus();
                } else {
                    document.getElementById("hide-volume").focus();
                }
            }

            if ($('.controller-orange-subtitles').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-subT")) {
                    document.getElementById("subt").focus();
                } else if (document.activeElement === document.getElementById("subt")) {
                    document.getElementById("subtitlesML").focus();
                } else if (document.activeElement === document.getElementById("subtitlesFR")) {
                    document.getElementById("subtitlesEN").focus();
                } else if (document.activeElement === document.getElementById("subtitlesML")) {
                    document.getElementById("subtitlesFR").focus();
                } else if (document.activeElement === document.getElementById("subtitlesEN")) {
                    document.getElementById("subtitlesES").focus();
                } else if (document.activeElement === document.getElementById("subtitlesES")) {
                    document.getElementById("subtitlesPL").focus();
                } else if (document.activeElement === document.getElementById("subtitlesPL")) {
                    document.getElementById("hide-subT").focus();
                } else {
                    document.getElementById("hide-subT").focus();
                }
            }

            if ($('.controller-orange-settings').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-settings")) {
                    document.getElementById("speed").focus();
                } else if (document.activeElement === document.getElementById("speed")) {//subtitlesParam
                    document.getElementById("subtitlesParam").focus();
                } else if (document.activeElement === document.getElementById("subtitlesParam")) {//subtitlesParam
                    document.getElementById("lsf").focus();
                } else if (document.activeElement === document.getElementById("lsf")) {
                    document.getElementById("audiodesc").focus();
                } else if (document.activeElement === document.getElementById("audiodesc")) {
                    document.getElementById("transcr").focus();
                } else if (document.activeElement === document.getElementById("transcr")) {
                    document.getElementById("vidcontr").focus();
                } else if (document.activeElement === document.getElementById("vidcontr")) {
                    document.getElementById("perceptionParam").focus();
                } else if (document.activeElement === document.getElementById("perceptionParam")) {
                    document.getElementById("reglageParam").focus();
                } else if (document.activeElement === document.getElementById("reglageParam")) {
                    document.getElementById("hide-settings").focus();
                } else {
                    document.getElementById("hide-settings").focus();
                }
            }

            if ($('.controller-orange-perception').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-perception")) {
                    document.getElementById("low").focus();
                } else if (document.activeElement === document.getElementById("low")) {
                    document.getElementById("acute").focus();
                } else if (document.activeElement === document.getElementById("acute")) {
                    document.getElementById("hide-perception").focus();
                } else {
                    document.getElementById("hide-perception").focus();
                }
            }

            if ($('.controller-orange-reglages').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-reglages")) {
                    document.getElementById("textColor").focus();
                } else if (document.activeElement === document.getElementById("textColor")) {
                    document.getElementById("bgColor").focus();
                } else if (document.activeElement === document.getElementById("bgColor")) {
                    document.getElementById("followColor").focus();
                } else if (document.activeElement === document.getElementById("followColor")) {
                    document.getElementById("fontSize").focus();
                } else if (document.activeElement === document.getElementById("fontSize")) {
                    document.getElementById("outText").focus();
                } else if (document.activeElement === document.getElementById("outText")) {
                    document.getElementById("textStyle").focus();
                } else if (document.activeElement === document.getElementById("textStyle")) {
                    document.getElementById("reglagesSettings").focus();
                } else if (document.activeElement === document.getElementById("reglagesSettings")) {
                    document.getElementById("hide-reglages").focus();
                } else {
                    document.getElementById("hide-reglages").focus();
                }
            }

            if ($('.controller-orange-textcolor').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-textColor")) {
                    document.getElementById("whiteTextColor").focus();
                } else if (document.activeElement === document.getElementById("whiteTextColor")) {
                    document.getElementById("blackTextColor").focus();
                } else if (document.activeElement === document.getElementById("blackTextColor")) {
                    document.getElementById("redTextColor").focus();
                } else if (document.activeElement === document.getElementById("redTextColor")) {
                    document.getElementById("greenTextColor").focus();
                } else if (document.activeElement === document.getElementById("greenTextColor")) {
                    document.getElementById("blueTextColor").focus();
                } else if (document.activeElement === document.getElementById("blueTextColor")) {
                    document.getElementById("yellowTextColor").focus();
                } else if (document.activeElement === document.getElementById("yellowTextColor")) {
                    document.getElementById("magentaTextColor").focus();
                } else if (document.activeElement === document.getElementById("magentaTextColor")) {
                    document.getElementById("cyanTextColor").focus();
                } else if (document.activeElement === document.getElementById("cyanTextColor")) {
                    document.getElementById("hide-textColor").focus();
                } else {
                    document.getElementById("hide-textColor").focus();
                }
            }

            if ($('.controller-orange-bgcolor').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-bgColor")) {
                    document.getElementById("whiteBGColor").focus();
                } else if (document.activeElement === document.getElementById("whiteBGColor")) {
                    document.getElementById("blackBGColor").focus();
                } else if (document.activeElement === document.getElementById("blackBGColor")) {
                    document.getElementById("redBGColor").focus();
                } else if (document.activeElement === document.getElementById("redBGColor")) {
                    document.getElementById("greenBGColor").focus();
                } else if (document.activeElement === document.getElementById("greenBGColor")) {
                    document.getElementById("blueBGColor").focus();
                } else if (document.activeElement === document.getElementById("blueBGColor")) {
                    document.getElementById("yellowBGColor").focus();
                } else if (document.activeElement === document.getElementById("yellowBGColor")) {
                    document.getElementById("magentaBGColor").focus();
                } else if (document.activeElement === document.getElementById("magentaBGColor")) {
                    document.getElementById("cyanBGColor").focus();
                } else if (document.activeElement === document.getElementById("cyanBGColor")) {
                    document.getElementById("hide-bgColor").focus();
                } else {
                    document.getElementById("hide-bgColor").focus();
                }
            }

            if ($('.controller-orange-followcolor').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-followColor")) {
                    document.getElementById("whiteFollowColor").focus();
                } else if (document.activeElement === document.getElementById("whiteFollowColor")) {
                    document.getElementById("blackFollowColor").focus();
                } else if (document.activeElement === document.getElementById("blackFollowColor")) {
                    document.getElementById("redFollowColor").focus();
                } else if (document.activeElement === document.getElementById("redFollowColor")) {
                    document.getElementById("greenFollowColor").focus();
                } else if (document.activeElement === document.getElementById("greenFollowColor")) {
                    document.getElementById("blueFollowColor").focus();
                } else if (document.activeElement === document.getElementById("blueFollowColor")) {
                    document.getElementById("yellowFollowColor").focus();
                } else if (document.activeElement === document.getElementById("yellowFollowColor")) {
                    document.getElementById("magentaFollowColor").focus();
                } else if (document.activeElement === document.getElementById("magentaFollowColor")) {
                    document.getElementById("cyanFollowColor").focus();
                } else if (document.activeElement === document.getElementById("cyanFollowColor")) {
                    document.getElementById("hide-followColor").focus();
                } else {
                    document.getElementById("hide-followColor").focus();
                }
            }

            if ($('.controller-orange-fontsize').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-fontsize")) {
                    document.getElementById("button50").focus();
                } else if (document.activeElement === document.getElementById("button50")) {
                    document.getElementById("button75").focus();
                } else if (document.activeElement === document.getElementById("button75")) {
                    document.getElementById("button100").focus();
                } else if (document.activeElement === document.getElementById("button100")) {
                    document.getElementById("button125").focus();
                } else if (document.activeElement === document.getElementById("button125")) {
                    document.getElementById("button150").focus();
                } else if (document.activeElement === document.getElementById("button150")) {
                    document.getElementById("button175").focus();
                } else if (document.activeElement === document.getElementById("button175")) {
                    document.getElementById("button200").focus();
                } else if (document.activeElement === document.getElementById("button200")) {
                    document.getElementById("button300").focus();
                } else if (document.activeElement === document.getElementById("button300")) {
                    document.getElementById("button400").focus();
                } else if (document.activeElement === document.getElementById("button400")) {
                    document.getElementById("hide-fontsize").focus();
                } else {
                    document.getElementById("hide-fontsize").focus();
                }
            }

            if ($('.controller-orange-outfont').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-out")) {
                    document.getElementById("outNo").focus();
                } else if (document.activeElement === document.getElementById("outNo")) {
                    document.getElementById("outHigh").focus();
                } else if (document.activeElement === document.getElementById("outHigh")) {
                    document.getElementById("outEnforce").focus();
                } else if (document.activeElement === document.getElementById("outEnforce")) {
                    document.getElementById("outUniform").focus();
                } else if (document.activeElement === document.getElementById("outUniform")) {
                    document.getElementById("outShadow").focus();
                } else if (document.activeElement === document.getElementById("outShadow")) {
                    document.getElementById("hide-out").focus();
                } else {
                    document.getElementById("hide-out").focus();
                }
            }

            if ($('.controller-orange-font').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-font")) {
                    document.getElementById("helvet").focus();
                } else if (document.activeElement === document.getElementById("helvet")) {
                    document.getElementById("consola").focus();
                } else if (document.activeElement === document.getElementById("consola")) {
                    document.getElementById("accessDFA").focus();
                } else if (document.activeElement === document.getElementById("accessDFA")) {
                    document.getElementById("comic").focus();
                } else if (document.activeElement === document.getElementById("comic")) {
                    document.getElementById("arial").focus();
                } else if (document.activeElement === document.getElementById("arial")) {
                    document.getElementById("hide-font").focus();
                } else {
                    document.getElementById("hide-font").focus();
                }
            }

            if ($('.controller-orange-butcol').is(':visible')) {
                if (document.activeElement === document.getElementById("hide-butcol")) {
                    document.getElementById("blackwhite").focus();
                } else if (document.activeElement === document.getElementById("blackwhite")) {
                    document.getElementById("whiteblack").focus();
                } else if (document.activeElement === document.getElementById("whiteblack")) {
                    document.getElementById("blueyellow").focus();
                } else if (document.activeElement === document.getElementById("blueyellow")) {
                    document.getElementById("yellowblue").focus();
                } else if (document.activeElement === document.getElementById("yellowblue")) {
                    document.getElementById("bluewhite").focus();
                } else if (document.activeElement === document.getElementById("bluewhite")) {
                    document.getElementById("whiteblue").focus();
                } else if (document.activeElement === document.getElementById("whiteblue")) {
                    document.getElementById("colordef").focus();
                } else if (document.activeElement === document.getElementById("colordef")) {
                    document.getElementById("hide-butcol").focus();
                } else {
                    document.getElementById("hide-butcol").focus();
                }
            }


        }
        function test() {
            //test1();
        }


//end OrangeLab here

        // handle clicks anywhere on the page. If any popups are open, close them.
        $(document).on('click', function () {
            //if ($('.able-popup:visible').length || $('.able-volume-popup:visible')) {
            if ($('.able-popup:visible').length) {
                // at least one popup is visible
                thisObj.ablePlayer.closePopups();
            } else if ($('.able-volume-popup:visible') && ($(event.target)[0] != $(thisObj.ablePlayer.$volumeSlider)[0] &&
                $(event.target)[0] != $(thisObj.ablePlayer.$volumeSliderTrack)[0] && $(event.target)[0] != $(thisObj.ablePlayer.$volumeSliderHead)[0]
                && $(event.target)[0] != $(thisObj.ablePlayer.$volumeSliderTrackOn)[0])) {
                thisObj.ablePlayer.closePopups();
            }
        });

        // handle mouse movement over player; make controls visible again if hidden
        this.ablePlayer.$ableDiv.on('mousemove', function () {
            if (thisObj.ablePlayer.controlsHidden) {
                thisObj.ablePlayer.control.fadeControls('in');
                thisObj.ablePlayer.controlsHidden = false;
                // after showing controls, wait another few seconds, then hide them again if video continues to play
                thisObj.ablePlayer.hidingControls = true;
                thisObj.ablePlayer.hideControlsTimeout = window.setTimeout(function () {
                    if (typeof thisObj.ablePlayer.playing !== 'undefined' && thisObj.ablePlayer.playing === true) {
                        thisObj.ablePlayer.control.fadeControls('out');
                        thisObj.ablePlayer.controlsHidden = true;
                        thisObj.ablePlayer.hidingControls = false;
                    }
                }, 3000);
            }

        });

        // if user presses a key from anywhere on the page, show player controls
        $(document).keydown(function () {
            if (thisObj.ablePlayer.controlsHidden) {
                thisObj.ablePlayer.control.fadeControls('in');
                thisObj.ablePlayer.controlsHidden = false;
            }
        });

        // handle local keydown events if this isn't the only player on the page;
        // otherwise these are dispatched by global handler (see ableplayer-base,js)
        this.ablePlayer.$ableDiv.keydown(function (e) {
            if (AblePlayer.nextIndex > 1) {
                thisObj.onPlayerKeyPress(e);
            }
        });

        // transcript is not a child of this.$ableDiv
        // therefore, must be added separately
        if (this.ablePlayer.$transcriptArea) {
            this.ablePlayer.$transcriptArea.keydown(function (e) {
                if (AblePlayer.nextIndex > 1) {
                    thisObj.onPlayerKeyPress(e);
                }
            });
        }

        // handle clicks on playlist items
        if (this.ablePlayer.$playlist) {
            this.ablePlayer.$playlist.click(function () {
                thisObj.ablePlayer.playlistIndex = $(this).index();
                thisObj.ablePlayer.swapSource(thisObj.ablePlayer.playlistIndex);
            });
        }

        // Also play/pause when clicking on the media.
        this.ablePlayer.$media.click(function () {
            thisObj.handlePlay();
        });

        // add listeners for media events
        if (this.ablePlayer.player === 'html5') {
            this.addHtml5MediaListeners();
        } else if (this.ablePlayer.player === 'jw') {
            //this.addJwMediaListeners();
        } else if (this.ablePlayer.player === 'youtube') {
            // Youtube doesn't give us time update events, so we just periodically generate them ourselves
            setInterval(function () {
                thisObj.onMediaUpdateTime();
            }, 300);
        }
    };

    handleFullscreenToggle () {

        var stillPaused = this.ablePlayer.paused;
        this.ablePlayer.control.setFullscreen(!this.ablePlayer.fullscreen);
        if (stillPaused) {
            this.ablePlayer.control.pauseMedia();
        }
        else if (!stillPaused) {
            this.ablePlayer.control.playMedia();
        }
        if (this.ablePlayer.fullscreen) {
            this.ablePlayer.hideControls = true;
            if (this.ablePlayer.playing) {
                this.ablePlayer.control.fadeControls('out');
                this.ablePlayer.controlsHidden = true;
            }
        }
        else {
            this.ablePlayer.hideControls = this.ablePlayer.hideControlsOriginal;
            if (!this.ablePlayer.hideControls) { // do not hide controls
                if (this.ablePlayer.controlsHidden) {
                    this.ablePlayer.control.fadeControls('in');
                    this.ablePlayer.controlsHidden = false;
                }
                // if there's an active timeout to fade controls out again, clear it
                if (this.ablePlayer.hideControlsTimeoutStatus === 'active') {
                    window.clearTimeout(this.ablePlayer.hideControlsTimeout);
                    this.ablePlayer.hideControlsTimeoutStatus = 'clear';
                }
            }
        }
    };




















}