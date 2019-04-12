(function ($) {
	AblePlayer.prototype.updateCaption = function (time) {

		if (!this.usingYouTubeCaptions && (typeof this.$captionsWrapper !== 'undefined')) {
			if (this.captionsOn) {
				this.$captionsWrapper.show();
				if (typeof time !== 'undefined') {
					this.showCaptions(time);
				}
			}
			else if (this.$captionsWrapper) {
				this.$captionsWrapper.hide();
				this.prefCaptions = 0;
			}
		}
	};

	AblePlayer.prototype.updateCaptionsMenu = function (lang) {

		// uncheck all previous menu items
		this.captionsPopup.find('li').attr('aria-checked','false');
		if (typeof lang === 'undefined') {
			// check the last menu item (captions off)
			this.captionsPopup.find('li').last().attr('aria-checked','true');
		}
		else {
			// check the newly selected lang
			this.captionsPopup.find('li[lang=' + lang + ']').attr('aria-checked','true');
		}
	};

	// Returns the function used when a caption is clicked in the captions menu.
	// Not called if user clicks "Captions off". Instead, that triggers getCaptionOffFunction()
	AblePlayer.prototype.getCaptionClickFunction = function (track) {

		var thisObj = this;
		return function () {
			thisObj.selectedCaptions = track;
			thisObj.captionLang = track.language;
			thisObj.currentCaption = -1;
			if (thisObj.usingYouTubeCaptions) {
				if (thisObj.captionsOn) {
					if (typeof thisObj.ytCaptionModule !== 'undefined') {
						// captions are already on. Just need to change the language
						thisObj.youTubePlayer.setOption(thisObj.ytCaptionModule, 'track', {'languageCode': thisObj.captionLang});
					}
					else {
						// need to wait for caption module to be loaded to change the language
						// caption module will be loaded after video starts playing, triggered by onApiChange event
						// at that point, thosObj.captionLang will be passed to the module as the default language
					}
				}
				else {
					// captions are off (i.e., captions module has been unloaded; need to reload it)
					// user's selected language will be reset after module has successfully loaded
					// (the onApiChange event will be fired -- see initialize.js > initYouTubePlayer())
					thisObj.resettingYouTubeCaptions = true;
					thisObj.youTubePlayer.loadModule(thisObj.ytCaptionModule);
				}
			}
			else if (thisObj.usingVimeoCaptions) {
				thisObj.vimeoPlayer.enableTextTrack(thisObj.captionLang).then(function(track) {
					// track.language = the iso code for the language
					// track.kind = 'captions' or 'subtitles'
					// track.label = the human-readable label
				}).catch(function(error) {
					switch (error.name) {
						case 'InvalidTrackLanguageError':
							// no track was available with the specified language
							console.log('No ' + track.kind + ' track is available in the specified language (' + track.label + ')');
							break;
						case 'InvalidTrackError':
							// no track was available with the specified language and kind
							console.log('No ' + track.kind + ' track is available in the specified language (' + track.label + ')');
							break;
						default:
							// some other error occurred
							console.log('Error loading ' + track.label + ' ' + track.kind + ' track');
							break;
    				}
				});
			}
			else { // using local track elements for captions/subtitles
				thisObj.syncTrackLanguages('captions',thisObj.captionLang);
				if (!thisObj.swappingSrc) {
					thisObj.updateCaption(thisObj.elapsed);
					thisObj.showDescription(thisObj.elapsed);
				}
			}
			thisObj.captionsOn = true;
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it (used in handleCaptionToggle())
			thisObj.hidingPopup = true;
			thisObj.captionsPopup.hide();
			// Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
			// e.g., if user triggered button with Enter or mouse click, not spacebar
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.updateCaptionsMenu(thisObj.captionLang);
			thisObj.$ccButton.focus();

			// save preference to cookie
			thisObj.prefCaptions = 1;
			thisObj.updateCookie('prefCaptions');
			thisObj.refreshControls('captions');
		}
	};

	// Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
	AblePlayer.prototype.getCaptionOffFunction = function () {

		var thisObj = this;
		return function () {
			if (thisObj.player == 'youtube') {
				thisObj.youTubePlayer.unloadModule(thisObj.ytCaptionModule);
			}
			thisObj.captionsOn = false;
			thisObj.currentCaption = -1;
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it (used in handleCaptionToggle())
			thisObj.hidingPopup = true;
			thisObj.captionsPopup.hide();
			// Ensure stopgap gets cancelled if handleCaptionToggle() isn't called
			// e.g., if user triggered button with Enter or mouse click, not spacebar
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.updateCaptionsMenu();
			thisObj.$ccButton.focus();

			// save preference to cookie
			thisObj.prefCaptions = 0;
			thisObj.updateCookie('prefCaptions');
			if (!this.swappingSrc) {
				thisObj.refreshControls('captions');
				thisObj.updateCaption();
			}
		}
	};

	AblePlayer.prototype.showCaptions = function(now) {

		var c, thisCaption, captionText;
		var cues;
		if (this.selectedCaptions) {
			cues = this.selectedCaptions.cues;
		}
		else if (this.captions.length >= 1) {
			cues = this.captions[0].cues;
		}
		else {
			cues = [];
		}
		for (c = 0; c < cues.length; c++) {
			if ((cues[c].start <= now) && (cues[c].end > now)) {
				thisCaption = c;
				break;
			}
		}
		if (typeof thisCaption !== 'undefined') {
			if (this.currentCaption !== thisCaption) {
				// it's time to load the new caption into the container div
				captionText = this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>');
				this.$captionsDiv.html(captionText);
				this.currentCaption = thisCaption;
				if (captionText.length === 0) {
					// hide captionsDiv; otherwise background-color is visible due to padding
					this.$captionsDiv.css('display','none');
				}
				else {
					this.$captionsDiv.css('display','inline-block');
				}
			}
		}
		else {
			this.$captionsDiv.html('');
			this.currentCaption = -1;
		}
	};

	AblePlayer.prototype.flattenCueForCaption = function (cue) {

		// Takes a cue and returns the caption text to display
		// Also used for chapters

		// Support for 'i' and 'b' tags added in 2.3.66
		// TODO: Add support for 'c' (class) and 'ruby'

		// c (class): <c.myClass1.myClass2>Some text</c>
		// Classes can be used to modify other tags too (e.g., <v.loud>)
		// If <c> tag, should be rendered as a <span>

		// ruby: http://www.w3schools.com/tags/tag_ruby.asp

		// WebVTT also supports 'u' (underline)
		// I see no reason to support that in Able Player.
		// If it's available authors are likely to use it incorrectly
		// where <i> or <b> should be used instead
		// Here are the rare use cases where an underline is appropriate on the web:
		// http://html5doctor.com/u-element/

		var result = [];

		var flattenComponent = function (component) {
			var result = [], ii;
			if (component.type === 'string') {
				result.push(component.value);
			}
			else if (component.type === 'v') {
				result.push('(' + component.value + ')');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
			}
			else if (component.type === 'i') {
				result.push('<em>');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
				result.push('</em>');
			}
			else if (component.type === 'b') {
				result.push('<strong>');
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
				result.push('</strong>');
			}
			else {
				for (ii = 0; ii < component.children.length; ii++) {
					result.push(flattenComponent(component.children[ii]));
				}
			}
			return result.join('');
		};

		if (typeof cue.components !== 'undefined') {
			for (var ii = 0; ii < cue.components.children.length; ii++) {
				result.push(flattenComponent(cue.components.children[ii]));
			}
		}
		return result.join('');
	};

	AblePlayer.prototype.getCaptionsOptions = function(pref) {

		var options = [];

		switch (pref) {

			case 'prefCaptionsFont':
				options[0] = this.tt.serif;
				options[1] = this.tt.sans;
				options[3] = this.tt.cursive;
				options[4] = this.tt.fantasy;
				options[2] = this.tt.monospace;
				break;

			case 'prefCaptionsColor':
			case 'prefCaptionsBGColor':
				// HTML color values must be in English
				options[0] = ['white',this.tt.white];
				options[1] = ['yellow',this.tt.yellow];
				options[2] = ['green',this.tt.green];
				options[3] = ['cyan',this.tt.cyan];
				options[4] = ['blue',this.tt.blue];
				options[5] = ['magenta',this.tt.magenta];
				options[6] = ['red',this.tt.red];
				options[7] = ['black',this.tt.black];
				break;

			case 'prefCaptionsSize':
				options[0] = '75%';
				options[1] = '100%';
				options[2] = '125%';
				options[3] = '150%';
				options[4] = '200%';
				break;

			case 'prefCaptionsOpacity':
				options[0] = '0%';
				options[1] = '25%';
				options[2] = '50%';
				options[3] = '75%';
				options[4] = '100%';
				break;

			case 'prefCaptionsStyle':
				options[0] = this.tt.captionsStylePopOn;
				options[1] = this.tt.captionsStyleRollUp;
				break;

			case 'prefCaptionsPosition':
				options[0] = 'overlay';
				options[1] = 'below';
				break;

		}
		return options;
	};

	AblePlayer.prototype.translatePrefs = function(pref, value, outputFormat) {

		// translate current value of pref to a value supported by outputformat
		if (outputFormat == 'youtube') {
			if (pref === 'size') {
				// YouTube font sizes are a range from -1 to 3 (0 = default)
				switch (value) {
					case '75%':
						return -1;
					case '100%':
						return 0;
					case '125%':
						return 1;
					case '150%':
						return 2;
					case '200%':
						return 3;
				}
			}
		}
		return false;
	}

	AblePlayer.prototype.stylizeCaptions = function($element, pref) {
		// $element is the jQuery element containing the captions
		// this function handles stylizing of the sample caption text in the Prefs dialog
		// plus the actual production captions
		// TODO: consider applying the same user prefs to visible text-based description
		var property, newValue, opacity, lineHeight;

		if (typeof $element !== 'undefined') {
			if (pref == 'prefCaptionsPosition') {
				this.positionCaptions();
			}
			else if (typeof pref !== 'undefined') {
				// just change the one property that user just changed
				if (pref === 'prefCaptionsFont') {
					property = 'font-family';
				}
				else if (pref === 'prefCaptionsSize') {
					property = 'font-size';
				}
				else if (pref === 'prefCaptionsColor') {
					property = 'color';
				}
				else if (pref === 'prefCaptionsBGColor') {
					property = 'background-color';
				}
				else if (pref === 'prefCaptionsOpacity') {
					property = 'opacity';
				}
				if (pref === 'prefCaptionsOpacity') {
					newValue = parseFloat($('#' + this.mediaId + '_' + pref).val()) / 100.0;
				}
				else {
					newValue = $('#' + this.mediaId + '_' + pref).val();
				}
				$element.css(property, newValue);
			}
			else { // no property was specified, update all styles with current saved prefs
				opacity = parseFloat(this.prefCaptionsOpacity) / 100.0;
				$element.css({
					'font-family': this.prefCaptionsFont,
					'font-size': this.prefCaptionsSize,
					'color': this.prefCaptionsColor,
					'background-color': this.prefCaptionsBGColor,
					'opacity': opacity
				});
				if ($element === this.$captionsDiv) {
					if (typeof this.$captionsWrapper !== 'undefined') {
						lineHeight = parseInt(this.prefCaptionsSize,10) + 25;
						this.$captionsWrapper.css('line-height',lineHeight + '%');
					}
				}
				if (this.prefCaptionsPosition === 'below') {
					// also need to add the background color to the wrapper div
					if (typeof this.$captionsWrapper !== 'undefined') {
						this.$captionsWrapper.css({
							'background-color': this.prefCaptionsBGColor,
							'opacity': '1'
						});
					}
				}
				else if (this.prefCaptionsPosition === 'overlay') {
					// no background color for overlay wrapper, captions are displayed in-line
					if (typeof this.$captionsWrapper !== 'undefined') {
						this.$captionsWrapper.css({
							'background-color': 'transparent',
							'opacity': ''
						});
					}
				}
				this.positionCaptions();
			}
		}
	};
	AblePlayer.prototype.positionCaptions = function(position) {

		// set caption position to either 'overlay' or 'below'
		// if position parameter was passed to this function, use that
		// otherwise use user preference
		if (typeof position === 'undefined') {
			position = this.prefCaptionsPosition;
		}
		if (typeof this.$captionsWrapper !== 'undefined') {

			if (position == 'below') {
				this.$captionsWrapper.removeClass('able-captions-overlay').addClass('able-captions-below');
				// also need to update in-line styles
				this.$captionsWrapper.css({
					'background-color': this.prefCaptionsBGColor,
					'opacity': '1'
				});
			}
			else {
				this.$captionsWrapper.removeClass('able-captions-below').addClass('able-captions-overlay');
				this.$captionsWrapper.css({
					'background-color': 'transparent',
					'opacity': ''
				});
			}
		}
	};

})(jQuery);
