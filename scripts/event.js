(function () {
  // Media events
  AblePlayer.prototype.onMediaUpdateTime = function () {
    if (this.startTime && !this.startedPlaying) { 
      // try seeking again, if seeking failed on canplay or canplaythrough
      this.seekTo(this.startTime);
      this.playMedia();
    }       

    // show highlight in transcript 
    if (this.prefHighlight === 1) {
      this.highlightTranscript(this.getElapsed()); 
    }

    this.updateCaption();
    this.updateDescription();
    this.refreshControls();
  };

  AblePlayer.prototype.onMediaPause = function () {
    if (this.debug) { 
      console.log('media pause event');       
    }
  };

  AblePlayer.prototype.onMediaComplete = function () {
    // if there's a playlist, advance to next item and start playing  
    if (this.hasPlaylist) { 
      if (this.playlistIndex === (this.$playlist.length - 1)) { 
        // this is the last track in the playlist
        if (this.loop) { 
          this.playlistIndex = 0;              
          this.swapSource(0);
        }             
      }
      else { 
        // this is not the last track. Play the next one. 
        this.playlistIndex++;
        this.swapSource(this.playlistIndex)
      }
    }

    this.refreshControls();
  };

  AblePlayer.prototype.onMediaNewSourceLoad = function () {
    if (this.swappingSrc === true) { 
      // new source file has just been loaded 
      // should be able to play 
      
      if (this.player === 'jw') {
        var player = this.jwPlayer;
        // Seems to be a bug in JW player, where this doesn't work when fired immediately.
        // Thus have to use a setTimeout
        setTimeout(function () {
          player.play(true);
        }, 500);
      }
      else {
        this.playMedia();
      }
      this.swappingSrc = false; // swapping is finished
      this.refreshControls();
    }
  };

  // End Media events

  AblePlayer.prototype.onWindowResize = function () {
    if (document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement ||
        this.modalFullscreenActive) {
      var newHeight = $(window).height() - this.$playerDiv.height();
      if (!this.$descDiv.is(':hidden')) {
        newHeight -= this.$descDiv.height();
      }
      this.resizePlayer($(window).width(), newHeight);
    }
    else {
      this.resizePlayer(this.playerWidth, this.playerHeight);
    }
  };

  AblePlayer.prototype.addSeekbarListeners = function () {
    var thisObj = this;

    // Handle seek bar events.
    this.seekBar.bodyDiv.on('startTracking', function (event) {
      thisObj.pausedBeforeTracking = thisObj.isPaused();
      thisObj.pauseMedia();
    }).on('tracking', function (event, position) {
      // Scrub transcript and captions.
      thisObj.highlightTranscript(position);
      thisObj.updateCaption(position);
      thisObj.updateDescription(position);
      thisObj.refreshControls();
    }).on('stopTracking', function (event, position) {
      thisObj.seekTo(position);

      if (!thisObj.pausedBeforeTracking) {
        setTimeout(function () {
          thisObj.playMedia();
        }, 200);
      }
    });
  };

  AblePlayer.prototype.onClickPlayerButton = function (el) {
    // TODO: This is super-fragile since we need to know the length of the class name to split off; update this to other way of dispatching?
    var whichButton = $(el).attr('class').split(' ')[0].substr(20); 
    if (whichButton === 'play') { 
      this.handlePlay();
    }
    else if (whichButton === 'stop') { 
      this.handleStop();
    }
    else if (whichButton === 'rewind') { 
      this.handleRewind();
    }
    else if (whichButton === 'forward') { 
      this.handleFastForward();        
    }
    else if (whichButton === 'mute') { 
      this.handleMute();
    }
    else if (whichButton === 'volume-up') { 
      this.handleVolume('up');
    }
    else if (whichButton === 'volume-down') { 
      this.handleVolume('down');
    }
    else if (whichButton === 'faster') {
      this.handleRateIncrease();
    }
    else if (whichButton === 'slower') {
      this.handleRateDecrease();
    }     
    else if (whichButton === 'captions') { 
      this.handleCaptionToggle();
    }
    else if (whichButton === 'chapters') {
      this.handleChapters();
    }
    else if (whichButton === 'descriptions') { 
      this.handleDescriptionToggle();
    }
    else if (whichButton.substr(0,4) === 'sign') { 
      // not yet supported
    }
    else if (whichButton === 'preferences') { 
      this.handlePrefsClick();
    }
    else if (whichButton === 'help') { 
      this.handleHelpClick();
    }
    else if (whichButton === 'transcript') {
      this.handleTranscriptToggle();
    }
    else if (whichButton === 'fullscreen') {
      this.handleFullscreenToggle();
    }
  };

  AblePlayer.prototype.onPlayerKeyPress = function (e) {
    // handle keystrokes (using DHTML Style Guide recommended key combinations) 
    // http://dev.aol.com/dhtml_style_guide/#mediaplayer
    // Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
    // NOTE #1: Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
    // The rest are reasonable best choices  
    // NOTE #2: If there are multiple players on a single page, keystroke handlers 
    // are only bound to the FIRST player 

    // Convert to lower case.
    var which = e.which;
    if (which >= 65 && which <= 90) {
      which += 32;
    }

      
    if (which === 27) { // Escape - TODO: Not listed in help file, should it be?
      this.closeTooltips();
    }
    else if (which === 32) { // spacebar = play/pause     
      if (!($('.able-controller button').is(':focus'))) { 
        // only toggle play if a button does not have focus 
        // if a button has focus, space should activate that button
        this.handlePlay(); 
      }
    }
    else if (which === 112) { // p = play/pause        
      if (this.usingModifierKeys(e)) { 
        this.handlePlay();
      }
    }
    else if (which === 115) { // s = stop 
      if (this.usingModifierKeys(e)) { 
        this.handleStop();
      }
    }
    else if (which === 109) { // m = mute 
      if (this.usingModifierKeys(e)) { 
        this.handleMute();
      }
    }
    else if (which === 117) { // u = volume up 
      if (this.usingModifierKeys(e)) { 
        this.handleVolume('up');
      }
    }
    else if (which === 100) { // d = volume down 
      if (this.usingModifierKeys(e)) { 
        this.handleVolume('down');
      }
    }
    else if (which >= 49 && which <= 53) { // set volume 1-5
      if (this.usingModifierKeys(e)) { 
        this.handleVolume(which);
      }
    }
    else if (which === 99) { // c = caption toggle 
      if (this.usingModifierKeys(e)) { 
        this.handleCaptionToggle();      
      }
    }
    else if (which === 102) { // f = forward 
      if (this.usingModifierKeys(e)) { 
        this.handleFastForward();
      }
    }
    else if (which === 114) { // r = rewind (could use B for back???) 
      if (this.usingModifierKeys(e)) { 
        this.handleRewind();
      }
    }
    else if (which === 110) { // n = narration (description)
      if (this.usingModifierKeys(e)) { 
        this.handleDescriptionToggle();
      }
    }     
    else if (which === 104) { // h = help
      if (this.usingModifierKeys(e)) { 
        this.handleHelpClick();
      }
    }     
    else if (which === 116) { // t = preferences
      if (this.usingModifierKeys(e)) { 
        this.handlePrefsClick();
      }
    }     
    else if (which === 104) { // h = help
      if (this.usingModifierKeys(e)) { 
        this.handleHelpClick();
      }
    }     
    else if (which === 13) { // Enter 
      var thisElement = $(document.activeElement);
      if (thisElement.prop('tagName') === 'SPAN') { 
        // register a click on this SPAN 
        // if it's a transcript span the transcript span click handler will take over
        thisElement.click();
      }
      else if (thisElement.prop('tagName') === 'LI') { 
        thisElement.click();
      }
    }
  };

  AblePlayer.prototype.addHtml5MediaListeners = function () {
    var thisObj = this;

    // NOTE: iOS does not support autoplay, 
    // and no events are triggered until media begins to play 
    this.$media
      .on('emptied',function() { 
        if (thisObj.debug) { 
          console.log('media has been emptied');        
        }
      })        
      .on('loadedmetadata',function() {
        if (thisObj.debug) {
          console.log('meta data has loaded');  
        }
        thisObj.onMediaNewSourceLoad();
      })
      .on('canplay',function() { 
        if (thisObj.startTime && !thisObj.startedPlaying) { 
          thisObj.seekTo(thisObj.startTime);
        }
      })
      .on('canplaythrough',function() { 
        if (thisObj.startTime && !thisObj.startedPlaying) { 
          // try again, if seeking failed on canplay
          thisObj.seekTo(thisObj.startTime);
        }
      })
      .on('playing',function() { 
        thisObj.refreshControls();
      })
      .on('ended',function() {
        thisObj.onMediaComplete();
      })
      .on('progress', function() {
        thisObj.refreshControls();
      })
      .on('waiting',function() { 
        thisObj.refreshControls();
      })
      .on('durationchange',function() { 
        // Display new duration.
        thisObj.refreshControls();
      })
      .on('timeupdate',function() { 
        thisObj.onMediaUpdateTime();
      })
      .on('play',function() { 
        if (thisObj.debug) { 
          console.log('media play event');        
        }
      })
      .on('pause',function() { 
        thisObj.onMediaPause();
      })
      .on('ratechange',function() { 
        if (thisObj.debug) { 
          console.log('media ratechange');        
        }
      })
      .on('volumechange',function() { 
        if (thisObj.debug) { 
          console.log('media volume change');       
        }
      })
      .on('error',function() { 
        if (thisObj.debug) { 
          switch (thisObj.media.error.code) { 
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

  AblePlayer.prototype.addJwMediaListeners = function () {
    var thisObj = this;

    // add listeners for JW Player events 
    this.jwPlayer
      .onTime(function() {
        console.log('a');
        thisObj.onMediaUpdateTime();
        console.log('b');
      })
      .onComplete(function() {
        console.log('c');
        thisObj.onMediaComplete();
        console.log('d');
      })
      .onReady(function() { 
        console.log('e');
        if (thisObj.debug) { 
          console.log('JW Player onReady event fired');
        }
        // remove JW Player from tab order. 
        // We don't want users tabbing into the Flash object and getting trapped
        $('#' + thisObj.jwId).removeAttr('tabindex'); 

        if (thisObj.startTime > 0) { 
          // ABLE has been initialized with a startTime 
          // e.g., from a search result or link in a transcript
          // ONE TIME ONLY - set currentTime to startTime and begin playing
          if (!thisObj.startedPlaying) {          
            // JW Player doesn't download media until it's needed  
            // Therefore, can't seek() until video has started playing 
            // This is why seek() works with Forward and Back buttons, but not with startTime 
            // The following is a hack: Start and immediately stop the player. 
            // This triggers a media download, which enables seek() to work. 
            // http pseudo-streaming would probably be a better solution, but isn't supported yet...
            // jwplayer(thisObj.jwId).play(true);
            // jwplayer(thisObj.jwId).play(false);
            // jwplayer(thisObj.jwId).seek(thisObj.startTime);
            thisObj.startedPlaying = true;
          }
        }

        thisObj.refreshControls();
        console.log('f');
      })
      .onSeek(function(event) { 
        // this is called when user scrubs ahead or back 
        // but not when seek() is called - OR IS IT???
        // After the target offset is reached, JW Player automatically plays media at that point  
        if (thisObj.debug) { 
          console.log('Seeking to ' + event.position + '; target: ' + event.offset);          
        }

        if (thisObj.jwSeekPause) {
          thisObj.jwSeekPause = false;
          thisObj.pauseMedia();
        }

        setTimeout(function () {
          thisObj.refreshControls();
        }, 300);
      })
      .onPlay(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onPlay event fired');
        }

        thisObj.refreshControls();
      })
      .onPause(function() { 
        thisObj.onMediaPause();
      })
      .onBuffer(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onBuffer event fired');
        }       
        thisObj.refreshControls();
      })
      .onBufferChange(function() {
        thisObj.refreshControls();
      })
      .onIdle(function(e) { 
        if (thisObj.debug) { 
          console.log('JW Player onIdle event fired');
        }

        thisObj.refreshControls();
      })
      .onMeta(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onMeta event fired');
        }       
      })
      .onPlaylist(function() { 
        if (thisObj.debug) { 
          console.log('JW Player onPlaylist event fired');
        }

        // Playlist change includes new media source.
        thisObj.onMediaNewSourceLoad();
      });
  };

  AblePlayer.prototype.addEventListeners = function () { 
    var thisObj, whichButton, thisElement; 
  
    // Save the current object context in thisObj for use with inner functions.
    thisObj = this;
    
    // Appropriately resize media player for full screen.
    $(window).resize(function () {
      thisObj.onWindowResize();
    });

    this.addSeekbarListeners();

    // handle clicks on player buttons 
    this.$controllerDiv.find('button').click(function(){
      thisObj.onClickPlayerButton(this);
    });

    // handle local key-presses if we're not the only player on the page; otherwise these are dispatched by global handler.
    this.$ableDiv.keydown(function (e) {
      if (AblePlayer.nextIndex > 1) {
        thisObj.onPlayerKeyPress(e);
      }
    });
    
    // handle clicks on playlist items
    if (this.$playlist) {
      this.$playlist.click(function() { 
        thisObj.playlistIndex = $(this).index();
        thisObj.swapSource(thisObj.playlistIndex);  
      });
    }

    // Also play/pause when clicking on the media.
    this.$media.click(function () {
      thisObj.handlePlay();
    });

    // add listeners for media events 
    if (this.player === 'html5') {
      this.addHtml5MediaListeners();
    }
    else if (this.player === 'jw') { 
      this.addJwMediaListeners();
    }
    else if (this.player === 'youtube') {
      setInterval(function () {
        // Youtube doesn't give us time update events, so we just periodically generate them ourselves.
        thisObj.onMediaUpdateTime();
      }, 300);
    }
  };
})();
