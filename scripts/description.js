(function ($) {
	AblePlayer.prototype.initDescription = function() {

		// set default mode for delivering description (open vs closed)
		// based on availability and user preference

		// called when player is being built, or when a user
		// toggles the Description button or changes a description-related preference
		// In the latter two scendarios, this.refreshingDesc == true via control.js > handleDescriptionToggle()

		// The following variables are applicable to delivery of description:
		// prefDesc == 1 if user wants description (i.e., Description button is on); else 0
		// prefDescFormat == either 'video' or 'text' (as of v4.0.10, prefDescFormat is always 'video')
		// useDescFormat is the format actually used ('video' or 'text'), regardless of user preference 
		// prevDescFormat is the value of useDescFormat before user toggled off description 
		// prefDescPause == 1 to pause video when description starts; else 0
		// prefDescVisible == 1 to visibly show text-based description area; else 0
		// hasOpenDesc == true if a described version of video is available via data-desc-src attribute
		// hasClosedDesc == true if a description text track is available
		// descOn == true if description of either type is on
		// exposeTextDescriptions == true if text description is to be announced audibly; otherwise false

		var thisObj = this;
		if (this.refreshingDesc) {
			this.prevDescFormat = this.useDescFormat;
		}
		else {
			// this is the initial build
			// first, check to see if there's an open-described version of this video
			// checks only the first source since if a described version is provided,
			// it must be provided for all sources
			this.descFile = this.$sources.first().attr('data-desc-src');
			if (typeof this.descFile !== 'undefined') {
				this.hasOpenDesc = true;
			}
			else {
				// there's no open-described version via data-desc-src,
				// but what about data-youtube-desc-src or data-vimeo-desc-src?
				if (this.youTubeDescId || this.vimeoDescId) {
					this.hasOpenDesc = true;
				}
				else { // there are no open-described versions from any source
					this.hasOpenDesc = false;
				}
			}
		}

		// Set this.useDescFormat based on media availability & user preferences
		if (this.prefDesc) {
			if (this.hasOpenDesc && this.hasClosedDesc) {
				// both formats are available. User gets their preference. 
				this.useDescFormat = this.prefDescFormat;
				this.descOn = true;
			}
			else if (this.hasOpenDesc) {
				this.useDescFormat = 'video';
				this.descOn = true;
			}
			else if (this.hasClosedDesc) {
				this.useDescFormat = 'text';
				this.descOn = true;
			}
		}
		else { 
			// prefDesc is not set for this user 
			this.useDescFormat = null;
			this.descOn = false;
		}

		if (this.useDescFormat === 'video') { 
			// If text descriptions are also available, silence them 
			this.exposeTextDescriptions = false; 
		}

		if (this.descOn) {
			if (this.useDescFormat === 'video') {
				if (!this.usingDescribedVersion()) {
					// switched from non-described to described version
					this.swapDescription();
				}
			}
			if (this.hasClosedDesc) {
				if (this.prefDescVisible) {
					// make description text visible
					// New in v4.0.10: Do this regardless of useDescFormat
					this.$descDiv.show();
					this.$descDiv.removeClass('able-clipped');
				}
				else {
					// keep it visible to screen readers, but hide it visibly
					this.$descDiv.addClass('able-clipped');
				}
				if (!this.swappingSrc) {
					this.showDescription(this.elapsed);
				}
			}
		}
		else { // description is off.
			if (this.prevDescFormat === 'video') { // user has turned off described version of video
				if (this.usingDescribedVersion()) {
					// user was using the described verion. Swap for non-described version
					this.swapDescription();
				}
			}
			else if (this.prevDescFormat === 'text') { // user has turned off text description
				// hide description div from everyone, including screen reader users
				this.$descDiv.hide();
				this.$descDiv.removeClass('able-clipped');
			}
		}
		this.refreshingDesc = false;
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

	AblePlayer.prototype.getBrowserVoices = function () {

		// define this.descVoices
		// NOTE: Some browsers (e.g., Chrome) require a user-initiated click before
		// this.synth.getVoices() will work

		var voices, descLangs, voiceLang, playerLang;

		// if browser supports Web Speech API
		// define this.descvoices (an array of available voices in this browser)
		if (window.speechSynthesis) {
			this.synth = window.speechSynthesis;
			voices = this.synth.getVoices();
			descLangs = this.getDescriptionLangs();
			if (voices.length > 0) {
				this.descVoices = [];
				// available languages are identified with local suffixes (e.g., en-US)
				for (var i=0; i<voices.length; i++) {
					// match only the first 2 characters of the lang code
					// include any language for which there is a matching description track
					// as well as the overall player lang
					voiceLang = voices[i].lang.substr(0,2).toLowerCase();
					playerLang = this.lang.substr(0,2).toLowerCase();
					if (voiceLang === playerLang || (descLangs.indexOf(voiceLang) !== -1)) {
						// this is a match. Add to the final array
						this.descVoices.push(voices[i]);
					}
				}
				if (!this.descVoices.length) {
					// no voices available in the default language(s)
					// just use all voices, regardless of language
					this.descVoices = voices;
				}
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
					descLangs.push(this.tracks[i].language.substr(0,2).toLowerCase());
				}
			}
		}
		return descLangs;
	};

	AblePlayer.prototype.updateDescriptionVoice = function () {

		// Called if user chooses a subtitle language for which there is a matching
		// description track, and the subtitle language is different than the player language
		// This ensures the description is read in a proper voice for the selected language

		var voices, descVoice;
		if (!this.descVoices) {
			this.getBrowserVoices();
			if (this.descVoices) {
				this.rebuildDescPrefsForm();
			}
		}
		else if (!this.$voiceSelectField) {
			this.rebuildDescPrefsForm();
		}

		descVoice = this.selectedDescriptions.language;

		if (this.synth) {
			voices = this.synth.getVoices();
			if (voices.length > 0) {
				// available languages are identified with local suffixes (e.g., en-US)
				for (var i=0; i<voices.length; i++) {
					// select the first language that matches the first 2 characters of the lang code
					if (voices[i].lang.substr(0,2).toLowerCase() === descVoice.substr(0,2).toLowerCase()) {
						// make this the user's current preferred voice
						this.prefDescVoice = voices[i].name;
						// select this voice in the Description Prefs dialog
						if (this.$voiceSelectField) {
							this.$voiceSelectField.val(this.prefDescVoice);
						}
						break;
					}
				}
			}
		}
	};

	AblePlayer.prototype.swapDescription = function() {

		// swap described and non-described source media, depending on which is playing
		// this function is only called in two circumstances:
		// 1. Swapping to described version when initializing player (based on user prefs & availability)
		// 2. User is toggling description
		var thisObj, i, origSrc, descSrc, srcType, newSource;

		thisObj = this;

		// get current time, and start new video at the same time
		// NOTE: There is some risk in resuming playback at the same start time
		// since the described version might include extended audio description (with pauses)
		// and might therefore be longer than the non-described version
		// The benefits though would seem to outweigh this risk

		this.swapTime = this.elapsed; // video will scrub to this time after loaded (see event.js)
		if (this.descOn) {
			// user has requested the described version
			this.showAlert(this.tt.alertDescribedVersion);
		}
		else {
			// user has requested the non-described version
			this.showAlert(this.tt.alertNonDescribedVersion);
		}
		if (this.player === 'html5') {

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
				// No need to check for this.initializing
				// This function is only called during initialization
				// if swapping from non-described to described
				this.swappingSrc = true;
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
				this.swappingSrc = true;
			}

			// now reload the source file.
			if (this.player === 'html5') {
				this.media.load();
			}
		}
		else if (this.player === 'youtube') {

			if (this.usingDescribedVersion()) {
				// the described version is currently playing. Swap to non-described
				this.activeYouTubeId = this.youTubeId;
				this.showAlert(this.tt.alertNonDescribedVersion);
			}
			else {
				// the non-described version is currently playing. Swap to described.
				this.activeYouTubeId = this.youTubeDescId;
				this.showAlert(this.tt.alertDescribedVersion);
			}
			if (typeof this.youTubePlayer !== 'undefined') {

				if (thisObj.playing) {
					// loadVideoById() loads and immediately plays the new video at swapTime
					thisObj.youTubePlayer.loadVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				}
				else {
					// cueVideoById() loads the new video and seeks to swapTime, but does not play
					thisObj.youTubePlayer.cueVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				}
			}
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
			// load the new video source
			this.vimeoPlayer.loadVideo(this.activeVimeoId).then(function() {

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
		}
	};

	AblePlayer.prototype.showDescription = function(now) {

		// there's a lot of redundancy between this function and showCaptions
		// Trying to combine them ended up in a mess though. Keeping as is for now.

		if (!this.exposeTextDescriptions || this.swappingSrc || !this.descOn) {
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
				if (window.speechSynthesis) {
					// browser supports speech synthsis
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
				if (this.prefDescPause && this.exposeTextDescriptions) {
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

	AblePlayer.prototype.announceDescriptionText = function(context, text) {

		// this function announces description text using speech synthesis
		// it's only called if already determined that browser supports speech synthesis
		// context is either:
		// 'description' - actual description text extracted from WebVTT file
		// 'sample' - called when user changes a setting in Description Prefs dialog

		var thisObj, speechTimeout, voiceName, i, voice, pitch, rate, volume, utterance;

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

		if (!this.descVoices) {
			// voices array failed to load the first time. Try again
			this.getBrowserVoices();
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
				utterance.onend = function(e) {
					// do something after speaking
					console.log('Finished speaking. That took ' + (e.elapsedTime/1000).toFixed(2) + ' seconds.');
					if (context === 'description') {
						if (thisObj.prefDescPause) {
							if (thisObj.pausedForDescription && thisObj.exposeTextDescriptions) {
								thisObj.playMedia();
								this.pausedForDescription = false;
							}
						}
					}
				};
				utterance.onerror = function(e) {
					// handle error
					console.log('Web Speech API error',e);
				}
				this.synth.speak(utterance);
			}
		}
	};

})(jQuery);
