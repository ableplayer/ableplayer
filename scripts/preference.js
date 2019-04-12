(function ($) {
	AblePlayer.prototype.setCookie = function(cookieValue) {
		Cookies.set('Able-Player', cookieValue, { expires:90 });
		// set the cookie lifetime for 90 days
	};

	AblePlayer.prototype.getCookie = function() {

		var defaultCookie = {
			preferences: {},
			sign: {},
			transcript: {}
		};

		var cookie;
		try {
			cookie = Cookies.getJSON('Able-Player');
		}
		catch (err) {
			// Original cookie can't be parsed; update to default
			Cookies.getJSON(defaultCookie);
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
		// useful for settings updated indpedently of Preferences dialog
		// e.g., prefAutoScrollTranscript, which is updated in control.js > handleTranscriptLockToggle()
		// setting is any supported preference name (e.g., "prefCaptions")
		// OR 'transcript' or 'sign' (not user-defined preferences, used to save position of draggable windows)
		var cookie, $window, windowPos, available, i, prefName;
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
		if (this.mediaType === 'video') {
			return ['captions','descriptions','keyboard','transcript'];
		}
		else if (this.mediaType === 'audio') {
			var groups = [];
			groups.push('keyboard');
			if (this.lyricsMode) {
				groups.push('transcript');
			}
			return groups;
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

		if (this.mediaType === 'video') {

			// Caption preferences
			prefs.push({
				'name': 'prefCaptions', // closed captions default state
				'label': null,
				'group': 'captions',
				'default': 1
			});
/* // not supported yet
			prefs.push({
				'name': 'prefCaptionsStyle',
				'label': this.tt.prefCaptionsStyle,
				'group': 'captions',
				'default': this.tt.captionsStylePopOn
			});
*/
			prefs.push({
				'name': 'prefCaptionsPosition',
				'label': this.tt.prefCaptionsPosition,
				'group': 'captions',
				'default': this.defaultCaptionsPosition
			});
			prefs.push({
				'name': 'prefCaptionsFont',
				'label': this.tt.prefCaptionsFont,
				'group': 'captions',
				'default': this.tt.sans
			});
			prefs.push({
				'name': 'prefCaptionsSize',
				'label': this.tt.prefCaptionsSize,
				'group': 'captions',
				'default': '100%'
			});
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

			// Description preferences
			prefs.push({
				'name': 'prefDesc', // audio description default state
				'label': null,
				'group': 'descriptions',
				'default': 0 // off because users who don't need it might find it distracting
			});
			prefs.push({
				'name': 'prefDescFormat', // audio description default state
				'label': this.tt.prefDescFormat,
				'group': 'descriptions',
				'default': 'video'
			});
			prefs.push({
				'name': 'prefDescPause', // automatically pause when closed description starts
				'label': this.tt.prefDescPause,
				'group': 'descriptions',
				'default': 0 // off because it burdens user with restarting after every pause
			});
			prefs.push({
				'name': 'prefVisibleDesc', // visibly show closed description (if avilable and used)
				'label': this.tt.prefVisibleDesc,
				'group': 'descriptions',
				'default': 1 // on because sighted users probably want to see this cool feature in action
			});

			// Video preferences without a category (not shown in Preferences dialogs)
			prefs.push({
				'name': 'prefSign', // open sign language window by default if avilable
				'label': null,
				'group': null,
				'default': 0 // off because clicking an icon to see the sign window has a powerful impact
			});

		}
		return prefs;
	};

	// Loads current/default preferences from cookie into the AblePlayer object.
	AblePlayer.prototype.loadCurrentPreferences = function () {
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

		// Save since we may have added default values.
		this.setCookie(cookie);
	};

	AblePlayer.prototype.injectPrefsForm = function (form) {

		// Creates a preferences form and injects it.
		// form is one of the supported forms (groups) defined in getPreferencesGroups()

		var available, thisObj, $prefsDiv, formTitle, introText,
			$prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
			$fieldset, fieldsetClass, fieldsetId,
			$descFieldset1, $descLegend1, $descFieldset2, $descLegend2, $legend,
			thisPref, $thisDiv, thisClass, thisId, $thisLabel, $thisField,
			$div1,id1,$radio1,$label1,
			$div2,id2,$radio2,$label2,
			options,$thisOption,optionValue,optionText,sampleCapsDiv,
			changedPref,changedSpan,changedText,
			currentDescState,
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

		// add intro
		if (form == 'captions') {
			formTitle = this.tt.prefTitleCaptions;
			introText = this.tt.prefIntroCaptions;
			// Uncomment the following line to include a cookie warning
			// Not included for now in order to cut down on unnecessary verbiage
			// introText += ' ' + this.tt.prefCookieWarning;
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
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
			introText = this.tt.prefIntroTranscript;
			// Uncomment the following line to include a cookie warning
			// Not included for now in order to cut down on unnecessary verbiage
			// introText += ' ' + this.tt.prefCookieWarning;
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		}

		if (form === 'descriptions') {
			// descriptions form has two field sets

			// Fieldset 1
			$descFieldset1 = $('<fieldset>');
			fieldsetClass = 'able-prefs-' + form + '1';
			fieldsetId = this.mediaId + '-prefs-' + form + '1';
			$descFieldset1.addClass(fieldsetClass).attr('id',fieldsetId);
			$descLegend1 = $('<legend>' + this.tt.prefDescFormat + '</legend>');
			$descFieldset1.append($descLegend1);

			// Fieldset 2
			$descFieldset2 = $('<fieldset>');
			fieldsetClass = 'able-prefs-' + form + '2';
			fieldsetId = this.mediaId + '-prefs-' + form + '2';
			$descFieldset2.addClass(fieldsetClass).attr('id',fieldsetId);
			$descLegend2 = $('<legend>' + this.tt.prefHeadingTextDescription + '</legend>');
			$descFieldset2.append($descLegend2);
		}
		else {
			// all other forms just have one fieldset
			$fieldset = $('<fieldset>');
			fieldsetClass = 'able-prefs-' + form;
			fieldsetId = this.mediaId + '-prefs-' + form;
			$fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
			if (form === 'keyboard') {
				$legend = $('<legend>' + this.tt.prefHeadingKeyboard1 + '</legend>');
				$fieldset.append($legend);
			}
		}
		for (i=0; i<available.length; i++) {

			// only include prefs on the current form if they have a label
			if ((available[i]['group'] == form) && available[i]['label']) {

				thisPref = available[i]['name'];
				thisClass = 'able-' + thisPref;
				thisId = this.mediaId + '_' + thisPref;
				if (thisPref !== 'prefDescFormat') {
					$thisDiv = $('<div>').addClass(thisClass);
				}

				// Audio Description preferred format radio buttons
				if (thisPref == 'prefDescFormat') {

					// option 1 radio button
					$div1 = $('<div>');
					id1 = thisId + '_1';
					$label1 = $('<label>')
						.attr('for',id1)
						.text(this.capitalizeFirstLetter(this.tt.prefDescFormatOption1))
					$radio1 = $('<input>',{
						type: 'radio',
						name: thisPref,
						id: id1,
						value: 'video'
					});
					if (this.prefDescFormat === 'video') {
						$radio1.prop('checked',true);
					};
					$div1.append($radio1,$label1);

					// option 2 radio button
					$div2 = $('<div>');
					id2 = thisId + '_2';
					$label2 = $('<label>')
						.attr('for',id2)
						.text(this.capitalizeFirstLetter(this.tt.prefDescFormatOption2));
					$radio2 = $('<input>',{
						type: 'radio',
						name: thisPref,
						id: id2,
						value: 'text'
					});
					if (this.prefDescFormat === 'text') {
						$radio2.prop('checked',true);
					};
					$div2.append($radio2,$label2);
				}
				else if (form === 'captions') {
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
						else if (thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
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
						$thisField.change(function() {
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
				if (form === 'descriptions') {
					if (thisPref === 'prefDescFormat') {
						$descFieldset1.append($div1,$div2);
					}
					else {
						$descFieldset2.append($thisDiv);
					}
				}
				else {
					$fieldset.append($thisDiv);
				}
			}
		}
		if (form === 'descriptions') {
			$prefsDiv.append($descFieldset1,$descFieldset2);
		}
		else {
			$prefsDiv.append($fieldset);
		}
		if (form === 'captions') {
			// add a sample closed caption div to prefs dialog
			if (this.mediaType === 'video') {
				this.$sampleCapsDiv = $('<div>',{
					'class': 'able-captions-sample'
				}).text(this.tt.sampleCaptionText);
				$prefsDiv.append(this.$sampleCapsDiv);
				this.stylizeCaptions(this.$sampleCapsDiv);
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
		dialog = new AccessibleDialog($prefsDiv, this.$prefsButton, 'dialog', formTitle, $prefsIntro, thisObj.tt.closeButtonLabel, '32em');

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

	 // Reset preferences form with default values from cookie
	 // Called when user clicks cancel or close button in Prefs Dialog
	 // also called when user presses Escape

	 AblePlayer.prototype.resetPrefsForm = function () {

		 var thisObj, cookie, available, i, prefName, thisDiv, thisId;

		 thisObj = this;
		 cookie = this.getCookie();
		 available = this.getAvailablePreferences();
		 for (i=0; i<available.length; i++) {
			 prefName = available[i]['name'];
			 if (prefName === 'prefDescFormat') {
				 if (this[prefName] === 'text') {
					 $('input[value="text"]').prop('checked',true);
				 }
				 else {
					 $('input[value="video"]').prop('checked',true);
				 }
			 }
			 else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
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

	// Return a prefs object constructed from the form.
	AblePlayer.prototype.savePrefsFromForm = function () {
		// called when user saves the Preferences form
		// update cookie with new value
		var numChanges, numCapChanges, capSizeChanged, capSizeValue, newValue;

		numChanges = 0;
		numCapChanges = 0; // changes to caption-style-related preferences
		capSizeChanged = false;
		var cookie = this.getCookie();
		var available = this.getAvailablePreferences();
		for (var i=0; i < available.length; i++) {
			// only prefs with labels are used in the Prefs form
			if (available[i]['label']) {
				var prefName = available[i]['name'];
				if (prefName == 'prefDescFormat') {
					this.prefDescFormat = $('input[name="' + prefName + '"]:checked').val();
					if (this.prefDescFormat !== cookie.preferences['prefDescFormat']) { // user changed setting
						cookie.preferences['prefDescFormat'] = this.prefDescFormat;
						numChanges++;
					}
				}
				else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
					// this is one of the caption-related select fields
					newValue = $('select[name="' + prefName + '"]').val();
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
				else { // all other fields are checkboxes
					if ($('input[name="' + prefName + '"]').is(':checked')) {
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
				this.youTubePlayer.setOption(this.ytCaptionModule,'fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
		}
		this.updatePrefs();
		if (numCapChanges > 0) {
			this.stylizeCaptions(this.$captionsDiv);
			// also apply same changes to descriptions, if present
			if (typeof this.$descDiv !== 'undefined') {
				this.stylizeCaptions(this.$descDiv);
			}
		}
	}

	// Updates player based on current prefs.	 Safe to call multiple times.
	AblePlayer.prototype.updatePrefs = function () {

		var modHelp;

		// modifier keys (update help text)
		if (this.prefAltKey === 1) {
			modHelp = 'Alt + ';
		}
		else {
			modHelp = '';
		}
		if (this.prefCtrlKey === 1) {
			modHelp += 'Control + ';
		}
		if (this.prefShiftKey === 1) {
			modHelp += 'Shift + ';
		}
		$('.able-help-modifiers').text(modHelp);

		// tabbable transcript
		if (this.prefTabbable === 1) {
			$('.able-transcript span.able-transcript-seekpoint').attr('tabindex','0');
		}
		else {
			$('.able-transcript span.able-transcript-seekpoint').removeAttr('tabindex');
		}

		// transcript highlights
		if (this.prefHighlight === 0) {
			// user doesn't want highlights; remove any existing highlights
			$('.able-transcript span').removeClass('able-highlight');
		}

		// Re-initialize caption and description in case relevant settings have changed
		this.updateCaption();
		this.refreshingDesc = true;
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
