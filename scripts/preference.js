(function ($) {
	AblePlayer.prototype.setCookie = function(cookieValue) {

		Cookies.set('Able-Player', JSON.stringify(cookieValue), {
			expires: 90,
			sameSite: 'strict'
		});
	};

	AblePlayer.prototype.getCookie = function() {

		var defaultCookie = {
			preferences: {},
			sign: {},
			transcript: {},
			voices: []
		};

		var cookie;
		try {
			cookie = JSON.parse(Cookies.get('Able-Player'));
		}
		catch (err) {
			// Original cookie can't be parsed; update to default
			this.setCookie(defaultCookie);
			cookie = defaultCookie;
		}
		if (cookie) {
			return cookie;
		}
		else {
			return defaultCookie;
		}
	};

	AblePlayer.prototype.updateCookie = function( setting ) {

		// called when a particular setting had been updated
		// useful for settings updated indepedently of Preferences dialog
		// e.g., prefAutoScrollTranscript, which is updated in control.js > handleTranscriptLockToggle()
		// setting is any supported preference name (e.g., "prefCaptions")
		// OR 'transcript' or 'sign' (not user-defined preferences, used to save position of draggable windows)
		var cookie, $window, windowPos, available, i, prefName, voiceLangFound, newVoice;
		cookie = this.getCookie();
		if (setting === 'transcript' || setting === 'sign') {
			if (setting === 'transcript') {
				$window = this.$transcriptArea;
				windowPos = $window.position();
				if (typeof cookie.transcript === 'undefined') {
					cookie.transcript = {};
				}
				cookie.transcript['position'] = $window.css('position'); // either 'relative' or 'absolute'
				cookie.transcript['zindex'] = $window.css('z-index');
				cookie.transcript['top'] = windowPos.top;
				cookie.transcript['left'] = windowPos.left;
				cookie.transcript['width'] = $window.width();
				cookie.transcript['height'] = $window.height();
			}
			else if (setting === 'sign') {
				$window = this.$signWindow;
				windowPos = $window.position();
				if (typeof cookie.sign === 'undefined') {
					cookie.sign = {};
				}
				cookie.sign['position'] = $window.css('position'); // either 'relative' or 'absolute'
				cookie.sign['zindex'] = $window.css('z-index');
				cookie.sign['top'] = windowPos.top;
				cookie.sign['left'] = windowPos.left;
				cookie.sign['width'] = $window.width();
				cookie.sign['height'] = $window.height();
			}
		}
		else if (setting === 'voice') { 
			if (typeof cookie.voices === 'undefined') {
				cookie.voices = [];
			}
			// replace preferred voice for this lang in cookie.voices array, if one exists 
			// otherwise, add it to the array 
			voiceLangFound = false; 
			for (var v=0; v < cookie.voices.length; v++) { 						
				if (cookie.voices[v].lang === this.prefDescVoiceLang) { 
					voiceLangFound = true; 
					cookie.voices[v].name = this.prefDescVoice; 
				}
			}
			if (!voiceLangFound) { 
				// no voice has been saved yet for this language. Add it to array. 
				newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
				cookie.voices.push(newVoice); 
			}								
		}
		else {
			available = this.getAvailablePreferences();
			// Rebuild cookie with current cookie values,
			// replacing the one value that's been changed
			for (i = 0; i < available.length; i++) {
				prefName = available[i]['name'];
				if (prefName == setting) {
					// this is the one that requires an update
					cookie.preferences[prefName] = this[prefName];
				}
			}
		}
		// Save updated cookie
		this.setCookie(cookie);
	};

	AblePlayer.prototype.getPreferencesGroups = function() {

		// return array of groups in the order in which they will appear
		// in the Preferences popup menu
		// Human-readable label for each group is defined in translation table
		if (this.usingYouTubeCaptions) {
			// no transcript is possible 
			return ['captions','descriptions','keyboard']; 
		}
		else if (this.usingVimeoCaptions) { 
			// users cannot control caption appearance
			// and no transcript is possible
			return ['descriptions','keyboard']; 
		}
		else { 
			return ['captions','descriptions','keyboard','transcript']; 
		} 
	}

	AblePlayer.prototype.getAvailablePreferences = function() {

		// Return the list of currently available preferences.
		// Preferences with no 'label' are set within player, not shown in Prefs dialog
		var prefs = [];

		// Modifier keys preferences
		prefs.push({
			'name': 'prefAltKey', // use alt key with shortcuts
			'label': this.tt.prefAltKey,
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefCtrlKey', // use ctrl key with shortcuts
			'label': this.tt.prefCtrlKey,
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefShiftKey',
			'label': this.tt.prefShiftKey,
			'group': 'keyboard',
			'default': 0
		});

		// Transcript preferences
		prefs.push({
			'name': 'prefTranscript', // transcript default state
			'label': null,
			'group': 'transcript',
			'default': 0 // off because turning it on has a certain WOW factor
		});
		prefs.push({
			'name': 'prefHighlight', // highlight transcript as media plays
			'label': this.tt.prefHighlight,
			'group': 'transcript',
			'default': 1 // on because many users can benefit
		});
		prefs.push({
			'name': 'prefAutoScrollTranscript',
			'label': null,
			'group': 'transcript',
			'default': 1
		});
		prefs.push({
			'name': 'prefTabbable', // tab-enable transcript
			'label': this.tt.prefTabbable,
			'group': 'transcript',
			'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
		});

		// Caption preferences

		prefs.push({
			'name': 'prefCaptions', // closed captions default state
			'label': null,
			'group': 'captions',
			'default': this.defaultStateCaptions
		});

		if (!this.usingYouTubeCaptions) {

			/* // not supported yet
			prefs.push({
				'name': 'prefCaptionsStyle',
				'label': this.tt.prefCaptionsStyle,
				'group': 'captions',
				'default': this.tt.captionsStylePopOn
			});
			*/
			// captions are always positioned above the player for audio 
			if (this.mediaType === 'video') {
				prefs.push({
					'name': 'prefCaptionsPosition',
					'label': this.tt.prefCaptionsPosition,
					'group': 'captions',
					'default': this.defaultCaptionsPosition
				});
			}	
			prefs.push({
				'name': 'prefCaptionsFont',
				'label': this.tt.prefCaptionsFont,
				'group': 'captions',
				'default': 'sans-serif'
			});
		}
		// This is the one option that is supported by YouTube IFrame API
		prefs.push({
			'name': 'prefCaptionsSize',
			'label': this.tt.prefCaptionsSize,
			'group': 'captions',
			'default': '100%'
		});

		if (!this.usingYouTubeCaptions) {

			prefs.push({
				'name': 'prefCaptionsColor',
				'label': this.tt.prefCaptionsColor,
				'group': 'captions',
				'default': 'white'
			});
			prefs.push({
				'name': 'prefCaptionsBGColor',
				'label': this.tt.prefCaptionsBGColor,
				'group': 'captions',
				'default': 'black'
			});
			prefs.push({
				'name': 'prefCaptionsOpacity',
				'label': this.tt.prefCaptionsOpacity,
				'group': 'captions',
				'default': '100%'
			});
		}

		if (this.mediaType === 'video') { 
			// Description preferences
			prefs.push({
				'name': 'prefDesc', // audio description default state
				'label': null,
				'group': 'descriptions',
				'default': this.defaultStateDescriptions
			});
			prefs.push({
				'name': 'prefDescMethod', // audio description default format (if both 'video' and 'text' are available)
				'label': null,
				'group': 'descriptions',
				'default': 'video' // video (an alternative described version) always wins
			});
			prefs.push({
				'name': 'prefDescVoice',
				'label': this.tt.prefDescVoice,
				'group': 'descriptions',
				'default': null // will be set later, in injectPrefsForm()
			});
			prefs.push({
				'name': 'prefDescPitch',
				'label': this.tt.prefDescPitch,
				'group': 'descriptions',
				'default': 1 // 0 to 2
			});
			prefs.push({
				'name': 'prefDescRate',
				'label': this.tt.prefDescRate,
				'group': 'descriptions',
				'default': 1 // 0.1 to 10 (1 is normal speech; 2 is fast but decipherable; >2 is super fast)
			});
			prefs.push({
				'name': 'prefDescVolume',
				'label': this.tt.volume,
				'group': 'descriptions',
				'default': 1 // 0 to 1
			});
			prefs.push({
				'name': 'prefDescPause', // automatically pause when closed description starts
				'label': this.tt.prefDescPause,
				'group': 'descriptions',
				'default': this.defaultDescPause
			});
			prefs.push({
				'name': 'prefDescVisible', // visibly show closed description (if avilable and used)
				'label': this.tt.prefDescVisible,
				'group': 'descriptions',
				'default': 0 // off as of 4.3.16, to avoid overloading the player with visible features
			});
		}
		// Preferences without a category (not shown in Preferences dialogs)
		prefs.push({
			'name': 'prefSign', // open sign language window by default if avilable
			'label': null,
			'group': null,
			'default': 0 // off because clicking an icon to see the sign window has a powerful impact
		});

		return prefs;
	};

	AblePlayer.prototype.loadCurrentPreferences = function () {

		// Load current/default preferences from cookie into the AblePlayer object.

		var available = this.getAvailablePreferences();
		var cookie = this.getCookie();
		// Copy current cookie values into this object, and fill in any default values.
		for (var ii = 0; ii < available.length; ii++) {
			var prefName = available[ii]['name'];
			var defaultValue = available[ii]['default'];
			if (cookie.preferences[prefName] !== undefined) {
				this[prefName] = cookie.preferences[prefName];
			}
			else {
				cookie.preferences[prefName] = defaultValue;
				this[prefName] = defaultValue;
			}
		}

		// Also load array of preferred voices from cookie 
		if (typeof cookie.voices !== 'undefined') { 
			this.prefVoices = cookie.voices;  
		}			

		this.setCookie(cookie);
	};

	AblePlayer.prototype.injectPrefsForm = function (form) {

		// Creates a preferences form and injects it.
		// form is one of the supported forms (groups) defined in getPreferencesGroups()

		var thisObj, available, descLangs,
			$prefsDiv, formTitle, introText,
			$prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
			$fieldset, fieldsetClass, fieldsetId,
			$descFieldset, $descLegend, $legend, legendId,
			thisPref, $thisDiv, thisClass, thisId, $thisLabel, $thisField,
			$div1,id1,$radio1,$label1,
			$div2,id2,$radio2,$label2,
			options,$thisOption,optionValue,optionLang,optionText,sampleCapsDiv,
			changedPref,changedSpan,changedText,
			currentDescState, prefDescVoice, 
			$kbHeading,$kbList,kbLabels,keys,kbListText,$kbListItem,
			dialog,saveButton,cancelButton;

		thisObj = this;
		available = this.getAvailablePreferences();

		// outer container, will be assigned role="dialog"
		$prefsDiv = $('<div>',{
			'class': 'able-prefs-form '
		});
		var customClass = 'able-prefs-form-' + form;
		$prefsDiv.addClass(customClass);

		// add titles and intros 
		if (form == 'captions') {			
			formTitle = this.tt.prefTitleCaptions;
			// Intro text removed in 4.4.32 to cut down on unnecessary verbiage 
		}
		else if (form == 'descriptions') {
			formTitle = this.tt.prefTitleDescriptions;
			var $prefsIntro = $('<p>',{
				text: this.tt.prefIntroDescription1
			});
			var $prefsIntroUL = $('<ul>');
			var $prefsIntroLI1 = $('<li>',{
				text: this.tt.prefDescFormatOption1
			});
			var $prefsIntroLI2 = $('<li>',{
				text: this.tt.prefDescFormatOption2
			});

			$prefsIntroUL.append($prefsIntroLI1,$prefsIntroLI2);
			if (this.hasOpenDesc && this.hasClosedDesc) {
				currentDescState = this.tt.prefIntroDescription2 + ' ';
				currentDescState += '<strong>' + this.tt.prefDescFormatOption1b + '</strong>';
				currentDescState += ' <em>' + this.tt.and + '</em> <strong>' + this.tt.prefDescFormatOption2b + '</strong>.';
			}
			else if (this.hasOpenDesc) {
				currentDescState = this.tt.prefIntroDescription2;
				currentDescState += ' <strong>' + this.tt.prefDescFormatOption1b + '</strong>.';
			}
			else if (this.hasClosedDesc) {
				currentDescState = this.tt.prefIntroDescription2;
				currentDescState += ' <strong>' + this.tt.prefDescFormatOption2b + '</strong>.';
			}
			else {
				currentDescState = this.tt.prefIntroDescriptionNone;
			}
			$prefsIntroP2 = $('<p>',{
				html: currentDescState
			});

			p3Text = this.tt.prefIntroDescription3;
			if (this.hasOpenDesc || this.hasClosedDesc) {
				p3Text += ' ' + this.tt.prefIntroDescription4;
			}
			$prefsIntroP3 = $('<p>',{
				text: p3Text
			});

			$prefsDiv.append($prefsIntro,$prefsIntroUL,$prefsIntroP2,$prefsIntroP3);
		}
		else if (form == 'keyboard') {
			formTitle = this.tt.prefTitleKeyboard;
			introText = this.tt.prefIntroKeyboard1;
			introText += ' ' + this.tt.prefIntroKeyboard2;
			introText += ' ' + this.tt.prefIntroKeyboard3;
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		}
		else if (form == 'transcript') {
			formTitle = this.tt.prefTitleTranscript;
			// Intro text removed in 4.4.32 to cut down on unnecessary verbiage 
		}

		$fieldset = $('<div>').attr('role','group');	
		fieldsetClass = 'able-prefs-' + form;
		fieldsetId = this.mediaId + '-prefs-' + form;
		legendId = fieldsetId + '-legend';
		$fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
		if (form === 'keyboard') {
			$legend = $('<h2>' + this.tt.prefHeadingKeyboard1 + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		}
		else if (form === 'descriptions') {
			$legend = $('<h2>' + this.tt.prefHeadingTextDescription + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		}
		for (i=0; i<available.length; i++) {

			// only include prefs on the current form if they have a label
			if ((available[i]['group'] == form) && available[i]['label']) {

				thisPref = available[i]['name'];
				thisClass = 'able-' + thisPref;
				thisId = this.mediaId + '_' + thisPref;
				$thisDiv = $('<div>').addClass(thisClass);

				if (form === 'captions') {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<select>',{
						name: thisPref,
						id: thisId,
					});
					if (thisPref !== 'prefCaptions' && thisPref !== 'prefCaptionsStyle') {
						// add a change handler that updates the style of the sample caption text
						$thisField.change(function() {
							changedPref = $(this).attr('name');
							thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
						});
					}
					options = this.getCaptionsOptions(thisPref);
					for (j=0; j < options.length; j++) {
						if (thisPref === 'prefCaptionsPosition') {
							optionValue = options[j];
							if (optionValue === 'overlay') {
								optionText = this.tt.captionsPositionOverlay;
							}
							else if (optionValue === 'below') {
								optionValue = options[j];
								optionText = this.tt.captionsPositionBelow;
							}
						}
						else if (thisPref === 'prefCaptionsFont' || thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
							optionValue = options[j][0];
							optionText = options[j][1];
						}
						else if (thisPref === 'prefCaptionsOpacity') {
							optionValue = options[j];
							optionText = options[j];
							if (optionValue === '0%') {
								optionText += ' (' + this.tt.transparent + ')';
							}
							else if (optionValue === '100%') {
								optionText += ' (' + this.tt.solid + ')';
							}
						}
						else {
							optionValue = options[j];
							optionText = options[j];
						}
						$thisOption = $('<option>',{
							value: optionValue,
							text: optionText
						});
						if (this[thisPref] === optionValue) {
							$thisOption.prop('selected',true);
						}
						$thisField.append($thisOption);
					}
					$thisDiv.append($thisLabel,$thisField);
				}
				else if (form === 'descriptions') {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					if (thisPref === 'prefDescPause' || thisPref === 'prefDescVisible') {
						// these preferences are checkboxes
						$thisDiv.addClass('able-prefs-checkbox');
						$thisField = $('<input>',{
							type: 'checkbox',
							name: thisPref,
							id: thisId,
							value: 'true'
						});
						// check current active value for this preference
						if (this[thisPref] === 1) {
							$thisField.prop('checked',true);
						}
						$thisDiv.append($thisField,$thisLabel);
					}
					else if (this.synth) {
						// Only show these options if browser supports speech synthesis
						$thisDiv.addClass('able-prefs-select');
						$thisField = $('<select>',{
							name: thisPref,
							id: thisId,
						});
						if (thisPref === 'prefDescVoice' && this.descVoices) {
							prefDescVoice = this.getPrefDescVoice(); 				
							for (j=0; j < this.descVoices.length; j++) {
								optionValue = this.descVoices[j].name;
								optionLang = this.descVoices[j].lang.substring(0,2).toLowerCase(); 
								optionText = optionValue + ' (' + this.descVoices[j].lang + ')';
								$thisOption = $('<option>',{
									'value': optionValue,
									'data-lang': optionLang,
									text: optionText
								});
								if (prefDescVoice === optionValue) {
									$thisOption.prop('selected',true);
								}
								$thisField.append($thisOption);
							}
							this.$voiceSelectField = $thisField;
						}
						else {
							if (thisPref == 'prefDescPitch') { // 0 to 2
								options = [0,0.5,1,1.5,2];
							}
							else if (thisPref == 'prefDescRate') { // 0.1 to 10
								// Tests with a variety of voices on MacOS and Windows
								// yielded the following choices that seem reasonable for audio description:
								// 0.5 - too slow (exclude this)
								// 0.7 - casual
								// 0.8 - add this
								// 0.9 - add this
								// 1 - normal
								// 1.1 - add this
								// 1.2 - add this
								// 1.5 - quick
								// 2 - speedy
								// 2.5 - fleet
								// 3 - fast! (some voices don't get any faster than this

								// Note: if these values are modified, must also modfiy them
								// in makePrefsValueReadable()
								options = [0.7,0.8,0.9,1,1.1,1.2,1.5,2,2.5,3];
							}
							else if (thisPref == 'prefDescVolume') { // 0 (mute) to 1
								options = [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1];
							}
							if (typeof options !== 'undefined') {
								for (j=0; j < options.length; j++) {
									optionValue = options[j];
									optionText = this.makePrefsValueReadable(thisPref,optionValue);
									$thisOption = $('<option>',{
										value: optionValue,
										text: optionText
									});
									if (this[thisPref] == optionValue) {
										$thisOption.prop('selected',true);
									}
									$thisField.append($thisOption);
									$thisDiv.append($thisLabel,$thisField);
								}
							}
						}
						// add a change handler that announces the sample description text
						$thisField.on('change',function() {
							thisObj.announceDescriptionText('sample',thisObj.currentSampleText);
						});
						$thisDiv.append($thisLabel,$thisField);
					}
				}
				else { // all other fields are checkboxes
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<input>',{
						type: 'checkbox',
						name: thisPref,
						id: thisId,
						value: 'true'
					});
					// check current active value for this preference
					if (this[thisPref] === 1) {
						$thisField.prop('checked',true);
					}
					if (form === 'keyboard') {
						// add a change handler that updates the list of current keyboard shortcuts
						$thisField.on('change',function() {
							changedPref = $(this).attr('name');
							if (changedPref === 'prefAltKey') {
								changedSpan = '.able-modkey-alt';
								changedText = thisObj.tt.prefAltKey + ' + ';
							}
							else if (changedPref === 'prefCtrlKey') {
								changedSpan = '.able-modkey-ctrl';
								changedText = thisObj.tt.prefCtrlKey + ' + ';
							}
							else if (changedPref === 'prefShiftKey') {
								changedSpan = '.able-modkey-shift';
								changedText = thisObj.tt.prefShiftKey + ' + ';
							}
							if ($(this).is(':checked')) {
								$(changedSpan).text(changedText);
							}
							else {
								$(changedSpan).text('');
							}
						});
					}
					$thisDiv.append($thisField,$thisLabel);
				}
				$fieldset.append($thisDiv);
			}
		}
		$prefsDiv.append($fieldset);

		if (form === 'captions') {
			// add a sample closed caption div to prefs dialog
			// do not show this for YouTube captions, since it's not an accurate reflection
			if (!this.usingYouTubeCaptions) {
				this.$sampleCapsDiv = $('<div>',{
					'class': 'able-captions-sample'
				}).text(this.tt.sampleCaptionText);
				$prefsDiv.append(this.$sampleCapsDiv);
				this.stylizeCaptions(this.$sampleCapsDiv);
			}
		}
		else if (form === 'descriptions') {
			if (this.synth) {
				// add a div with sample audio description text
				this.$sampleDescDiv = $('<div>',{
					'class': 'able-desc-sample'
				}).text(this.tt.sampleDescriptionText);
				$prefsDiv.append(this.$sampleDescDiv);
				this.currentSampleText = this.tt.sampleDescriptionText; 
			}
		}
		else if (form === 'keyboard') {
			// add a current list of keyboard shortcuts
			$kbHeading = $('<h2>',{
				text: this.tt.prefHeadingKeyboard2
			});
			$kbList = $('<ul>');
			// create arrays of kbLabels and keys
			kbLabels = [];
			keys = [];
			for (i=0; i<this.controls.length; i++) {
				if (this.controls[i] === 'play') {
					kbLabels.push(this.tt.play + '/' + this.tt.pause);
					keys.push('p</span> <em>' + this.tt.or + '</em> <span class="able-help-modifiers"> ' + this.tt.spacebar);
				}
				else if (this.controls[i] === 'restart') {
					kbLabels.push(this.tt.restart);
					keys.push('s');
				}
				else if (this.controls[i] === 'previous') {
					kbLabels.push(this.tt.prevTrack);
					keys.push('b'); // b = back
				}
				else if (this.controls[i] === 'next') {
					kbLabels.push(this.tt.nextTrack);
					keys.push('n');
				}
				else if (this.controls[i] === 'rewind') {
					kbLabels.push(this.tt.rewind);
					keys.push('r');
				}
				else if (this.controls[i] === 'forward') {
					kbLabels.push(this.tt.forward);
					keys.push('f');
				}
				else if (this.controls[i] === 'volume') {
					kbLabels.push(this.tt.volume);
					keys.push('v</span> <em>' + this.tt.or + '</em> <span class="able-modkey">1-9');
					// mute toggle
					kbLabels.push(this.tt.mute + '/' + this.tt.unmute);
					keys.push('m');
				}
				else if (this.controls[i] === 'captions') {
					if (this.captions.length > 1) {
						// caption button launches a Captions popup menu
						kbLabels.push(this.tt.captions);
					}
					else {
						// there is only one caption track
						// therefore caption button is a toggle
						if (this.captionsOn) {
							kbLabels.push(this.tt.hideCaptions);
						}
						else {
							kbLabels.push(this.tt.showCaptions);
						}
					}
					keys.push('c');
				}
				else if (this.controls[i] === 'descriptions') {
					if (this.descOn) {
						kbLabels.push(this.tt.turnOffDescriptions);
					}
					else {
						kbLabels.push(this.tt.turnOnDescriptions);
					}
					keys.push('d');
				}
				else if (this.controls[i] === 'prefs') {
					kbLabels.push(this.tt.preferences);
					keys.push('e');
				}
				else if (this.controls[i] === 'help') {
					kbLabels.push(this.tt.help);
					keys.push('h');
				}
			}
			for (i=0; i<keys.length; i++) {
				// alt
				kbListText = '<span class="able-modkey-alt">';
				if (this.prefAltKey === 1) {
					kbListText += this.tt.prefAltKey + ' + ';
				}
				kbListText += '</span>';
				// ctrl
				kbListText += '<span class="able-modkey-ctrl">';
				if (this.prefCtrlKey === 1) {
					kbListText += this.tt.prefCtrlKey + ' + ';
				}
				kbListText += '</span>';
				// shift
				kbListText += '<span class="able-modkey-shift">';
				if (this.prefShiftKey === 1) {
					kbListText += this.tt.prefShiftKey + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey">' + keys[i] + '</span>';
				kbListText += ' = ' + kbLabels[i];
				$kbListItem = $('<li>',{
					html: kbListText
				});
				$kbList.append($kbListItem);
			}
			// add Escape key
			kbListText = '<span class="able-modkey">' + this.tt.escapeKey + '</span>';
			kbListText += ' = ' + this.tt.escapeKeyFunction;
			$kbListItem = $('<li>',{
				html: kbListText
			});
			$kbList.append($kbListItem);
			// put it all together
			$prefsDiv.append($kbHeading,$kbList);
		}

		// $prefsDiv (dialog) must be appended to the BODY!
		// otherwise when aria-hidden="true" is applied to all background content
		// that will include an ancestor of the dialog,
		// which will render the dialog unreadable by screen readers
		$('body').append($prefsDiv);
		dialog = new AccessibleDialog($prefsDiv, this.$prefsButton, 'dialog', true, formTitle, $prefsIntro, thisObj.tt.closeButtonLabel, '32em');

		// Add save and cancel buttons.
		$prefsDiv.append('<hr>');
		saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
		cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
		saveButton.click(function () {
			dialog.hide();
			thisObj.savePrefsFromForm();
		});
		cancelButton.click(function () {
			dialog.hide();
			thisObj.resetPrefsForm();
		});

		$prefsDiv.append(saveButton);
		$prefsDiv.append(cancelButton);

		// Associate the dialog's H1 as aria-labelledby for groups of fields
		// (alternative to fieldset and legend) 
		if (form === 'captions' || form === 'transcript') { 
			$fieldset.attr('aria-labelledby',dialog.titleH1.attr('id')); 
		}

		// add global reference for future control
		if (form === 'captions') {
			this.captionPrefsDialog = dialog;
		}
		else if (form === 'descriptions') {
			this.descPrefsDialog = dialog;
		}
		else if (form === 'keyboard') {
			this.keyboardPrefsDialog = dialog;
		}
		else if (form === 'transcript') {
			this.transcriptPrefsDialog = dialog;
		}

		// Add click handler for dialog close button
		// (button is added in dialog.js)
		$('div.able-prefs-form button.modalCloseButton').click(function() {
			thisObj.resetPrefsForm();
		})
		// Add handler for escape key
		$('div.able-prefs-form').keydown(function(e) {
			if (e.which === 27) { // escape
				thisObj.resetPrefsForm();
			}
		});
	};

	AblePlayer.prototype.getPrefDescVoice = function () {

		// return user's preferred voice for the current language from cookie.voices 
		var lang, cookie, i; 

		if (this.selectedDescriptions) { 
			lang = this.selectedDescriptions.language; 
		}
		else if (this.captionLang) { 
			lang = this.captionLang; 
		}
		else { 
			lang = this.lang; 
		}
		cookie = this.getCookie(); 
		if (cookie.voices) { 
			for (i=0; i < cookie.voices.length; i++) { 
				if (cookie.voices[i].lang === lang) { 					
					return cookie.voices[i].name; 
				}
			}
		}
		return null; // user has no saved preference
	}

	AblePlayer.prototype.rebuildDescPrefsForm = function () {

		// Called if this.descVoices changes, which may happen if: 
		//  getBrowserVoices() succeeds after an earlier failure 
		//  user changes language of captions/subtitles and descVoices changes to match the new language 

		var i, optionValue, optionText, $thisOption;

		this.$voiceSelectField = $('#' + this.mediaId + '_prefDescVoice');
		this.$voiceSelectField.empty();
		for (i=0; i < this.descVoices.length; i++) {
			optionValue = this.descVoices[i].name;
			optionText = optionValue + ' (' + this.descVoices[i].lang + ')';
			$thisOption = $('<option>',{
				'value': optionValue,
				'data-lang': this.descVoices[i].lang.substring(0,2).toLowerCase(),
				text: optionText
			});
			if (this.prefDescVoice == optionValue) {
				$thisOption.prop('selected',true);
			}
			this.$voiceSelectField.append($thisOption);
		}
	};

	 AblePlayer.prototype.makePrefsValueReadable = function(pref,value) {

		 // The values for pitch, rate, and volume (web speech API)
		 // are strange and inconsistent between variables
		 // this function returns text that is more readable than the values themselves

		 if (pref === 'prefDescPitch') {
			 if (value === 0) {
				 return this.tt.prefDescPitch1;
			 }
			 else if (value === 0.5) {
				 return this.tt.prefDescPitch2;
			 }
			 else if (value === 1) {
				 return this.tt.prefDescPitch3;
			 }
			 else if (value === 1.5) {
				 return this.tt.prefDescPitch4;
			 }
			 else if (value === 2) {
				 return this.tt.prefDescPitch5;
			 }
		 }
		 else if (pref === 'prefDescRate') {
			 // default in the API is 0.1 to 10, where 1 is normal speaking voice
			 // our custom range offers several rates close to 1
			 // plus a couple of crazy fast ones for sport
			 // Our more readable options (1-10) or mapped here to API values 
			 if (value === 0.7) {
				 return 1;
			 }
			 else if (value === 0.8) {
				 return 2;
			 }
			 else if (value === 0.9) {
				 return 3;
			 }
			 else if (value === 1) {
				 return 4;
			 }
			 else if (value === 1.1) {
				 return 5;
			 }
			 else if (value === 1.2) {
				 return 6;
			 }
			 else if (value === 1.5) {
				 return 7;
			 }
			 else if (value === 2) {
				 return 8;
			 }
			 else if (value === 2.5) {
				 return 9;
			 }
			 else if (value === 3) {
				 return 10;
			 }
		 }
		 else if (pref === 'prefDescVolume') {
			 // values range from 0.1 to 1.0
			 return value * 10;
		 }
		 return value;
	 };

	 AblePlayer.prototype.resetPrefsForm = function () {

		 // Reset preferences form with default values from cookie
		 // Called when:
		 // User clicks cancel or close button in Prefs Dialog
		 // User presses Escape to close Prefs dialog
		 // User clicks Save in Prefs dialog, & there's more than one player on page

		 var thisObj, cookie, available, i, prefName, prefId, thisDiv, thisId;

		 thisObj = this;
		 cookie = this.getCookie();
		 available = this.getAvailablePreferences();
		 for (i=0; i<available.length; i++) {
			 prefName = available[i]['name'];
			 prefId = this.mediaId + '_' + prefName;
			 if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
				 // this is a caption-related select box
				 $('select[name="' + prefName + '"]').val(cookie.preferences[prefName]);
			 }
			 else { // all others are checkboxes
				 if (this[prefName] === 1) {
					 $('input[name="' + prefName + '"]').prop('checked',true);
					}
					else {
						$('input[name="' + prefName + '"]').prop('checked',false);
					}
				}
			}
			// also restore style of sample caption div
			this.stylizeCaptions(this.$sampleCapsDiv);
	 };

	AblePlayer.prototype.savePrefsFromForm = function () {

		// Return a prefs object constructed from the form.
		// called when user saves the Preferences form
		// update cookie with new value
		var cookie, available, prefName, prefId, 
			voiceSelectId, newVoice, newVoiceLang, numChanges, voiceLangFound, 
			numCapChanges, capSizeChanged, capSizeValue, newValue;

		numChanges = 0;
		numCapChanges = 0; // changes to caption-style-related preferences
		capSizeChanged = false;
		cookie = this.getCookie();
		available = this.getAvailablePreferences();
		for (var i=0; i < available.length; i++) {
			// only prefs with labels are used in the Prefs form
			if (available[i]['label']) {
				prefName = available[i]['name'];
				prefId = this.mediaId + '_' + prefName;
				if (prefName === 'prefDescVoice') { 
					if (typeof cookie.voices === 'undefined') {
						cookie.voices = [];
					}
					voiceSelectId = this.mediaId + '_prefDescVoice';
					this.prefDescVoice = $('select#' + voiceSelectId).find(':selected').val();
					this.prefDescVoiceLang = $('select#' + voiceSelectId).find(':selected').attr('data-lang');
					// replace preferred voice for this lang in cookie.voices array, if one exists 
					// otherwise, add it to the array 
					voiceLangFound = false; 
					for (var v=0; v < cookie.voices.length; v++) { 						
						if (cookie.voices[v].lang === this.prefDescVoiceLang) { 
							voiceLangFound = true; 
							cookie.voices[v].name = this.prefDescVoice; 
						}
					}
					if (!voiceLangFound) { 
						// no voice has been saved yet for this language. Add it to array. 
						newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
						cookie.voices.push(newVoice); 
					}					
					numChanges++; 
				}
				else if (prefName == 'prefDescMethod') {
					// As of v4.0.10, prefDescMethod is no longer a choice
					// this.prefDescMethod = $('input[name="' + prefName + '"]:checked').val();
					this.prefDescMethod = 'video';
					if (this.prefDescMethod !== cookie.preferences['prefDescMethod']) { // user's preference has changed
						cookie.preferences['prefDescMethod'] = this.prefDescMethod;
						numChanges++;
					}
				}
				else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
					// this is one of the caption-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (cookie.preferences[prefName] !== newValue) { // user changed setting
						cookie.preferences[prefName] = newValue;
						// also update global var for this pref (for caption fields, not done elsewhere)
						this[prefName] = newValue;
						numChanges++;
						numCapChanges++;
					}
					if (prefName === 'prefCaptionsSize') {
						capSizeChanged = true;
						capSizeValue = newValue;
					}
				}
				else if ((prefName.indexOf('Desc') !== -1) && (prefName !== 'prefDescPause') && prefName !== 'prefDescVisible') {
					// this is one of the description-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (cookie.preferences[prefName] !== newValue) { // user changed setting
						cookie.preferences[prefName] = newValue;
						// also update global var for this pref
						this[prefName] = newValue;
						numChanges++;
					}
				}
				else { // all other fields are checkboxes
					if ($('input[id="' + prefId + '"]').is(':checked')) {
						cookie.preferences[prefName] = 1;
						if (this[prefName] === 1) {
							// nothing has changed
						}
						else {
							// user has just turned this pref on
							this[prefName] = 1;
							numChanges++;
						}
					}
					else { // thisPref is not checked
						cookie.preferences[prefName] = 0;
						if (this[prefName] === 1) {
							// user has just turned this pref off
							this[prefName] = 0;
							numChanges++;
						}
						else {
							// nothing has chaged
						}
					}
				}
			}
		}
		if (numChanges > 0) {
			this.setCookie(cookie);
			this.showAlert(this.tt.prefSuccess);
		}
		else {
			this.showAlert(this.tt.prefNoChange);
		}
		if (this.player === 'youtube' &&
			(typeof this.usingYouTubeCaptions !== 'undefined' && this.usingYouTubeCaptions) &&
			capSizeChanged) {
				// update font size of YouTube captions
				this.youTubePlayer.setOption('captions','fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
		}
		if (AblePlayerInstances.length > 1) {
			// there are multiple players on this page.
			// update prefs for ALL of them
			for (var i=0; i<AblePlayerInstances.length; i++) {
				AblePlayerInstances[i].updatePrefs();
				AblePlayerInstances[i].geteferences();
				AblePlayerInstances[i].resetPrefsForm();
				if (numCapChanges > 0) {
					AblePlayerInstances[i].stylizeCaptions(AblePlayerInstances[i].$captionsDiv);
					// also apply same changes to descriptions, if present
					if (typeof AblePlayerInstances[i].$descDiv !== 'undefined') {
						AblePlayerInstances[i].stylizeCaptions(AblePlayerInstances[i].$descDiv);
					}
				}
			}
		}
		else {
			// there is only one player
			this.updatePrefs();
			if (numCapChanges > 0) {
				this.stylizeCaptions(this.$captionsDiv);
				// also apply same changes to descriptions, if present
				if (typeof this.$descDiv !== 'undefined') {
					this.stylizeCaptions(this.$descDiv);
				}
			}
		}
	}

	AblePlayer.prototype.updatePrefs = function () {

		// Update player based on current prefs. Safe to call multiple times.

		if (this.$transcriptDiv) { 
			// tabbable transcript
			if (this.prefTabbable === 1) {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').attr('tabindex','0');
			}
			else {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').removeAttr('tabindex');
			}

			// transcript highlights
			if (this.prefHighlight === 0) {
				// user doesn't want highlights; remove any existing highlights
				this.$transcriptDiv.find('span').removeClass('able-highlight');
			}
		}

		// Re-initialize caption and description in case relevant settings have changed
		this.updateCaption();
		this.initDescription();
	};

	AblePlayer.prototype.usingModifierKeys = function(e) {

		// return true if user is holding down required modifier keys
		if ((this.prefAltKey === 1) && !e.altKey) {
			return false;
		}
		if ((this.prefCtrlKey === 1) && !e.ctrlKey) {
			return false;
		}
		if ((this.prefShiftKey === 1) && !e.shiftKey) {
			return false;
		}
		return true;
	};

})(jQuery);
