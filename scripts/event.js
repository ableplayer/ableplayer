(function ($) {
	// Media events
	AblePlayer.prototype.onMediaUpdateTime = function (duration, elapsed) {

		// duration and elapsed are passed from callback functions of Vimeo API events
		// duration is expressed as sss.xxx
		// elapsed is expressed as sss.xxx
		var thisObj = this;

		this.getMediaTimes(duration,elapsed).then(function(mediaTimes) {
			if (typeof duration === 'undefined') {
				thisObj.duration = mediaTimes['duration'];
			}
			if (typeof elapsed === 'undefined') {
				thisObj.elapsed = mediaTimes['elapsed'];
			}
			if (thisObj.swappingSrc && (typeof thisObj.swapTime !== 'undefined')) {
				if (thisObj.swapTime === thisObj.elapsed) {
					// described version been swapped and media has scrubbed to time of previous version
					if (thisObj.playing) {
						// resume playback
						thisObj.playMedia();
						// reset vars
						thisObj.swappingSrc = false;
						thisObj.swapTime = null;
					}
				}
			}
			else if (thisObj.startedPlaying) {
				// do all the usual time-sync stuff during playback
				if (thisObj.prefHighlight === 1) {
					thisObj.highlightTranscript(thisObj.elapsed);
				}
				thisObj.updateCaption(thisObj.elapsed);
				thisObj.showDescription(thisObj.elapsed);
				thisObj.updateChapter(thisObj.elapsed);
				thisObj.updateMeta(thisObj.elapsed);
				thisObj.refreshControls('timeline', thisObj.duration, thisObj.elapsed);
			}
		});
	};

	AblePlayer.prototype.onMediaPause = function () {

		if (this.controlsHidden) {
			this.fadeControls('in');
			this.controlsHidden = false;
		}
		if (this.hideControlsTimeoutStatus === 'active') {
			window.clearTimeout(this.hideControlsTimeout);
			this.hideControlsTimeoutStatus = 'clear';

		}
		this.refreshControls('playpause');
	};

	AblePlayer.prototype.onMediaComplete = function () {

		// if there's a playlist, advance to next item and start playing
		if (this.hasPlaylist && !this.cueingPlaylistItem) {
			if (this.playlistIndex === (this.$playlist.length - 1)) {
				// this is the last track in the playlist
				if (this.loop) {
					this.playlistIndex = 0;
					this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
					this.cuePlaylistItem(0);
				}
			}
			else {
				// this is not the last track. Play the next one.
				this.playlistIndex++;
				this.cueingPlaylistItem = true; // stopgap to prevent multiple firings
				this.cuePlaylistItem(this.playlistIndex)
			}
		}
		this.refreshControls('init');
	};

	AblePlayer.prototype.onMediaNewSourceLoad = function () {

		if (this.cueingPlaylistItem) {
			// this variable was set in order to address bugs caused by multiple firings of media 'end' event
			// safe to reset now
			this.cueingPlaylistItem = false;
		}
		if (this.swappingSrc === true) {
			// new source file has just been loaded
			if (this.swapTime > 0) {
				// this.swappingSrc will be set to false after seek is complete
				// see onMediaUpdateTime()
				this.seekTo(this.swapTime);
			}
			else {
				if (this.playing) {
					// should be able to resume playback
					this.playMedia();
				}
				this.swappingSrc = false; // swapping is finished
				this.refreshControls('init');
			}
		}
	};

	// End Media events

	AblePlayer.prototype.onWindowResize = function () {

		if (this.fullscreen) { // replace isFullscreen() with a Boolean. see function for explanation

			var newWidth, newHeight;

			newWidth = $(window).width();

			// haven't isolated why, but some browsers return an innerHeight that's 20px too tall in fullscreen mode
			// Test results:
			// Browsers that require a 20px adjustment: Firefox, IE11 (Trident), Edge
			if (this.isUserAgent('Firefox') || this.isUserAgent('Trident') || this.isUserAgent('Edge')) {
				newHeight = window.innerHeight - this.$playerDiv.outerHeight() - 20;
			}
			else if (window.outerHeight >= window.innerHeight) {
				// Browsers that do NOT require adjustment: Chrome, Safari, Opera, MSIE 10
				newHeight = window.innerHeight - this.$playerDiv.outerHeight();
			}
			else {
				// Observed in Safari 9.0.1 on Mac OS X: outerHeight is actually less than innerHeight
				// Maybe a bug, or maybe window.outerHeight is already adjusted for controller height(?)
				// No longer observed in Safari 9.0.2
				newHeight = window.outerHeight;
			}
			if (!this.$descDiv.is(':hidden')) {
				newHeight -= this.$descDiv.height();
			}
			this.positionCaptions('overlay');
		}
		else { // not fullscreen
			if (this.restoringAfterFullScreen) {
				newWidth = this.preFullScreenWidth;
				newHeight = this.preFullScreenHeight;
			}
			else {
				// not restoring after full screen
				newWidth = this.$ableWrapper.width();
				if (typeof this.aspectRatio !== 'undefined') {
					newHeight = Math.round(newWidth / this.aspectRatio);
				}
				else {
					// not likely, since this.aspectRatio is defined during intialization
					// however, this is a fallback scenario just in case
					newHeight = this.$ableWrapper.height();
				}
				this.positionCaptions(); // reset with this.prefCaptionsPosition
			}
		}
		this.resizePlayer(newWidth, newHeight);
	};

	AblePlayer.prototype.addSeekbarListeners = function () {

		var thisObj = this;

		// Handle seek bar events.
		this.seekBar.bodyDiv.on('startTracking', function (e) {
			thisObj.pausedBeforeTracking = thisObj.paused;
			thisObj.pauseMedia();
		}).on('tracking', function (e, position) {
			// Scrub transcript, captions, and metadata.
			thisObj.highlightTranscript(position);
			thisObj.updateCaption(position);
			thisObj.showDescription(position);
			thisObj.updateChapter(thisObj.convertChapterTimeToVideoTime(position));
			thisObj.updateMeta(position);
			thisObj.refreshControls('init');
		}).on('stopTracking', function (e, position) {
			if (thisObj.useChapterTimes) {
				thisObj.seekTo(thisObj.convertChapterTimeToVideoTime(position));
			}
			else {
				thisObj.seekTo(position);
			}
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
		else if (whichButton === 'restart') {
			this.seekTrigger = 'restart';
			this.handleRestart();
		}
		else if (whichButton === 'rewind') {
			this.seekTrigger = 'rewind';
			this.handleRewind();
		}
		else if (whichButton === 'forward') {
			this.seekTrigger = 'forward';
			this.handleFastForward();
		}
		else if (whichButton === 'mute') {
			this.handleMute();
		}
		else if (whichButton === 'volume') {
			this.handleVolume();
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
		else if (whichButton === 'sign') {
			this.handleSignToggle();
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
			this.clickedFullscreenButton = true;
			this.handleFullscreenToggle();
		}
	};

	AblePlayer.prototype.okToHandleKeyPress = function () {

		// returns true unless user's focus is on a UI element
		// that is likely to need supported keystrokes, including space

		var activeElement = AblePlayer.getActiveDOMElement();

		if ($(activeElement).prop('tagName') === 'INPUT') {
			return false;
		}
		else {
			return true;
		}
	};

	AblePlayer.prototype.onPlayerKeyPress = function (e) {

		// handle keystrokes (using DHTML Style Guide recommended key combinations)
		// https://web.archive.org/web/20130127004544/http://dev.aol.com/dhtml_style_guide/#mediaplayer
		// Modifier keys Alt + Ctrl are on by default, but can be changed within Preferences
		// NOTE #1: Style guide only supports Play/Pause, Stop, Mute, Captions, & Volume Up & Down
		// The rest are reasonable best choices
		// NOTE #2: If there are multiple players on a single page, keystroke handlers
		// are only bound to the FIRST player
		// NOTE #3: The DHTML Style Guide is now the W3C WAI-ARIA Authoring Guide and has undergone many revisions
		// including removal of the "media player" design pattern. There's an issue about that:
		// https://github.com/w3c/aria-practices/issues/27

		if (!this.okToHandleKeyPress()) {
			return false;
		}
		// Convert to lower case.
		var which = e.which;

		if (which >= 65 && which <= 90) {
			which += 32;
		}

		// Only use keypress to control player if focus is NOT on a form field or contenteditable element
		if (!(
			$(':focus').is('[contenteditable]') ||
			$(':focus').is('input') ||
			$(':focus').is('textarea') ||
			$(':focus').is('select') ||
			e.target.hasAttribute('contenteditable') ||
			e.target.tagName === 'INPUT' ||
			e.target.tagName === 'TEXTAREA' ||
			e.target.tagName === 'SELECT'
		)){
			if (which === 27) { // escape
				this.closePopups();
			}
			else if (which === 32) { // spacebar = play/pause
				if (this.$ableWrapper.find('.able-controller button:focus').length === 0) {
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
			else if (which === 115) { // s = stop (now restart)
				if (this.usingModifierKeys(e)) {
					this.handleRestart();
				}
			}
			else if (which === 109) { // m = mute
				if (this.usingModifierKeys(e)) {
					this.handleMute();
				}
			}
			else if (which === 118) { // v = volume
				if (this.usingModifierKeys(e)) {
					this.handleVolume();
				}
			}
			else if (which >= 49 && which <= 57) { // set volume 1-9
				if (this.usingModifierKeys(e)) {
					this.handleVolume(which);
				}
			}
			else if (which === 99) { // c = caption toggle
				if (this.usingModifierKeys(e)) {
					this.handleCaptionToggle();
				}
			}
			else if (which === 100) { // d = description
				if (this.usingModifierKeys(e)) {
					this.handleDescriptionToggle();
				}
			}
			else if (which === 102) { // f = forward
				if (this.usingModifierKeys(e)) {
					this.handleFastForward();
				}
			}
			else if (which === 114) { // r = rewind
				if (this.usingModifierKeys(e)) {
					this.handleRewind();
				}
			}
			else if (which === 101) { // e = preferences
				if (this.usingModifierKeys(e)) {
					this.handlePrefsClick();
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
		}
	};

	AblePlayer.prototype.addHtml5MediaListeners = function () {

		var thisObj = this;

		// NOTE: iOS and some browsers do not support autoplay
		// and no events are triggered until media begins to play
		// Able Player gets around this by automatically loading media in some circumstances
		// (see initialize.js > initPlayer() for details)
		this.$media
			.on('emptied',function() {
				// do something
			})
			.on('loadedmetadata',function() {
				thisObj.onMediaNewSourceLoad();
			})
			.on('canplay',function() {
				// previously handled seeking to startTime here
				// but it's probably safer to wait for canplaythrough
				// so we know player can seek ahead to anything
			})
			.on('canplaythrough',function() {
				if (thisObj.userClickedPlaylist) {
					if (!thisObj.startedPlaying) {
							// start playing; no further user action is required
						thisObj.playMedia();
				 		}
					thisObj.userClickedPlaylist = false; // reset
				}
				if (thisObj.seekTrigger == 'restart' || thisObj.seekTrigger == 'chapter' || thisObj.seekTrigger == 'transcript') {
					// by clicking on any of these elements, user is likely intending to play
					// Not included: elements where user might click multiple times in succession
					// (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
					thisObj.playMedia();
				}
				else if (!thisObj.startedPlaying) {
					if (thisObj.startTime > 0) {
						if (thisObj.seeking) {
							// a seek has already been initiated
							// since canplaythrough has been triggered, the seek is complete
							thisObj.seeking = false;
							if (thisObj.autoplay || thisObj.okToPlay) {
								thisObj.playMedia();
							}
						}
						else {
							// haven't started seeking yet
							thisObj.seekTo(thisObj.startTime);
						}
					}
					else if (thisObj.defaultChapter && typeof thisObj.selectedChapters !== 'undefined') {
						thisObj.seekToChapter(thisObj.defaultChapter);
					}
					else {
						// there is no startTime, therefore no seeking required
						if (thisObj.autoplay || thisObj.okToPlay) {
							thisObj.playMedia();
						}
					}
				}
				else if (thisObj.hasPlaylist) {
					if ((thisObj.playlistIndex !== thisObj.$playlist.length) || thisObj.loop) {
						// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
						thisObj.playMedia();
					}
				}
				else {
					// already started playing
					// we're here because a new media source has been loaded and is ready to resume playback
					thisObj.getPlayerState().then(function(currentState) {
						if (thisObj.swappingSrc && currentState === 'stopped') {
							// Safari is the only browser that returns value of 'stopped' (observed in 12.0.1 on MacOS)
							// This prevents 'timeupdate' events from triggering, which prevents the new media src
							// from resuming playback at swapTime
							// This is a hack to jump start Safari
							thisObj.startedPlaying = false;
							if (thisObj.swapTime > 0) {
								thisObj.seekTo(thisObj.swapTime);
							}
							else {
								thisObj.playMedia();
							}
						}
					});
				}
			})
			.on('play',function() {
				// both 'play' and 'playing' seem to be fired in all browsers (including IE11)
				// therefore, doing nothing here & doing everything when 'playing' is triggered
				 thisObj.refreshControls('playpause');
			})
			.on('playing',function() {
				thisObj.playing = true;
				thisObj.paused = false;
				thisObj.refreshControls('playpause');
			})
			.on('ended',function() {
				thisObj.playing = false;
				thisObj.paused = true;
				thisObj.onMediaComplete();
			})
			.on('progress', function() {
				thisObj.refreshControls('timeline');
			})
			.on('waiting',function() {
				 // do something
				 // previously called refreshControls() here but this event probably doesn't warrant a refresh
			})
			.on('durationchange',function() {
				// Display new duration.
				thisObj.refreshControls('timeline');
			})
			.on('timeupdate',function() {
				thisObj.onMediaUpdateTime(); // includes a call to refreshControls()
			})
			.on('pause',function() {
				if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
					// this happens in some browsers (not Chrome, as of 70.x)
					// when swapping source (e.g., between tracks in a playlist, or swapping description)
					if (thisObj.hasPlaylist || thisObj.swappingSrc) {
						// do NOT set playing to false.
						// doing so prevents continual playback after new track is loaded
					}
					else {
						thisObj.playing = false;
						thisObj.paused = true;
					}
				}
				else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
				thisObj.clickedPlay = false; // done with this variable
				thisObj.onMediaPause(); // includes a call to refreshControls()
			})
			.on('ratechange',function() {
				// do something
			})
			.on('volumechange',function() {
				thisObj.volume = thisObj.getVolume();
				if (thisObj.debug) {
					console.log('media volume change to ' + thisObj.volume + ' (' + thisObj.volumeButton + ')');
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

	AblePlayer.prototype.addVimeoListeners = function () {

// The following content is orphaned. It was in 'canplaythrough' but there's no equivalent event in Vimeo.
// Maybe it should go under 'loaded' or 'progress' ???
/*
				if (thisObj.userClickedPlaylist) {
					if (!thisObj.startedPlaying) {
							// start playing; no further user action is required
						thisObj.playMedia();
				 		}
					thisObj.userClickedPlaylist = false; // reset
				}
				if (thisObj.seekTrigger == 'restart' || thisObj.seekTrigger == 'chapter' || thisObj.seekTrigger == 'transcript') {
					// by clicking on any of these elements, user is likely intending to play
					// Not included: elements where user might click multiple times in succession
					// (i.e., 'rewind', 'forward', or seekbar); for these, video remains paused until user initiates play
					thisObj.playMedia();
				}
				else if (!thisObj.startedPlaying) {
					if (thisObj.startTime > 0) {
						if (thisObj.seeking) {
							// a seek has already been initiated
							// since canplaythrough has been triggered, the seek is complete
							thisObj.seeking = false;
							if (thisObj.autoplay || thisObj.okToPlay) {
								thisObj.playMedia();
							}
						}
						else {
							// haven't started seeking yet
							thisObj.seekTo(thisObj.startTime);
						}
					}
					else if (thisObj.defaultChapter && typeof thisObj.selectedChapters !== 'undefined') {
						thisObj.seekToChapter(thisObj.defaultChapter);
					}
					else {
						// there is no startTime, therefore no seeking required
						if (thisObj.autoplay || thisObj.okToPlay) {
							thisObj.playMedia();
						}
					}
				}
				else if (thisObj.hasPlaylist) {
					if ((thisObj.playlistIndex !== thisObj.$playlist.length) || thisObj.loop) {
						// this is not the last track in the playlist (OR playlist is looping so it doesn't matter)
						thisObj.playMedia();
					}
				}
				else {
					// already started playing
					// we're here because a new media source has been loaded and is ready to resume playback
					thisObj.getPlayerState().then(function(currentState) {
						if (thisObj.swappingSrc && currentState === 'stopped') {
							// Safari is the only browser that returns value of 'stopped' (observed in 12.0.1 on MacOS)
							// This prevents 'timeupdate' events from triggering, which prevents the new media src
							// from resuming playback at swapTime
							// This is a hack to jump start Safari
							thisObj.startedPlaying = false;
							if (thisObj.swapTime > 0) {
								thisObj.seekTo(thisObj.swapTime);
							}
							else {
								thisObj.playMedia();
							}
						}
					});
				}

*/

		var thisObj = this;

		// Vimeo doesn't seem to support chaining of on() functions
		// so each event listener must be attached separately
		this.vimeoPlayer.on('loaded', function(vimeoId) {
			 // Triggered when a new video is loaded in the player
			thisObj.onMediaNewSourceLoad();
		 });
		this.vimeoPlayer.on('play', function(data) {
			// Triggered when the video plays
			thisObj.playing = true;
			thisObj.startedPlaying = true;
			thisObj.paused = false;
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('ended', function(data) {
			// Triggered any time the video playback reaches the end.
			// Note: when loop is turned on, the ended event will not fire.
			thisObj.playing = false;
			thisObj.paused = true;
			thisObj.onMediaComplete();
		});
		this.vimeoPlayer.on('bufferstart', function() {
			// Triggered when buffering starts in the player.
			// This is also triggered during preload and while seeking.
			// There is no associated data with this event.
		});
		this.vimeoPlayer.on('bufferend', function() {
			// Triggered when buffering ends in the player.
			// This is also triggered at the end of preload and seeking.
			// There is no associated data with this event.
		});
		this.vimeoPlayer.on('progress', function(data) {
			// Triggered as the video is loaded.
			 // Reports back the amount of the video that has been buffered (NOT the amount played)
			 // Data has keys duration, percent, and seconds
	 	});
		this.vimeoPlayer.on('seeking', function(data) {
		 	// Triggered when the player starts seeking to a specific time.
			 // A timeupdate event will also be fired at the same time.
	 	});
		this.vimeoPlayer.on('seeked', function(data) {
			// Triggered when the player seeks to a specific time.
			// A timeupdate event will also be fired at the same time.
		});
		this.vimeoPlayer.on('timeupdate',function(data) {
			// Triggered as the currentTime of the video updates.
			 // It generally fires every 250ms, but it may vary depending on the browser.
			thisObj.onMediaUpdateTime(data['duration'], data['seconds']);
		});
		this.vimeoPlayer.on('pause',function(data) {
			// Triggered when the video pauses
			if (!thisObj.clickedPlay) {
					// 'pause' was triggered automatically, not initiated by user
				// this happens in some browsers (not Chrome, as of 70.x)
				// when swapping source (e.g., between tracks in a playlist, or swapping description)
				if (thisObj.hasPlaylist || thisObj.swappingSrc) {
						// do NOT set playing to false.
					// doing so prevents continual playback after new track is loaded
				}
				else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
			}
			else {
				thisObj.playing = false;
				thisObj.paused = true;
			}
			thisObj.clickedPlay = false; // done with this variable
			thisObj.onMediaPause();
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('playbackratechange',function(data) {
			// Triggered when the playback rate of the video in the player changes.
			// The ability to change rate can be disabled by the creator
			// and the event will not fire for those videos.
			// data contains one key: 'playbackRate'
			thisObj.vimeoPlaybackRate = data['playbackRate'];
		});
		this.vimeoPlayer.on('texttrackchange', function(data) {
			// Triggered when the active text track (captions/subtitles) changes.
			// The values will be null if text tracks are turned off.
			// data contains three keys: kind, label, language
		});
		this.vimeoPlayer.on('volumechange',function(data) {
			// Triggered when the volume in the player changes.
			// Some devices do not support setting the volume of the video
			// independently from the system volume,
			// so this event will never fire on those devices.
			thisObj.volume = data['volume'] * 10;
		});
		this.vimeoPlayer.on('error',function(data) {
			// do something with the available data
			// data contains three keys: message, method, name
			// message: A user-friendly error message
			// method: The Vimeo API method call that triggered the error
			// name: Name of the error (not necesssarily user-friendly)
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

		// Refresh player if it changes from hidden to visible
		// There is no event triggered by a change in visibility
		// but MutationObserver works in most browsers (but NOT in IE 10 or earlier)
		// http://caniuse.com/#feat=mutationobserver
		if (window.MutationObserver) {
			var target = this.$ableDiv[0];
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
						// the player's style attribute has changed. Check to see if it's visible
						if (thisObj.$ableDiv.is(':visible')) {
							thisObj.refreshControls('init');
						}
					}
				});
			});
			var config = { attributes: true, childList: true, characterData: true };
			observer.observe(target, config);
		}
		else {
			// browser doesn't support MutationObserver
			// TODO: Figure out an alternative solution for this rare use case in older browsers
			// See example in buildplayer.js > useSvg()
		}
		if (typeof this.seekBar !== 'undefined') {
			this.addSeekbarListeners();
		}
		else {
			// wait a bit and try again
			// TODO: Should set this up to keep trying repeatedly.
			// Seekbar listeners are critical.
			setTimeout(function() {
				if (typeof thisObj.seekBar !== 'undefined') {
					thisObj.addSeekbarListeners();
				}
			},2000);
		}

		// handle clicks on player buttons
		this.$controllerDiv.find('button').on('click',function(e){
			e.stopPropagation();
			thisObj.onClickPlayerButton(this);
		});

		// handle clicks (left only) anywhere on the page. If any popups are open, close them.
		$(document).on('click',function(e) {

			if (e.button !== 0) { // not a left click
				return false;
			}
			if ($('.able-popup:visible').length || $('.able-volume-popup:visible')) {
				// at least one popup is visible
				thisObj.closePopups();
			}
		});

		// handle mouse movement over player; make controls visible again if hidden
		this.$ableDiv.on('mousemove',function() {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					// after showing controls, hide them again after a brief timeout
					thisObj.invokeHideControlsTimeout();
				}
			}
			else {
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		// if user presses a key from anywhere on the page, show player controls
		$(document).keydown(function() {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					// after showing controls, hide them again after a brief timeout
					thisObj.invokeHideControlsTimeout();
				}
			}
			else {
				// controls are visible
				// if there's already an active timeout, clear it and start timer again
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';

					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		// handle local keydown events if this isn't the only player on the page;
		// otherwise these are dispatched by global handler (see ableplayer-base,js)
		this.$ableDiv.keydown(function (e) {
			if (AblePlayer.nextIndex > 1) {
				thisObj.onPlayerKeyPress(e);
			}
		});

		// transcript is not a child of this.$ableDiv
		// therefore, must be added separately
		if (this.$transcriptArea) {
			this.$transcriptArea.keydown(function (e) {
				if (AblePlayer.nextIndex > 1) {
					thisObj.onPlayerKeyPress(e);
				}
			});
		}

		// handle clicks on playlist items
		if (this.$playlist) {
			this.$playlist.click(function(e) {
				if (!thisObj.userClickedPlaylist) {
					// stopgap in case multiple clicks are fired on the same playlist item
					thisObj.userClickedPlaylist = true; // will be set to false after new src is loaded & canplaythrough is triggered
					thisObj.playlistIndex = $(this).index();
					thisObj.cuePlaylistItem(thisObj.playlistIndex);
				}
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
		else if (this.player === 'vimeo') {
			 this.addVimeoListeners();
		}
		else if (this.player === 'youtube') {
			// Youtube doesn't give us time update events, so we just periodically generate them ourselves
			setInterval(function () {
				thisObj.onMediaUpdateTime();
			}, 300);
		}
	};
})(jQuery);
