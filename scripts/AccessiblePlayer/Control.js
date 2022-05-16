import Misc from "./Misc.js";
import AccessibleDialog from "./AccessibleDialog.js";

export default class Control {

    constructor() {}

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    setPreference( preference ){
        this.preference = preference;
        return this;
    }

    seekTo (newTime) {
        this.ablePlayer.seekFromTime = this.ablePlayer.media.currentTime;
        this.ablePlayer.seekToTime = newTime;

        this.ablePlayer.seeking = true;
        this.ablePlayer.liveUpdatePending = true;
        if (this.ablePlayer.player === 'html5') {
            var seekable;
            this.ablePlayer.startTime = newTime;
            seekable = this.ablePlayer.media.seekable;
            if (seekable.length > 0 && this.ablePlayer.startTime >= seekable.start(0) && this.ablePlayer.startTime <= seekable.end(0)) {
                this.ablePlayer.media.currentTime = this.ablePlayer.startTime;
                if (this.ablePlayer.hasSignLanguage && this.ablePlayer.signVideo) {
                    // keep sign languge video in sync
                    this.ablePlayer.signVideo.currentTime = this.ablePlayer.startTime;
                }
            }
        }else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            // pause JW Player temporarily.
            // When seek has successfully reached newTime,
            // onSeek event will be called, and playback will be resumed
            this.ablePlayer.jwSeekPause = true;
            this.ablePlayer.jwPlayer.seek(newTime);
        } else if (this.ablePlayer.player === 'youtube') {
            this.ablePlayer.youTubePlayer.seekTo(newTime, true);
            if (newTime > 0) {
                if (typeof this.ablePlayer.$posterImg !== 'undefined') {
                    this.ablePlayer.$posterImg.hide();
                }
            }
        }
        this.refreshControls();
    };

    /**
     * returns duration of the current media, expressed in seconds
     * @returns Promise
     */
    getDuration() {
        var duration;
        if (this.ablePlayer.player === 'html5') {
            duration = this.ablePlayer.media.duration;
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            duration = this.ablePlayer.jwPlayer.getDuration();
        } else if (this.ablePlayer.player === 'youtube' && this.ablePlayer.youTubePlayer) {
            duration = this.ablePlayer.youTubePlayer.getDuration();
        }
        if (duration === undefined || isNaN(duration) || duration === -1) {
            return 0;
        }
        return duration;
    };

    /**
     * returns elapsed time of the current media, expressed in seconds
     * @returns Promise
     */
    getElapsed() {
        var position;
        if (this.ablePlayer.player === 'html5') {
            position = this.ablePlayer.media.currentTime;
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            if (this.ablePlayer.jwPlayer.getState() === 'IDLE') {
                return 0;
            }
            position = this.ablePlayer.jwPlayer.getPosition();
        } else if (this.ablePlayer.player === 'youtube') {
            if (this.ablePlayer.youTubePlayer) {
                position = this.ablePlayer.youTubePlayer.getCurrentTime();
            }
        }

        if (position === undefined || isNaN(position) || position === -1) {
            return 0;
        }
        return position;
    };

    getPlayerState() {
        if (this.ablePlayer.swappingSrc) {
            return;
        }
        if (this.ablePlayer.player === 'html5') {
            if (this.ablePlayer.media.paused) {
                if (this.getElapsed() === 0) {
                    return 'stopped';
                } else if (this.ablePlayer.media.ended) {
                    return 'ended';
                } else {
                    return 'paused';
                }
            } else if (this.ablePlayer.media.readyState !== 4) {
                return 'buffering';
            } else {
                return 'playing';
            }
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            if (this.ablePlayer.jwPlayer.getState() === 'PAUSED' || this.ablePlayer.jwPlayer.getState() === 'IDLE' || this.ablePlayer.jwPlayer.getState() === undefined) {

                if (this.getElapsed() === 0) {
                    return 'stopped';
                } else if (this.getElapsed() === this.getDuration()) {
                    return 'ended';
                } else {
                    return 'paused';
                }
            } else if (this.ablePlayer.jwPlayer.getState() === 'BUFFERING') {
                return 'buffering';
            } else if (this.ablePlayer.jwPlayer.getState() === 'PLAYING') {
                return 'playing';
            }
        } else if (this.ablePlayer.player === 'youtube' && this.ablePlayer.youTubePlayer) {
            var state = this.ablePlayer.youTubePlayer.getPlayerState();
            if (state === -1 || state === 5) {
                return 'stopped';
            } else if (state === 0) {
                return 'ended';
            } else if (state === 1) {
                return 'playing';
            } else if (state === 2) {
                return 'paused';
            } else if (state === 3) {
                return 'buffering';
            }
        }
    };

    isPlaybackRateSupported() {
        if (this.ablePlayer.player === 'html5') {
            return this.ablePlayer.media.playbackRate ? true : false;
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            // Not directly supported by JW player; can hack for HTML5 version by finding the dynamically generated video tag, but decided not to do that.
            return false;
        } else if (this.ablePlayer.player === 'youtube') {
            // Youtube always supports a finite list of playback rates.  Only expose controls if more than one is available.
            return (this.ablePlayer.youTubePlayer.getAvailablePlaybackRates().length > 1);
        }
    };

    setPlaybackRate(rate) {
        rate = Math.max(0.5, rate);
        if (this.ablePlayer.player === 'html5') {
            this.ablePlayer.media.playbackRate = rate;
        }else if (this.ablePlayer.player === 'youtube') {
            this.ablePlayer.youTubePlayer.setPlaybackRate(rate);
        }
        if (this.ablePlayer.hasSignLanguage && this.ablePlayer.signVideo) {
            this.ablePlayer.signVideo.playbackRate = rate;
        }
        this.ablePlayer.playbackRate = rate;
        this.ablePlayer.$speed.text(this.ablePlayer.tt.speed + ': ' + rate.toFixed(2).toString() + 'x');
    };

    getPlaybackRate() {
        if (this.ablePlayer.player === 'html5') {
            return this.ablePlayer.media.playbackRate;
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            // Unsupported, always the normal rate.
            return 1;
        } else if (this.ablePlayer.player === 'youtube') {
            return this.ablePlayer.youTubePlayer.getPlaybackRate();
        }
    };

    isPaused() {
        var state = this.getPlayerState();
        return state === 'paused' || state === 'stopped' || state === 'ended';
    };

    pauseMedia () {
        //spec OrangeLab
        this.ablePlayer.$buttonCopyPlay.removeClass('pause');
        this.ablePlayer.$buttonCopyPlay.text('');
        this.ablePlayer.$buttonCopyPlay.value = this.tt.play;
        this.ablePlayer.$buttonCopyPlay.attr('aria-label', this.tt.play);
        //$('#copy-play').append("<i class=\"play\"></i><span id=\"copy-play\">"+this.tt.play+"</span>");
        this.ablePlayer.$buttonCopyPlay.children('svg').remove();
        //this.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'></path></svg><span id=\"copy-play\" style='margin-left:-25%'>"+this.tt.play+"</span>");
        this.ablePlayer.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 16 20'><path d='M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z'</path></svg> <span id=\"spanPlay\" class='spanButton'>" + this.ablePlayer.tt.play + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.resizeAccessMenu();
        if (this.ablePlayer.player === 'html5') {
            this.ablePlayer.media.pause(true);
            if (this.ablePlayer.hasSignLanguage && this.ablePlayer.signVideo) {
                this.ablePlayer.signVideo.pause(true);
            }
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            this.ablePlayer.jwPlayer.pause(true);
        } else if (this.ablePlayer.player === 'youtube') {
            this.ablePlayer.youTubePlayer.pauseVideo();
        }
    };

    playMedia () {
        var thisObj = this;

        //spec OrangeLab
        this.ablePlayer.$buttonCopyPlay.text('');
        this.ablePlayer.$buttonCopyPlay.addClass('pause');
        this.ablePlayer.$buttonCopyPlay.value = this.tt.pause;
        this.ablePlayer.$buttonCopyPlay.attr('aria-label', this.tt.pause);
        this.ablePlayer.$buttonCopyPlay.children('svg').remove();
        //$('#copy-play').append("<i class=\"play\"></i><span id=\"copy-play\">"+this.tt.pause+"</span>");
        //$('#copy-play').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z'></path></svg><span id=\"copy-play\" style='margin-left:-25%'>"+this.tt.pause+"</span>");
        this.ablePlayer.$buttonCopyPlay.append("<svg style='float:left;margin-left:25%' viewBox='0 0 16 20'><path d='M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z'</path></svg> <span id=\"spanPlay\" class='spanButton'>" + this.tt.pause + "</span><i class=\"arrow right\" style='visibility:hidden'></i>");
        this.resizeAccessMenu();
        if (this.ablePlayer.player === 'html5') {
            if (this.ablePlayer.userAgent.browser.name != 'Firefox') {
                if (this.ablePlayer.contextAudio.length > 0) {
                    this.ablePlayer.contextAudio[0].resume();
                    this.ablePlayer.contextAudio[1].resume();
                }
            }
            this.ablePlayer.media.play(true);
            this.ablePlayer.media.addEventListener('ended',() => {
                this.ablePlayer.load();
                //this.playing = false;
            });
            if (this.ablePlayer.hasSignLanguage && this.ablePlayer.signVideo) {
                this.ablePlayer.signVideo.addEventListener('ended', () => {
                    this.ablePlayer.load();
                    //this.playing = false;
                });
                this.ablePlayer.signVideo.play(true);
            }
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            this.ablePlayer.jwPlayer.play(true);
        } else if (this.ablePlayer.player === 'youtube') {
            this.ablePlayer.youTubePlayer.playVideo();
            if (typeof this.ablePlayer.$posterImg !== 'undefined') {
                this.ablePlayer.$posterImg.hide();
            }
            this.ablePlayer.stoppingYouTube = false;
        }
        this.ablePlayer.startedPlaying = true;
        if (this.ablePlayer.hideControls) {
            // wait briefly after playback begins, then hide controls
            this.ablePlayer.hidingControls = true;
            this.ablePlayer.hideControlsTimeout = window.setTimeout(function () {
                thisObj.fadeControls('out');
                thisObj.ablePlayer.controlsHidden = true;
                thisObj.ablePlayer.hidingControls = false;
            }, 2000);
        }
    };

    // Visibly fade controls without hiding them from screen reader users
    fadeControls (direction) {
        if (direction == 'out') {
            this.ablePlayer.$controllerDiv.addClass('able-offscreen');
            this.ablePlayer.$statusBarDiv.addClass('able-offscreen');
            // Removing content from $playerDiv leaves an empty controller bar in its place
            // What to do with the empty space?
            // For now, changing to a black background; will restore to original background on fade-in
            this.ablePlayer.playerBackground = this.ablePlayer.$playerDiv.css('background-color');
            this.ablePlayer.$playerDiv.css('background-color', 'black');
        } else if (direction == 'in') {
            this.ablePlayer.$controllerDiv.removeClass('able-offscreen');
            this.ablePlayer.$statusBarDiv.removeClass('able-offscreen');
            if (typeof this.ablePlayer.playerBackground !== 'undefined') {
                this.ablePlayer.$playerDiv.css('background-color', this.ablePlayer.playerBackground);
            } else {
                this.ablePlayer.$playerDiv.css('background-color', '');
            }
        }
    };

    // context is one of the following:
    refreshControls ( ) {
        var thisObj, duration, elapsed, lastChapterIndex, displayElapsed,
            updateLive, textByState, timestamp, widthUsed,
            leftControls, rightControls, seekbarWidth, seekbarSpacer, captionsCount,
            buffered, newTop, statusBarHeight, speedHeight, statusBarWidthBreakpoint,
            newSvgData;

        thisObj = this;
        if (this.swappingSrc) {
            // wait until new source has loaded before refreshing controls
            return;
        }

        duration = this.getDuration();
        elapsed = this.getElapsed();

        // if(this.$accMenu){
        //   this.$accMenu.attr('aria-label',this.tt.accmenu);
        //   console.log("refresh access menu");
        //   console.log(this.prefAccessMenu);
        // }

        if (this.useChapterTimes) {
            this.chapterDuration = this.getChapterDuration();
            this.chapterElapsed = this.getChapterElapsed();
        }

        if (this.useFixedSeekInterval === false && this.seekIntervalCalculated === false && duration > 0) {
            // couldn't calculate seekInterval previously; try again.
            this.setSeekInterval();
        }

        if (this.seekBar) {// || this.seekBarOrange) {
            if (this.useChapterTimes) {
                lastChapterIndex = this.selectedChapters.cues.length - 1;
                if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
                    // this is the last chapter
                    if (this.currentChapter.end !== duration) {
                        // chapter ends before or after video ends
                        // need to adjust seekbar duration to match video end
                        this.seekBar.setDuration(duration - this.currentChapter.start);
                        //this.seekBarOrange.setDuration(duration - this.currentChapter.start);
                    } else {
                        this.seekBar.setDuration(this.chapterDuration);
                        //this.seekBarOrange.setDuration(this.chapterDuration);
                    }
                } else {
                    // this is not the last chapter
                    this.seekBar.setDuration(this.chapterDuration);
                    //this.seekBarOrange.setDuration(this.chapterDuration);
                }
            } else {
                this.seekBar.setDuration(duration);
                //this.seekBarOrange.setDuration(duration);
            }
            //console.log("Control");
            if (!(this.seekBar.tracking)) {
                //console.log("seekbar is not tracking Control elpased :"+elapsed);
                // Only update the aria live region if we have an update pending (from a
                // seek button control) or if the seekBar has focus.
                // We use document.activeElement instead of $(':focus') due to a strange bug:
                //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
                updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
                //updateLiveOrange = this.liveUpdatePending || this.seekBarOrange.seekHead.is($(document.activeElement));
                this.liveUpdatePending = false;
                if (this.useChapterTimes) {
                    this.seekBar.setPosition(this.chapterElapsed, updateLive);
                } else {
                    this.seekBar.setPosition(elapsed, updateLive);
                }
            }
            // if (!(this.seekBarOrange.tracking)) {
            //   //console.log("seekbar orange is not tracking Control elpased :"+elapsed);
            //   // Only update the aria live region if we have an update pending (from a
            //   // seek button control) or if the seekBar has focus.
            //   // We use document.activeElement instead of $(':focus') due to a strange bug:
            //   //  When the seekHead element is focused, .is(':focus') is failing and $(':focus') is returning an undefined element.
            //   updateLive = this.liveUpdatePending || this.seekBarOrange.seekHead.is($(document.activeElement));
            //   //updateLiveOrange = this.liveUpdatePending || this.seekBarOrange.seekHead.is($(document.activeElement));
            //   this.liveUpdatePending = false;
            //   if (this.useChapterTimes) {
            //     this.seekBarOrange.setPosition(this.chapterElapsed, updateLive);
            //   }
            //   else {
            //     this.seekBarOrange.setPosition(elapsed, updateLive);
            //   }
            // }

            // When seeking, display the seek bar time instead of the actual elapsed time.
            // if (this.seekBarOrange.tracking) {
            //   displayElapsed = this.seekBarOrange.lastTrackPosition;
            // }
            if (this.seekBar.tracking) {
                displayElapsed = this.seekBar.lastTrackPosition;
            } else {
                if (this.useChapterTimes) {
                    displayElapsed = this.chapterElapsed;
                } else {
                    displayElapsed = elapsed;
                }
            }
        }
        if (this.useChapterTimes) {
            //this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
            this.$durationContainer.text(this.formatSecondsAsColonTime(this.chapterDuration));
            this.$durationContainerOrange.text(this.formatSecondsAsColonTime(this.chapterDuration));
        } else {
            //this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(duration));
            this.$durationContainer.text(this.formatSecondsAsColonTime(duration));
            this.$durationContainerOrange.text(this.formatSecondsAsColonTime(duration));
        }
        //this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
        this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(duration - displayElapsed));
        this.$elapsedTimeContainerOrange.text(this.formatSecondsAsColonTime(displayElapsed));

        textByState = {
            'stopped': this.tt.statusStopped,
            'paused': this.tt.statusPaused,
            'playing': this.tt.statusPlaying,
            'buffering': this.tt.statusBuffering,
            'ended': this.tt.statusEnd
        };

        if (this.stoppingYouTube) {
            // stoppingYouTube is true temporarily while video is paused and seeking to 0
            // See notes in handleRestart()
            // this.stoppingYouTube will be reset when seek to 0 is finished (in event.js > onMediaUpdateTime())
            if (this.$status.text() !== this.tt.statusStopped) {
                this.$status.text(this.tt.statusStopped);
            }
            if (this.$playpauseButton.find('span').first().hasClass('icon-pause')) {
                if (this.iconType === 'font') {
                    this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
                    this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
                } else if (this.iconType === 'svg') {
                    newSvgData = this.getSvgData('play');
                    this.$playpauseButton.find('svg').attr('viewBox', newSvgData[0]);
                    this.$playpauseButton.find('path').attr('d', newSvgData[1]);
                } else {
                    this.$playpauseButton.find('img').attr('src', this.playButtonImg);
                }
            }
        } else {
            if (typeof this.$status !== 'undefined' && typeof this.seekBar !== 'undefined') {
                // Update the text only if it's changed since it has role="alert";
                // also don't update while tracking, since this may Pause/Play the player but we don't want to send a Pause/Play update.
                if (this.$status.text() !== textByState[this.getPlayerState()] && !this.seekBar.tracking) {
                    // Debounce updates; only update after status has stayed steadily different for 250ms.
                    timestamp = (new Date()).getTime();
                    if (!this.statusDebounceStart) {
                        this.statusDebounceStart = timestamp;
                        // Make sure refreshControls gets called again at the appropriate time to check.
                        this.statusTimeout = setTimeout(function () {
                            thisObj.refreshControls();
                        }, 300);
                    } else if ((timestamp - this.statusDebounceStart) > 250) {
                        this.$status.text(textByState[this.getPlayerState()]);
                        this.statusDebounceStart = null;
                        clearTimeout(this.statusTimeout);
                        this.statusTimeout = null;
                    }
                } else {
                    this.statusDebounceStart = null;
                    clearTimeout(this.statusTimeout);
                    this.statusTimeout = null;
                }

                // Don't change play/pause button display while using the seek bar (or if YouTube stopped)
                if (!this.seekBar.tracking && !this.stoppingYouTube) {
                    if (this.isPaused()) {
                        this.$playpauseButton.attr('aria-label', this.tt.play);

                        if (this.iconType === 'font') {
                            this.$playpauseButton.find('span').first().removeClass('icon-pause').addClass('icon-play');
                            this.$playpauseButton.find('span.able-clipped').text(this.tt.play);
                        } else if (this.iconType === 'svg') {
                            newSvgData = this.getSvgData('play');
                            this.$playpauseButton.find('svg').attr('viewBox', newSvgData[0]);
                            this.$playpauseButton.find('path').attr('d', newSvgData[1]);
                        } else {
                            this.$playpauseButton.find('img').attr('src', this.playButtonImg);
                        }
                    } else {
                        this.$playpauseButton.attr('aria-label', this.tt.pause);

                        if (this.iconType === 'font') {
                            this.$playpauseButton.find('span').first().removeClass('icon-play').addClass('icon-pause');
                            this.$playpauseButton.find('span.able-clipped').text(this.tt.pause);
                        } else if (this.iconType === 'svg') {
                            newSvgData = this.getSvgData('pause');
                            this.$playpauseButton.find('svg').attr('viewBox', newSvgData[0]);
                            this.$playpauseButton.find('path').attr('d', newSvgData[1]);
                        } else {
                            this.$playpauseButton.find('img').attr('src', this.pauseButtonImg);
                        }
                    }
                }
            }
        }

        // Update seekbar width.
        // To do this, we need to calculate the width of all buttons surrounding it.
        //if (this.seekBar || this.seekBarOrange) {
        if (this.seekBar) {

            widthUsed = 30;
            seekbarSpacer = 40; // adjust for discrepancies in browsers' calculated button widths

            leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
            rightControls = leftControls.next('div.able-right-controls');
            leftControls.children().each(function () {
                if ($(this).prop('tagName') == 'BUTTON') {
                    widthUsed += $(this).width();
                }
            });
            rightControls.children().each(function () {
                if ($(this).prop('tagName') == 'BUTTON') {
                    widthUsed += $(this).width();
                }
            });
            if (this.isFullscreen()) {
                seekbarWidth = $(window).width() - widthUsed - seekbarSpacer;
            } else {
                //seekbarWidth = this.$ableWrapper.width() - widthUsed - seekbarSpacer;
                seekbarWidth = $('.able-controller').width() - widthUsed - seekbarSpacer;
            }
            // Sometimes some minor fluctuations based on browser weirdness, so set a threshold.
            if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
                this.seekBar.setWidth(seekbarWidth - (15 * seekbarWidth / 100));
                //this.seekBarOrange.setWidth(seekbarWidth);
            }
            //console.log('seekbar now '+this.$statusBarDiv.width());
        }

        // Show/hide status bar content conditionally
        if (!this.isFullscreen()) {
            statusBarWidthBreakpoint = 300;
            statusBarHeight = this.$statusBarDiv.height();
            speedHeight = this.$statusBarDiv.find('span.able-speed').height();
            if (speedHeight > (statusBarHeight + 5)) {
                // speed bar is wrapping (happens often in German player)
                this.$statusBarDiv.find('span.able-speed').hide();
                this.hidingSpeed = true;
            } else {
                if (this.hidingSpeed) {
                    this.$statusBarDiv.find('span.able-speed').show();
                    this.hidingSpeed = false;
                }
                if (this.$statusBarDiv.width() < statusBarWidthBreakpoint) {
                    // Player is too small for a speed span
                    this.$statusBarDiv.find('span.able-speed').hide();
                    this.hidingSpeed = true;
                } else {
                    if (this.hidingSpeed) {
                        this.$statusBarDiv.find('span.able-speed').show();
                        this.hidingSpeed = false;
                    }
                }
            }
        }

        if (this.$descButton) {
            if (this.descOn) {
                this.$descButton.removeClass('buttonOff').attr('aria-label', this.tt.turnOffDescriptions);
                this.$descButton.find('span.able-clipped').text(this.tt.turnOffDescriptions);
            } else {
                this.$descButton.addClass('buttonOff').attr('aria-label', this.tt.turnOnDescriptions);
                this.$descButton.find('span.able-clipped').text(this.tt.turnOnDescriptions);
            }
        }

        if (this.$ccButton) {
            if (this.usingYouTubeCaptions) {
                captionsCount = this.ytCaptions.length;
            } else {
                captionsCount = this.captions.length;
            }
            // Button has a different title depending on the number of captions.
            // If only one caption track, this is "Show captions" and "Hide captions"
            // Otherwise, it is just always "Captions"
            if (!this.captionsOn) {
                this.$ccButton.addClass('buttonOff');
                if (captionsCount === 1) {
                    this.$ccButton.attr('aria-label', this.tt.showCaptions);
                    this.$ccButton.find('span.able-clipped').text(this.tt.showCaptions);
                }
            } else {
                this.$ccButton.removeClass('buttonOff');
                if (captionsCount === 1) {
                    this.$ccButton.attr('aria-label', this.tt.hideCaptions);
                    this.$ccButton.find('span.able-clipped').text(this.tt.hideCaptions);
                }
            }

            if (captionsCount > 1) {
                this.$ccButton.attr({
                    'aria-label': this.tt.captions,
                    'aria-haspopup': 'true',
                    'aria-controls': this.mediaId + '-captions-menu'
                });
                this.$ccButton.find('span.able-clipped').text(this.tt.captions);
            }
        }

        if (this.$chaptersButton) {
            this.$chaptersButton.attr({
                'aria-label': this.tt.chapters,
                'aria-haspopup': 'true',
                'aria-controls': this.mediaId + '-chapters-menu'
            });
        }
        if (this.$fullscreenButton) {
            if (!this.isFullscreen()) {
                this.$fullscreenButton.attr('aria-label', this.tt.enterFullScreen);
                if (this.iconType === 'font') {
                    this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-collapse').addClass('icon-fullscreen-expand');
                    this.$fullscreenButton.find('span.able-clipped').text(this.tt.enterFullScreen);
                } else if (this.iconType === 'svg') {
                    newSvgData = this.getSvgData('fullscreen-expand');
                    this.$fullscreenButton.find('svg').attr('viewBox', newSvgData[0]);
                    this.$fullscreenButton.find('path').attr('d', newSvgData[1]);
                } else {
                    this.$fullscreenButton.find('img').attr('src', this.fullscreenExpandButtonImg);
                }
            } else {
                this.$fullscreenButton.attr('aria-label', this.tt.exitFullScreen);
                if (this.iconType === 'font') {
                    this.$fullscreenButton.find('span').first().removeClass('icon-fullscreen-expand').addClass('icon-fullscreen-collapse');
                    this.$fullscreenButton.find('span.able-clipped').text(this.tt.exitFullScreen);
                } else if (this.iconType === 'svg') {
                    newSvgData = this.getSvgData('fullscreen-collapse');
                    this.$fullscreenButton.find('svg').attr('viewBox', newSvgData[0]);
                    this.$fullscreenButton.find('path').attr('d', newSvgData[1]);
                } else {
                    this.$fullscreenButton.find('img').attr('src', this.fullscreenCollapseButtonImg);
                }
            }
        }

        if (typeof this.$bigPlayButton !== 'undefined') {
            // Choose show/hide for big play button and adjust position.
            if (this.isPaused() && !this.seekBar.tracking) {
                if (!this.hideBigPlayButton) {
                    this.$bigPlayButton.removeClass('icon-pause').addClass('icon-play');
                    this.$bigPlayButton.show();
                }
                if (this.isFullscreen()) {
                    this.$bigPlayButton.width($(window).width());
                    this.$bigPlayButton.height($(window).height());
                } else {
                    this.$bigPlayButton.width(this.$mediaContainer.width());
                    this.$bigPlayButton.height(this.$mediaContainer.height());
                }
                this.$bigPlayButton.css('height', this.$mediaContainer.find('video').css('height'));
                this.$bigPlayButton.css('width', this.$mediaContainer.find('video').css('width'));
            } else {
                //this.$bigPlayButton.hide();
                this.$bigPlayButton.removeClass('icon-play').addClass('icon-pause');
            }
        }

        if (this.transcriptType) {
            // Sync checkbox and autoScrollTranscript with user preference
            if (this.prefAutoScrollTranscript === 1) {
                this.autoScrollTranscript = true;
                this.$autoScrollTranscriptCheckbox.prop('checked', true);
            } else {
                this.autoScrollTranscript = false;
                this.$autoScrollTranscriptCheckbox.prop('checked', false);
            }

            // If transcript locked, scroll transcript to current highlight location.
            if (this.autoScrollTranscript && this.currentHighlight && this.isPaused() == false) {
                newTop = Math.floor($('.able-transcript').scrollTop() +
                    $(this.currentHighlight).position().top -
                    ($('.able-transcript').height() / 2) +
                    ($(this.currentHighlight).height() / 2));
                if (newTop !== Math.floor($('.able-transcript').scrollTop())) {
                    // Set a flag to ignore the coming scroll event.
                    // there's no other way I know of to differentiate programmatic and user-initiated scroll events.
                    this.scrollingTranscript = true;
                    $('.able-transcript').scrollTop(newTop);
                }
            }
        }

        // Update buffering progress.
        // TODO: Currently only using the first HTML5 buffered interval, but this fails sometimes when buffering is split into two or more intervals.
        if (this.player === 'html5') {
            if (this.media.buffered.length > 0) {
                buffered = this.media.buffered.end(0)
                if (this.useChapterTimes) {
                    if (buffered > this.chapterDuration) {
                        buffered = this.chapterDuration;
                    }
                    if (this.seekBar) {// || this.seekBarOrange) {
                        this.seekBar.setBuffered(buffered / this.chapterDuration);
                        //this.seekBarOrange.setBuffered(buffered / this.chapterDuration);
                    }
                } else {
                    if (this.seekBar) { //|| this.seekBarOrange) {
                        this.seekBar.setBuffered(buffered / duration);
                        //this.seekBarOrange.setBuffered(buffered / duration);
                    }
                }
            }
        } else if (this.player === 'jw' && this.jwPlayer) {
            if (this.seekBar) {
                this.seekBar.setBuffered(this.jwPlayer.getBuffer() / 100);
                //this.seekBarOrange.setBuffered(this.jwPlayer.getBuffer() / 100);
            }
        } else if (this.player === 'youtube') {
            if (this.seekBar) {
                this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
                //this.seekBarOrange.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
            }
        }

    };

    handlePlay (e) {

        if (this.isPaused()) {
            this.playMedia();
        } else {
            this.pauseMedia();
        }
        this.refreshControls();
    };

    handleRestart () {
        this.seekTo(0);

        /*
    // Prior to 2.3.68, this function was handleStop()
    // which was a bit more challenging to implement
    // Preserved here in case Stop is ever cool again...

    var thisObj = this;
    if (this.player == 'html5') {
      this.pauseMedia();
      this.seekTo(0);
    }
    else if (this.player === 'jw' && this.jwPlayer) {
      this.jwPlayer.stop();
    }
    else if (this.player === 'youtube') {
      // YouTube API function stopVideo() does not reset video to 0
      // Also, the stopped video is not seekable so seekTo(0) after stopping doesn't work
      // Workaround is to use pauseVideo(), followed by seekTo(0) to emulate stopping
      // However, the tradeoff is that YouTube doesn't restore the poster image when video is paused
      // Added 12/29/15: After seekTo(0) is finished, stopVideo() to reset video and restore poster image
      // This final step is handled in event.js > onMediaUpdate()
      this.youTubePlayer.pauseVideo();
      this.seekTo(0);
      this.stoppingYouTube = true;
    }
  */
        this.refreshControls();
    };

    handleRewind () {

        var elapsed, targetTime;
        var lastTimeClick = parseInt($('#copy-rewind').val().split("+")[0])

        elapsed = this.getElapsed();

        //For Orange, new method for seekInterval, can't use previous this.seekInterval
        if (Date.now() - lastTimeClick < 1000) {
            var addTime = 0;
            if ($('#copy-rewind').val().split("+")[1] === "NaN") {
                addTime = 20;
            } else {
                addTime = parseInt($('#copy-rewind').val().split("+")[1])
            }
            targetTime = elapsed - addTime;
            $('#copy-rewind').val('' + $('#copy-rewind').val().split("+")[0] + "+" + (addTime * 2));
        } else {
            //targetTime = elapsed + this.seekInterval;
            targetTime = elapsed - 20;
            $('#copy-rewind').val('' + $('#copy-rewind').val().split("+")[0] + "+20");
        }

        //targetTime = elapsed - this.seekInterval;
        if (this.ablePlayer.useChapterTimes) {
            if (targetTime < this.ablePlayer.currentChapter.start) {
                targetTime = this.ablePlayer.currentChapter.start;
            }
        } else {
            if (targetTime < 0) {
                targetTime = 0;
            }
        }

        this.seekTo(targetTime);
    };

    handleFastForward() {
        var elapsed, duration, targetTime, lastChapterIndex;
        var lastTimeClick = parseInt($('#copy-forward').val().split("+")[0])
        elapsed = this.getElapsed();
        duration = this.getDuration();
        lastChapterIndex = this.chapters.length - 1;
        //For Orange, new method for seekInterval, can't use previous this.seekInterval
        if (Date.now() - lastTimeClick < 1000) {
            var addTime = 0;
            if ($('#copy-forward').val().split("+")[1] === "NaN") {
                addTime = 20;
            } else {
                addTime = parseInt($('#copy-forward').val().split("+")[1])
            }
            targetTime = elapsed + addTime;
            $('#copy-forward').val('' + $('#copy-forward').val().split("+")[0] + "+" + (addTime * 2));
        } else {
            //targetTime = elapsed + this.seekInterval;
            targetTime = elapsed + 20;
            $('#copy-forward').val('' + $('#copy-forward').val().split("+")[0] + "+20");
        }


        if (this.ablePlayer.useChapterTimes) {
            if (this.ablePlayer.chapters[lastChapterIndex] == this.ablePlayer.currentChapter) {
                // this is the last chapter
                if (targetTime > duration || targetTime > this.ablePlayer.currentChapter.end) {
                    // targetTime would exceed the end of the video (or chapter)
                    // scrub to end of whichever is earliest
                    targetTime = Math.min(duration, this.ablePlayer.currentChapter.end);
                } else if (duration % targetTime < this.ablePlayer.seekInterval) {
                    // nothing left but pocket change after seeking to targetTime
                    // go ahead and seek to end of video (or chapter), whichever is earliest
                    targetTime = Math.min(duration, this.ablePlayer.currentChapter.end);
                }
            } else {
                // this is not the last chapter
                if (targetTime > this.ablePlayer.currentChapter.end) {
                    // targetTime would exceed the end of the chapter
                    // scrub exactly to end of chapter
                    targetTime = this.ablePlayer.currentChapter.end;
                }
            }
        } else {
            // not using chapter times
            if (targetTime > duration) {
                targetTime = duration;
            }
        }
        this.seekTo(targetTime);
    };

    handleRateIncrease () {
        //this.changeRate(1);
        //Add this for Orange spec
        if ($('.able-speed').text().indexOf(': 1.50x') != -1) {
            //this.setPlaybackRate(1);
            //$('#speed').text(this.tt.speed+ ' normale');

        } else if ($('.able-speed').text().indexOf(': 0.50x') != -1) {

            this.setPlaybackRate(1);
            //$('#speed').text(this.tt.speed+ ' normale');
            $('#speed').children('svg').remove();
            $('#speed').children('span').remove();
            $('#speedMain').children('svg').remove();
            $('#speedMain').children('span').remove();
            $('#speedMain').children('i').remove();
            $('#speedMain').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + this.ablePlayer.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            $('#speed').append("<svg style='float:left;margin-left:25%' class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + this.ablePlayer.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            this.resizeAccessMenu();

        } else if ($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) {
            //this.setPlaybackRate(0.5);
            //$('#speed').text(this.tt.speed+ ' ralentie');
            this.setPlaybackRate(1.5)
            //$('#speed').text(this.tt.speed+ ' rapide');
            $('#speed').children('svg').remove();
            $('#speed').children('span').remove();
            $('#speed').children('p').remove();
            $('#speedMain').children('svg').remove();
            $('#speedMain').children('span').remove();
            $('#speedMain').children('p').remove();
            $('#speedMain').children('i').remove();
            $('#speed').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + this.ablePlayer.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            $('#speedMain').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z'></path></svg><span id=\"\" class='spanButton'>" + this.ablePlayer.tt.speed + " rapide</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            this.resizeAccessMenu();
        }
    };

    handleRateDecrease () {
        if ($('.able-speed').text().indexOf(': 1.50x') != -1) {
            this.setPlaybackRate(1);
            //$('#speed').text(this.tt.speed+ ' normale');

            $('#speed').children('svg').remove();
            $('#speed').children('span').remove();
            $('#speedMain').children('svg').remove();
            $('#speedMain').children('span').remove()
            $('#speedMain').append("<svg style='float:left;margin-left:25%'class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + this.ablePlayer.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            $('#speed').append("<svg style='float:left;margin-left:25%'class=\"normalIcon\"></svg><span class='spanButton' id=\"\">" + this.ablePlayer.tt.speed + " normale</span><i class=\"arrow right\" style='visibility:hidden'></i>");


        } else if ($('.able-speed').text().indexOf(': 0.50x') != -1) {

            //this.setPlaybackRate(1);
            //$('#speed').text(this.tt.speed+ ' normale');

        } else if ($('.able-speed').text().indexOf(': 1x') != -1 || $('.able-speed').text().indexOf(': 1.00x') != -1) {
            this.setPlaybackRate(0.5);
            //$('#speed').text(this.tt.speed+ ' ralentie');

            $('#speed').children('svg').remove();
            $('#speed').children('span').remove();
            $('#speed').children('p').remove();
            $('#speedMain').children('svg').remove();
            $('#speedMain').children('span').remove();
            $('#speedMain').children('p').remove();
            $('#speedMain').children('i').remove();
            $('#speed').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>" + this.ablePlayer.tt.speed + " ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");
            $('#speedMain').append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z'></path></svg><span id=\"\" class='spanButton'>" + this.ablePlayer.tt.speed + " ralentie</span><i class=\"arrow right\" style='visibility:hidden'></i>");


        }
    };

    changeRate (dir) {
        if (this.ablePlayer.player === 'html5') {
            this.setPlaybackRate(this.getPlaybackRate() + (0.25 * dir));
        } else if (this.ablePlayer.player === 'youtube') {
            var rates = this.ablePlayer.youTubePlayer.getAvailablePlaybackRates();
            var currentRate = this.getPlaybackRate();
            var index = rates.indexOf(currentRate);
            if (index === -1) {
                console.log('ERROR: Youtube returning unknown playback rate ' + currentRate.toString());
            } else {
                index += dir;
                // Can only increase or decrease rate if there's another rate available.
                if (index < rates.length && index >= 0) {
                    this.setPlaybackRate(rates[index]);
                }
            }
        }
    };

    //Orange click for changing reglages
    changeCaptionsTranscrColor(elt) {
        this.ablePlayer.prefCaptionsColor = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsColor').val(elt);
        this.ablePlayer.preference.updateCookie('prefCaptionsColor');
        this.ablePlayer.prefTRColor = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRColor').val(elt);
        this.ablePlayer.preference.updateCookie('prefTRColor');
        $('.able-captions').css('color', this.ablePlayer.prefCaptionsColor);
        $('.able-descriptions').css('color', this.ablePlayer.prefCaptionsColor);
        $('.able-transcript-seekpoint').css('color', this.ablePlayer.prefCaptionsColor);
        $('.controller-orange-textcolor button').each(function () {
            if (!$(this)[0].id.includes('hide-textColor')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
            if ($(this)[0].id.includes(elt)) {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            }
        });
    }

    changeBGColor (elt) {
        this.ablePlayer.prefCaptionsBGColor = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsBGColor').val(elt);
        this.ablePlayer.preference.updateCookie('prefCaptionsBGColor');
        this.ablePlayer.prefTRBGColor = elt;
        $('#' + this.mediaId + '_' + 'prefTRBGColor').val(elt);
        this.ablePlayer.preference.updateCookie('prefTRBGColor');
        $('.able-captions-wrapper').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.able-captions').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.able-descriptions').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.able-transcript-seekpoint').css('background-color', this.ablePlayer.prefCaptionsBGColor);
        $('.controller-orange-bgcolor button').each(function () {
            if (!$(this)[0].id.includes('hide-bgColor')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            }
            if ($(this)[0].id.includes(elt)) {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
        });
    }

    changeFollowColor (elt) {
        this.ablePlayer.prefFollowColor = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefFollowColor').val(elt);
        this.ablePlayer.preference.updateCookie('prefFollowColor');
        $('.controller-orange-followcolor button').each(function () {
            if (!$(this)[0].id.includes('hide-followColor')) {
                $(this).removeClass('aria-no-checked');
                $(this).attr('aria-pressed', 'false');
            }
            if ($(this)[0].id.includes(elt)) {
                $(this).addClass('aria-no-checked');
                $(this).attr('aria-pressed', 'true');
            }
        });
    }

    changeSize (elt) {
        this.ablePlayer.prefCaptionsSize = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsSize').val(elt);
        this.ablePlayer.preference.updateCookie('prefCaptionsSize');
        this.ablePlayer.prefTRSize = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRSize').val(elt);
        this.ablePlayer.preference.updateCookie('prefTRSize');
        $('.able-captions').css('font-size', this.ablePlayer.prefCaptionsSize);
        $('.able-descriptions').css('font-size', this.ablePlayer.prefCaptionsSize);
        $('.able-transcript-seekpoint').css('font-size', this.ablePlayer.prefTRSize);
        $('.controller-orange-fontsize span').each(function () {
            if ($(this)[0].textContent.includes('%')) {
                $($(this)[0].parentElement).removeClass('aria-no-checked');
                $($(this)[0].parentElement).attr('aria-pressed', 'false');
            }
            if ($(this)[0].textContent === elt + '') {
                $($(this)[0].parentElement).addClass('aria-no-checked');
                $($(this)[0].parentElement).attr('aria-pressed', 'true');
            }
        });
        var lineHeight = parseInt(this.ablePlayer.prefCaptionsSize, 10) + 25;
        this.ablePlayer.$captionsWrapper.css('line-height', lineHeight + '%');
    }

    changeOutFont (elt) {
        this.ablePlayer.prefShadowType = elt;
        var outFont = ''
        if (elt === this.ablePlayer.tt.outHigh) {
            //outFont = '1px 1px 2px black, 0 0 25px grey, 0 0 5px grey';
            outFont = '1px 1px 1px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,1), 1px 1px 1px rgba(0,0,0,1)';
        } else if (elt === this.ablePlayer.tt.outEnforce) {
            //outFont = '1px 1px 2px black, 0 0 25px black, 0 0 5px black';
            outFont = '-1px -1px white, 1px 1px #333';
        } else if (elt === this.ablePlayer.tt.outUniform) {
            //outFont = '-1px 0 black, 0 1px black,1px 0 black, 0 -1px black';
            outFont = '0 0 0.15em black, 0 0 0.15em black, 0 0 0.15em black';
        } else if (elt === this.ablePlayer.tt.outShadow) {
            outFont = '2px 2px 4px black';
        }
        $('#' + this.ablePlayer.mediaId + '_' + 'prefShadowType').val(elt);
        this.ablePlayer.preference.updateCookie('prefShadowType');
        $('.able-captions').css('text-shadow', outFont);
        $('.able-descriptions').css('text-shadow', outFont);
        $('.able-transcript-seekpoint').css('text-shadow', outFont);
        $('.controller-orange-outfont span').each(function () {
            console.log($(this)[0].textContent);
            $($(this)[0].parentElement).attr('aria-pressed', 'false');
            $($(this)[0].parentElement).removeClass('aria-no-checked');
            if ($(this)[0].textContent === elt + '') {
                $($(this)[0].parentElement).addClass('aria-no-checked');
                $($(this)[0].parentElement).attr('aria-pressed', 'true');
            }
        });
    }

    changeFont (elt) {
        this.ablePlayer.prefCaptionsFont = elt;
        this.ablePlayer.prefTRFont = elt;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefCaptionsFont').val(elt);
        $('#' + this.ablePlayer.mediaId + '_' + 'prefTRFont').val(elt);
        this.ablePlayer.preference.updateCookie('prefCaptionsFont');
        this.ablePlayer.preference.updateCookie('prefTRFont');
        $('.able-captions').css('font-family', this.ablePlayer.prefCaptionsFont);
        $('.able-descriptions').css('font-family', this.ablePlayer.prefCaptionsFont);
        $('.able-transcript-seekpoint').css('font-family', this.ablePlayer.prefCaptionsFont);
        $('.controller-orange-font span').each(function () {
            console.log($(this)[0].textContent);
            $($(this)[0].parentElement).attr('aria-pressed', 'false');
            $($(this)[0].parentElement).removeClass('aria-no-checked');
            if ($(this)[0].textContent === elt + '') {
                $($(this)[0].parentElement).addClass('aria-no-checked');
                $($(this)[0].parentElement).attr('aria-pressed', 'true');
            }
        });
    }

    changeColorButton (elt) {
        console.log(elt);
        this.ablePlayer.prefColorButton = elt[0].id;
        $('#' + this.ablePlayer.mediaId + '_' + 'prefColorButton').val(elt[0].id);
        this.ablePlayer.preference.updateCookie('prefColorButton');
        //
        $('.button').removeClass('whiteblue');
        $('.button').removeClass('bluewhite');
        $('.button').removeClass('yellowblue');
        $('.button').removeClass('blueyellow');
        $('.button').removeClass('whiteblack');
        $('.button').removeClass('blackwhite');
        $('i').removeClass('whiteblue');
        $('i').removeClass('bluewhite');
        $('i').removeClass('yellowblue');
        $('i').removeClass('blueyellow');
        $('i').removeClass('whiteblack');
        $('i').removeClass('blackwhite');
        $('.button').addClass(elt[0].id);
        $('i').addClass(elt[0].id);
        //
        $('.controller-orange-butcol span').each(function () {
            console.log($(this)[0].textContent);
            $($(this)[0].parentElement).attr('aria-pressed', 'false');
            if ($(this)[0].textContent === elt + '') {
                $($(this)[0].parentElement).attr('aria-pressed', 'true');
            }
        });
    };

    //Finally for Orange we copied handlcaption method for On/Off switch in control.js -> handleCaptionToggle
    handleCaptionToggleOnOffOrange () {
        var captions;
        console.log('handleCapORange');
        console.log(this.ablePlayer.hidingPopup);
        if (this.ablePlayer.hidingPopup) {
            // stopgap to prevent spacebar in Firefox from reopening popup
            // immediately after closing it
            this.ablePlayer.hidingPopup = false;
            return false;
        }
        if (this.ablePlayer.captions.length) {
            captions = this.ablePlayer.captions;
        } else if (this.ablePlayer.ytCaptions.length) {
            captions = this.ablePlayer.ytCaptions;
        } else {
            captions = [];
        }
        console.log("HEY captions ??");
        console.log(this.ablePlayer.captionsOn + " captionsOn ?");
        console.log((this.ablePlayer.captionsOn === true) + " captionsOn is ture ?");
        // When there's only one set of captions, just do an on/off toggle.
        if (this.ablePlayer.captionsOn === true) {
            // turn them off
            this.ablePlayer.captionsOn = false;
            this.ablePlayer.prefCaptions = 0;
            this.ablePlayer.preference.updateCookie('prefCaptions');
            if (this.ablePlayer.usingYouTubeCaptions) {
                this.ablePlayer.youTubePlayer.unloadModule(this.ablePlayer.ytCaptionModule);
            } else {
                this.ablePlayer.$captionsWrapper.hide();
            }

            $('#subt').attr('aria-pressed', 'false');
            $('#subt').attr('aria-label', this.ablePlayer.tt.act_st_label_general);
            $('#subt').removeClass('aria-no-checked');
            //activate captions
            //thisObj.handleCaptionToggle();
            $('#subt').removeClass('subtno')
            $('#subt').text('');
            $('#subt').attr('disabled', true);
            //$('#subt').append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\">");
            $('#subt').append("<span>" + this.ablePlayer.tt.de_act_st_general + "</span>");

            //all others are false
            $('#subtitlesFR').attr('aria-pressed', 'false');
            $('#subtitlesFR').removeClass('aria-no-checked');
            $('#subtitlesFR').removeClass('subtno');
            $('#subtitlesFR').text(this.ablePlayer.tt.act_st_fr);
            $('#subtitlesFR').attr('aria-label', this.ablePlayer.tt.act_st_fr_label);

            $('#subtitlesML').attr('aria-pressed', 'false');
            $('#subtitlesML').removeClass('aria-no-checked');
            $('#subtitlesML').removeClass('subtno');
            $('#subtitlesML').text('');
            //$('#subtitlesML').append("<span id=\"\">"+this.tt.act_st_ml+"</span><i class=\"captions\"></i>");
            $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + this.ablePlayer.tt.act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

            $('#subtitlesML').attr('aria-label', this.ablePlayer.tt.act_st_ml_label);

            $('#subtitlesEN').attr('aria-pressed', 'false');
            $('#subtitlesEN').removeClass('aria-no-checked');
            $('#subtitlesEN').removeClass('subtno');
            $('#subtitlesEN').text(this.ablePlayer.tt.act_st_en);
            $('#subtitlesEN').attr('aria-label', this.ablePlayer.tt.act_st_en_label);

            $('#subtitlesES').attr('aria-pressed', 'false');
            $('#subtitlesES').removeClass('aria-no-checked');
            $('#subtitlesES').removeClass('subtno');
            $('#subtitlesES').text(this.ablePlayer.tt.act_st_es);
            $('#subtitlesES').attr('aria-label', this.ablePlayer.tt.act_st_es_label);

            $('#subtitlesPL').attr('aria-pressed', 'false');
            $('#subtitlesPL').removeClass('aria-no-checked');
            $('#subtitlesPL').removeClass('subtno');
            $('#subtitlesPL').text(this.ablePlayer.tt.act_st_pl);
            $('#subtitlesPL').attr('aria-label', this.ablePlayer.tt.act_st_pl_label);
            console.log('turn off caption');
        } else {
            console.log("captions are off. Turn them on");
            // captions are off. Turn them on.
            this.ablePlayer.captionsOn = true;
            this.ablePlayer.prefCaptions = 1;
            this.ablePlayer.preference.updateCookie('prefCaptions');
            if (this.ablePlayer.usingYouTubeCaptions) {
                if (typeof this.ablePlayer.ytCaptionModule !== 'undefined') {
                    this.ablePlayer.youTubePlayer.loadModule(this.ablePlayer.ytCaptionModule);
                }
            } else {
                this.ablePlayer.$captionsWrapper.show();
            }
            var selected = 0;
            for (var i = 0; i < captions.length; i++) {
                if (captions[i].def === true || captions[i].language == "fr") { // this is the default language
                    this.ablePlayer.selectedCaptions = captions[i];
                    selected = i;
                }
            }
            this.ablePlayer.selectedCaptions = this.ablePlayer.captions[selected];
            if (this.ablePlayer.descriptions.length >= 0) {
                this.ablePlayer.selectedDescriptions = this.ablePlayer.descriptions[0];
            }
            for (var q = 0; q < $(this.ablePlayer.captionsPopup.find('input')).length; q++) {
                console.log("selectedCaptions = ");
                console.log(this.ablePlayer.selectedCaptions);
                if ($($(this.ablePlayer.captionsPopup.find('input'))[q]).attr('lang') == this.ablePlayer.selectedCaptions.language) {
                    //console.log('Bingo : '+$($(thisObj.captionsPopup.find('input'))[q]).attr('lang'));
                    $($(this.ablePlayer.captionsPopup.find('input'))[q]).prop("checked", true);
                } else {
                    $($(this.ablePlayer.captionsPopup.find('input'))[q]).prop("checked", false);
                }
            }
            if (this.ablePlayer.captionLang === 'en') {
                $('#subtitlesEN').attr('aria-pressed', 'true');
                $('#subtitlesEN').attr('aria-label', this.ablePlayer.tt.de_act_st_en_label);
                $('#subtitlesEN').addClass('aria-no-checked');
                $('#subtitlesEN').text(this.ablePlayer.tt.de_act_st_en);
                $('#subtitlesEN').addClass('subtno');
            } else if (this.ablePlayer.captionLang === 'fr') {
                $('#subtitlesFR').attr('aria-pressed', 'true');
                $('#subtitlesFR').attr('aria-label', this.ablePlayer.tt.de_act_st_fr_label);
                $('#subtitlesFR').addClass('aria-no-checked');
                $('#subtitlesFR').text(this.ablePlayer.tt.de_act_st_fr);
                $('#subtitlesFR').addClass('subtno');
            } else if (this.ablePlayer.captionLang === 'es') {
                $('#subtitlesES').attr('aria-pressed', 'true');
                $('#subtitlesES').attr('aria-label', this.ablePlayer.tt.de_act_st_es_label);
                $('#subtitlesES').addClass('aria-no-checked');
                $('#subtitlesES').text(this.ablePlayer.tt.de_act_st_es);
                $('#subtitlesES').addClass('subtno');
            } else if (this.ablePlayer.captionLang === 'ml') {
                $('#subtitlesML').attr('aria-pressed', 'true');
                $('#subtitlesML').attr('aria-label', this.ablePlayer.tt.de_act_st_ml_label);
                $('#subtitlesML').addClass('aria-no-checked');
                $('#subtitlesML').text('');
                $('#subtitlesML').append("<svg style='float:left;margin-left:25%;visibility:hidden' class=\"captions\"></svg><span> " + this.ablePlayer.tt.de_act_st_ml + "</span><i class=\"arrow right\" style='-webkit-transform:rotate(0deg);transform:rotate(0deg)'><svg style='-webkit-transform:rotate(0deg);transform:rotate(0deg)' viewBox='0 0 20 20'><path d='M 7.85,19.81 C 7.32,19.72 6.85,19.43 6.58,19.04 6.38,18.74 6.36,18.67 6.38,18.32 6.42,17.87 6.63,17.59 7.02,17.46 7.28,17.37 7.45,17.42 8.04,17.78 8.52,18.06 8.83,18.07 9.37,17.80 9.65,17.66 9.94,17.43 10.25,17.10 10.80,16.52 11.01,16.21 11.93,14.68 12.77,13.29 13.03,12.95 14.07,11.86 15.43,10.45 15.74,9.86 15.91,8.39 16.11,6.74 15.54,5.18 14.29,3.93 13.46,3.10 12.80,2.72 11.67,2.41 11.01,2.23 9.72,2.24 9.03,2.44 7.06,3.01 5.39,4.59 5.06,6.21 4.93,6.84 4.91,6.87 4.68,6.96 4.37,7.09 3.39,7.02 3.16,6.85 2.93,6.68 2.89,6.27 3.04,5.67 3.28,4.74 3.85,3.78 4.68,2.91 6.34,1.16 8.66,0.18 10.77,0.33 13.65,0.53 15.91,1.94 17.08,4.27 17.65,5.41 17.88,6.44 17.88,7.87 17.88,10.01 17.31,11.31 15.46,13.32 13.74,15.19 13.62,15.34 12.58,17.29 12.07,18.24 11.34,19.01 10.65,19.34 9.80,19.74 8.61,19.94 7.85,19.81 7.85,19.81 7.85,19.81 7.85,19.81 Z M 12.29,10.08 C 12.02,9.98 11.82,9.87 11.84,9.83 12.55,8.29 12.66,7.17 12.16,6.46 11.69,5.79 10.51,5.52 9.73,5.92 9.39,6.09 8.70,6.72 8.42,7.12 8.42,7.12 8.28,7.30 8.28,7.30 8.28,7.30 7.72,7.20 7.72,7.20 7.41,7.15 7.14,7.09 7.13,7.07 7.07,7.01 7.32,6.37 7.52,6.06 7.83,5.59 8.42,5.10 9.05,4.79 9.58,4.53 9.65,4.51 10.30,4.48 11.11,4.45 11.59,4.54 12.16,4.83 13.80,5.64 14.30,7.75 13.33,9.67 13.13,10.06 13.01,10.23 12.92,10.24 12.84,10.25 12.56,10.17 12.29,10.08 12.29,10.08 12.29,10.08 12.29,10.08 Z'</path></svg></i>");

                //$('#subtitlesML').append("<span id=\"\">"+this.tt.de_act_st_ml+"</span><i class=\"captions\"></i>");
                //$('#subtitlesML').addClass('subtno');
            } else if (this.ablePlayer.captionLang === 'pl') {
                $('#subtitlesPL').attr('aria-pressed', 'true');
                $('#subtitlesPL').attr('aria-label', this.ablePlayer.tt.de_act_st_pl_label);
                $('#subtitlesPL').addClass('aria-no-checked');
                $('#subtitlesPL').text(this.ablePlayer.tt.de_act_st_pl);
                $('#subtitlesPL').addClass('subtno');
            }

            $('#subt').attr('aria-checked', 'true');
            $('#subt').attr('aria-pressed', 'true');
            $('#subt').attr('aria-label', this.ablePlayer.tt.de_act_st_label);
            $('#subt').addClass('aria-no-checked');
            $('#subt').text('');
            //$('#subt').addClass('subtno')
            $('#subt').attr('disabled', false);
            $('#subt').append("<span id=\"\">" + this.ablePlayer.tt.de_act_st_general + "</span>");

        }
        this.checkContextVidTranscr();
        this.refreshControls();
    }

    handleAccessToggle() {
        console.log('onclick button Access');
        if (this.ablePlayer.hidingPopup || this.ablePlayer.accessPopup.is(':visible')) {
            // stopgap to prevent spacebar in Firefox from reopening popup
            // immediately after closing it
            this.hidingPopup = false;
            this.ablePlayer.accessPopup.find('li').removeClass('able-focus').attr('tabindex', '0');
            this.ablePlayer.$accMenu.focus();
            $('.able-button-handler-accmenu').focus();
            this.ablePlayer.closePopups();
            return false;
        } else {
            this.ablePlayer.closePopups();
            this.ablePlayer.accessPopup.show();
            this.ablePlayer.accessPopup.css('top', this.ablePlayer.$accMenu.position().top - this.ablePlayer.accessPopup.outerHeight());
            this.ablePlayer.accessPopup.find('li').removeClass('able-focus');
            if (this) {

            }
            if (this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] === 'false') {
                //this.accessPopup.find('input').first().focus().parent().removeClass('able-focus');
            } else {
                this.ablePlayer.accessPopup.find('input').first().focus().parent().removeClass('able-focus');
            }
            if (this.ablePlayer.accessPopup.find('input:checked')) {
                this.ablePlayer.accessPopup.find('input:checked').focus().parent().addClass('able-focus');
            } else {
                this.ablePlayer.accessPopup.find('input').first().focus().parent().addClass('able-focus');

            }

        }


    }

    handleCaptionToggle () {
        var captions;
        if (this.ablePlayer.hidingPopup) {
            this.ablePlayer.hidingPopup = false;
            return false;
        }
        if (this.ablePlayer.captions.length) {
            captions = this.ablePlayer.captions;
        } else if (this.ablePlayer.ytCaptions.length) {
            captions = this.ablePlayer.ytCaptions;
        } else {
            captions = [];
        }

        //Orange take car about new interface
        if (this.captionsOn === true) {
            //   $('#subt').attr('aria-checked','false');
            //   $('#subt').removeClass('aria-no-checked');
            //  //activate captions
            //  //thisObj.handleCaptionToggle();
            //   $('#subt').removeClass('subtno')
            //   $('#subt').text('');
            //   //$('#subt').append("<i class=\"captions\"></i><span id=\"\">"+this.tt.captions+"</span><i class=\"arrow right\">");
            //   $('#subt').append("<i class=\"captions\"></i><span>"+this.tt.act_st+"</span><i class=\"captions\">");

        } else {


            // $('#subt').attr('aria-checked','true');
            // $('#subt').addClass('aria-no-checked');
            // $('#subt').text('');
            // $('#subt').addClass('subtno')
            // $('#subt').append("<i class=\"captions\"></i><span id=\"\">"+this.tt.de_act_st+"</span><i class=\"captions\">");
        }


        if (captions.length === 1) {
            if (this.ablePlayer.captionsOn === true) {
                this.ablePlayer.captionsOn = false;
                this.ablePlayer.prefCaptions = 0;
                this.ablePlayer.preference.updateCookie('prefCaptions');
                if (this.ablePlayer.usingYouTubeCaptions) {
                    //this.youTubePlayer.unloadModule('captions');
                }
                else {
                    this.ablePlayer.$captionsWrapper.hide();
                }
            }
            else {
                // captions are off. Turn them on.
                this.ablePlayer.captionsOn = true;
                this.ablePlayer.prefCaptions = 1;
                this.ablePlayer.preference.updateCookie('prefCaptions');
                if (this.ablePlayer.usingYouTubeCaptions) {
                    if (typeof this.ablePlayer.ytCaptionModule !== 'undefined') {
                        this.ablePlayer.youTubePlayer.loadModule(this.ablePlayer.ytCaptionModule);
                    }
                }
                else {
                    this.ablePlayer.$captionsWrapper.show();
                }
                for (var i=0; i<captions.length; i++) {
                    if (captions[i].def === true) { // this is the default language
                        this.ablePlayer.selectedCaptions = captions[i];
                    }
                }
                this.ablePlayer.selectedCaptions = this.ablePlayer.captions[0];
                if (this.ablePlayer.descriptions.length >= 0) {
                    this.ablePlayer.selectedDescriptions = this.ablePlayer.descriptions[0];
                }
            }
            this.refreshControls();
        }
        else {
            if (this.ablePlayer.captionsPopup.is(':visible')) {
                this.ablePlayer.captionsPopup.hide();
                this.hidingPopup = false;
                this.ablePlayer.$ccButton.focus();
            }
            else {
                this.ablePlayer.closePopups();
                this.ablePlayer.captionsPopup.show();
                this.ablePlayer.captionsPopup.css('top', this.ablePlayer.$ccButton.position().top - this.ablePlayer.captionsPopup.outerHeight());
                console.log(this);
                this.ablePlayer.captionsPopup.css('left', this.ablePlayer.$ccButton.position().left);
                this.ablePlayer.captionsPopup.css('left', this.ablePlayer.$controllerDiv.width() - this.ablePlayer.captionsPopup.width());
                // Focus on the checked button, if any buttons are checked
                // Otherwise, focus on the first button
                this.ablePlayer.captionsPopup.find('li').removeClass('able-focus');
                if (this.ablePlayer.captionsPopup.find('input:checked')) {
                    this.ablePlayer.captionsPopup.find('input:checked').focus().parent().addClass('able-focus');
                } else {
                    this.ablePlayer.captionsPopup.find('input').first().focus().parent().addClass('able-focus');
            }
        }
    }};

    handleChapters() {
        if (this.ablePlayer.hidingPopup) {
            this.ablePlayer.hidingPopup = false;
            return false;
        }
        if (this.ablePlayer.chaptersPopup.is(':visible')) {
            this.ablePlayer.chaptersPopup.hide();
            this.ablePlayer.hidingPopup = false;
            this.ablePlayer.$chaptersButton.focus();
        }
        else {
            this.ablePlayer.closePopups();
            this.ablePlayer.chaptersPopup.show();
            this.ablePlayer.chaptersPopup.css('top', this.ablePlayer.$chaptersButton.position().top - this.ablePlayer.chaptersPopup.outerHeight());
            this.ablePlayer.chaptersPopup.css('left', this.ablePlayer.$chaptersButton.position().left)
            // Focus on the checked button, if any buttons are checked
            // Otherwise, focus on the first button
            this.ablePlayer.chaptersPopup.find('li').removeClass('able-focus');
            if (this.ablePlayer.chaptersPopup.find('input:checked')) {
                this.ablePlayer.chaptersPopup.find('input:checked').focus().parent().addClass('able-focus');
            } else {
                this.ablePlayer.chaptersPopup.find('input').first().focus().parent().addClass('able-focus');
            }
        }
    };

    handleDescriptionToggle() {
        if ($('#audiodesc').attr('aria-checked') === 'false') {
            $('#audiodesc').attr('aria-checked', 'true');
            $('#audiodesc').attr('aria-label', this.ablePlayer.tt.audiodescno);
            $('#audiodesc').addClass('aria-no-checked');
            $('#audiodesc').children('svg').children('line').css('display', 'none');
            $('#audiodesc').children('span').text(this.ablePlayer.tt.audiodescno);
            $('#audiodesc').addClass('audiodescno')
        } else {
            $('#audiodesc').attr('aria-checked', 'false');
            $('#audiodesc').attr('aria-label', this.ablePlayer.tt.audiodescact);
            $('#audiodesc').removeClass('aria-no-checked');
            $('#audiodesc').children('svg').children('line').css('display', 'block');
            $('#audiodesc').children('span').text(this.ablePlayer.tt.audiodescact);
            $('#audiodesc').removeClass('audiodescno');

        }
        console.log('handleDescriptionToggle');
        this.ablePlayer.descOn = !this.ablePlayer.descOn;
        this.ablePlayer.prefDesc = +this.ablePlayer.descOn; // convert boolean to integer
        this.ablePlayer.preference.updateCookie('prefDesc');
        this.ablePlayer.refreshingDesc = true;
        this.ablePlayer.description.initDescription();
        this.refreshControls();

        this.resizeAccessMenu();
        this.checkContextVidTranscr();
    };

    handlePrefsClick(pref) {
        var thisObj, prefsButtonPosition, prefsMenuRight, prefsMenuLeft;
        if (this.ablePlayer.hidingPopup) {
            // stopgap to prevent spacebar in Firefox from reopening popup
            // immediately after closing it
            this.ablePlayer.hidingPopup = false;
            return false;
        }
        if (this.ablePlayer.prefsPopup.is(':visible')) {
            this.ablePlayer.prefsPopup.hide();
            this.ablePlayer.hidingPopup = false;
            this.ablePlayer.$prefsButton.focus();
            // restore each menu item to original hidden state
            this.ablePlayer.prefsPopup.find('li').removeClass('able-focus').attr('tabindex', '-1');
        } else {
            this.ablePlayer.closePopups();
            this.ablePlayer.prefsPopup.show();
            prefsButtonPosition = this.ablePlayer.$prefsButton.position();
            prefsMenuRight = this.ablePlayer.$ableDiv.width() - 5;
            prefsMenuLeft = prefsMenuRight - this.ablePlayer.prefsPopup.width();
            this.ablePlayer.prefsPopup.css('top', prefsButtonPosition.top - this.ablePlayer.prefsPopup.outerHeight());
            this.ablePlayer.prefsPopup.css('left', prefsMenuLeft);
            // remove prior focus and set focus on first item; also change tabindex from -1 to 0
            this.ablePlayer.prefsPopup.find('li').removeClass('able-focus').attr('tabindex', '0');
            this.ablePlayer.prefsPopup.find('li').first().focus().addClass('able-focus');
        }
    };

    handleHelpClick() {
        this.setFullscreen(false);
        this.ablePlayer.helpDialog.show();
    };

    handleTranscriptToggle () {
        if (this.ablePlayer.$transcriptDiv.is(':visible')) {
            this.ablePlayer.$transcriptArea.hide();
            if( this.ablePlayer.$transcriptButton !== undefined ) {
                this.ablePlayer.$transcriptButton.addClass('buttonOff').attr('aria-label',this.ablePlayer.tt.showTranscript);
                this.ablePlayer.$transcriptButton.find('span.able-clipped').text(this.ablePlayer.tt.showTranscript);
            }
            this.ablePlayer.prefTranscript = 0;
        }
        else {
            this.ablePlayer.positionDraggableWindow('transcript');
            this.ablePlayer.$transcriptArea.show();
            this.ablePlayer.$transcriptPopup.hide();
            if( this.ablePlayer.$transcriptButton !== undefined ){
                this.ablePlayer.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.ablePlayer.tt.hideTranscript);
                this.ablePlayer.$transcriptButton.find('span.able-clipped').text(this.ablePlayer.tt.hideTranscript);
            }
            this.ablePlayer.prefTranscript = 1;
        }
        this.ablePlayer.preference.updateCookie('prefTranscript');
        this.checkContextVidTranscr();
    };

    handleSignToggle() {
        if (this.ablePlayer.$signWindow.is(':visible')) {
            this.ablePlayer.$signWindow.hide();
            this.ablePlayer.$signButton.addClass('buttonOff').attr('aria-label',this.ablePlayer.tt.showSign);
            this.ablePlayer.$signButton.find('span.able-clipped').text(this.ablePlayer.tt.showSign);
            this.ablePlayer.prefSign = 0;
        }
        else {
            this.ablePlayer.positionDraggableWindow('sign');
            this.ablePlayer.$signWindow.show();
            this.ablePlayer.$signButton.removeClass('buttonOff').attr('aria-label',this.ablePlayer.tt.hideSign);
            this.ablePlayer.$signButton.find('span.able-clipped').text(this.ablePlayer.tt.hideSign);
            this.ablePlayer.prefSign = 1;
        }
        this.ablePlayer.ablePlayer.updateCookie('prefSign');

        //Orange interface
        if ($('#lsf').attr('aria-checked') == 'true') {
            console.log('handleSignToggle prefSign=' + this.ablePlayer.preference.getCookie()['preferences']['prefSign'] + ' and tr=' + this.ablePlayer.preference.getCookie()['preferences']['prefTranscript']);
            $('#lsf').attr('aria-checked', 'false');
            $('#lsf').attr('aria-label', this.ablePlayer.tt.lsfact);
            $('#lsf').removeClass('aria-no-checked');
            $('#lsf').children('span').text(this.ablePlayer.tt.lsfact);
            if (this.ablePlayer.$mediaContainer.find('video').find('source')[0].src.includes(this.ablePlayer.$sources.first().attr('data-sign-src')) && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                if (this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] === 0) {
                    this.ablePlayer.$ableDiv.css('width', '100%');
                    this.ablePlayer.$playerDiv.css('width', '100%');
                    //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
                } else {
                    this.ablePlayer.$playerDiv.css('width', '100%');
                    //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
                    this.ablePlayer.$transcriptArea.css('top', '0px');
                }
                var svgVideoSrc = this.ablePlayer.$signWindow.find('video').find('source')[0].src;
                //put video sign in the second container
                this.ablePlayer.$mediaContainer.find('video').find('source')[0].src = svgVideoSrc;
                this.ablePlayer.$mediaContainer.find('video')[0].load();
                //put video in the first containre
                this.ablePlayer.$signWindow.find('video').find('source')[0].src = this.ablePlayer.$sources.first().attr('data-sign-src');
                this.ablePlayer.$signWindow.find('video')[0].load();
            }
            $('#lsf').removeClass('lsfno');
            $('#lsf').children('svg').children('line').css('display', 'block');

        } else {
            console.log('handleSignToggle and tr=' + this.ablePlayer.getCookie()['preferences']['prefTranscript']);
            if (this.ablePlayer.$mediaContainer.find('video').find('source')[0].src.includes(this.ablePlayer.$sources.first().attr('data-sign-src')) === false && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                this.ablePlayer.$ableDiv.css('width', '33%');
                this.ablePlayer.$signWindow.css('width', '33%');
                this.ablePlayer.$signWindow.css('width', thisObj.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                this.ablePlayer.$signWindow.css('left', '67%');
                this.ablePlayer.$signWindow.css('position', 'absolute');
                this.ablePlayer.$signWindow.css('top', '0px');
                this.ablePlayer.$signWindow.css('margin', '0px');
                //put video sign in the first container
                var svgVideoSrc = this.ablePlayer.$mediaContainer.find('video').find('source')[0].src;
                this.ablePlayer.$mediaContainer.find('video').find('source')[0].src = this.ablePlayer.$sources.first().attr('data-sign-src');
                this.ablePlayer.$mediaContainer.find('video')[0].load();
                this.ablePlayer.$mediaContainer.css('background-color', 'lightgray');
                //put video in the second containre
                this.ablePlayer.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
                this.ablePlayer.$signWindow.find('video')[0].load();
                if (this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] === 1) {
                    var takePadding = 0;
                    if (parseInt(this.ablePlayer.$signToolbar.css('padding').replace('px', ''))) {
                        takePadding = parseInt(this.ablePlayer.$signToolbar.css('padding').replace('px', ''));
                    }
                    this.ablePlayer.$transcriptArea.css('top', (this.ablePlayer.$signWindow.height() + this.ablePlayer.$signToolbar.height() + takePadding) + 'px');
                } else {
                    this.ablePlayer.$playerDiv.css('width', (this.ablePlayer.$mediaContainer.width()) + 'px');
                    //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
                    //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
                }
            }


            $('#lsf').attr('aria-checked', 'true');
            $('#lsf').attr('aria-label', this.ablePlayer.tt.lsfno);
            $('#lsf').addClass('aria-no-checked');
            $('#lsf').children('span').text(this.ablePlayer.tt.lsfno);
            $('#lsf').addClass('lsfno');
            $('#lsf').children('svg').children('line').css('display', 'none');

        }
    };

    isFullscreen() {
        if (this.ablePlayer.browser.nativeFullscreenSupported()) {
            return (document.fullscreenElement ||
                document.webkitFullscreenElement ||
                document.webkitCurrentFullScreenElement ||
                document.mozFullScreenElement ||
                document.msFullscreenElement) ? true : false;
        } else {
            return this.ablePlayer.modalFullscreenActive ? true : false;
        }
    }

    setFullscreen(fullscreen) {
        if (this.isFullscreen() == fullscreen) {
            return;
        }
        var thisObj = this;
        var $el = this.ablePlayer.$ableWrapper;
        var el = $el[0];

        if (this.ablePlayer.browser.nativeFullscreenSupported()) {
            // Note: many varying names for options for browser compatibility.
            if (fullscreen) {
                // Initialize fullscreen
                $('#acc-menu-id').css('display', 'none');
                console.log("enter fullscreen by this way");
                // But first, capture current settings so they can be restored later
                this.ablePlayer.preFullScreenWidth = this.ablePlayer.$ableWrapper.width();
                this.ablePlayer.preFullScreenHeight = this.ablePlayer.$ableWrapper.height();

                if (el.requestFullscreen) {
                    el.requestFullscreen();
                } else if (el.webkitRequestFullscreen) {
                    el.webkitRequestFullscreen();
                } else if (el.mozRequestFullScreen) {
                    el.mozRequestFullScreen();
                } else if (el.msRequestFullscreen) {
                    el.msRequestFullscreen();
                }
            } else {
                console.log('exit fullscreen with profil ' + thisObj.ablePlayer.preference.getCookie()['preferences']['prefModeUsage']);
                if (thisObj.ablePlayer.preference.getCookie()['preferences']['prefModeUsage'] != 'profDef') {
                    $('#acc-menu-id').css('display', 'initial');
                }
                // Exit fullscreen
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen();
                }

                //OrangeLab spec
                // $('.controller-orange-main').attr('style','display:block');
                // this.resizeAccessMenu();
                // $('.able-controller').attr('style','display:none');
                // this.$bigPlayButton.width(this.$mediaContainer.width());
                // this.$bigPlayButton.height(this.$mediaContainer.height());
                // $('.able-player').attr('style','margin-top:0px');
                // if(this.getCookie()['preferences']['prefSign'] === 1 && this.getCookie()['preferences']['prefAccessMenu'] === 'true'){
                //   this.$ableDiv.css('width','67%');
                //   this.$signWindow.css('width','33%');
                //   this.$signWindow.css('left','67%');
                //   this.$signWindow.css('position','absolute');
                //   this.$signWindow.css('top','0px');
                //   this.$signWindow.css('margin','0px');
                //   if(this.getCookie()['preferences']['prefTranscript'] === 1){
                //     var takePadding = 0;
                //     if(parseInt(thisObj.$signToolbar.css('padding').replace('px',''))){
                //       takePadding = parseInt(thisObj.$signToolbar.css('padding').replace('px',''));
                //     }
                //     this.$transcriptArea.css('top',(thisObj.$signWindow.height()+thisObj.$signToolbar.height()+takePadding)+'px');
                //     this.$transcriptArea .css('width','66%');
                //     this.$transcriptArea .css('left','33%');
                //   } else {
                //     this.$playerDiv.css('width',(this.$ableWrapper.width())+'px');
                //     //$('.able-captions-wrapper').css('width',(this.$playerDiv.width())+'px');
                //     //$('.able-descriptions').css('width',(this.$playerDiv.width())+'px');
                //   }
                // } else if(this.getCookie()['preferences']['prefTranscript'] === 1 && this.getCookie()['preferences']['prefAccessMenu'] === 'true') {
                //     this.$transcriptArea.css('top','0px');
                //     this.$transcriptArea .css('width','66%');
                //     this.$transcriptArea .css('left','33%');
                //     this.$ableDiv.css('width','33%');
                // }

                //Check pref to toogle or not buttons USELESS since 06/10/2020
                // if(this.$sources.first().attr('data-sign-opt')){
                // 	if(thisObj.$playlist.eq(0).attr('class')!='able-current'){
                // 		this.$buttonVidcontr.removeClass('aria-no-checked')
                // 		this.$buttonVidcontr.attr('aria-checked','true')
                // 		this.$buttonVidcontr.addClass('vidcontrno')
                //  		this.$buttonVidcontr.text('');
                //  		this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.vidcontr+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                // 	} else {
                // 		this.$buttonVidcontr.addClass('aria-no-checked')
                // 		this.$buttonVidcontr.attr('aria-checked','false')
                // 		this.$buttonVidcontr.removeClass('vidcontrno')
                //  		this.$buttonVidcontr.text('');
                //  		this.$buttonVidcontr.append("<svg style='float:left;margin-left:25%' class=\"captions\"></svg><span class='spanButton' id=\"\">"+thisObj.tt.vidcontrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                // 	}
                // } else {
                // 	this.$buttonVidcontr.prop("disabled",true);
                // }
                // if(this.$sources.first().attr('data-sign-src')){
                // 	if(this.getCookie()['preferences']['prefSign'] == 1){
                // 		this.$buttonLSF.removeClass('aria-no-checked')
                // 		this.$buttonLSF.attr('aria-checked','true')
                // 	} else {
                // 		this.$buttonLSF.addClass('aria-no-checked')
                // 		this.$buttonLSF.attr('aria-checked','false')
                // 		this.$buttonLSF.attr('aria-label',this.tt.lsfno)
                // 		this.$buttonLSF.text('');
                // 		this.$buttonLSF.addClass('lsfno')
                //  		this.$buttonLSF.append("<i class=\"captions\"></i><span class='spanButton' id=\"\">"+this.tt.lsfno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                // 	}
                // } else {
                // 	this.$buttonLSF.prop("disabled",true);
                // }
                // if(this.transcriptType){
                // 	if(this.getCookie()['preferences']['prefTranscript'] == 1){
                // 		this.$buttonTranscr.removeClass('aria-no-checked')
                // 		this.$buttonTranscr.attr('aria-checked','true')
                // 	} else {
                // 		this.$buttonTranscr.addClass('aria-no-checked')
                // 		this.$buttonTranscr.attr('aria-checked','false')
                // 		this.$buttonTranscr.attr('aria-label',this.tt.transcrno)
                // 		this.$buttonTranscr.text('');
                // 		this.$buttonTranscr.addClass('transcrno')
                //  		this.$buttonTranscr.append("<i class=\"captions\"></i><span class='spanButton' id=\"\">"+this.tt.transcrno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                // 	}
                // } else {
                // 	this.$buttonTranscr.prop("disabled",true);
                // }
                // if(this.transcriptType){
                // 	if(this.getCookie()['preferences']['prefDesc'] == 1){
                // 		this.$buttonAudioDesc.removeClass('aria-no-checked')
                // 		this.$buttonAudioDesc.attr('aria-checked','true')
                // 	} else {
                // 		this.$buttonAudioDesc.addClass('aria-no-checked')
                // 		this.$buttonAudioDesc.attr('aria-checked','false')
                // 		this.$buttonAudioDesc.attr('aria-label',this.tt.audiodescno)
                // 		this.$buttonAudioDesc.text('');
                // 		this.$buttonAudioDesc.addClass('audiodescno')
                //  		this.$buttonAudioDesc.append("<i class=\"captions\"></i><span class='spanButton' id=\"\">"+this.tt.audiodescno+"</span><i class=\"arrow right\" style='visibility:hidden'></i>");
                // 	}
                // } else {
                // 	this.$buttonAudioDesc.prop("disabled",true);
                // }


                //07/08/2020 USELESS
                // if(this.$media.find('track[kind="captions"], track[kind="subtitles"]').length > 0){
                // 	if(this.getCookie()['preferences']['prefCaptions'] == 1){

                //     this.$buttonActivateSub.addClass('aria-no-checked')
                // 		this.$buttonActivateSub.attr('aria-pressed','true')
                // 		this.$buttonActivateSub.attr('aria-label',this.tt.de_act_st)
                //  		this.$buttonActivateSub.text('');
                // 		this.$buttonActivateSub.addClass('subtno')
                //  		this.$buttonActivateSub.append("<i class=\"captions\"></i><span id=\"\">"+this.tt.de_act_st+"</span>");
                // 	} else {

                // 		this.$buttonActivateSub.removeClass('aria-no-checked')
                // 		this.$buttonActivateSub.attr('aria-pressed','false')
                // 		this.$buttonActivateSub.attr('aria-label',this.tt.act_st)
                // 	}
                // } else {
                // 	  this.$buttonActivateSub.prop("disabled",true);
                // }

            }
            // add event handlers for changes in full screen mode
            // currently most changes are made in response to windowResize event
            // However, that alone is not resulting in a properly restored player size in Opera Mac
            // More on the Opera Mac bug: https://github.com/ableplayer/ableplayer/issues/162
            // this fullscreen event handler added specifically for Opera Mac,
            // but includes event listeners for all browsers in case its functionality could be expanded
            // Added functionality in 2.3.45 for handling YouTube return from fullscreen as well
            $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange', function () {
                console.log('fullscreenChange detected');
                setTimeout(function () {
                    if (thisObj.ablePlayer.preference.getCookie()['preferences']['prefModeUsage'] != 'profDef') {
                        var wasShow = $('[class^="controller-orange"]').filter(":visible");
                        if (wasShow.length > 1) {
                            thisObj.ablePlayer.$controllerOrangeDiv.css('display', 'none');
                        }
                        //thisObj.$wasShow.attr('style','display:block');
                    }
                    //thisObj.checkContextVidTranscr();
                    thisObj.resizeAccessMenu();
                }, 300);
                if (!thisObj.isFullscreen()) {
                    // user has just exited full screen
                    console.log('fullscreen exit by detection');
                    thisObj.ablePlayer.restoringAfterFullScreen = true;
                    thisObj.resizePlayer(thisObj.ablePlayer.preFullScreenWidth, thisObj.ablePlayer.preFullScreenHeight);
                    var wasShow = $('[class^="controller-orange"]').filter(":visible");
                    if (wasShow.length > 1) {
                        thisObj.ablePlayer.$controllerOrangeDiv.css('display', 'none');
                    }
                    thisObj.checkContextVidTranscr();
                    thisObj.resizePlayer();
                    thisObj.resizeAccessMenu();
                }
            });
        } else {
            // Non-native fullscreen support through modal dialog.
            // Create dialog on first run through.
            if (!this.ablePlayer.fullscreenDialog) {
                var $dialogDiv = $('<div>');
                // create a hidden alert, communicated to screen readers via aria-describedby
                var $fsDialogAlert = $('<p>', {
                    'class': 'able-screenreader-alert'
                }).text(this.ablePlayer.tt.fullscreen); // In English: "Full screen"; TODO: Add alert text that is more descriptive
                $dialogDiv.append($fsDialogAlert);
                // now render this as a dialog
                this.ablePlayer.fullscreenDialog = new AccessibleDialog($dialogDiv, this.ablePlayer.$fullscreenButton, 'dialog', 'Fullscreen video player', $fsDialogAlert, this.ablePlayer.tt.exitFullScreen, '100%', true, function () {
                    thisObj.handleFullscreenToggle()
                });
                $('body').append($dialogDiv);
            }

            // Track whether paused/playing before moving element; moving the element can stop playback.
            var wasPaused = this.isPaused();

            if (fullscreen) {
                this.ablePlayer.modalFullscreenActive = true;
                this.ablePlayer.fullscreenDialog.show();

                // Move player element into fullscreen dialog, then show.
                // Put a placeholder element where player was.
                this.ablePlayer.$modalFullscreenPlaceholder = $('<div class="placeholder">');
                this.ablePlayer.$modalFullscreenPlaceholder.insertAfter($el);
                $el.appendTo(this.ablePlayer.fullscreenDialog.modal);

                // Column left css is 50% by default; set to 100% for full screen.
                if ($el === this.ablePlayer.$ableColumnLeft) {
                    $el.width('100%');
                }
                var newHeight = $(window).height() - this.ablePlayer.$playerDiv.height();
                if (!this.ablePlayer.$descDiv.is(':hidden')) {
                    newHeight -= this.ablePlayer.$descDiv.height();
                }
                this.resizePlayer($(window).width(), newHeight);
            } else {
                this.ablePlayer.modalFullscreenActive = false;
                if ($el === this.ablePlayer.$ableColumnLeft) {
                    $el.width('50%');
                }
                $el.insertAfter(this.ablePlayer.$modalFullscreenPlaceholder);
                this.ablePlayer.$modalFullscreenPlaceholder.remove();
                this.ablePlayer.fullscreenDialog.hide();
                this.resizePlayer(this.ablePlayer.$ableWrapper.width(), this.ablePlayer.$ableWrapper.height());
            }

            // TODO: JW Player freezes after being moved on iPads (instead of being reset as in most browsers)
            // Need to call setup again after moving?

            // Resume playback if moving stopped it.
            if (!wasPaused && this.isPaused()) {
                this.playMedia();
            }
        }
        this.refreshControls();
    };

    handleFullscreenToggle () {
        var stillPaused = this.isPaused(); //add boolean variable reading return from isPaused function
        this.setFullscreen(!this.isFullscreen());
        if (stillPaused) {
            this.pauseMedia(); // when toggling fullscreen and media is just paused, keep media paused.
        } else if (!stillPaused) {
            this.playMedia(); // when toggling fullscreen and media is playing, continue playing.
        }
    };

    handleTranscriptLockToggle(val) {

        this.ablePlayer.autoScrollTranscript = val;
        this.ablePlayer.prefAutoScrollTranscript = +val;
        this.preference.updateCookie('prefAutoScrollTranscript');
        this.refreshControls();
    };

    showTooltip ($tooltip) {

        if (($tooltip).is(':animated')) {
            $tooltip.stop(true,true).show().delay(4000).fadeOut(1000);
        }
        else {
            $tooltip.stop().show().delay(4000).fadeOut(1000);
        }
    };

    showAlert(msg, location) {

        // location is either of the following:
        // 'main' (default)
        // 'screenreader
        // 'sign' (sign language window)
        // 'transcript' (trasncript window)
        var thisObj, $alertBox, $parentWindow, alertLeft, alertTop;

        thisObj = this;

        if (location === 'transcript') {
            $alertBox = this.ablePlayer.$transcriptAlert;
            $parentWindow = this.ablePlayer.$transcriptArea;
        } else if (location === 'sign') {
            $alertBox = this.ablePlayer.$signAlert;
            $parentWindow = this.ablePlayer.$signWindow;
        } else if (location === 'screenreader') {
            $alertBox = this.ablePlayer.$srAlertBox;
        } else {
            $alertBox = this.ablePlayer.$alertBox;
        }
        $alertBox.show();
        $alertBox.text(msg);
        if (location == 'transcript' || location === 'sign') {
            if ($parentWindow.width() > $alertBox.width()) {
                alertLeft = $parentWindow.width() / 2 - $alertBox.width() / 2;
            } else {
                // alert box is wider than its container. Position it far left and let it wrap
                alertLeft = 10;
            }
            if (location === 'sign') {
                // position alert in the lower third of the sign window (to avoid covering the signer)
                alertTop = ($parentWindow.height() / 3) * 2;
            } else if (location === 'transcript') {
                // position alert just beneath the toolbar to avoid getting lost among transcript text
                alertTop = this.ablePlayer.$transcriptToolbar.height() + 30;
            }
            $alertBox.css({
                top: alertTop + 'px',
                left: alertLeft + 'px'
            });
        } else if (location !== 'screenreader') {
            // The original formula incorporated offset() into the calculation
            // but at some point this began resulting in an alert that's off-centered
            // Changed in v2.2.17, but here's the original for reference in case needed:
            // left: this.$playerDiv.offset().left + (this.$playerDiv.width() / 2) - ($alertBox.width() / 2)
            $alertBox.css({
                left: (this.ablePlayer.$playerDiv.width() / 2) - ($alertBox.width() / 2)
            });
        }
        if (location !== 'screenreader') {
            setTimeout(function () {
                $alertBox.fadeOut(300);
            }, 3000);
        }
    };

    // returns true if the target alert has already been shown
    // useful for throttling alerts that only need to be shown once
    // e.g., move alerts with instructions for dragging a window
    showedAlert(which) {
        if (which === 'transcript') {
            if (this.ablePlayer.showedTranscriptAlert) {
                return true;
            } else {
                return false;
            }
        } else if (which === 'sign') {
            if (this.ablePlayer.showedSignAlert) {
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    // Resizes all relevant basePlayer attributes.
    resizePlayer(width, height) {

        var captionSizeOkMin, captionSizeOkMax, captionSize, newCaptionSize, newLineHeight;
        if (this.ablePlayer.fullscreen) { // replace isFullscreen() with a Boolean. see function for explanation
            if (typeof this.ablePlayer.$vidcapContainer !== 'undefined') {
                this.ablePlayer.$ableWrapper.css({
                    'width': width + 'px',
                    'max-width': ''
                })
                this.ablePlayer.$vidcapContainer.css({
                    'height': height + 'px',
                    'width': width
                });
                this.ablePlayer.$media.css({
                    'height': height + 'px',
                    'width': width
                })
            }
            if (typeof this.ablePlayer.$transcriptArea !== 'undefined') {
                this.retrieveOffscreenWindow('transcript',width,height);
            }
            if (typeof this.ablePlayer.$signWindow !== 'undefined') {
                this.retrieveOffscreenWindow('sign',width,height);
            }
        }
        else {
            // basePlayer resized
            if (this.ablePlayer.restoringAfterFullScreen) {
                // User has just exited fullscreen mode. Restore to previous settings
                width = this.ablePlayer.preFullScreenWidth;
                height = this.ablePlayer.preFullScreenHeight;
                this.ablePlayer.restoringAfterFullScreen = false;
                this.ablePlayer.$ableWrapper.css({
                    'max-width': width + 'px',
                    'width': ''
                });
                if (typeof this.ablePlayer.$vidcapContainer !== 'undefined') {
                    this.ablePlayer.$vidcapContainer.css({
                        'height': '',
                        'width': ''
                    });
                }
                this.ablePlayer.$media.css({
                    'width': '100%',
                    'height': 'auto'
                });

                 if (this.ablePlayer.preference.getCookie()['preferences']['prefModeUsage'] != 'profDef') {
                    //TODO be carefull of no regression here
                    //$('.controller-orange-main').attr('style','display:block');
                    this.resizeAccessMenu();
                }

                //$('.able-controller').attr('style','display:none');
                this.ablePlayer.$bigPlayButton.width(this.ablePlayer.$mediaContainer.width());
                this.ablePlayer.$bigPlayButton.height(this.ablePlayer.$mediaContainer.height());
            }
        }

        if (this.ablePlayer.player === 'youtube' && this.ablePlayer.youTubePlayer) {
            this.ablePlayer.youTubePlayer.setSize(width, height);
        } else if (this.ablePlayer.player === 'jw' && this.ablePlayer.jwPlayer) {
            if (this.ablePlayer.mediaType === 'audio') {
                // keep height set to 0 to prevent JW PLayer from showing its own player
                this.ablePlayer.jwPlayer.resize(width, 0);
            } else {
                this.ablePlayer.jwPlayer.resize(width, jwHeight);
            }
        }


        // Resize captions
        if (typeof this.ablePlayer.$captionsDiv !== 'undefined') {
            captionSizeOkMin = 400;
            captionSizeOkMax = 1000;
            captionSize = parseInt(this.ablePlayer.prefCaptionsSize,10);

            if (width > captionSizeOkMax) {
                newCaptionSize = captionSize * 1.5;
            }
            else if (width < captionSizeOkMin) {
                newCaptionSize = captionSize / 1.5;
            }
            else {
                newCaptionSize = captionSize;
            }
            newLineHeight = newCaptionSize + 25;
            this.ablePlayer.$captionsDiv.css('font-size',newCaptionSize + '%');
            this.ablePlayer.$captionsWrapper.css('line-height',newLineHeight + '%');
        }
        this.refreshControls();
        this.resizeAccessMenu();
        this.checkContextVidTranscr();
    };

    //resize AccessibilityMenu button
    resizeAccessMenu() {
        console.log("resizeAccessMenu ");
        //console.log(this.$ableWrapper.width());
        //console.log(this.$playerDiv);
        this.ablePlayer.$playerDiv.css('width', (this.ablePlayer.$ableWrapper.width()) + 'px');
        if (this.ablePlayer.$captionsWrapper != undefined) {
            this.ablePlayer.$captionsWrapper.css('width', (this.ablePlayer.$ableWrapper.width() - 0.5) + 'px');
        }
        this.ablePlayer.$descDiv.css('width', (this.ablePlayer.$ableWrapper.width() - 0.5) + 'px');

        var maxSpanSize = $($('.menuButton').find('span').get(0)).width();
        var maxButtonSize = $('.menuButton').get(0).offsetWidth;
        //console.log($('.menuButton').length+" / "+maxSpanSize);
        for (var i = 0; i < $('.menuButton').length; i++) {
            var widthOfEl = $($('.menuButton').find('span').get(i)).width();
            if (widthOfEl >= maxSpanSize && widthOfEl != 0) {
                maxSpanSize = widthOfEl;
                //console.log($('.menuButton').find('span').get(i).offsetWidth);
            }
            if ($('.menuButton').get(i).offsetWidth >= maxButtonSize) {
                maxButtonSize = $('.menuButton').get(i).offsetWidth;
            }
        }
        //if((100*maxSpanSize)/$('.menuButton').get(0).offsetWidth > 75 || maxSpanSize == 0){
        if ((100 * maxSpanSize) / maxButtonSize > 75 || maxSpanSize == 0) {
            //console.log("MaxSpan size crack = "+maxSpanSize);
            var n = 0;
            if ($($('.menuButton').get(n)).width() != undefined) {
                while ($('.menuButton').get(n) != undefined && $($('.menuButton').get(n)).width() == 0) {
                    n++;
                }
                if ($('.menuButton').get(n) != undefined) {
                    //maxSpanSize = $('.menuButton').get(n).offsetWidth * 0.75;
                    maxSpanSize = $($('.menuButton').get(n)).width() * 0.75;
                }
            }
        } else {
            console.log("MaxSpan ELSE = " + maxSpanSize);
            var n = 0;
            for (var n = 0; n < $('.menuButton').find('span').length; n++) {
                if ($($('.menuButton').find('span').get(n)).width() != undefined) {
                    if ($('.menuButton').find('span').get(n) != undefined && $('.menuButton').find('span').get(n) != 0 && $($('.menuButton').find('span').get(n)).width() > maxSpanSize) {
                        maxSpanSize = $($('.menuButton').find('span').get(n)).width();
                        console.log("MaxSpan boucle = " + maxSpanSize);
                    }
                }
            }
        }
        $('.menuButton').find('svg').css('margin-left', ((maxButtonSize - maxSpanSize) / 2) - 30 + 'px');
        $('.menuButton').find('i').css('margin-right', ((maxButtonSize - maxSpanSize) / 2) - 30 + 'px');
        //$('.menuButton').find('i').css('margin-right',(100-space/2)+"%");
        if (maxButtonSize < 350) {
            //$('.menuButton').find('i').css('display','none');
            //$('.menuButton').find('span').css('margin-left','-25%');
        } else {
            //$('.menuButton').find('i').css('display','inline-block');
            // $('.menuButton').find('span').css('margin-left','');
            // $('#spanPlay').css('margin-left','-25%');
            // $('#spanFull').css('margin-left','-25%');
        }
        if (maxButtonSize < 230) {
            $('.menuButton').find('i').css('margin-right', '0px');
            for (var i = 0; i <= 16; i++) {
                if (i != 11 && i != 5) {
                    var item1 = $('.menuButton').find('span').get(i);
                    item1.style.display = 'none';
                    var item1 = $('.menuButton').find('svg').get(i);
                    item1.style.float = 'none';
                    //$('.menuButton').find('span').find(item1).css('display','none');
                }

            }
            $('#copy-rewind').find('span').css('display', 'none');
            $('#copy-forward').find('span').css('display', 'none');
        } else {
            for (var i = 0; i <= 16; i++) {
                if (i != 11 && i != 5) {
                    var item1 = $('.menuButton').find('svg').get(i);
                    item1.style.float = 'left';
                    //$('.menuButton').find('span').find(item1).css('display','none');
                }
            }
            $('.menuButton').find('span').css('display', 'inline-block');
            $('#copy-rewind').find('span').css('display', 'inline-block');
            $('#copy-forward').find('span').css('display', 'inline-block');
        }

    }

    checkContextVidTranscr () {
        console.log('checkContextVidTranscr, media height ' + this.ablePlayer.$mediaContainer.height());
        console.log(this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu']);
        //check the context and place windows into the context
        //check when captions and audiodesc are present too
        //context 1 : On a pas de vidéo signé ni de transcription ni de menu accessible : 100% largeur pour menu et la vidéo
        if (this.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 0 && this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 0 && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] == 'false') {
            console.log('contexte 1');
            //remove transcr
            this.$playerDiv.css('position', '');
            $('#transcr').attr('aria-checked', 'false');
            $('#transcr').attr('aria-label', thi.ablePlayers.tt.transcract);
            $('#transcr').removeClass('aria-no-checked');
            $('#transcr').children('svg').children('line').css('display', 'block');
            if ($('#transcr').children('span').text() != this.ablePlayer.tt.transcract) {
                $('#transcr').children('span').text(this.ablePlayer.tt.transcract);
            }
            $('#transcr').removeClass('transcrno');
            if (this.isFullscreen()) {
                console.log('contexte 1 fullscreen');
                this.ablePlayer.$mediaContainer.find('video').css('width', '100%');
                //this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height'));
                this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$vidcapContainer.css('height'));
                this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$vidcapContainer.css('height'));
            } else {
                console.log('contexte 1 exit fullscreen');
                this.$mediaContainer.find('video').css('width', '100%');
                console.log('contexte 1 exit fullscreen -W height mediaContainer :' + this.$mediaContainer.find('video').css('height'));
                this.$mediaContainer.css('min-height', this.$mediaContainer.find('video').css('height'));
                this.$mediaContainer.css('height', this.$mediaContainer.find('video').css('height'));
            }

        }
        //contexte 2 : On a le menu de préférence et une seule vidéo
        if (this.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 0 && this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 0 && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] == 'true') {
            console.log('contexte 2');
            //remove transcr
            this.ablePlayer.$playerDiv.css('position', '');
            $('#transcr').attr('aria-checked', 'false');
            $('#transcr').attr('aria-label', this.ablePlayer.tt.transcract);
            $('#transcr').removeClass('aria-no-checked');
            $('#transcr').children('svg').children('line').css('display', 'block');
            if ($('#transcr').children('span').text() != this.ablePlayer.tt.transcract) {
                $('#transcr').children('span').text(this.ablePlayer.tt.transcract);
            }
            $('#transcr').removeClass('transcrno');
            //remove LSF
            this.ablePlayer.$ableDiv.css('width', '100%');
            this.ablePlayer.$playerDiv.css('width', (this.ablePlayer.$ableWrapper.width()) + 'px');
            if (this.isFullscreen()) {
                console.log('contexte 2 fullscreen');
                console.log(this.ablePlayer.$playerDiv);
                this.ablePlayer.$mediaContainer.find('video').css('width', '100%');
                //this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height'));
                this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$vidcapContainer.css('height'));
                this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$vidcapContainer.css('height'));
            } else {
                console.log('contexte 2 exit fullscreen');
                this.ablePlayer.$mediaContainer.find('video').css('width', '100%');
                console.log('contexte 2 exit fullscreen -W height mediaContainer :' + this.ablePlayer.$mediaContainer.find('video').css('height'));
                this.ablePlayer.$mediaContainer.css('min-height', this.ablePlayer.$mediaContainer.find('video').css('height'));
                this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$mediaContainer.find('video').css('height'));
            }
        }
        //contexte 3 : On a la vidéo LSF et le menu accessible
        if (this.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 1 && this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 0 && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] == 'true') {
            console.log('contexte 3');
            //remove transcr and set LSF
            this.ablePlayer.$playerDiv.css('position', '');
            $('#transcr').attr('aria-checked', 'false');
            $('#transcr').attr('aria-label', this.ablePlayer.tt.transcract);
            $('#transcr').removeClass('aria-no-checked');
            $('#transcr').children('svg').children('line').css('display', 'block');
            if ($('#transcr').children('span').text() != this.ablePlayer.tt.transcract) {
                $('#transcr').children('span').text(this.ablePlayer.tt.transcract);
            }
            $('#transcr').removeClass('transcrno');
            //set LSF
            this.ablePlayer.$playerDiv.css('width', (this.ablePlayer.$ableWrapper.width()) + 'px');

            //add 04/10/2020
            console.log('injectSignPlayerCode in contexte 3');
            this.ablePlayer.positionDraggableWindow('sign', this.ablePlayer.getDefaultWidth('sign'));
            //this.$ableDiv.css('width','67%');
            this.ablePlayer.$ableDiv.css('width', (100 - this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
            //this.$signWindow.css('width','33%');
            this.ablePlayer.$signWindow.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
            //this.$signWindow.css('left','66%');
            this.ablePlayer.$signWindow.css('left', (100 - this.ablePlayer.preference.getCookie()['preferences']['prefVidSize']) + '%');
            this.ablePlayer.$signWindow.css('position', 'absolute');
            this.ablePlayer.$signWindow.css('top', '0px');
            this.ablePlayer.$signWindow.css('margin', '0px');
            // //put video sign in the first container
            // var svgVideoSrc = this.$mediaContainer.find('video').find('source')[0].src;
            // this.$mediaContainer.find('video').find('source')[0].src = this.$sources.first().attr('data-sign-src');
            // this.$mediaContainer.find('video')[0].load();
            // //put video in the second containre
            // this.$signWindow.find('video').find('source')[0].src = svgVideoSrc;
            // this.$signWindow.find('video')[0].load();
            // this.$signWindow.find('video')[0].muted = true;
            // this.$mediaContainer.find('video')[0].muted = true;

            this.ablePlayer.$mediaContainer.css('background-color', 'lightgray');
            this.ablePlayer.$buttonSoundMute.attr('aria-pressed', 'false');
            this.ablePlayer.$buttonSoundMute.attr('aria-label', this.tt.mute);
            this.ablePlayer.$buttonSoundMute.addClass('aria-no-checked');
            this.ablePlayer.$buttonHideVol.text('');
            this.ablePlayer.$buttonHideVol.append("<i class=\"arrow left\"></i><span id=\"\">" + this.tt.volume + " " + (parseInt(this.volume) / 10 * 100) + "%</span>");
            this.ablePlayer.$buttonSoundMute.text('');
            this.ablePlayer.$buttonSoundMute.addClass('vmuteno')
            this.ablePlayer.$buttonSoundMute.append("<svg style='float:left;margin-left:25%' viewBox='0 0 20 20'><path d='M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z'</path></svg><span style='margin-left:-25%'> " + this.tt.mute + "</span>");


            for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                var vidId = document.getElementsByClassName("video-accessible")[q].id;
                document.getElementsByClassName("video-accessible")[q].addEventListener('loadeddata', function () {
                    //document.getElementById(vidId+"-sign").style.maxHeight = document.getElementById(vidId).offsetHeight+"px";
                    document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                    document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                    console.log("for sign");
                    console.log(document.getElementById(vidId + "-sign").style.height);
                    document.getElementById(vidId + "-sign").addEventListener('ended', function () {
                        document.getElementById(vidId + "-sign").load();
                    });
                }, false);
            }


            if (this.isFullscreen()) {//change to adapt to this specific condition
                console.log('contexte 3 fullscreen');
                //this.$mediaContainer.css('min-height',this.$mediaContainer.css('height'));

                this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$vidcapContainer.css('height'));
                this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$vidcapContainer.css('height'));

                this.ablePlayer.$mediaContainer.find('video').css('width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                //this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                this.ablePlayer.$mediaContainer.css('width', 'width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                this.ablePlayer.$mediaContainer.find('video').css('width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                this.ablePlayer.$signWindow.find('video').css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                this.ablePlayer.$signWindow.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                this.ablePlayer.$bigPlayButton.css('width', 'width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                this.ablePlayer.$signWindow.find('.able-resizable').css('display', 'none');
                this.ablePlayer.$signWindow.find('.able-button-handler-preferences').css('display', 'none');
            } else {
                console.log('contexte 3 EXIT fullscreen');

                if (this.ablePlayer.$mediaContainer.css('min-height').split('px')[0] > 0) {
                    console.log('exit 1');
                    this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                    this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                    this.ablePlayer.$signWindow.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                    this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.css('height'));
                    this.ablePlayer.$signWindow.find('.able-resizable').css('display', 'block');
                    this.ablePlayer.$signWindow.find('.able-button-handler-preferences').css('display', 'block');
                }
                for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                    console.log('contexte end media height :' + this.ablePlayer.$mediaContainer.height());
                    var vidId = document.getElementsByClassName("video-accessible")[q].id;
                    document.getElementById(vidId).style.width = this.ablePlayer.$mediaContainer.width() + "px";
                    console.log(this.ablePlayer.$mediaContainer.width() + ' et media hauteur ' + this.ablePlayer.$mediaContainer.height());
                    document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                    document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                }

                //this.$controllerDiv.css('display','block');
            }

            //this.refreshControls();
        }
        //contexte 4 : On a la transcription et le menu accessible
        if (this.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 0 && this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 1 && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] == 'true') {
            console.log('contexte 4');
            //update transcript button to be activated
            $('#transcr').attr('aria-checked', 'true');
            $('#transcr').attr('aria-label', this.tt.transcrno);
            $('#transcr').addClass('aria-no-checked');
            $('#transcr').children('svg').children('line').css('display', 'none');
            $('#transcr').children('span').text(this.tt.transcrno);
            $('#transcr').addClass('transcrno');
            //update transcript to show it on right off video if vertical
            if (this.ablePlayer.preference.getCookie()['preferences']['prefTranscriptOrientation'] == 'vertical') {
                this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'block');
                this.ablePlayer.$ableDiv.css('width', 100 - parseInt(this.ablePlayer.preference.getCookie()['preferences']['prefTrSize']) + '%');
                this.ablePlayer.$transcriptArea.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                this.ablePlayer.$transcriptArea.css('left', 100 - parseInt(this.ablePlayer.preference.getCookie()['preferences']['prefTrSize']) + '%');
                var heightTranscriptArea = this.ablePlayer.$mediaContainer.css('height').split("px")[0] - this.ablePlayer.$transcriptToolbar.css('min-height').split("px")[0];
                //this.$transcriptArea.css('height',heightTranscriptArea+'px');
                this.resizeAccessMenu();
                this.ablePlayer.$transcriptArea.css('position', 'absolute');
                this.ablePlayer.$transcriptArea.css('top', '0px');
                if (this.ablePlayer.$transcriptArea[0].offsetWidth < 500) {
                    this.ablePlayer.$transcriptToolbar.css('min-height', '28px');
                }
                this.ablePlayer.$transcriptArea.css('height', (heightTranscriptArea + parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + 'px'));
                this.ablePlayer.$transcriptDiv.css('height', heightTranscriptArea + 'px');
                this.ablePlayer.$playerDiv.css('width', this.ablePlayer.$ableWrapper.width() + 'px');
                this.ablePlayer.$playerDiv.css('top', '0px');
                this.ablePlayer.$playerDiv.css('position', '');
                if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                    this.ablePlayer.$captionsWrapper.css('bottom', '');
                }

                //if fullscreen and transcript is vertical
                if (this.isFullscreen()) {
                    console.log('contexte 4 fullscreen vertical');
                    console.log(this.ablePlayer.$mediaContainer.css('min-height'));
                    //this.$mediaContainer.css('min-height',this.$mediaContainer.css('height'));
                    this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$vidcapContainer.css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                    this.ablePlayer.$mediaContainer.css('width', 'width', 100 - this.getCookie()['preferences']['prefTrSize'] + '%');
                    this.ablePlayer.$mediaContainer.find('video').css('width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                    this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$vidcapContainer.css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");
                    this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$vidcapContainer.css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");
                    this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$vidcapContainer.css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                    this.ablePlayer.$transcriptArea.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                    this.ablePlayer.$transcriptArea.css('left', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                    //this.$playerDiv.css('width',this.$ableWrapper.width()+'px');
                    this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                    this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'none');
                    this.ablePlayer.$bigPlayButton.css('width', 'width', this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                    this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$vidcapContainer.css('height').split('px')[0] + "px");
                    console.log(this.ablePlayer.$transcriptArea.find('.able-resizable'));
                    console.log(this.ablePlayer.$transcriptArea);
                    console.log(this.ablePlayer.$mediaContainer);
                } else {
                    if (this.ablePlayer.$mediaContainer.css('min-height').split('px')[0] > 0) {
                        this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                        this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                        this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                        this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.css('min-height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + 'px');
                        this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'block');
                        this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'block');
                    }
                    for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                        console.log('contexte end media height :' + this.ablePlayer.$mediaContainer.height());
                        var vidId = document.getElementsByClassName("video-accessible")[q].id;
                        document.getElementById(vidId).style.width = this.ablePlayer.$mediaContainer.width() + "px";
                        console.log(this.ablePlayer.$mediaContainer.width() + ' et media hauteur ' + this.ablePlayer.$mediaContainer.height());
                        document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                        document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                    }
                    // //this.$transcriptArea.css('width',this.getCookie()['preferences']['prefVidSize']+'%');
                    // this.$mediaContainer.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]);
                    // this.$mediaContainer.find('video').css('height',this.$mediaContainer.css('height'));
                    // this.$bigPlayButton.css('height',this.$mediaContainer.css('height'));
                    //this.$mediaContainer.css('height','auto');
                    //this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");

                    console.log(this.ablePlayer.$mediaContainer.find('video').css('height'));
                }


            } else {//horizontal
                console.log('contexte 6 horizontal');
                console.log(this.ablePlayer.$transcriptArea.height() + ' tr area height');
                var initTRheight = this.ablePlayer.$transcriptArea.height();
                var initTRheightDiv = this.ablePlayer.$transcriptDiv.height();
                var takePadding = 0;
                if (parseInt(this.ablePlayer.$signToolbar.css('padding').replace('px', ''))) {
                    takePadding = parseInt(this.ablePlayer.$signToolbar.css('padding').replace('px', ''));
                }
                var topOfTranscriptArea = this.ablePlayer.$mediaContainer.height();
                var isCaptionVisible = false;
                if (this.ablePlayer.captionsPopup != undefined) {
                    isCaptionVisible = this.ablePlayer.captionsPopup.is(':visible');
                }
                if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                    topOfTranscriptArea += this.ablePlayer.$captionsWrapper.height();
                }
                console.log('check descDiv 1 : ' + this.ablePlayer.descOn + ' ' + this.ablePlayer.$descDiv.is(':visible') + ' ' + this.ablePlayer.preference.getCookie()['preferences']['prefDesc']);
                if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                    console.log('add descDiv 1 cap: ' + this.ablePlayer.$descDiv.height());
                    //topOfTranscriptArea += parseFloat(this.$descDiv.css('height').split('px')[0]);
                }
                this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                this.ablePlayer.$transcriptArea.css('top', topOfTranscriptArea + 'px');
                this.ablePlayer.$transcriptArea.css('left', '0%');
                this.ablePlayer.$transcriptArea.css('width', this.ablePlayer.$ableWrapper.width() + 'px');
                if (this.ablePlayer.$transcriptArea[0].offsetWidth < 500) {
                    this.ablePlayer.$transcriptToolbar.css('min-height', '28px');
                }

                this.ablePlayer.$transcriptArea.css('height', (parseInt(this.ablePlayer.$playerDiv.css('top').split('px')[0]) + parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.ablePlayer.$mediaContainer.height())) + 'px');
                this.ablePlayer.$transcriptDiv.css('height', (parseInt(this.ablePlayer.$playerDiv.css('top').split('px')[0]) - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.ablePlayer.$mediaContainer.height())) + 'px');
                console.log('if ? ' + this.$playerDiv.css('top').split('px')[0]);
                if (this.ablePlayer.$playerDiv.css('top').split('px')[0] == 0 || this.ablePlayer.$playerDiv.css('top').split('px')[0] == 'auto') {
                    this.ablePlayer.$transcriptArea.css('height', parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + parseInt(this.ablePlayer.$mediaContainer.height()) + 'px');
                    this.ablePlayer.$transcriptDiv.css('height', (parseInt(this.ablePlayer.$mediaContainer.height()) - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0])) + 'px');
                }
                var topOfPlayerDiv = 0;
                this.ablePlayer.$transcriptArea.height(initTRheight);
                this.ablePlayer.$transcriptDiv.height(initTRheightDiv);
                var topOfPlayerDiv = this.ablePlayer.$mediaContainer.height() + this.ablePlayer.$transcriptArea.height();//+this.$controllerDiv.height();
                console.log(this.ablePlayer.$transcriptArea.height() + ' tr area height');
                console.log(topOfPlayerDiv + ' topOfPlayerDiv');
                if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                    console.log('cap ON and VISIBLE');
                    this.ablePlayer.$captionsWrapper.css('bottom', '');
                    topOfPlayerDiv += this.ablePlayer.$captionsWrapper.height();//+this.$controllerDiv.height();
                }
                if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                    this.ablePlayer.$descDiv.css('bottom', '');
                    this.$captionsWrapper.css('bottom', '');
                    console.log('add descDiv 2 : ' + this.ablePlayer.$captionsWrapper.height());
                    topOfPlayerDiv += this.ablePlayer.$descDiv.css('height').split('px')[0];
                    console.log('add descDiv 2 ?? : ' + this.ablePlayer.$transcriptDiv.css('height').split('px')[0]);
                }
                this.ablePlayer.$ableDiv.css('width', '100%');
                this.ablePlayer.$playerDiv.css('top', topOfPlayerDiv + 'px');
                this.ablePlayer.$playerDiv.css('position', 'absolute');
                this.ablePlayer.$playerDiv.css('width', this.ablePlayer.$ableWrapper.width() + 'px');

                if (this.isFullscreen()) {//Horizontal and fullscreen
                    console.log('contexte 4 fullscreen horizontal'); //On va diviser par 2 la hauteur et les afficher l'un en dessous de l'autre
                    console.log(this.ablePlayer.$vidcapContainer.css('height'));

                    this.ablePlayer.$mediaContainer.css('height', (this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0]) / 2 + "px");
                    this.ablePlayer.$mediaContainer.find('video').css('height', (this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0]) / 2 + "px");
                    if (this.ablePlayer.$mediaContainer.height() < (this.ablePlayer.$vidcapContainer.height() / 2)) {
                        console.log('contexte 4 fullscreen HERE');
                        this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$vidcapContainer.height() / 2);
                        this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$vidcapContainer.height() / 2);
                    }
                    if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                        console.log('captionsOn');
                        // if(this.descOn === true && this.$descDiv.is(':visible')){
                        //   console.log('add descDiv 3');
                        //   this.$transcriptDiv.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        //   this.$transcriptArea.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                        //   this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                        //   this.$captionsWrapper.css('bottom',this.$controllerDiv.css('min-height'));
                        //   this.$descDiv.css('padding','0');
                        // } else {
                        console.log('add descDiv 3 else ');
                        this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$vidcapContainer.height() / 2 - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$vidcapContainer.height() / 2 - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                        //}
                    } else {
                        console.log('captionsOFF');
                        // if(this.descOn === true && this.$descDiv.is(':visible')){
                        //   console.log('add descDiv 4 '+this.$descDiv.css('height').split('px')[0]);
                        //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$controllerDiv.height()+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-this.$controllerDiv.height()+"px");
                        //   this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                        //   this.$descDiv.css('padding','0');
                        // } else {
                        console.log('add descDiv 5');
                        this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]));//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0]);
                        //}
                    }
                    this.ablePlayer.$transcriptArea.css('top', this.ablePlayer.$mediaContainer.css('height'));

                    this.ablePlayer.$playerDiv.css('top', '');
                    //this.$transcriptArea.css('width',this.getCookie()['preferences']['prefTrSize']+'%');
                    //this.$transcriptArea.css('left',100-this.getCookie()['preferences']['prefTrSize']+'%');
                    this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                    this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'none');
                    this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.css('height'));
                } else {
                    if (this.ablePlayer.$mediaContainer.css('min-height').split('px')[0] > 0) {
                        this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                        this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                        //var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0])+parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                        //this.$transcriptArea.css('top',topTrArea+'px');

                        if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                            // if(this.descOn === true && this.$descDiv.is(':visible')){
                            //   console.log('add descDiv 6');
                            //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                            //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                            //   topTrArea += parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                            //   this.$transcriptArea.css('top',topTrArea+'px');
                            //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                            //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]+"px");
                            // } else {
                            console.log('add descDiv 6 else ' + parseInt(this.ablePlayer.$mediaContainer.css('height').split('px')[0]) + '   ' + parseInt(this.ablePlayer.$captionsWrapper.css('height').split('px')[0]));
                            var topTrArea = parseInt(this.ablePlayer.$mediaContainer.css('height').split('px')[0]) + parseInt(this.ablePlayer.$captionsWrapper.css('height').split('px')[0]);
                            this.ablePlayer.$transcriptArea.css('top', topTrArea + 'px');
                            this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                            this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                            //}
                        } else {
                            // if(this.descOn === true && this.$descDiv.is(':visible')){
                            //   console.log('add descDiv 7');
                            //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                            //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                            //   this.$transcriptArea.css('top',topTrArea+'px');
                            //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                            //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");

                            // } else {
                            console.log('add descDiv 8');
                            var topTrArea = parseInt(this.ablePlayer.$mediaContainer.css('height').split('px')[0]);
                            this.ablePlayer.$transcriptArea.css('top', topTrArea + 'px');
                            this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                            this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] + "px");
                            //}
                        }

                        var topOfPlayerDiv = 0;

                        var topOfPlayerDiv = this.ablePlayer.$mediaContainer.height() + this.ablePlayer.$transcriptArea.height();//+this.$controllerDiv.height();
                        if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                            topOfPlayerDiv += this.ablePlayer.$captionsWrapper.height();//+this.$controllerDiv.height();
                        }
                        if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                            console.log('add descDiv 9');
                            //topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
                        }
                        this.ablePlayer.$ableDiv.css('width', '100%');
                        this.ablePlayer.$playerDiv.css('top', topOfPlayerDiv + 'px');
                        this.ablePlayer.$playerDiv.css('position', 'absolute');
                        this.ablePlayer.$playerDiv.css('width', this.ablePlayer.$ableWrapper.width() + 'px');

                        console.log('mask able resizabmle');
                        this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                        this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'block');
                    } else {
                        console.log("le cas spec est ici");
                        var topOfPlayerDiv = 0;

                        var topOfPlayerDiv = this.ablePlayer.$mediaContainer.height() + this.ablePlayer.$transcriptArea.height();//+this.$controllerDiv.height();
                        if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                            topOfPlayerDiv += this.ablePlayer.$captionsWrapper.height();//+this.$controllerDiv.height();
                        }
                        if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                            console.log('add descDiv 9');
                            //topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
                        }
                        this.ablePlayer.$ableDiv.css('width', '100%');
                        this.ablePlayer.$playerDiv.css('top', topOfPlayerDiv + 'px');
                        this.ablePlayer.$playerDiv.css('position', 'absolute');
                        this.ablePlayer.$playerDiv.css('width', this.ablePlayer.$ableWrapper.width() + 'px');

                        this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                        this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'block');
                    }
                }
            }


            //this.refreshControls();

        }
        //contexte 5 : On a tout
        if (this.ablePlayer.preference.getCookie()['preferences']['prefSign'] == 1 && this.ablePlayer.preference.getCookie()['preferences']['prefTranscript'] == 1 && this.ablePlayer.preference.getCookie()['preferences']['prefAccessMenu'] == 'true') {
            console.log('contexte 5');
            console.log(this.ablePlayer.$transcriptDiv);
            var initTRheight = this.ablePlayer.$transcriptArea.height();
            var initTRheightDiv = this.ablePlayer.$transcriptDiv.height();
            //update transcript button to be activated
            //update button transc in able toolbar
            $('#transcr').attr('aria-checked', 'true');
            $('#transcr').attr('aria-label', this.ablePlayer.tt.transcrno);
            $('#transcr').addClass('aria-no-checked');
            $('#transcr').children('svg').children('line').css('display', 'none');
            $('#transcr').children('span').text(this.ablePlayer.tt.transcrno);
            $('#transcr').addClass('transcrno');
            this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
            //update transcript to be under videos
            var takePadding = 0;
            if (parseInt(this.ablePlayer.$signToolbar.css('padding').replace('px', ''))) {
                takePadding = parseInt(this.ablePlayer.$signToolbar.css('padding').replace('px', ''));
            }
            console.log(this.ablePlayer.$mediaContainer.height() + this.ablePlayer.$transcriptArea.height() + 'px');
            console.log(this.ablePlayer.$transcriptArea.height());
            var topOfTranscriptArea = this.ablePlayer.$mediaContainer.height();
            var isCaptionVisible = false;
            if (this.ablePlayer.captionsPopup != undefined) {
                isCaptionVisible = this.ablePlayer.captionsPopup.is(':visible');
            }
            if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                console.log('add descDiv 1 5: ');
                //topOfTranscriptArea += this.$captionsWrapper.height();
            }
            console.log(this.ablePlayer.captionsOn);
            console.log(isCaptionVisible);
            if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                console.log('ok captions is here');
                console.log(this.ablePlayer.$captionsWrapper.height());
                console.log(this.ablePlayer.$mediaContainer.height());
                topOfTranscriptArea += this.ablePlayer.$captionsWrapper.height();
            }
            this.ablePlayer.$transcriptArea.css('top', topOfTranscriptArea + 'px');
            this.ablePlayer.$transcriptArea.css('left', '0%');
            this.ablePlayer.$transcriptArea.css('width', this.ablePlayer.$ableWrapper.width() + 'px');
            if (this.ablePlayer.$transcriptArea[0].offsetWidth < 500) {
                this.ablePlayer.$transcriptToolbar.css('min-height', '28px');
            }
            this.ablePlayer.$transcriptArea.css('height', (parseInt(this.ablePlayer.$playerDiv.css('top').split('px')[0]) + parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.ablePlayer.$mediaContainer.height())) + 'px');
            this.ablePlayer.$transcriptDiv.css('height', (parseInt(this.ablePlayer.$playerDiv.css('top').split('px')[0]) - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) - parseInt(this.ablePlayer.$mediaContainer.height())) + 'px');
            console.log('if ? ' + this.$playerDiv.css('top').split('px')[0]);
            if (this.ablePlayer.$playerDiv.css('top').split('px')[0] == 0 || this.ablePlayer.$playerDiv.css('top').split('px')[0] == 'auto') {
                this.ablePlayer.$transcriptArea.css('height', parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + parseInt(this.ablePlayer.$mediaContainer.height()) + 'px');
                this.ablePlayer.$transcriptDiv.css('height', (parseInt(this.ablePlayer.$mediaContainer.height()) - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0])) + 'px');
            }
            var topOfPlayerDiv = 0;

            this.$transcriptArea.height(initTRheight);
            this.$transcriptDiv.height(initTRheightDiv);
            var topOfPlayerDiv = this.ablePlayer.$mediaContainer.height() + this.ablePlayer.$transcriptArea.height();//+this.$controllerDiv.height();
            console.log(this.ablePlayer.$transcriptArea.height() + ' tr area height');
            //console.log(topOfPlayerDiv+' topOfPlayerDiv');
            if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                console.log('caption 5 ON');
                this.ablePlayer.$captionsWrapper.css('bottom', '');
                topOfPlayerDiv += this.ablePlayer.$captionsWrapper.height();//+this.$controllerDiv.height();
            }
            // if(this.descOn === true && this.$descDiv.is(':visible')){
            //   this.$descDiv.css('bottom','');
            //   this.$captionsWrapper.css('bottom','');
            //   console.log('add descDiv 2 : ');
            //   topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
            // }
            this.ablePlayer.$playerDiv.css('top', topOfPlayerDiv + 'px');
            this.ablePlayer.$playerDiv.css('position', 'absolute');
            this.ablePlayer.$playerDiv.css('width', this.ablePlayer.$ableWrapper.width() + 'px');

            if (this.isFullscreen()) {//fullscreen,
                console.log('contexte 5 fullscreen'); //On va diviser par 2 la hauteur et les afficher l'un en dessous de l'autre

                //this.$mediaContainer.css('min-height',this.$mediaContainer.css('height'));
                this.ablePlayer.$mediaContainer.css('height', (this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0]) / 2 + "px");
                this.ablePlayer.$mediaContainer.find('video').css('height', (this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0]) / 2 + "px");

                if (this.ablePlayer.$mediaContainer.height() < (this.ablePlayer.$vidcapContainer.height() / 2)) {
                    console.log('contexte 4 fullscreen HERE');
                    this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$vidcapContainer.height() / 2);
                    this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$vidcapContainer.height() / 2);
                }

                this.ablePlayer.$mediaContainer.css('width', 'width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                this.ablePlayer.$mediaContainer.find('video').css('width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');

                this.ablePlayer.$signWindow.find('video').css('height', (this.ablePlayer.$mediaContainer.css('height').split('px')[0]) + "px");
                this.ablePlayer.$signWindow.css('width', this.ablePlayer.preference.getCookie()['preferences']['prefVidSize'] + '%');
                if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                    // this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    // this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                    // if(this.descOn === true && this.$descDiv.is(':visible')){
                    //   console.log('add descDiv 3 if ');
                    //   this.$transcriptDiv.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    //   this.$transcriptArea.css('height',this.$mediaContainer.css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]+"px");
                    //   this.$descDiv.css('bottom',this.$controllerDiv.css('min-height'));
                    //   this.$captionsWrapper.css('bottom',this.$controllerDiv.css('min-height'));
                    //   this.$descDiv.css('padding','0');
                    //   console.log('add descDiv 3 '+this.$transcriptDiv.css('height'));
                    // } else {
                    console.log('add descDiv 3 else ' + (this.ablePlayer.$vidcapContainer.height() / 2) + " " + parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]));
                    this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$vidcapContainer.height() / 2 - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                    this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$vidcapContainer.height() / 2 - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                    //}
                } else {
                    // console.log(this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0]));
                    // this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//
                    // this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                    if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                        console.log('add descDiv 4 ' + this.$descDiv.css('height').split('px')[0]);
                        this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$descDiv.css('height').split('px')[0] - this.ablePlayer.$controllerDiv.height() + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$descDiv.css('height').split('px')[0] - this.ablePlayer.$controllerDiv.height() + "px");
                        this.ablePlayer.$descDiv.css('bottom', this.ablePlayer.$controllerDiv.css('min-height'));
                        this.ablePlayer.$descDiv.css('padding', '0');
                    } else {
                        console.log('add descDiv 5');
                        // this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        // this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                        this.ablePlayer.$transcriptDiv.css('height', (this.ablePlayer.$vidcapContainer.css('height').split('px')[0] / 2) - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        this.ablePlayer.$transcriptArea.css('height', (this.ablePlayer.$mediaContainer.css('height').split('px')[0] / 2) + "px");
                    }
                }
                this.ablePlayer.$transcriptArea.css('top', this.ablePlayer.$mediaContainer.css('height'));
                //this.$transcriptArea.css('width',this.getCookie()['preferences']['prefTrSize']+'%');
                //this.$transcriptArea.css('left',100-this.getCookie()['preferences']['prefTrSize']+'%');
                this.ablePlayer.$playerDiv.css('top', '');

                this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'none');
                this.ablePlayer.$signWindow.find('.able-resizable').css('display', 'none');
                this.ablePlayer.$signWindow.find('.able-button-handler-preferences').css('display', 'none');
                this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.find('video').css('height'));
            } else {
                if (this.ablePlayer.$mediaContainer.css('min-height').split('px')[0] > 0) {
                    this.ablePlayer.$mediaContainer.css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                    this.ablePlayer.$mediaContainer.find('video').css('height', this.ablePlayer.$mediaContainer.css('min-height'));
                    this.ablePlayer.$mediaContainer.find('video').css('width', 100 - this.ablePlayer.preference.getCookie()['preferences']['prefTrSize'] + '%');
                    if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                        //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0])+parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                        //   this.$transcriptArea.css('top',topTrArea+'px');
                        //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]+"px");
                        // } else {
                        //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                        //   this.$transcriptArea.css('top',topTrArea+'px');
                        //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");
                        // }
                        // if(this.descOn === true && this.$descDiv.is(':visible')){
                        //   console.log('add descDiv 6');
                        //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                        //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                        //   topTrArea += parseInt(this.$captionsWrapper.css('height').split('px')[0]);
                        //   this.$transcriptArea.css('top',topTrArea+'px');
                        //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-this.$captionsWrapper.css('height').split('px')[0]-this.$descDiv.css('height').split('px')[0]+"px");
                        // } else {
                        var topTrArea = parseInt(this.ablePlayer.$mediaContainer.css('height').split('px')[0]) + parseInt(this.ablePlayer.$captionsWrapper.css('height').split('px')[0]);
                        this.ablePlayer.$transcriptArea.css('top', topTrArea + 'px');
                        this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - this.ablePlayer.$captionsWrapper.css('height').split('px')[0] + "px");
                        //}
                    } else {
                        // if(this.descOn === true && this.$descDiv.is(':visible')){
                        //   console.log('add descDiv 7');
                        //   var topTrArea = parseInt(this.$mediaContainer.css('height').split('px')[0]);
                        //   topTrArea += parseInt(this.$descDiv.css('height').split('px')[0]);
                        //   this.$transcriptArea.css('top',topTrArea+'px');
                        //   this.$transcriptDiv.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])+"px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        //   this.$transcriptArea.css('height',this.$mediaContainer.find('video').css('height').split('px')[0]+"px");

                        // } else {
                        console.log('add descDiv 8');
                        var topTrArea = parseInt(this.ablePlayer.$mediaContainer.css('height').split('px')[0]);
                        this.ablePlayer.$transcriptArea.css('top', topTrArea + 'px');
                        this.ablePlayer.$transcriptDiv.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] - parseInt(this.ablePlayer.$transcriptToolbar.css('min-height').split('px')[0]) + "px");//-parseInt(this.$transcriptToolbar.css('min-height').split('px')[0])
                        this.ablePlayer.$transcriptArea.css('height', this.ablePlayer.$mediaContainer.find('video').css('height').split('px')[0] + "px");
                        //}
                    }


                    var topOfPlayerDiv = 0;

                    var topOfPlayerDiv = this.ablePlayer.$mediaContainer.height() + this.ablePlayer.$transcriptArea.height();//+this.$controllerDiv.height();
                    console.log(topOfPlayerDiv + ' topOfPlayerDiv');
                    if (this.ablePlayer.captionsOn === true || isCaptionVisible) {
                        topOfPlayerDiv += this.ablePlayer.$captionsWrapper.height();//+this.$controllerDiv.height();
                    }
                    console.log(this.ablePlayer.$captionsWrapper.height() + ' cap');
                    if (this.ablePlayer.descOn === true && this.ablePlayer.$descDiv.is(':visible')) {
                        //topOfPlayerDiv += parseFloat(this.$descDiv.css('height').split('px')[0]);
                    }

                    //this.$ableDiv.css('width','100%');
                    this.ablePlayer.$playerDiv.css('top', topOfPlayerDiv + 'px');
                    //this.$playerDiv.css('position','absolute');
                    //this.$playerDiv.css('width',this.$ableWrapper.width()+'px');

                    this.ablePlayer.$transcriptArea.find('.able-resizable').css('display', 'none');
                    this.ablePlayer.$transcriptArea.find('.able-button-handler-preferences').css('display', 'block');
                    this.ablePlayer.$signWindow.find('.able-resizable').css('display', 'block');
                    this.ablePlayer.$signWindow.find('.able-button-handler-preferences').css('display', 'block');
                    this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.find('video').css('height'));
                    this.ablePlayer.$bigPlayButton.css('width', this.ablePlayer.$mediaContainer.find('video').css('width'));
                }
            }


            //this.refreshControls();


        }
        //quelque soit le ocntexte, on vérifie la taille de la vidéo
        if (!this.isFullscreen()) {
            for (var q = 0; q < document.getElementsByClassName("video-accessible").length; q++) {
                console.log('contexte end media height :' + this.ablePlayer.$mediaContainer.height());
                var vidId = document.getElementsByClassName("video-accessible")[q].id;
                document.getElementById(vidId).style.width = this.ablePlayer.$mediaContainer.width() + "px";
                console.log(this.ablePlayer.$mediaContainer.width() + ' et media hauteur ' + this.ablePlayer.$mediaContainer.height());
                document.getElementById(vidId + "-sign").style.height = document.getElementById(vidId).offsetHeight + "px";
                document.getElementById(vidId + "-sign").style.backgroundColor = "black";
                console.log('contexte end 2 media height :' + this.ablePlayer.$mediaContainer.height());

            }
        }
        this.ablePlayer.$bigPlayButton.css('height', this.ablePlayer.$mediaContainer.find('video').css('height'));
        this.ablePlayer.$bigPlayButton.css('width', this.ablePlayer.$mediaContainer.find('video').css('width'));

    }

    // check to be sure popup windows ('transcript' or 'sign') are positioned on-screen
    retrieveOffscreenWindow( which, width, height ) {
        var window, windowPos, windowTop, windowLeft, windowRight, windowWidth, windowBottom, windowHeight;

        if (which == 'transcript') {
            window = this.ablePlayer.$transcriptArea;
        }
        else if (which == 'sign') {
            window = this.ablePlayer.$signWindow;
        }
        windowWidth = window.width();
        windowHeight = window.height();
        windowPos = window.position();
        windowTop = windowPos.top;
        windowLeft = windowPos.left;
        windowRight = windowLeft + windowWidth;
        windowBottom = windowTop + windowHeight;

        if (windowTop < 0) { // off-screen to the top
            windowTop = 10;
            window.css('top',windowTop);
        }
        if (windowLeft < 0) { // off-screen to the left
            windowLeft = 10;
            window.css('left',windowLeft);
        }
        if (windowRight > width) { // off-screen to the right
            windowLeft = (width - 20) - windowWidth;
            window.css('left',windowLeft);
        }
        if (windowBottom > height) { // off-screen to the bottom
            windowTop = (height - 10) - windowHeight;
            window.css('top',windowTop);
        }
    };

    // returns the highest z-index on page
    getHighestZIndex() {
        var max, $elements, z;
        max = 0;
        $elements = $('body *').not('.able-modal-dialog,.able-modal-dialog *,.able-modal-overlay,.able-modal-overlay *,.able-sign-window,.able-transcript-area');

        $elements.each(function(){
            z = $(this).css('z-index');
            if (Number.isInteger(+z)) { // work only with integer values, not 'auto'
                if (parseInt(z) > max) {
                    max = parseInt(z);
                }
            }
        });
        return max;
    };

    // update z-index of 'transcript' or 'sign', relative to each other
    updateZIndex (which) {
        var transcriptZ, signZ, newHighZ, newLowZ;

        if (typeof this.ablePlayer.$transcriptArea === 'undefined' || typeof this.ablePlayer.$signWindow === 'undefined') {
            // at least one of the windows doesn't exist, so there's no conflict
            return false;
        }
        console.log("updateZIndex");
        // get current values
        transcriptZ = parseInt(this.ablePlayer.$transcriptArea.css('z-index'));
        signZ = parseInt(this.ablePlayer.$signWindow.css('z-index'));
        console.log(signZ);
        console.log(transcriptZ);

        if (transcriptZ === signZ && transcriptZ < 9500) {
            // the two windows are equal; move the target window the top
            newHighZ = transcriptZ + 1000;
            newLowZ = transcriptZ;
        } else if (transcriptZ > signZ && transcriptZ < 9500) {
            if (which === 'transcript') {
                // transcript is already on top; nothing to do
                return false;
            } else {
                // swap z's
                newHighZ = transcriptZ;
                newLowZ = signZ;
            }
        } else { // signZ is greater
            if (which === 'sign') {
                return false;
            } else {
                newHighZ = signZ;
                newLowZ = transcriptZ;
            }

        }

        // now assign the new values
        if (which === 'transcript') {
            //this.$transcriptArea.css('z-index',newHighZ);
            this.ablePlayer.$transcriptArea.css('z-index', '0');
            this.ablePlayer.$signWindow.css('z-index', newLowZ);
        } else if (which === 'sign') {
            this.ablePlayer.$signWindow.css('z-index', newHighZ);
            this.ablePlayer.$transcriptArea.css('z-index', '0');
            //this.$transcriptArea.css('z-index',newLowZ);
        }
    };

    syncTrackLanguages (source, language) {
        var i, captions, descriptions, chapters, meta;

        // Captions
        for (i = 0; i < this.ablePlayer.captions.length; i++) {
            if (this.ablePlayer.captions[i].language === language) {
                captions = this.ablePlayer.captions[i];
            }
        }
        // Chapters
        for (i = 0; i < this.ablePlayer.chapters.length; i++) {
            if (this.ablePlayer.chapters[i].language === language) {
                chapters = this.ablePlayer.chapters[i];
            }
        }
        // Descriptions
        for (i = 0; i < this.ablePlayer.descriptions.length; i++) {
            if (this.ablePlayer.descriptions[i].language === language) {
                descriptions = this.ablePlayer.descriptions[i];
            }
        }
        // Metadata
        for (i = 0; i < this.ablePlayer.meta.length; i++) {
            if (this.ablePlayer.meta[i].language === language) {
                meta = this.ablePlayer.meta[i];
            }
        }
        // regardless of source...
        this.ablePlayer.transcriptLang = language;

        if (source === 'init' || source === 'captions') {
            this.ablePlayer.captionLang = language;
            this.ablePlayer.selectedCaptions = captions;
            this.ablePlayer.selectedChapters = chapters;
            this.ablePlayer.selectedDescriptions = descriptions;
            this.ablePlayer.selectedMeta = meta;
            this.ablePlayer.transcriptCaptions = captions;
            this.ablePlayer.transcriptChapters = chapters;
            this.ablePlayer.transcriptDescriptions = descriptions;
            this.ablePlayer.chapter.updateChaptersList();
            this.ablePlayer.setupPopups('chapters');
        }
        else if (source === 'transcript') {
            this.ablePlayer.transcriptCaptions = captions;
            this.ablePlayer.transcriptChapters = chapters;
            this.ablePlayer.transcriptDescriptions = descriptions;
        }
        this.ablePlayer.transcript.updateTranscript();
    };

    handleChangeProfil (profil) {
        console.log('handleChangeProfil : ' + profil);
        $('.able-button-handler-accmenu').focus();
        if (profil == 'vplus') {
            if (this.ablePlayer.prefAccessMenu == 'false') {
                this.ablePlayer.prefAccessMenu = "true";
                $('#' + this.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('true');
                this.ablePlayer.preference.updateCookie('prefAccessMenu');
                $('#acc-menu-id').click();
            }
            $('#visionPlus').click();
            $('#accmenu-0').closest('li').addClass("able-focus");
            $('#accmenu-1').closest('li').removeClass("able-focus");
            $('#accmenu-2').closest('li').removeClass("able-focus");
            $('#accmenu-3').closest('li').removeClass("able-focus");
            $('#accmenu-4').closest('li').removeClass("able-focus");
            $('#accmenu-5').closest('li').removeClass("able-focus");
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-0').prop('checked', true);
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-4').prop('checked', false);
            $('#accmenu-5').prop('checked', false);
        } else if (profil == 'audplus') {
            if (this.ablePlayer.prefAccessMenu == 'false') {
                this.ablePlayer.prefAccessMenu = "true";
                $('#' + this.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('true');
                this.ablePlayer.preference.updateCookie('prefAccessMenu');
                $('#acc-menu-id').click();
            }
            $('#auditionPlus').click();
            $('#accmenu-0').closest('li').removeClass("able-focus");
            $('#accmenu-1').closest('li').removeClass("able-focus");
            $('#accmenu-2').closest('li').removeClass("able-focus");
            $('#accmenu-3').closest('li').removeClass("able-focus");
            $('#accmenu-4').closest('li').addClass("able-focus");
            $('#accmenu-5').closest('li').addClass("able-focus");
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-0').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-5').prop('checked', false);
            $('#accmenu-4').prop('checked', true);
        } else if (profil == 'svplus') {
            if (this.ablePlayer.prefAccessMenu == 'false') {
                this.ablePlayer.prefAccessMenu = "true";
                $('#' + this.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('true');
                this.ablePlayer.preference.updateCookie('prefAccessMenu');
                $('#acc-menu-id').click();
            }
            $('#sansVisionPlus').click();
            $('#accmenu-0').closest('li').removeClass("able-focus");
            $('#accmenu-1').closest('li').addClass("able-focus");
            $('#accmenu-2').closest('li').removeClass("able-focus");
            $('#accmenu-3').closest('li').removeClass("able-focus");
            $('#accmenu-4').closest('li').removeClass("able-focus");
            $('#accmenu-5').closest('li').removeClass("able-focus");
            $('#accmenu-1').prop('checked', true);
            $('#accmenu-0').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-4').prop('checked', false);
            $('#accmenu-5').prop('checked', false);
        } else if (profil == 'lsfplus') {
            if (this.ablePlayer.prefAccessMenu == 'false') {
                this.ablePlayer.prefAccessMenu = "true";
                $('#' + this.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('true');
                this.ablePlayer.preference.updateCookie('prefAccessMenu');
                $('#acc-menu-id').click();
            }
            $('#lsfPlus').click();
            $('#accmenu-0').closest('li').removeClass("able-focus");
            $('#accmenu-1').closest('li').removeClass("able-focus");
            $('#accmenu-2').closest('li').addClass("able-focus");
            $('#accmenu-3').closest('li').removeClass("able-focus");
            $('#accmenu-4').closest('li').removeClass("able-focus");
            $('#accmenu-5').closest('li').removeClass("able-focus");
            $('#accmenu-2').prop('checked', true);
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-0').prop('checked', false);
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-4').prop('checked', false);
            $('#accmenu-5').prop('checked', false);
        } else if (profil == 'conplus') {
            if (this.ablePlayer.prefAccessMenu == 'false') {
                this.ablePlayer.prefAccessMenu = "true";
                $('#' + this.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('true');
                this.ablePlayer.preference.updateCookie('prefAccessMenu');
                $('#acc-menu-id').click();
            }
            $('#conPlus').click();
            $('#accmenu-0').closest('li').removeClass("able-focus");
            $('#accmenu-1').closest('li').removeClass("able-focus");
            $('#accmenu-2').closest('li').removeClass("able-focus");
            $('#accmenu-3').closest('li').addClass("able-focus");
            $('#accmenu-4').closest('li').removeClass("able-focus");
            $('#accmenu-5').closest('li').removeClass("able-focus");
            $('#accmenu-3').prop('checked', true);
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-0').prop('checked', false);
            $('#accmenu-4').prop('checked', false);
            $('#accmenu-5').prop('checked', false);
        } else if (profil == 'profdef') {
            // if(this.prefAccessMenu == 'false'){
            //   this.prefAccessMenu = "true";
            //   $('#' + this.mediaId + '_' + 'prefAccessMenu').val('true');
            //   this.updateCookie('prefAccessMenu');
            //   $('#acc-menu-id').click();
            // }
            $('#profDef').click();
            $('#accmenu-0').closest('li').removeClass("able-focus");
            $('#accmenu-1').closest('li').removeClass("able-focus");
            $('#accmenu-2').closest('li').removeClass("able-focus");
            $('#accmenu-3').closest('li').removeClass("able-focus");
            $('#accmenu-4').closest('li').removeClass("able-focus");
            $('#accmenu-5').closest('li').addClass("able-focus");
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-0').prop('checked', false);
            $('#accmenu-4').prop('checked', false);
            $('#accmenu-5').prop('checked', true);
        } else {
            this.ablePlayer.prefAccessMenu = "false";
            $('#' + this.ablePlayer.mediaId + '_' + 'prefAccessMenu').val('false');
            this.ablePlayer.preference.updateCookie('prefAccessMenu');
            $('#acc-menu-id').click();
            $('#accmenu-3').prop('checked', false);
            $('#accmenu-1').prop('checked', false);
            $('#accmenu-2').prop('checked', false);
            $('#accmenu-0').prop('checked', false);
            $('#accmenu-4').prop('checked', false);
            $('#accmenu-5').prop('checked', true);
            $('#accmenu-5').closest('li').addClass("able-focus");
        }
        this.checkContextVidTranscr();
    }

    /*handleSignToggle () {
        if (this.ablePlayer.$signWindow.is(':visible')) {
            this.ablePlayer.$signWindow.hide();
            this.ablePlayer.$signButton.addClass('buttonOff').attr('aria-label',this.ablePlayer.tt.showSign);
            this.ablePlayer.$signButton.find('span.able-clipped').text(this.ablePlayer.tt.showSign);
            this.prefSign = 0;
            this.ablePlayer.$signButton.focus().addClass('able-focus');
            setTimeout(() => {
                this.ablePlayer.closingSign = false;
            }, 100);
        }
        else {
            this.ablePlayer.positionDraggableWindow('sign');
            this.ablePlayer.$signWindow.show();
            this.ablePlayer.$signPopup.hide();
            this.ablePlayer.$signButton.removeClass('buttonOff').attr('aria-label',this.ablePlayer.tt.hideSign);
            this.ablePlayer.$signButton.find('span.able-clipped').text(this.ablePlayer.tt.hideSign);
            this.ablePlayer.prefSign = 1;
            this.ablePlayer.focusNotClick = true;
            this.ablePlayer.$signWindow.find('button').first().focus();
            setTimeout(() => {
                this.ablePlayer.focusNotClick = false;
            }, 100);
        }
        this.preference.updateCookie('prefSign');
    };

    handleTranscriptToggle () {
        if (this.ablePlayer.$transcriptDiv.is(':visible')) {
            this.ablePlayer.$transcriptArea.hide();
            this.ablePlayer.$transcriptButton.addClass('buttonOff').attr('aria-label',this.ablePlayer.tt.showTranscript);
            this.ablePlayer.$transcriptButton.find('span.able-clipped').text(this.ablePlayer.tt.showTranscript);
            this.ablePlayer.prefTranscript = 0;
            this.ablePlayer.$transcriptButton.focus().addClass('able-focus');
            setTimeout(() => {
                this.ablePlayer.closingTranscript = false;
            }, 100);
        }
        else {
            this.ablePlayer.positionDraggableWindow('transcript');
            this.ablePlayer.$transcriptArea.show();
            this.ablePlayer.$transcriptPopup.hide();
            this.ablePlayer.$transcriptButton.removeClass('buttonOff').attr('aria-label',this.ablePlayer.tt.hideTranscript);
            this.ablePlayer.$transcriptButton.find('span.able-clipped').text(this.ablePlayer.tt.hideTranscript);
            this.ablePlayer.prefTranscript = 1;
            this.ablePlayer.focusNotClick = true;
            this.ablePlayer.$transcriptArea.find('button').first().focus();
            setTimeout(() => {
                this.ablePlayer.focusNotClick = false;
            }, 100);
        }
        this.preference.updateCookie('prefTranscript');
    };*/

    //to delete
    /**
     * retourne la duree et le temps ecoulé en bon format
     * Returns an array with keys 'duration' and 'elapsed'
     * @param duration
     * @param elapsed
     * @returns Promise
     */
    async getMediaTimes (duration, elapsed) {
        var mediaTimes;
        mediaTimes = {};
        if (typeof duration !== 'undefined' && typeof elapsed !== 'undefined') {
            mediaTimes['duration'] = duration;
            mediaTimes['elapsed'] = elapsed;
            return mediaTimes;
        }
        else {
            let duration = await this.getDuration();
            mediaTimes['duration'] = Misc.roundDown(duration,6);
            let elapsed = await this.getElapsed();
            mediaTimes['elapsed'] = Misc.roundDown(elapsed,6);
        }
        return mediaTimes;
    };

    //to delete
    handlePrevTrack() {

        if (this.ablePlayer.playlistIndex === 0) {
            this.ablePlayer.playlistIndex = this.ablePlayer.$playlist.length - 1;
        }
        else {
            this.ablePlayer.playlistIndex--;
        }
        this.ablePlayer.cueingPlaylistItem = true;
        this.ablePlayer.cuePlaylistItem(this.ablePlayer.playlistIndex);
    };

    //to delete
    handleNextTrack () {

        if (this.ablePlayer.playlistIndex === this.ablePlayer.$playlist.length - 1) {
            this.ablePlayer.playlistIndex = 0;
        }
        else {
            this.ablePlayer.playlistIndex++;
        }
        this.ablePlayer.cueingPlaylistItem = true; // stopgap to prevent multiple firings
        this.ablePlayer.cuePlaylistItem(this.ablePlayer.playlistIndex);
    };

    //to delete
    invokeHideControlsTimeout () {
        this.ablePlayer.hideControlsTimeout = window.setTimeout(() => {
            if (typeof this.ablePlayer.playing !== 'undefined' && this.ablePlayer.playing === true && this.ablePlayer.hideControls) {
                this.ablePlayer.control.fadeControls('out');
                this.ablePlayer.controlsHidden = true;
            }
        },5000);
        this.ablePlayer.hideControlsTimeoutStatus = 'active';
    };





}