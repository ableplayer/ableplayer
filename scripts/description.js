(function ($) {
	AblePlayer.prototype.initDescription = function() {

		// set default mode for delivering description (open vs closed)
		// based on availability and user preference

		// called when player is being built, or when a user
		// toggles the Description button or changes a description-related preference

		// The following variables are applicable to delivery of description:
		// defaultStateDescriptions == 'on' or 'off', defined by website owner (overridden by prefDesc) 
		// prefDesc == 1 if user wants description (i.e., Description button is on); else 0
		// prefDescPause == 1 to pause video when description starts; else 0
		// prefDescVisible == 1 to visibly show text-based description area; else 0
		// prefDescMethod == either 'video' or 'text' (as of v4.0.10, prefDescMethod is always 'video')
		// descMethod is the format actually used ('video' or 'text'), regardless of user preference 
		// hasOpenDesc == true if a described version of video is available via data-desc-src attribute
		// hasClosedDesc == true if a description text track is available
		// descOn == true if description of either type is on
		// readDescriptionsAloud == true if text description is to be announced audibly; otherwise false
		// descReader == either 'browser' or 'screenreader'

		var deferred, promise, thisObj;

		deferred = new $.Deferred();
		promise = deferred.promise();
		thisObj = this;

		if (this.mediaType === 'audio') { 
			deferred.resolve(); 
		}

		// check to see if there's an open-described version of this video
		// checks only the first source since if a described version is provided,
		// it must be provided for all sources
		this.descFile = this.$sources.first().attr('data-desc-src');
		if (typeof this.descFile !== 'undefined') {
			this.hasOpenDesc = true;
		}
		else {
			// there's no open-described version via data-desc-src,
			// but what about data-youtube-desc-src or data-vimeo-desc-src?
			// if these exist, they would have been defined earlier 
			if (this.youTubeDescId || this.vimeoDescId) {
				this.hasOpenDesc = true;
			}
			else { // there are no open-described versions from any source
				this.hasOpenDesc = false;
			}
		}

		// Set this.descMethod based on media availability & user preferences
		if (this.hasOpenDesc && this.hasClosedDesc) {
			// both formats are available. User gets their preference. 
			if (this.prefDescMethod) { 
				this.descMethod = this.prefDescMethod;
			}
			else { 
				// user has no preference. Video is default. 
				this.descMethod = 'video'; 
			}
		}
		else if (this.hasOpenDesc) {
			this.descMethod = 'video';
		}
		else if (this.hasClosedDesc) {
			this.descMethod = 'text';
		}
		else { 
			// no description is available for this video 
			this.descMethod = null; 
		}

		// Set the default state of descriptions
		if (this.descMethod) { 
			if (this.prefDesc === 1) { 
				this.descOn = true; 
			}
			else if (this.prefDesc === 0) { 
				this.descOn = false; 
			}
			else { 				
				// user has no prefs. Use default state. 
				if (this.defaultStateDescriptions === 1)	{ 			
					this.descOn = true; 
				}
				else { 
					this.descOn = false; 
				}
			}
		}
		else { 			
			this.descOn = false;
		}
		if (typeof this.$descDiv === 'undefined' && this.hasClosedDesc && this.descMethod === 'text') {		
			this.injectTextDescriptionArea();
		}

		if (this.descOn) {
			if (this.descMethod === 'video') {
				if (!this.usingDescribedVersion()) {
					// switched from non-described to described version
					this.swapDescription();
				}
			}
			if (this.hasClosedDesc) {
				if (this.prefDescVisible) {
					// make description text visible
					if (typeof this.$descDiv !== 'undefined') {
						this.$descDiv.show();
						this.$descDiv.removeClass('able-clipped');
					}
				}
				else {
					// keep it visible to screen readers, but hide it visibly
					if (typeof this.$descDiv !== 'undefined') {
						this.$descDiv.addClass('able-clipped');
					}
				}
			}
		}
		else { // description is off.
			if (this.descMethod === 'video') { // user has turned off described version of video
				if (this.usingDescribedVersion()) {
					// user was using the described verion. Swap for non-described version
					this.swapDescription();
				}
			}
			else if (this.descMethod === 'text') { // user has turned off text description
				// hide description div from everyone, including screen reader users
				if (typeof this.$descDiv !== 'undefined') {
					this.$descDiv.hide();
					this.$descDiv.removeClass('able-clipped');
				}
			}
		}
		deferred.resolve();
		return promise; 
	};

	AblePlayer.prototype.usingDescribedVersion = function () {

		// Returns true if currently using audio description, false otherwise.

		if (this.player === 'youtube') {
			return (this.activeYouTubeId === this.youTubeDescId);
		}
		else if (this.player === 'vimeo') {
			return (this.activeVimeoId === this.vimeoDescId);
		}
		else {
			return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
		}
	};

	AblePlayer.prototype.initSpeech = function (context) { 

		// Some browsers &/or operating systems require a user-initiated click 
		// before this.synth.getVoices() will work. As of Nov 2022: 
		// Chrome requires a click before synth.getVoices() will work
		// iOS requires a click before synth.speak() will work 
		// A hack to address this: Listen for ANY click, then play an inaudible utterance 
		// to intitiate speech synthesis 		
		// https://stackoverflow.com/questions/32193704/js-speech-synthesis-issue-on-ios
		// This function does that, and sets this.speechEnabled
		// It's called with either of these contexts: 
		// 'init' - player is being initialized 
		// 'play' - user has clicked play 
		// 'prefs' - user has clicked prefs button
		// 'desc' - it's time to announce a description!  

		var thisObj = this; 
		
		if (this.speechEnabled === null) {  

			if (typeof this.synth !== 'undefined') { 
				// cancel any previous synth instance and reinitialize  
				this.synth.cancel(); 
			}	

			if (window.speechSynthesis) {

				// browser supports speech synthesis 

				this.synth = window.speechSynthesis;

				if (context === 'init') { 
					// handle a click on anything, in case the user 
					// clicks something before they click 'play' or 'prefs' buttons
					// that would allow us to init speech before it's needed 
					$(document).on('click',function() { 			
						var greeting = new SpeechSynthesisUtterance('Hi!');
						greeting.volume = 0; // silent 
						greeting.rate = 10; // fastest speed supported by the API  
						thisObj.synth.speak(greeting);
						greeting.onstart = function(e) { 						
							// utterance has started 
							$(document).off('click'); // unbind the click event listener 		
						}
						greeting.onend = function(e) {
							// should now be able to get browser voices 
							// in browsers that require a click 
							thisObj.getBrowserVoices(); 
							if (thisObj.descVoices.length) { 
								thisObj.speechEnabled = true; 
							}
						};
					}); 
									
					// go ahead and call get browser voices in case it might work, 
					// for browsers that don't require a click 
					this.getBrowserVoices(); 
					if (this.descVoices.length) { 
						this.speechEnabled = true; 
					}
				}
				else {  // context is either 'play' or 'prefs' or 'desc'
					var greeting = new SpeechSynthesisUtterance('Hi!');
					greeting.volume = 0; // silent 
					greeting.rate = 10; // fastest speed supported by the API  
					thisObj.synth.speak(greeting);
					greeting.onstart = function(e) { 						
						// utterance has started 
						$(document).off('click'); // unbind the click event listener 			
					};
					greeting.onend = function(e) {
						// should now be able to get browser voices 
						// in browsers that require a click 
						thisObj.getBrowserVoices(); 
						if (thisObj.descVoices.length) { 
							thisObj.speechEnabled = true; 
						}
					};							
				}
			}
			else { 
				// browser does not support speech synthesis
				this.speechEnabled = false; 
			}
		}
	}; 

	AblePlayer.prototype.getBrowserVoices = function () {
		
		// define this.descVoices array 
		// includes only languages that match the language of the captions or player 

		var voices, descLangs, voiceLang, preferredLang;

		if (this.captionLang) { 
			preferredLang = this.captionLang.substring(0,2).toLowerCase();
		}
		else { 
			preferredLang = this.lang.substring(0,2).toLowerCase();
		}
		this.descVoices = []; 
		voices = this.synth.getVoices();
		descLangs = this.getDescriptionLangs();
		if (voices.length > 0) {
			this.descVoices = [];
			// available languages are identified with local suffixes (e.g., en-US)
			for (var i=0; i<voices.length; i++) {
				// match only the first 2 characters of the lang code
				voiceLang = voices[i].lang.substring(0,2).toLowerCase();
				if (voiceLang === preferredLang && (descLangs.indexOf(voiceLang) !== -1)) {
					// this voice matches preferredLang 
					// AND there's a matching description track in this language
					// Add this voice to final array 
					this.descVoices.push(voices[i]);
				}
			}
			if (!this.descVoices.length) {
				// no voices available in the default language(s)
				// just use all voices, regardless of language
				this.descVoices = voices;
			}
		}
		return false;
	};

	AblePlayer.prototype.getDescriptionLangs = function () {

		// returns an array of languages (from srclang atttributes)
		// in which there are description tracks
		// use only first two characters of the lang code
		var descLangs = [];
		if (this.tracks) {
			for (var i=0; i < this.tracks.length; i++) {
				if (this.tracks[i].kind === 'descriptions') {
					descLangs.push(this.tracks[i].language.substring(0,2).toLowerCase());
				}
			}
		}
		return descLangs;
	};

	AblePlayer.prototype.setDescriptionVoice = function () {

		// set description voice on player init, or when user changes caption language 
		// Voice is determined in the following order of precedence: 
		// 1. User's preferred voice for this language, saved in a cookie
		// 2. The first available voice in the array of available voices for this browser in this language

		var cookie, voices, prefDescVoice, descVoice, descLang, prefVoiceFound;
		cookie = this.getCookie(); 
		if (typeof cookie.voices !== 'undefined') { 			
			prefDescVoice = this.getPrefDescVoice(); 
		}
		else { 
			prefDescVoice = null; 
		}
	
		this.getBrowserVoices();
		this.rebuildDescPrefsForm();

		if (this.selectedDescriptions) { 
			descLang = this.selectedDescriptions.language;
		}
		else if (this.captionLang) { 
			descLang = this.captionLang; 
		}
		else { 
			descLang = this.lang; 
		}

		if (this.synth) {
			voices = this.synth.getVoices();
			if (voices.length > 0) {
				if (prefDescVoice) { 
					// select the language that matches prefDescVoice, if it's available 
					prefVoiceFound = false; 
					for (var i=0; i<voices.length; i++) {
						// first, be sure voice is the correct language
						if (voices[i].lang.substring(0,2).toLowerCase() === descLang.substring(0,2).toLowerCase()) {
							if (voices[i].name === prefDescVoice) { 
								descVoice = voices[i].name; 
								prefVoiceFound = true; 
								break;
							}
						}
					}
				}
				if (!prefVoiceFound) { 
					// select the first language that matches the first 2 characters of the lang code
					for (var i=0; i<voices.length; i++) {
						if (voices[i].lang.substring(0,2).toLowerCase() === descLang.substring(0,2).toLowerCase()) {
							descVoice = voices[i].name;
							break;
						}
					}
				}
				// make this the user's current preferred voice
				this.prefDescVoice = descVoice;
				this.prefDescVoiceLang = descLang;
				// select this voice in the Description Prefs dialog
				if (this.$voiceSelectField) {
					var selectedOption = this.$voiceSelectField.find('option[value="' + this.prefDescVoice + '"]');
					this.$voiceSelectField.val(this.prefDescVoice);
				}
				this.updateCookie('voice'); 
			}
		}
	};

	AblePlayer.prototype.swapDescription = function() {

		// swap described and non-described source media, depending on which is playing
		// this function is only called in two circumstances:
		// 1. Swapping to described version when initializing player (based on user prefs & availability)
		// (playerCreated == false)
		// 2. User is toggling description
		// (playerCreated == true)

		var thisObj, i, origSrc, descSrc, srcType, newSource;

		thisObj = this;

		// We are no longer loading the previous media source 
		// Only now, as a new source is requested, is it safe to reset this var 
		// It will be reset to true when media.load() is called 
		this.loadingMedia = false; 

		// get element that has focus at the time swap is initiated 
		// after player is rebuilt, focus will return to that same element 
		// (if it exists)
		this.$focusedElement = $(':focus'); 

		// get current time of current source, and attempt to start new video at the same time
		// whether this is possible will be determined after the new media source has loaded 
		// see onMediaNewSourceLoad() 
		if (this.elapsed > 0) { 
			this.swapTime = this.elapsed; 
		}
		else { 
			this.swapTime = 0; 
		}
		if (this.duration > 0) { 
			this.prevDuration = this.duration; 										
		}

		// Capture current playback state, so media can resume after source is swapped 
		if (!this.okToPlay) { 
			this.okToPlay = this.playing; 
		}

		if (this.descOn) {
			// user has requested the described version
			this.showAlert(this.tt.alertDescribedVersion);
		}
		else {
			// user has requested the non-described version
			this.showAlert(this.tt.alertNonDescribedVersion);
		}

		if (this.player === 'html5') {

			this.swappingSrc = true;
			this.paused = true; 

			if (this.usingDescribedVersion()) {
				// the described version is currently playing. Swap to non-described
				for (i=0; i < this.$sources.length; i++) {
					// for all <source> elements, replace src with data-orig-src
					origSrc = this.$sources[i].getAttribute('data-orig-src');
					srcType = this.$sources[i].getAttribute('type');
					if (origSrc) {
						this.$sources[i].setAttribute('src',origSrc);
					}
				}						
			}
			else {
				// the non-described version is currently playing. Swap to described.
				for (i=0; i < this.$sources.length; i++) {
					// for all <source> elements, replace src with data-desc-src (if one exists)
					// then store original source in a new data-orig-src attribute
					origSrc = this.$sources[i].getAttribute('src');
					descSrc = this.$sources[i].getAttribute('data-desc-src');
					srcType = this.$sources[i].getAttribute('type');
					if (descSrc) {
						this.$sources[i].setAttribute('src',descSrc);
						this.$sources[i].setAttribute('data-orig-src',origSrc);
					}
				}
			}

			if (this.recreatingPlayer) { 
				// stopgap to prevent multiple firings of recreatePlayer()
				return; 
			}	
			if (this.playerCreated) { 
				// delete old player, then recreate it with new source & tracks 
				this.deletePlayer('swap-desc-html'); 			
				this.recreatePlayer().then(function() { 
					if (!thisObj.loadingMedia) { 
						thisObj.media.load();
						thisObj.loadingMedia = true; 
					}
				});
			}
			else { 
				// player is in the process of being created
				// no need to recreate it 	
			} 
		}
		else if (this.player === 'youtube') {

			if (this.usingDescribedVersion()) {
				// the described version is currently playing. Swap to non-described
				this.activeYouTubeId = this.youTubeId;
			}
			else {
				// the non-described version is currently playing. Swap to described.
				this.activeYouTubeId = this.youTubeDescId;
			}
			if (typeof this.youTubePlayer !== 'undefined') {
				thisObj.swappingSrc = true; 
				if (thisObj.playing) {
					// loadVideoById() loads and immediately plays the new video at swapTime
					thisObj.youTubePlayer.loadVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				}
				else {
					// cueVideoById() loads the new video and seeks to swapTime, but does not play
					thisObj.youTubePlayer.cueVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				}
			}
			if (this.playerCreated) { 
				this.deletePlayer('swap-desc-youtube'); 				
			}
			// player needs to be recreated with new source 
			if (this.recreatingPlayer) { 
				// stopgap to prevent multiple firings of recreatePlayer()
				return; 
			}	
			this.recreatePlayer().then(function() { 
				// nothing to do here 
				// next steps occur when youtube onReady event fires 
				// see youtube.js > finalizeYoutubeInit() 
			});				
		}
		else if (this.player === 'vimeo') {
			if (this.usingDescribedVersion()) {
				// the described version is currently playing. Swap to non-described
				this.activeVimeoId = this.vimeoId;
				this.showAlert(this.tt.alertNonDescribedVersion);
			}
			else {
				// the non-described version is currently playing. Swap to described.
				this.activeVimeoId = this.vimeoDescId;
				this.showAlert(this.tt.alertDescribedVersion);
			}
			if (this.playerCreated) { 
				this.deletePlayer('swap-desc-vimeo'); 				
			}
			// player needs to be recreated with new source 
			if (this.recreatingPlayer) { 
				// stopgap to prevent multiple firings of recreatePlayer()
				return; 
			}	
			this.recreatePlayer().then(function() { 
				// load the new video source
				thisObj.vimeoPlayer.loadVideo(thisObj.activeVimeoId).then(function() {
					if (thisObj.playing) {
						// video was playing when user requested an alternative version
						// seek to swapTime and continue playback (playback happens automatically)
						thisObj.vimeoPlayer.setCurrentTime(thisObj.swapTime);
					}
					else {
						// Vimeo autostarts immediately after video loads
						// The "Described" button should not trigger playback, so stop this before the user notices.
						thisObj.vimeoPlayer.pause();
					}
				});
			});
		}
	};

	AblePlayer.prototype.showDescription = function(now) {

		if (!this.hasClosedDesc || this.swappingSrc || !this.descOn || this.descMethod === 'video') {			
			return;
		}

		var thisObj, i, cues, d, thisDescription, descText, msg;
		thisObj = this;

		var flattenComponentForDescription = function (component) {
			var result = [];
			if (component.type === 'string') {
				result.push(component.value);
			}
			else {
				for (var i = 0; i < component.children.length; i++) {
					result.push(flattenComponentForDescription(component.children[i]));
				}
			}
			return result.join('');
		};

		if (this.selectedDescriptions) {
			cues = this.selectedDescriptions.cues;
		}
		else if (this.descriptions.length >= 1) {
			cues = this.descriptions[0].cues;
		}
		else {
			cues = [];
		}
		for (d = 0; d < cues.length; d++) {
			if ((cues[d].start <= now) && (cues[d].end > now)) {
				thisDescription = d;
				break;
			}
		}
		if (typeof thisDescription !== 'undefined') {
			if (this.currentDescription !== thisDescription) {
				// temporarily remove aria-live from $status in order to prevent description from being interrupted
				this.$status.removeAttr('aria-live');
				descText = flattenComponentForDescription(cues[thisDescription].components);
				if (this.descReader === 'screenreader') { 					
					// load the new description into the container div for screen readers to read
					this.$descDiv.html(descText);
				}
				else if (this.speechEnabled) { 
					// use browser's built-in speech synthesis
					this.announceDescriptionText('description',descText);
					if (this.prefDescVisible) {
						// write description to the screen for sighted users
						// but remove ARIA attributes since it isn't intended to be read by screen readers
						this.$descDiv.html(descText).removeAttr('aria-live aria-atomic');
					}
				}
				else {
					// browser does not support speech synthesis
					// load the new description into the container div for screen readers to read
					this.$descDiv.html(descText);
				}
				if (this.prefDescPause && this.descMethod === 'text') {
					this.pauseMedia();
					this.pausedForDescription = true;
				}
				this.currentDescription = thisDescription;
			}
		}
		else {
			this.$descDiv.html('');
			this.currentDescription = -1;
			// restore aria-live to $status
			this.$status.attr('aria-live','polite');
		}
	};

	AblePlayer.prototype.syncSpeechToPlaybackRate = function(rate) { 

		// called when user changed playback rate 
		// adjust rate of audio description to match 

		var speechRate; 

		if (rate === 0.5) { 
			speechRate = 0.7; // option 1 in prefs menu 
		}
		else if (rate === 0.75) { 
			speechRate =  0.8; // option 2 in prefs menu 
		}
		else if (rate === 1.0) { 		
			speechRate =  1; // option 4 in prefs menu (normal speech, default)
		}
		else if (rate === 1.25) { 
			speechRate =  1.1; // option 5 in prefs menu
		}
		else if (rate === 1.5) { 
			speechRate =  1.2; // option 6 in prefs menu 
		}
		else if (rate === 1.75) { 
			speechRate =  1.5; // option 7 in prefs menu 
		}
		else if (rate === 2.0) { 
			speechRate =  2; // option 8 in prefs menu (fast)
		}
		else if (rate === 2.25) { 
			speechRate =  2.5; // option 9 in prefs menu (very fast)
		}
		else if (rate >= 2.5) { 
			speechRate =  3; // option 10 in prefs menu (super fast) 
		}
		this.prefDescRate = speechRate;
	}; 

	AblePlayer.prototype.announceDescriptionText = function(context, text) {

		// this function announces description text using speech synthesis
		// it's only called if already determined that browser supports speech synthesis
		// context is either:
		// 'description' - actual description text extracted from WebVTT file
		// 'sample' - called when user changes a setting in Description Prefs dialog

		var thisObj, voiceName, i, voice, pitch, rate, volume, utterance,
			timeElapsed, secondsElapsed;

		thisObj = this;

		// As of Feb 2021,
		// 1. In some browsers (e.g., Chrome) window.speechSynthesis.getVoices()
		//  returns 0 voices unless the request is triggered with a user click
		//  Therefore, description may have failed to initialize when the page loaded
		//  This function cannot have been called without a mouse click.
		//  Therefore, this is a good time to check that, and try again if needed
		// 2. In some browsers, the window.speechSynthesis.speaking property fails to reset,
		//  and onend event is never fired. This prevents new speech from being spoken.
		//  window.speechSynthesis.cancel() also fails, so it's impossible to recover.
		//  This only seems to happen with some voices.
		//  Typically the first voice in the getVoices() array (index 0) is realiable
		//  When speech synthesis gets wonky, this is a deep problem that impacts all browsers
		//  and typically requires a computer reboot to make right again.
		//  This has been observed frequently in macOS Big Sur, but also in Windows 10
		//  To ignore user's voice preferences and always use the first voice, set the following var to true
		//	This is for testing only; not recommended for production
		// 	unless the voice select field is also removed from the Prefs dialog
		var useFirstVoice = false;
	
		if (!this.speechEnabled) {
			// voices array failed to load the first time. Try again
			this.initSpeech('desc');
		}

		if (context === 'sample') {
			// get settings from form
			voiceName = $('#' + this.mediaId + '_prefDescVoice').val();
			pitch = $('#' + this.mediaId + '_prefDescPitch').val();
			rate = $('#' + this.mediaId + '_prefDescRate').val();
			volume = $('#' + this.mediaId + '_prefDescVolume').val();
		}
		else {
			// get settings from global prefs
			voiceName = this.prefDescVoice;
			pitch = this.prefDescPitch;
			rate = this.prefDescRate;
			volume = this.prefDescVolume;
		}

		// get the voice associated with the user's chosen voice name
		if (this.descVoices) {
			if (this.descVoices.length > 0) {
				if (useFirstVoice) {
					voice = this.descVoices[0];
				}
				else if (voiceName) {
					// get the voice that matches user's preferred voiceName
					for (i = 0; i < this.descVoices.length; i++) {
						if (this.descVoices[i].name == voiceName) {
							voice = this.descVoices[i];
							break;
						}
					}
				}
				if (typeof voice === 'undefined') {
					// no matching voice was found
					// use the first voice in the array
					voice = this.descVoices[0];
				}
				utterance = new SpeechSynthesisUtterance();
				utterance.voice = voice;
				utterance.voiceURI = 'native';
				utterance.volume = volume;
				utterance.rate = rate;
				utterance.pitch = pitch;
				utterance.text = text;
				// TODO: Consider the best language for the utterance:
				// language of the web page? (this.lang)
				// language of the WebVTT description track?
				// language of the user's chosen voice?
				// If there's a mismatch between any of these, the description will likely be unintelligible
				utterance.lang = this.lang;
				utterance.onstart = function(e) { 
					// utterance has started 
				};
				utterance.onpause = function(e) { 
					// utterance has paused 
				};
				utterance.onend = function(e) {
					// utterance has ended 
					this.speakingDescription = false; 
					timeElapsed = e.elapsedTime; 
					// As of Firefox 95, e.elapsedTime is expressed in seconds 
					// Other browsers (tested in Chrome & Edge) express this in milliseconds 
					// Assume no utterance will require over 100 seconds to express... 
					if (timeElapsed > 100) { 
						// time is likely expressed in milliseconds 
						secondsElapsed = (e.elapsedTime/1000).toFixed(2); 
					}
					else { 
						// time is likely already expressed in seconds; just need to round it
						secondsElapsed = (e.elapsedTime).toFixed(2); 
					}
					if (this.debug) { 
						console.log('Finished speaking. That took ' + secondsElapsed + ' seconds.');
					}
					if (context === 'description') {
						if (thisObj.prefDescPause) {
							if (thisObj.pausedForDescription) {
								thisObj.playMedia();
								this.pausedForDescription = false;
							}
						}
					}
				};
				utterance.onerror = function(e) {
					// handle error
					console.log('Web Speech API error',e);
				};
				if (this.synth.paused) { 
					this.synth.resume();					
				}
				this.synth.speak(utterance);
				this.speakingDescription = true; 
			}
		}
	};

})(jQuery);
