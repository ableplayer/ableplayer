 /*  global Cookies */
 import $ from 'jquery';
 import AccessibleDialog from './dialog';

 function addPreferenceFunctions(AblePlayer) {
	AblePlayer.prototype.setPrefs = function(preferences) {
		if ( typeof Cookies !== 'undefined' ) {
			Cookies.set('Able-Player', JSON.stringify(preferences), {
				expires: 90,
				sameSite: 'strict'
			});
		} else {
			localStorage.setItem( 'Able-Player', JSON.stringify( preferences ) );
		}
	};

	AblePlayer.prototype.getPref = function() {

		var defaultPrefs = {
			preferences: {},
			sign: {},
			transcript: {},
			voices: []
		};

		var preferences;
		try {
			if ( typeof Cookies !== 'undefined' ) {
				preferences = JSON.parse( Cookies.get('Able-Player') );
			} else {
				preferences = JSON.parse( localStorage.getItem('Able-Player') );
			}
		}
		catch (err) {
			// Original preferences can't be parsed; update to default
			this.setPrefs( defaultPrefs );
			preferences = defaultPrefs;
		}
		return (preferences) ? preferences : defaultPrefs;
	};

	AblePlayer.prototype.updatePreferences = function( setting ) {
		// useful for settings updated independently of Preferences dialog
		// e.g., prefAutoScrollTranscript, which is updated in control.js > handleTranscriptLockToggle()
		// setting is any supported preference name (e.g., "prefCaptions")
		// OR 'transcript' or 'sign' (not user-defined preferences, used to save position of draggable windows)
		var preferences, $window, windowPos, available, i, prefName, voiceLangFound, newVoice;
		preferences = this.getPref();
		if (setting === 'transcript' || setting === 'sign') {
			if (setting === 'transcript') {
				$window = this.$transcriptArea;
				windowPos = $window.position();
				if (typeof preferences.transcript === 'undefined') {
					preferences.transcript = {};
				}
				preferences.transcript['position'] = $window.css('position'); // either 'relative' or 'absolute'
				preferences.transcript['zindex'] = $window.css('z-index');
				preferences.transcript['top'] = windowPos.top;
				preferences.transcript['left'] = windowPos.left;
				preferences.transcript['width'] = $window.width();
				preferences.transcript['height'] = $window.height();
			} else if (setting === 'sign') {
				$window = this.$signWindow;
				windowPos = $window.position();
				if (typeof preferences.sign === 'undefined') {
					preferences.sign = {};
				}
				preferences.sign['position'] = $window.css('position'); // either 'relative' or 'absolute'
				preferences.sign['zindex'] = $window.css('z-index');
				preferences.sign['top'] = windowPos.top;
				preferences.sign['left'] = windowPos.left;
				preferences.sign['width'] = $window.width();
				preferences.sign['height'] = $window.height();
			}
		} else if (setting === 'voice') {
			if (typeof preferences.voices === 'undefined') {
				preferences.voices = [];
			}
			// replace preferred voice for this lang in preferences.voices array, if one exists
			// otherwise, add it to the array
			voiceLangFound = false;
			for (var v=0; v < preferences.voices.length; v++) {
				if (preferences.voices[v].lang === this.prefDescVoiceLang) {
					voiceLangFound = true;
					preferences.voices[v].name = this.prefDescVoice;
				}
			}
			if (!voiceLangFound) {
				// no voice has been saved yet for this language. Add it to array.
				newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
				preferences.voices.push(newVoice);
			}
		} else {
			available = this.getAvailablePreferences();
			// Rebuild preferences with current preferences values,
			// replacing the one value that's been changed
			for (i = 0; i < available.length; i++) {
				prefName = available[i]['name'];
				if (prefName == setting) {
					// this is the one that requires an update
					preferences.preferences[prefName] = this[prefName];
				}
			}
		}
		// Save updated preferences
		this.setPrefs(preferences);
	};

	AblePlayer.prototype.getPreferencesGroups = function() {

		// return array of groups in the order in which they will appear
		// in the Preferences popup menu
		// Human-readable label for each group is defined in translation table
		if (this.usingYouTubeCaptions) {
			// no transcript is possible
			return ['captions','descriptions','keyboard'];
		} else if (this.usingVimeoCaptions) {
			// users cannot control caption appearance
			// and no transcript is possible
			return ['descriptions','keyboard'];
		} else {
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
			'label': this.translate( 'prefAltKey', 'Alt' ),
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefCtrlKey', // use ctrl key with shortcuts
			'label': this.translate( 'prefCtrlKey', 'Control' ),
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefShiftKey',
			'label': this.translate( 'prefShiftKey', 'Shift' ),
			'group': 'keyboard',
			'default': 0
		});
		prefs.push({
			'name': 'prefNoKeyShortcuts',
			'label': this.translate( 'prefNoKeyShortcuts', 'Disable Keyboard Shortcuts' ),
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
			'label': this.translate( 'prefHighlight', 'Highlight transcript as media plays' ),
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
			'label': this.translate( 'prefTabbable', 'Keyboard-enable transcript' ),
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
				'label': this.translate( 'prefCaptionsStyle', 'Style' ),
				'group': 'captions',
				'default': this.translate( 'captionsStylePopOn', 'Pop-on' )
			});
			*/
			// captions are always positioned above the player for audio
			if (this.mediaType === 'video') {
				prefs.push({
					'name': 'prefCaptionsPosition',
					'label': this.translate( 'prefCaptionsPosition', 'Position' ),
					'group': 'captions',
					'default': this.defaultCaptionsPosition
				});
			}
			prefs.push({
				'name': 'prefCaptionsFont',
				'label': this.translate( 'prefCaptionsFont', 'Font' ),
				'group': 'captions',
				'default': 'sans-serif'
			});
		}
		// This is the one option that is supported by YouTube IFrame API
		prefs.push({
			'name': 'prefCaptionsSize',
			'label': this.translate( 'prefCaptionsSize', 'Font size' ),
			'group': 'captions',
			'default': '100%'
		});

		if (!this.usingYouTubeCaptions) {

			prefs.push({
				'name': 'prefCaptionsColor',
				'label': this.translate( 'prefCaptionsColor', 'Text Color' ),
				'group': 'captions',
				'default': 'white'
			});
			prefs.push({
				'name': 'prefCaptionsBGColor',
				'label': this.translate( 'prefCaptionsBGColor', 'Background' ),
				'group': 'captions',
				'default': 'black'
			});
			prefs.push({
				'name': 'prefCaptionsOpacity',
				'label': this.translate( 'prefCaptionsOpacity', 'Opacity' ),
				'group': 'captions',
				'default': '100%'
			});
			prefs.push({
				'name': 'prefCaptionsSpeak',
				'label': this.translate( 'prefVoicedCaptions', 'Voiced Captions' ),
				'group': 'captions',
				'default': 0
			});
			prefs.push({
				'name': 'prefCaptionsVoice',
				'label': this.translate( 'prefDescVoice', 'Voice' ),
				'group': 'captions',
				'default': null // will be set later, in injectPrefsForm()
			});
			prefs.push({
				'name': 'prefCaptionsPitch',
				'label': this.translate( 'prefDescPitch', 'Pitch' ),
				'group': 'captions',
				'default': 1 // 0 to 2
			});
			prefs.push({
				'name': 'prefCaptionsRate',
				'label': this.translate( 'prefDescRate', 'Rate' ),
				'group': 'captions',
				'default': 1.2 // 0.1 to 10 (1 is normal speech; 2 is fast but decipherable; >2 is super fast)
			});
			prefs.push({
				'name': 'prefCaptionsVolume',
				'label': this.translate( 'volume', 'Volume' ),
				'group': 'captions',
				'default': 1 // 0 to 1
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
				'label': this.translate( 'prefDescVoice', 'Voice' ),
				'group': 'descriptions',
				'default': null // will be set later, in injectPrefsForm()
			});
			prefs.push({
				'name': 'prefDescPitch',
				'label': this.translate( 'prefDescPitch', 'Pitch' ),
				'group': 'descriptions',
				'default': 1 // 0 to 2
			});
			prefs.push({
				'name': 'prefDescRate',
				'label': this.translate( 'prefDescRate', 'Rate' ),
				'group': 'descriptions',
				'default': 1 // 0.1 to 10 (1 is normal speech; 2 is fast but decipherable; >2 is super fast)
			});
			prefs.push({
				'name': 'prefDescVolume',
				'label': this.translate( 'volume', 'Volume' ),
				'group': 'descriptions',
				'default': 1 // 0 to 1
			});
			// Don't enable pause option if video described files in use.
			if ( this.descMethod !== 'video' ) {
				prefs.push({
					'name': 'prefDescPause', // automatically pause when closed description starts
					'label': this.translate( 'prefDescPause', 'Automatically pause video when description starts' ),
					'group': 'descriptions',
					'default': this.defaultDescPause
				});
			}
			prefs.push({
				'name': 'prefDescVisible', // visibly show closed description (if avilable and used)
				'label': this.translate( 'prefDescVisible', 'Make description visible' ),
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

		// Load current/default preferences into the AblePlayer object.

		var available = this.getAvailablePreferences();
		var preferences = this.getPref();
		// Copy current preferences values into this object, and fill in any default values.
		for (var ii = 0; ii < available.length; ii++) {
			var prefName = available[ii]['name'];
			var defaultValue = available[ii]['default'];
			if (preferences.preferences[prefName] !== undefined) {
				this[prefName] = preferences.preferences[prefName];
			} else {
				preferences.preferences[prefName] = defaultValue;
				this[prefName] = defaultValue;
			}
		}

		// Also load array of preferred voices from preferences
		if (typeof preferences.voices !== 'undefined') {
			this.prefVoices = preferences.voices;
		}

		this.setPrefs(preferences);
	};

	AblePlayer.prototype.injectPrefsForm = function (form) {

		// Creates a preferences form and injects it.
		// form is one of the supported forms (groups) defined in getPreferencesGroups()

		var thisObj, available,
			$prefsDiv, formTitle, introText, $prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
			$fieldset, fieldsetClass, fieldsetId, $legend, legendId, thisPref, $thisDiv, thisClass,
			thisId, $thisLabel, $thisField, captionsOptions,options,$thisOption,optionValue,optionLang,optionText,
			changedPref,changedSpan,changedText, currentDescState, prefDescVoice, $kbHeading,$kbList,
			kbLabels,keys,kbListText,$kbListItem, dialog,$saveButton,$cancelButton,$buttonContainer;

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
			formTitle = this.translate( 'prefTitleCaptions', 'Captions Preferences' );
		} else if (form == 'descriptions') {
			formTitle = this.translate( 'prefTitleDescriptions', 'Audio Description Preferences' );
			$prefsIntro = $('<p>',{
				text: this.translate( 'prefIntroDescription1', 'This media player supports audio description in two ways: ' )
			});
			var $prefsIntroUL = $('<ul>');
			var $prefsIntroLI1 = $('<li>',{
				text: this.translate( 'prefDescFormatOption1', 'alternative described version of video' )
			});
			var $prefsIntroLI2 = $('<li>',{
				text: this.translate( 'prefDescFormatOption2', 'text-based description, announced by screen reader' )
			});

			$prefsIntroUL.append($prefsIntroLI1,$prefsIntroLI2);
			if (this.hasOpenDesc && this.hasClosedDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' ) + ' ';
				currentDescState += '<strong>' + this.translate( 'prefDescFormatOption1b', 'an alternative described version' ) + '</strong>; ';
				currentDescState += '<strong>' + this.translate( 'prefDescFormatOption2b', 'text-based description, announced by screen reader' ) + '</strong>.';
			} else if (this.hasOpenDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' );
				currentDescState += ' <strong>' + this.translate( 'prefDescFormatOption1b', 'an alternative described version' ) + '</strong>.';
			} else if (this.hasClosedDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' );
				currentDescState += ' <strong>' + this.translate( 'prefDescFormatOption2b', 'text-based description, announced by screen reader' ) + '</strong>.';
			} else {
				currentDescState = this.translate( 'prefIntroDescriptionNone', 'The current video has no audio description in either format.' );
			}
			$prefsIntroP2 = $('<p>',{
				html: currentDescState
			});

			p3Text = this.translate( 'prefIntroDescription3', 'Use the following form to set your preferences related to text-based audio description.' );
			if (this.hasOpenDesc || this.hasClosedDesc) {
				p3Text += ' ' + this.translate( 'prefIntroDescription4', 'After you save your settings, audio description can be toggled on/off using the Description button.' );
			}
			$prefsIntroP3 = $('<p>',{
				text: p3Text
			});

			$prefsDiv.append( $prefsIntro, $prefsIntroUL, $prefsIntroP2, $prefsIntroP3 );
		} else if (form == 'keyboard') {
			formTitle = this.translate( 'prefTitleKeyboard', 'Keyboard Preferences' );
			introText = this.translate( 'prefIntroKeyboard1', 'The media player on this web page can be operated from anywhere on the page using keyboard shortcuts (see below for a list).' );
			introText += ' ' + this.translate( 'prefIntroKeyboard2', 'Modifier keys (Shift, Alt, and Control) can be assigned below.' );
			introText += ' ' + this.translate( 'prefIntroKeyboard3', 'NOTE: Some key combinations might conflict with keys used by your browser and/or other software applications. Try various combinations of modifier keys to find one that works for you.' );
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		} else if (form == 'transcript') {
			formTitle = this.translate( 'prefTitleTranscript', 'Transcript Preferences' );
		}

		$fieldset = $('<div>').attr('role','group');
		fieldsetClass = 'able-prefs-' + form;
		fieldsetId = this.mediaId + '-prefs-' + form;
		legendId = fieldsetId + '-legend';
		$fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
		if (form === 'keyboard') {
			$legend = $('<h2>' + this.translate( 'prefHeadingKeyboard1', 'Modifier keys used for shortcuts' ) + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		} else if (form === 'descriptions') {
			$legend = $('<h2>' + this.translate( 'prefHeadingTextDescription', 'Text-based audio description' ) + '</h2>');
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
				$thisDiv = $('<div>').addClass(thisClass + ' able-player-setting');
				if (form === 'captions' ) {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<select>',{
						name: thisPref,
						id: thisId,
					});
					// add a change handler that updates the style of the sample caption text
					let viewingOptions = ['prefCaptionsPosition','prefCaptionsFont','prefCaptionsSize','prefCaptionsColor','prefCaptionsBGColor','prefCaptionsOpacity'];
					if ( viewingOptions.indexOf(thisPref) !== -1 ) {
						$thisField.on( 'change', function() {
							changedPref = $(this).attr('name');
							thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
						});
					}
					captionsOptions = this.getCaptionsOptions(thisPref);
					if ( thisPref !== 'prefCaptionsVoice' ) {
						$thisDiv.append($thisLabel,$thisField);
					}
					for (j=0; j < captionsOptions.length; j++) {
						if (thisPref === 'prefCaptionsPosition') {
							optionValue = captionsOptions[j];
							if (optionValue === 'overlay') {
								optionText = this.translate( 'captionsPositionOverlay', 'Overlay' );
							} else if (optionValue === 'below') {
								optionValue = captionsOptions[j];
								optionText = this.translate( 'captionsPositionBelow', 'Below video' );
							}
						} else if (thisPref === 'prefCaptionsFont' || thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor' || thisPref === 'prefCaptionsSpeak' ) {
							optionValue = captionsOptions[j][0];
							optionText = captionsOptions[j][1];
						} else if (thisPref === 'prefCaptionsOpacity') {
							optionValue = captionsOptions[j];
							optionText = captionsOptions[j];
							optionText += (optionValue === '0%') ? ' (' + this.translate( 'transparent', 'transparent' ) + ')' : ' (' + this.translate( 'solid', 'solid' ) + ')';
						} else if (thisPref === 'prefCaptionsSize') {
							optionValue = captionsOptions[j];
							optionText = captionsOptions[j];
						}
						let voicingOptions = ['prefCaptionsPitch','prefCaptionsRate','prefCaptionsVolume'];
						if ( optionValue && voicingOptions.indexOf(thisPref) === -1 ) {
							$thisOption = $('<option>',{
								value: optionValue,
								text: optionText
							});
							if (this[thisPref] === optionValue) {
								$thisOption.prop('selected',true);
							}
							$thisField.append($thisOption);
						}
						// If synth is possible, show voicing options.
						if ( this.synth ) {
							if ( thisPref === 'prefCaptionsVoice' && this.descVoices.length ) {
								prefDescVoice = this.getPrefVoice();
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
							} else {
								if ( thisPref == 'prefCaptionsPitch' || thisPref == 'prefCaptionsRate' || thisPref == 'prefCaptionsVolume' ) {
									options = false;
									// Options values described in audio description preferences.
									options = (thisPref == 'prefCaptionsPitch') ? [0,0.5,1,1.5,2] : options;
									options = (thisPref == 'prefCaptionsRate') ? [0.7,0.8,0.9,1,1.1,1.2,1.5,2,2.5,3] : options;
									options = (thisPref == 'prefCaptionsVolume') ? [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1] : options;
									if ( options ) {
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
										}
										// add a change handler that announces the sample text
										$thisField.on('change',function() {
											let captionSample = thisObj.translate( 'sampleCaptionText', 'Sample caption text' )
											thisObj.announceText('captionSample',captionSample);
										});
										$thisDiv.append($thisLabel,$thisField);
									}
								}
							}
						}
					}
				} else if (form === 'descriptions') {
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
					} else if (this.synth) {
						// Only show these options if browser supports speech synthesis
						$thisDiv.addClass('able-prefs-select');
						$thisField = $('<select>',{
							name: thisPref,
							id: thisId,
						});
						if ( thisPref === 'prefDescVoice' && this.descVoices.length) {
							prefDescVoice = this.getPrefVoice();
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
						} else {
							if (thisPref == 'prefDescPitch') { // 0 to 2
								options = [0,0.5,1,1.5,2];
							} else if (thisPref == 'prefDescRate') { // 0.1 to 10
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
							} else if (thisPref == 'prefDescVolume') { // 0 (mute) to 1
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
							thisObj.announceText('sample',thisObj.currentSampleText);
						});
						$thisDiv.append($thisLabel,$thisField);
					}
				} else { // all other fields are checkboxes
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
							} else if (changedPref === 'prefCtrlKey') {
								changedSpan = '.able-modkey-ctrl';
								changedText = thisObj.tt.prefCtrlKey + ' + ';
							} else if (changedPref === 'prefShiftKey') {
								changedSpan = '.able-modkey-shift';
								changedText = thisObj.tt.prefShiftKey + ' + ';
							}
							if ( changedPref !== 'prefNoKeyShortcuts' ) {
								if ($(this).is(':checked')) {
									$(changedSpan).text(changedText);
								} else {
									$(changedSpan).text('');
								}
							} else {
								if ($(this).is(':checked')) {
									$('.able-modkey-item').addClass('hidden');
								} else {
									$('.able-modkey-item').removeClass('hidden');
								}
							}
						});
					}
					$thisDiv.append($thisField,$thisLabel);
				}
				if (thisPref === 'prefDescVoice' && !this.descVoices.length) {
					// No voices are available (e.g., in Safari 15.4 on Mac OS)
				} else {
					$fieldset.append($thisDiv);
				}
			}
		}
		$prefsDiv.append($fieldset);

		if (form === 'captions') {
			// add a sample closed caption div to prefs dialog
			// do not show this for YouTube captions, since it's not an accurate reflection
			if (!this.usingYouTubeCaptions) {
				this.$sampleCapsDiv = $('<div>',{
					'class': 'able-captions-sample'
				}).text( this.translate( 'sampleCaptionText', 'Sample caption text' ) );
				$prefsDiv.append(this.$sampleCapsDiv);
				this.stylizeCaptions(this.$sampleCapsDiv);
			}
		} else if (form === 'descriptions') {
			if (this.synth) {
				// add a div with sample audio description text
				this.$sampleDescDiv = $('<div>',{
					'class': 'able-desc-sample'
				}).text( this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' ) );
				$prefsDiv.append(this.$sampleDescDiv);
				this.currentSampleText = this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' );
			}
		} else if (form === 'keyboard') {
			let shortcutClass = (this.prefNoKeyShortcuts === 1 ) ? 'able-modkey-item hidden' : 'able-modkey-item';

			// add a current list of keyboard shortcuts
			$kbHeading = $('<h2>',{
				text: this.translate( 'prefHeadingKeyboard2', 'Current keyboard shortcuts' )
			});
			$kbList = $('<ul>');
			// create arrays of kbLabels and keys
			kbLabels = [];
			keys = [];
			for (i=0; i<this.controls.length; i++) {
				if (this.controls[i] === 'play') {
					kbLabels.push( this.translate( 'play', 'Play' ) + '/' + this.translate( 'pause', 'Pause' ) );
					keys.push('p</span>, <span class="able-help-modifiers"> ' + this.translate( 'spacebar', 'spacebar' ));
				} else if (this.controls[i] === 'restart') {
					kbLabels.push(this.translate( 'restart', 'Restart' ));
					keys.push('s');
				} else if (this.controls[i] === 'previous') {
					kbLabels.push( this.translate( 'prevTrack', 'Previous track' ) );
					keys.push('b'); // b = back
				} else if (this.controls[i] === 'next') {
					kbLabels.push( this.translate( 'nextTrack', 'Next track' ) );
					keys.push('n');
				} else if (this.controls[i] === 'rewind') {
					kbLabels.push(this.translate( 'rewind', 'Rewind' ));
					keys.push('r');
				} else if (this.controls[i] === 'forward') {
					kbLabels.push(this.translate( 'forward', 'Forward' ));
					keys.push('f');
				} else if (this.controls[i] === 'volume') {
					kbLabels.push(this.translate( 'volume', 'Volume' ));
					keys.push('v</span>,' + ' <span class="able-modkey">1-9');
					// mute toggle
					kbLabels.push(this.translate( 'mute', 'Mute' ) + '/' + this.translate( 'unmute', 'Unmute' ));
					keys.push('m');
				} else if (this.controls[i] === 'captions') {
					if (this.captions.length > 1) {
						// caption button launches a Captions popup menu
						kbLabels.push(this.translate( 'captions', 'Captions' ));
					} else {
						// there is only one caption track
						// therefore caption button is a toggle
						if (this.captionsOn) {
							kbLabels.push(this.translate( 'hideCaptions', 'Hide captions' ));
						} else {
							kbLabels.push(this.translate( 'showCaptions', 'Show captions' ));
						}
					}
					keys.push('c');
				} else if (this.controls[i] === 'descriptions') {
					if (this.descOn) {
						kbLabels.push(this.translate( 'turnOffDescriptions', 'Turn off descriptions' ));
					} else {
						kbLabels.push(this.translate( 'turnOnDescriptions', 'Turn on descriptions' ));
					}
					keys.push('d');
				} else if (this.controls[i] === 'prefs') {
					kbLabels.push(this.translate( 'preferences', 'Preferences' ));
					keys.push('e');
				}
			}
			for (i=0; i<keys.length; i++) {
				// alt
				kbListText = '<span class="able-modkey-alt">';
				if (this.prefAltKey === 1) {
					kbListText += this.translate( 'prefAltKey', 'Alt' ) + ' + ';
				}
				kbListText += '</span>';
				// ctrl
				kbListText += '<span class="able-modkey-ctrl">';
				if (this.prefCtrlKey === 1) {
					kbListText += this.translate( 'prefCtrlKey', 'Control' ) + ' + ';
				}
				kbListText += '</span>';
				// shift
				kbListText += '<span class="able-modkey-shift">';
				if (this.prefShiftKey === 1) {
					kbListText += this.translate( 'prefShiftKey', 'Shift' ) + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey">' + keys[i] + '</span>';
				kbListText += ' = ' + kbLabels[i];
				$kbListItem = $('<li>',{
					'class': shortcutClass,
					html: kbListText,
				});
				$kbList.append($kbListItem);
			}
			// add Escape key
			kbListText = '<span class="able-modkey">' + this.translate( 'escapeKey', 'Escape' ) + '</span>';
			kbListText += ' = ' + this.translate( 'escapeKeyFunction', 'Close current dialog or popup menu' );
			$kbListItem = $('<li>',{
				html: kbListText
			});
			$kbList.append($kbListItem);
			// put it all together
			$prefsDiv.append($kbHeading,$kbList);
		}

		// $prefsDiv (dialog) must be appended to the BODY!
		$('body').append($prefsDiv);
		dialog = new AccessibleDialog(
			$prefsDiv,
			this.$prefsButton,
			formTitle,
			thisObj.tt.closeButtonLabel
		);

		// Add save and cancel buttons.
		$buttonContainer = $( '<div class="able-prefs-buttons"></div>' );
		$saveButton = $('<button class="modal-button">' + this.translate( 'save', 'Save' ) + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.translate( 'cancel', 'Cancel' ) + '</button>');
		$saveButton.on( 'click', function () {
			dialog.hide();
			thisObj.savePrefsFromForm();
		});
		$cancelButton.on( 'click', function () {
			dialog.hide();
			thisObj.resetPrefsForm();
		});
		$buttonContainer.append( $saveButton,$cancelButton );
		$prefsDiv.append($buttonContainer);
		// Associate the dialog's H1 as aria-labelledby for groups of fields
		// (alternative to fieldset and legend)
		if (form === 'captions' || form === 'transcript') {
			$fieldset.attr('aria-labelledby',dialog.titleH1.attr('id'));
		}

		// add global reference for future control
		if (form === 'captions') {
			this.captionPrefsDialog = dialog;
		} else if (form === 'descriptions') {
			this.descPrefsDialog = dialog;
		} else if (form === 'keyboard') {
			this.keyboardPrefsDialog = dialog;
		} else if (form === 'transcript') {
			this.transcriptPrefsDialog = dialog;
		}

		// Add click handler for dialog close button
		// (button is added in dialog.js)
		$('div.able-prefs-form button.modalCloseButton').on( 'click', function() {
			thisObj.resetPrefsForm();
		})
		// Add handler for escape key
		$('div.able-prefs-form').on( 'keydown', function(e) {
			if (e.key === 'Escape') {
				thisObj.resetPrefsForm();
			}
		});
	};

	AblePlayer.prototype.getPrefVoice = function () {

		// return user's preferred voice for the current language from preferences.voices
		var lang, preferences, i;

		if (this.selectedDescriptions) {
			lang = this.selectedDescriptions.language;
		} else if (this.captionLang) {
			lang = this.captionLang;
		} else {
			lang = this.lang;
		}
		preferences = this.getPref();
		if (preferences.voices) {
			for (i=0; i < preferences.voices.length; i++) {
				if (preferences.voices[i].lang === lang) {
					return preferences.voices[i].name;
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

		if (pref === 'prefDescPitch' || pref === 'prefCaptionsPitch' ) {
			if (value === 0) {
				return this.translate( 'prefDescPitch1', 'Very low' );
			} else if (value === 0.5) {
				return this.translate( 'prefDescPitch2', 'Low' );
			} else if (value === 1) {
				return this.translate( 'prefDescPitch3', 'Default' );
			} else if (value === 1.5) {
				return this.translate( 'prefDescPitch4', 'High' );
			} else if (value === 2) {
				return this.translate( 'prefDescPitch5', 'Very high' );
			}
		} else if (pref === 'prefDescRate' || pref === 'prefCaptionsRate' ) {
			// default in the API is 0.1 to 10, where 1 is normal speaking voice
			// our custom range offers several rates close to 1
			// plus a couple of crazy fast ones for sport
			// Our more readable options (1-10) or mapped here to API values
			if (value === 0.7) {
				return 1;
			} else if (value === 0.8) {
				return 2;
			} else if (value === 0.9) {
				return 3;
			} else if (value === 1) {
				return 4;
			} else if (value === 1.1) {
				return 5;
			} else if (value === 1.2) {
				return 6;
			} else if (value === 1.5) {
				return 7;
			} else if (value === 2) {
				return 8;
			} else if (value === 2.5) {
				return 9;
			} else if (value === 3) {
				return 10;
			}
		} else if (pref === 'prefDescVolume' || pref === 'prefCaptionsVolume' ) {
			// values range from 0.1 to 1.0
			return value * 10;
		}
		return value;
	};

	AblePlayer.prototype.resetPrefsForm = function () {

		// Reset preferences form with default values from preferences
		// Called when:
		// User clicks cancel or close button in Prefs Dialog
		// User presses Escape to close Prefs dialog
		// User clicks Save in Prefs dialog, & there's more than one player on page

		var preferences, available, i, prefName;

		preferences = this.getPref();
		available = this.getAvailablePreferences();
		for (i=0; i<available.length; i++) {
			prefName = available[i]['name'];
			if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
				// this is a caption-related select box
				$('select[name="' + prefName + '"]').val(preferences.preferences[prefName]);
			} else { // all others are checkboxes
				if (this[prefName] === 1) {
					$('input[name="' + prefName + '"]').prop('checked',true);
				} else {
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
		// update preferences with new value
		var preferences, available, prefName, prefId,
			voiceSelectId, newVoice, numChanges, voiceLangFound,
			numCapChanges, capSizeChanged, capSizeValue, newValue;

		numChanges = 0;
		numCapChanges = 0; // changes to caption-style-related preferences
		capSizeChanged = false;
		preferences = this.getPref();
		available = this.getAvailablePreferences();
		for (var i=0; i < available.length; i++) {
			// only prefs with labels are used in the Prefs form
			if (available[i]['label']) {
				prefName = available[i]['name'];
				prefId = this.mediaId + '_' + prefName;
				if (prefName === 'prefDescVoice') {
					if (typeof preferences.voices === 'undefined') {
						preferences.voices = [];
					}
					voiceSelectId = this.mediaId + '_prefDescVoice';
					this.prefDescVoice = $('select#' + voiceSelectId).find(':selected').val();
					this.prefDescVoiceLang = $('select#' + voiceSelectId).find(':selected').attr('data-lang');
					// replace preferred voice for this lang in preferences.voices array, if one exists
					// otherwise, add it to the array
					voiceLangFound = false;
					for (var v=0; v < preferences.voices.length; v++) {
						if (preferences.voices[v].lang === this.prefDescVoiceLang) {
							voiceLangFound = true;
							preferences.voices[v].name = this.prefDescVoice;
						}
					}
					if (!voiceLangFound) {
						// no voice has been saved yet for this language. Add it to array.
						newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
						preferences.voices.push(newVoice);
					}
					numChanges++;
				} else if (prefName == 'prefDescMethod') {
					// As of v4.0.10, prefDescMethod is no longer a choice
					this.prefDescMethod = 'video';
					if (this.prefDescMethod !== preferences.preferences['prefDescMethod']) { // user's preference has changed
						preferences.preferences['prefDescMethod'] = this.prefDescMethod;
						numChanges++;
					}
				} else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
					// this is one of the caption-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (preferences.preferences[prefName] !== newValue) { // user changed setting
						preferences.preferences[prefName] = newValue;
						// also update global var for this pref (for caption fields, not done elsewhere)
						this[prefName] = newValue;
						numChanges++;
						numCapChanges++;
					}
					if (prefName === 'prefCaptionsSize') {
						capSizeChanged = true;
						capSizeValue = newValue;
					}
				} else if ((prefName.indexOf('Desc') !== -1) && (prefName !== 'prefDescPause') && prefName !== 'prefDescVisible') {
					// this is one of the description-related select fields
					newValue = $('select[id="' + prefId + '"]').val();
					if (preferences.preferences[prefName] !== newValue) { // user changed setting
						preferences.preferences[prefName] = newValue;
						// also update global var for this pref
						this[prefName] = newValue;
						numChanges++;
					}
				} else { // all other fields are checkboxes
					if ($('input[id="' + prefId + '"]').is(':checked')) {
						preferences.preferences[prefName] = 1;
						if (this[prefName] === 1) {
							// nothing has changed
						} else {
							// user has just turned this pref on
							this[prefName] = 1;
							numChanges++;
						}
					} else { // thisPref is not checked
						preferences.preferences[prefName] = 0;
						if (this[prefName] === 1) {
							// user has just turned this pref off
							this[prefName] = 0;
							numChanges++;
						} else {
							// nothing has chaged
						}
					}
				}
			}
		}
		if (numChanges > 0) {
			this.setPrefs(preferences);
			this.showAlert( this.translate( 'prefSuccess', 'Your changes have been saved.' ) );
		} else {
			this.showAlert( this.translate( 'prefNoChange', "You didn't make any changes" ) );
		}
		if (this.player === 'youtube' &&
			(typeof this.usingYouTubeCaptions !== 'undefined' && this.usingYouTubeCaptions) &&
			capSizeChanged) {
				// update font size of YouTube captions
				this.youTubePlayer.setOption('captions','fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
		}
		if (!AblePlayer.hasSingleInstance()) {
			// there are multiple players on this page.
			// update prefs for ALL of them
			for (const instance of AblePlayer.ablePlayerInstances) {
				instance.updatePlayerPrefs();
				instance.loadCurrentPreferences();
				instance.resetPrefsForm();
				if (numCapChanges > 0) {
					instance.stylizeCaptions(instance.$captionsDiv);
					// also apply same changes to descriptions, if present
					if (typeof instance.$descDiv !== 'undefined') {
						instance.stylizeCaptions(instance.$descDiv);
					}
				}
			}
		} else {
			// there is only one player
			this.updatePlayerPrefs();
			if (numCapChanges > 0) {
				this.stylizeCaptions(this.$captionsDiv);
				// also apply same changes to descriptions, if present
				if (typeof this.$descDiv !== 'undefined') {
					this.stylizeCaptions(this.$descDiv);
				}
			}
		}
	}

	AblePlayer.prototype.updatePlayerPrefs = function () {

		// Update player based on current prefs. Safe to call multiple times.
		if (this.$transcriptDiv) {
			// tabbable transcript
			if (this.prefTabbable === 1) {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').attr('tabindex','0');
			} else {
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
}

export default addPreferenceFunctions;
