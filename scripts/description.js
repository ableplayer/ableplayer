(function ($) {
	AblePlayer.prototype.initDescription = function() {

		// set default mode for delivering description (open vs closed)
		// based on availability and user preference

		// called when player is being built, or when a user
		// toggles the Description button or changes a description-related preference
		// In the latter two scendarios, this.refreshingDesc == true via control.js > handleDescriptionToggle()

		// The following variables are applicable to delivery of description:
		// prefDesc == 1 if user wants description (i.e., Description button is on); else 0
		// prefDescFormat == either 'video' or 'text'
		// prefDescPause == 1 to pause video when description starts; else 0
		// prefVisibleDesc == 1 to visibly show text-based description area; else 0
		// hasOpenDesc == true if a described version of video is available via data-desc-src attribute
		// hasClosedDesc == true if a description text track is available
		// this.useDescFormat == either 'video' or 'text'; the format ultimately delivered
		// descOn == true if description of either type is on

		var thisObj = this;

		if (!this.refreshingDesc) {
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
		// update this.useDescFormat based on media availability & user preferences
		if (this.prefDesc) {
			if (this.hasOpenDesc && this.hasClosedDesc) {
				// both formats are available. Use whichever one user prefers
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
		else { // description button is off
			if (this.refreshingDesc) { // user just now toggled it off
				this.prevDescFormat = this.useDescFormat;
				this.useDescFormat = false;
				this.descOn = false;
			}
			else { // desc has always been off
				this.useDescFormat = false;
			}
		}

		if (this.useDescFormat === 'text') {
			// check whether browser supports the Web Speech API
			if (window.speechSynthesis) {
				// It does!
				this.synth = window.speechSynthesis;
				this.descVoices = this.synth.getVoices();
				// select the first voice that matches the track language
				// available languages are identified with local suffixes (e.g., en-US)
				// in case no matching voices are found, use the first voice in the voices array
				this.descVoiceIndex = 0;
				for (var i=0; i<this.descVoices.length; i++) {
					if (this.captionLang.length === 2) {
						// match only the first 2 characters of the lang code
						if (this.descVoices[i].lang.substr(0,2).toLowerCase() === this.captionLang.toLowerCase()) {
							this.descVoiceIndex = i;
							break;
						}
					}
					else {
						// match the entire lang code
						if (this.descVoices[i].lang.toLowerCase() === this.captionLang.toLowerCase()) {
							this.descVoiceIndex = i;
							break;
						}
					}
				}
			}
		}
		if (this.descOn) {

			if (this.useDescFormat === 'video') {
				if (!this.usingAudioDescription()) {
					// switched from non-described to described version
					this.swapDescription();
				}
				// hide description div
				this.$descDiv.hide();
				this.$descDiv.removeClass('able-clipped');
			}
			else if (this.useDescFormat === 'text') {
				this.$descDiv.show();
				if (this.prefVisibleDesc) { // make it visible to everyone
					this.$descDiv.removeClass('able-clipped');
				}
				else { // keep it visible to screen readers, but hide from everyone else
					this.$descDiv.addClass('able-clipped');
				}
				if (!this.swappingSrc) {
					this.showDescription(this.elapsed);
				}
			}
		}
		else { // description is off.

			if (this.prevDescFormat === 'video') { // user was previously using description via video
				if (this.usingAudioDescription()) {
					this.swapDescription();
				}
			}
			else if (this.prevDescFormat === 'text') { // user was previously using text description
				// hide description div from everyone, including screen reader users
				this.$descDiv.hide();
				this.$descDiv.removeClass('able-clipped');
			}
		}
		this.refreshingDesc = false;
	};

	// Returns true if currently using audio description, false otherwise.
	AblePlayer.prototype.usingAudioDescription = function () {

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

			if (this.usingAudioDescription()) {
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

			if (this.usingAudioDescription()) {
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

				// retrieve/setup captions for the new video from YouTube
				this.setupAltCaptions().then(function() {

					if (thisObj.playing) {
						// loadVideoById() loads and immediately plays the new video at swapTime
						thisObj.youTubePlayer.loadVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
					}
					else {
						// cueVideoById() loads the new video and seeks to swapTime, but does not play
						thisObj.youTubePlayer.cueVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
					}
				});
			}
		}
		else if (this.player === 'vimeo') {
			if (this.usingAudioDescription()) {
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

		if (this.swappingSrc) {
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
				if (typeof this.synth !== 'undefined' && typeof this.descVoiceIndex !== 'undefined') {
					// browser supports speech synthesis and a voice has been selected in initDescription()
					// use the web speech API
					msg = new SpeechSynthesisUtterance();
					msg.voice = this.descVoices[this.descVoiceIndex]; // Note: some voices don't support altering params
					msg.voiceURI = 'native';
					msg.volume = 1; // 0 to 1
					msg.rate = 1.5; // 0.1 to 10 (1 is normal human speech; 2 is fast but easily decipherable; anything above 2 is blazing fast)
					msg.pitch = 1; //0 to 2
					msg.text = descText;
					msg.lang = this.captionLang;
					msg.onend = function(e) {
						// NOTE: e.elapsedTime might be useful
						if (thisObj.pausedForDescription) {
							thisObj.playMedia();
						}
      			};
					this.synth.speak(msg);
					if (this.prefVisibleDesc) {
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
				if (this.prefDescPause) {
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

})(jQuery);
