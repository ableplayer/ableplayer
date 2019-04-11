(function ($) {

	AblePlayer.prototype.injectPlayerCode = function() {

		// create and inject surrounding HTML structure
		// If IOS:
		//	If video:
		//	 IOS does not support any of the player's functionality
		//	 - everything plays in its own player
		//	 Therefore, AblePlayer is not loaded & all functionality is disabled
		//	 (this all determined. If this is IOS && video, this function is never called)
		//	If audio:
		//	 HTML cannot be injected as a *parent* of the <audio> element
		//	 It is therefore injected *after* the <audio> element
		//	 This is only a problem in IOS 6 and earlier,
		//	 & is a known bug, fixed in IOS 7

		var thisObj, vidcapContainer, prefsGroups, i;
		thisObj = this;

		// create three wrappers and wrap them around the media element. From inner to outer:
		// $mediaContainer - contains the original media element
		// $ableDiv - contains the media player and all its objects (e.g., captions, controls, descriptions)
		// $ableWrapper - contains additional widgets (e.g., transcript window, sign window)
		this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();
		this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
		this.$ableWrapper = this.$ableDiv.wrap('<div class="able-wrapper"></div>').parent();

		// NOTE: Excluding the following from youtube was resulting in a player
		// that exceeds the width of the YouTube video
		// Unclear why it was originally excluded; commented out in 3.1.20
		// if (this.player !== 'youtube') {
		this.$ableWrapper.css({
			'max-width': this.playerMaxWidth + 'px'
		});

		this.injectOffscreenHeading();

		if (this.mediaType === 'video') {
			// youtube adds its own big play button
			// don't show ours *unless* video has a poster attribute
			// (which obstructs the YouTube poster & big play button)
			if (this.iconType != 'image' && (this.player !== 'youtube' || this.hasPoster)) {
				this.injectBigPlayButton();
			}

			// add container that captions or description will be appended to
			// Note: new Jquery object must be assigned _after_ wrap, hence the temp vidcapContainer variable
			vidcapContainer = $('<div>',{
				'class' : 'able-vidcap-container'
			});
			this.$vidcapContainer = this.$mediaContainer.wrap(vidcapContainer).parent();
		}
		this.injectPlayerControlArea();
		this.injectTextDescriptionArea();
		this.injectAlert();
		this.injectPlaylist();
	};

	AblePlayer.prototype.injectOffscreenHeading = function () {
		// Inject an offscreen heading to the media container.
		// If heading hasn't already been manually defined via data-heading-level,
		// automatically assign a level that is one level deeper than the closest parent heading
		// as determined by getNextHeadingLevel()
		var headingType;
		if (this.playerHeadingLevel == '0') {
			// do NOT inject a heading (at author's request)
		}
		else {
			if (typeof this.playerHeadingLevel === 'undefined') {
				this.playerHeadingLevel = this.getNextHeadingLevel(this.$ableDiv); // returns in integer 1-6
			}
			headingType = 'h' + this.playerHeadingLevel.toString();
			this.$headingDiv = $('<' + headingType + '>');
			this.$ableDiv.prepend(this.$headingDiv);
			this.$headingDiv.addClass('able-offscreen');
			this.$headingDiv.text(this.tt.playerHeading);
		}
	};

	AblePlayer.prototype.injectBigPlayButton = function () {

		this.$bigPlayButton = $('<button>', {
			'class': 'able-big-play-button icon-play',
			'aria-hidden': true,
			'tabindex': -1
		});

		var thisObj = this;
		this.$bigPlayButton.click(function () {
			thisObj.handlePlay();
		});

		this.$mediaContainer.append(this.$bigPlayButton);
	};

	AblePlayer.prototype.injectPlayerControlArea = function () {

		this.$playerDiv = $('<div>', {
			'class' : 'able-player',
			'role' : 'region',
			'aria-label' : this.mediaType + ' player'
		});
		this.$playerDiv.addClass('able-'+this.mediaType);

		// The default skin depends a bit on a Now Playing div
		// so go ahead and add one
		// However, it's only populated if this.showNowPlaying = true
		this.$nowPlayingDiv = $('<div>',{
			'class' : 'able-now-playing',
			'aria-live' : 'assertive',
			'aria-atomic': 'true'
		});

		this.$controllerDiv = $('<div>',{
			'class' : 'able-controller'
		});
		this.$controllerDiv.addClass('able-' + this.iconColor + '-controls');

		this.$statusBarDiv = $('<div>',{
			'class' : 'able-status-bar'
		});
		this.$timer = $('<span>',{
			'class' : 'able-timer'
		});
		this.$elapsedTimeContainer = $('<span>',{
			'class': 'able-elapsedTime',
			text: '0:00'
		});
		this.$durationContainer = $('<span>',{
			'class': 'able-duration'
		});
		this.$timer.append(this.$elapsedTimeContainer).append(this.$durationContainer);

		this.$speed = $('<span>',{
			'class' : 'able-speed',
			'aria-live' : 'assertive'
		}).text(this.tt.speed + ': 1x');

		this.$status = $('<span>',{
			'class' : 'able-status',
			'aria-live' : 'polite'
		});

		// Put everything together.
		this.$statusBarDiv.append(this.$timer, this.$speed, this.$status);
		this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
		this.$ableDiv.append(this.$playerDiv);
	};

	AblePlayer.prototype.injectTextDescriptionArea = function () {

		// create a div for exposing description
		// description will be exposed via role="alert" & announced by screen readers
		this.$descDiv = $('<div>',{
			'class': 'able-descriptions',
			'aria-live': 'assertive',
			'aria-atomic': 'true'
		});
		// Start off with description hidden.
		// It will be exposed conditionally within description.js > initDescription()
		this.$descDiv.hide();
		this.$ableDiv.append(this.$descDiv);
	};

	AblePlayer.prototype.getDefaultWidth = function(which) {

		// return default width of resizable elements
		// these values are somewhat arbitrary, but seem to result in good usability
		// if users disagree, they can resize (and resposition) them
		if (which === 'transcript') {
			return 450;
		}
		else if (which === 'sign') {
			return 400;
		}
	};

	AblePlayer.prototype.positionDraggableWindow = function (which, width) {

		// which is either 'transcript' or 'sign'

		var cookie, cookiePos, $window, dragged, windowPos, currentWindowPos, firstTime, zIndex;

		cookie = this.getCookie();
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			if (typeof cookie.transcript !== 'undefined') {
				cookiePos = cookie.transcript;
			}
		}
		else if (which === 'sign') {
			$window = this.$signWindow;
			if (typeof cookie.transcript !== 'undefined') {
				cookiePos = cookie.sign;
			}
		}
		if (typeof cookiePos !== 'undefined' && !($.isEmptyObject(cookiePos))) {
			// position window using stored values from cookie
			$window.css({
				'position': cookiePos['position'],
				'width': cookiePos['width'],
				'z-index': cookiePos['zindex']
			});
			if (cookiePos['position'] === 'absolute') {
				$window.css({
					'top': cookiePos['top'],
					'left': cookiePos['left']
				});
			}
			// since cookie is not page-specific, z-index needs may vary across different pages
			this.updateZIndex(which);
		}
		else {
			// position window using default values
			windowPos = this.getOptimumPosition(which, width);
			if (typeof width === 'undefined') {
				width = this.getDefaultWidth(which);
			}
			$window.css({
				'position': windowPos[0],
				'width': width,
				'z-index': windowPos[3]
			});
			if (windowPos[0] === 'absolute') {
				$window.css({
					'top': windowPos[1] + 'px',
					'left': windowPos[2] + 'px',
				});
			}
		}
	};

	AblePlayer.prototype.getOptimumPosition = function (targetWindow, targetWidth) {

		// returns optimum position for targetWindow, as an array with the following structure:
		// 0 - CSS position ('absolute' or 'relative')
		// 1 - top
		// 2 - left
		// 3 - zindex (if not default)
		// targetWindow is either 'transcript' or 'sign'
		// if there is room to the right of the player, position element there
		// else if there is room the left of the player, position element there
		// else position element beneath player

		var gap, position, ableWidth, ableHeight, ableOffset, ableTop, ableLeft,
			 windowWidth, otherWindowWidth, zIndex;

		if (typeof targetWidth === 'undefined') {
			targetWidth = this.getDefaultWidth(targetWindow);
		}

		gap = 5; // number of pixels to preserve between Able Player objects

		position = []; // position, top, left

		ableWidth = this.$ableDiv.width();
		ableHeight = this.$ableDiv.height();
		ableOffset = this.$ableDiv.offset();
		ableTop = ableOffset.top;
		ableLeft = ableOffset.left;
		windowWidth = $(window).width();
		otherWindowWidth = 0; // width of other visiable draggable windows will be added to this

		if (targetWindow === 'transcript') {
			if (typeof this.$signWindow !== 'undefined') {
				if (this.$signWindow.is(':visible')) {
					otherWindowWidth = this.$signWindow.width() + gap;
				}
			}
		}
		else if (targetWindow === 'sign') {
			if (typeof this.$transcriptArea !== 'undefined') {
				if (this.$transcriptArea.is(':visible')) {
					otherWindowWidth = this.$transcriptArea.width() + gap;
				}
			}
		}
		if (targetWidth < (windowWidth - (ableLeft + ableWidth + gap + otherWindowWidth))) {
			// there's room to the left of $ableDiv
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableWidth + otherWindowWidth + gap;
		}
		else if (targetWidth + gap < ableLeft) {
			// there's room to the right of $ableDiv
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableLeft - targetWidth - gap;
		}
		else {
			// position element below $ableDiv
			position[0] = 'relative';
			// no need to define top, left, or z-index
		}
		return position;
	};

	AblePlayer.prototype.injectPoster = function ($element, context) {

		// get poster attribute from media element and append that as an img to $element
		// context is either 'youtube' or 'fallback'
		var poster, width, height;

		if (context === 'youtube') {
			if (typeof this.ytWidth !== 'undefined') {
				width = this.ytWidth;
				height = this.ytHeight;
			}
			else if (typeof this.playerMaxWidth !== 'undefined') {
				width = this.playerMaxWidth;
				height = this.playerMaxHeight;
			}
			else if (typeof this.playerWidth !== 'undefined') {
				width = this.playerWidth;
				height = this.playerHeight;
			}
		}
		else if (context === 'fallback') {
			width = '100%';
			height = 'auto';
		}

		if (this.hasPoster) {
			poster = this.$media.attr('poster');
			this.$posterImg = $('<img>',{
				'class': 'able-poster',
				'src' : poster,
				'alt' : "",
				'role': "presentation",
				'width': width,
				'height': height
			});
			$element.append(this.$posterImg);
		}
	};

	AblePlayer.prototype.injectAlert = function () {

		// inject two alerts, one visible for all users and one for screen reader users only

		var top;

		this.$alertBox = $('<div role="alert"></div>');
		this.$alertBox.addClass('able-alert');
		this.$alertBox.hide();
		this.$alertBox.appendTo(this.$ableDiv);
		if (this.mediaType == 'audio') {
			top = '-10';
		}
		else {
			// position just below the vertical center of the mediaContainer
			// hopefully above captions, but not too far from the controller bar
			top = Math.round(this.$mediaContainer.height() / 3) * 2;
		}
		this.$alertBox.css({
			top: top + 'px'
		});

		this.$srAlertBox = $('<div role="alert"></div>');
		this.$srAlertBox.addClass('able-screenreader-alert');
		this.$srAlertBox.appendTo(this.$ableDiv);
	};

	AblePlayer.prototype.injectPlaylist = function () {

		if (this.playlistEmbed === true) {
			// move playlist into player, immediately before statusBarDiv
			var playlistClone = this.$playlistDom.clone();
			playlistClone.insertBefore(this.$statusBarDiv);
			// Update to the new playlist copy.
			this.$playlist = playlistClone.find('li');
		}
	};

	AblePlayer.prototype.createPopup = function (which, tracks) {

		// Create popup menu and append to player
		// 'which' parameter is either 'captions', 'chapters', 'prefs', 'transcript-window' or 'sign-window'
		// 'tracks', if provided, is a list of tracks to be used as menu items

		var thisObj, $menu, prefCats, i, $menuItem, prefCat, whichPref,
			hasDefault, track, windowOptions, whichPref, whichMenu,
			$thisItem, $prevItem, $nextItem;

		thisObj = this;

		$menu = $('<ul>',{
			'id': this.mediaId + '-' + which + '-menu',
			'class': 'able-popup',
			'role': 'menu'
		}).hide();

		if (which === 'captions') {
			$menu.addClass('able-popup-captions');
		}

		// Populate menu with menu items
		if (which === 'prefs') {
			prefCats = this.getPreferencesGroups();
			for (i = 0; i < prefCats.length; i++) {
				$menuItem = $('<li></li>',{
					'role': 'menuitem',
					'tabindex': '-1'
				});
				prefCat = prefCats[i];
				if (prefCat === 'captions') {
					$menuItem.text(this.tt.prefMenuCaptions);
				}
				else if (prefCat === 'descriptions') {
					$menuItem.text(this.tt.prefMenuDescriptions);
				}
				else if (prefCat === 'keyboard') {
					$menuItem.text(this.tt.prefMenuKeyboard);
				}
				else if (prefCat === 'transcript') {
					$menuItem.text(this.tt.prefMenuTranscript);
				}
				$menuItem.on('click',function() {
					whichPref = $(this).text();
					thisObj.setFullscreen(false);
					if (whichPref === thisObj.tt.prefMenuCaptions) {
						thisObj.captionPrefsDialog.show();
					}
					else if (whichPref === thisObj.tt.prefMenuDescriptions) {
						thisObj.descPrefsDialog.show();
					}
					else if (whichPref === thisObj.tt.prefMenuKeyboard) {
						thisObj.keyboardPrefsDialog.show();
					}
					else if (whichPref === thisObj.tt.prefMenuTranscript) {
						thisObj.transcriptPrefsDialog.show();
					}
					thisObj.closePopups();
				});
				$menu.append($menuItem);
			}
		}
		else if (which === 'captions' || which === 'chapters') {
			hasDefault = false;
			for (i = 0; i < tracks.length; i++) {
				track = tracks[i];
				$menuItem = $('<li></li>',{
					'role': 'menuitemradio',
					'tabindex': '-1',
					'lang': track.language
				});
				if (track.def) {
					$menuItem.attr('aria-checked','true');
					hasDefault = true;
				}
				else {
					$menuItem.attr('aria-checked','false');
				}
				// Get a label using track data
				if (which == 'captions') {
					$menuItem.text(track.label);
					$menuItem.on('click',this.getCaptionClickFunction(track));
				}
				else if (which == 'chapters') {
					$menuItem.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
					$menuItem.on('click',this.getChapterClickFunction(track.start));
				}
				$menu.append($menuItem);
			}
			if (which === 'captions') {
				// add a 'captions off' menu item
				$menuItem = $('<li></li>',{
					'role': 'menuitemradio',
					'tabindex': '-1',
				}).text(this.tt.captionsOff);
				if (this.prefCaptions === 0) {
					$menuItem.attr('aria-checked','true');
					hasDefault = true;
				}
				$menuItem.on('click',this.getCaptionOffFunction());
				$menu.append($menuItem);
			}
		}
		else if (which === 'transcript-window' || which === 'sign-window') {
			windowOptions = [];
			windowOptions.push({
				'name': 'move',
				'label': this.tt.windowMove
			});
			windowOptions.push({
				'name': 'resize',
				'label': this.tt.windowResize
			});
			windowOptions.push({
				'name': 'close',
				'label': this.tt.windowClose
			});
			for (i = 0; i < windowOptions.length; i++) {
				$menuItem = $('<li></li>',{
					'role': 'menuitem',
					'tabindex': '-1',
					'data-choice': windowOptions[i].name
				});
				$menuItem.text(windowOptions[i].label);
				$menuItem.on('click mousedown',function(e) {
					e.stopPropagation();
					if (e.button !== 0) { // not a left click
						return false;
					}
					if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
						thisObj.windowMenuClickRegistered = true;
						thisObj.handleMenuChoice(which.substr(0, which.indexOf('-')), $(this).attr('data-choice'), e);
					}
				});
				$menu.append($menuItem);
			}
		}
		// assign default item, if there isn't one already
		if (which === 'captions' && !hasDefault) {
			// check the menu item associated with the default language
			// as determined in control.js > syncTrackLanguages()
			if ($menu.find('li[lang=' + this.captionLang + ']')) {
				// a track exists for the default language. Check that item in the menu
				$menu.find('li[lang=' + this.captionLang + ']').attr('aria-checked','true');
			}
			else {
				// check the last item (captions off)
				$menu.find('li').last().attr('aria-checked','true');
			}
		}
		else if (which === 'chapters') {
			if ($menu.find('li:contains("' + this.defaultChapter + '")')) {
				$menu.find('li:contains("' + this.defaultChapter + '")').attr('aria-checked','true').addClass('able-focus');
			}
			else {
				$menu.find('li').first().attr('aria-checked','true').addClass('able-focus');
			}
		}
		// add keyboard handlers for navigating within popups
		$menu.on('keydown',function (e) {
			whichMenu = $(this).attr('id').split('-')[1];
			$thisItem = $(this).find('li:focus');
			if ($thisItem.is(':first-child')) {
				// this is the first item in the menu
				$prevItem = $(this).find('li').last(); // wrap to bottom
				$nextItem = $thisItem.next();
			}
			else if ($thisItem.is(':last-child')) {
				// this is the last Item
				$prevItem = $thisItem.prev();
				$nextItem = $(this).find('li').first(); // wrap to top
			}
			else {
				$prevItem = $thisItem.prev();
				$nextItem = $thisItem.next();
			}
			if (e.which === 9) { // Tab
				if (e.shiftKey) {
					$thisItem.removeClass('able-focus');
					$prevItem.focus().addClass('able-focus');
				}
				else {
					$thisItem.removeClass('able-focus');
					$nextItem.focus().addClass('able-focus');
				}
			}
			else if (e.which === 40 || e.which === 39) { // down or right arrow
				$thisItem.removeClass('able-focus');
				$nextItem.focus().addClass('able-focus');
			}
			else if (e.which == 38 || e.which === 37) { // up or left arrow
				$thisItem.removeClass('able-focus');
				$prevItem.focus().addClass('able-focus');
			}
			else if (e.which === 32 || e.which === 13) { // space or enter
				$thisItem.click();
			}
			else if (e.which === 27) {	// Escape
				$thisItem.removeClass('able-focus');
				thisObj.closePopups();
			}
			e.preventDefault();
		});
		this.$controllerDiv.append($menu);
		return $menu;
	};

	AblePlayer.prototype.closePopups = function () {

		if (this.chaptersPopup && this.chaptersPopup.is(':visible')) {
			this.chaptersPopup.hide();
			this.$chaptersButton.attr('aria-expanded','false').focus();
		}
		if (this.captionsPopup && this.captionsPopup.is(':visible')) {
			this.captionsPopup.hide();
			this.$ccButton.attr('aria-expanded','false').focus();
		}
		if (this.prefsPopup && this.prefsPopup.is(':visible')) {
			this.prefsPopup.hide();
			// restore menu items to their original state
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$prefsButton.attr('aria-expanded','false').focus();
		}
		if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
			this.$volumeSlider.hide().attr('aria-hidden','true');
			this.$volumeAlert.text(this.tt.volumeSliderClosed);
			this.$volumeButton.attr('aria-expanded','false').focus();
		}
		if (this.$transcriptPopup && this.$transcriptPopup.is(':visible')) {
			this.$transcriptPopup.hide();
			// restore menu items to their original state
			this.$transcriptPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$transcriptPopupButton.attr('aria-expanded','false').focus();
		}
		if (this.$signPopup && this.$signPopup.is(':visible')) {
			this.$signPopup.hide();
			// restore menu items to their original state
			this.$signPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$signPopupButton.attr('aria-expanded','false').focus();
		}
	};

	AblePlayer.prototype.setupPopups = function (which) {

		// Create and fill in the popup menu forms for various controls.
		// parameter 'which' is passed if refreshing content of an existing popup ('captions' or 'chapters')
		// If which is undefined, automatically setup 'captions', 'chapters', and 'prefs' popups
		// However, only setup 'transcript-window' and 'sign-window' popups if passed as value of which
		var popups, thisObj, hasDefault, i, j,
				tracks, track, $trackButton, $trackLabel,
				radioName, radioId, $menu, $menuItem,
				prefCats, prefCat, prefLabel;

		popups = [];
		if (typeof which === 'undefined') {
			popups.push('prefs');
		}

		if (which === 'captions' || (typeof which === 'undefined')) {
			if (this.captions.length > 0) {
				popups.push('captions');
			}
		}
		if (which === 'chapters' || (typeof which === 'undefined')) {
			if (this.chapters.length > 0 && this.useChaptersButton) {
				popups.push('chapters');
			}
		}
		if (which === 'transcript-window' && this.transcriptType === 'popup') {
			popups.push('transcript-window');
		}
		if (which === 'sign-window' && this.hasSignLanguage) {
			popups.push('sign-window');
		}
		if (popups.length > 0) {
			thisObj = this;
			for (var i=0; i<popups.length; i++) {
				var popup = popups[i];
				hasDefault = false;
				if (popup == 'prefs') {
					this.prefsPopup = this.createPopup('prefs');
				}
				else if (popup == 'captions') {
					if (typeof this.captionsPopup === 'undefined' || !this.captionsPopup) {
						this.captionsPopup = this.createPopup('captions',this.captions);
					}
				}
				else if (popup == 'chapters') {
					if (this.selectedChapters) {
						tracks = this.selectedChapters.cues;
					}
					else if (this.chapters.length >= 1) {
						tracks = this.chapters[0].cues;
					}
					else {
						tracks = [];
					}
					if (typeof this.chaptersPopup === 'undefined' || !this.chaptersPopup) {
						this.chaptersPopup = this.createPopup('chapters',tracks);
					}
				}
				else if (popup == 'transcript-window') {
					return this.createPopup('transcript-window');
				}
				else if (popup == 'sign-window') {
					return this.createPopup('sign-window');
				}
			}
		}
	};

	AblePlayer.prototype.provideFallback = function() {

		// provide ultimate fallback for users who are unable to play the media
		// If there is HTML content nested within the media element, display that
		// Otherwise, display standard localized error text

		var $fallbackDiv, width, mediaClone, fallback, fallbackText,
		showBrowserList, browsers, i, b, browserList;

		// Could show list of supporting browsers if 99.9% confident the error is truly an outdated browser
		// Too many sites say "You need to update your browser" when in fact I'm using a current version
		showBrowserList = false;

		$fallbackDiv = $('<div>',{
			'class' : 'able-fallback',
			'role' : 'alert',
		});
		// override default width of .able-fallback with player width, if known
		if (typeof this.playerMaxWidth !== 'undefined') {
			width = this.playerMaxWidth + 'px';
		}
		else if (this.$media.attr('width')) {
			width = parseInt(this.$media.attr('width'), 10) + 'px';
		}
		else {
			width = '100%';
		}
		$fallbackDiv.css('max-width',width);

		// use fallback content that's nested inside the HTML5 media element, if there is any
		mediaClone = this.$media.clone();
		$('source, track', mediaClone).remove();
		fallback = mediaClone.html().trim();
		if (fallback.length) {
			$fallbackDiv.html(fallback);
		}
		else {
			// use standard localized error message
			fallbackText =	this.tt.fallbackError1 + ' ' + this.tt[this.mediaType] + '. ';
			fallbackText += this.tt.fallbackError2 + ':';
			fallback = $('<p>').text(fallbackText);
			$fallbackDiv.html(fallback);
			showBrowserList = true;
		}

		if (showBrowserList) {
			browserList = $('<ul>');
			browsers = this.getSupportingBrowsers();
			for (i=0; i<browsers.length; i++) {
				b = $('<li>');
				b.text(browsers[i].name + ' ' + browsers[i].minVersion + ' ' + this.tt.orHigher);
				browserList.append(b);
			}
			$fallbackDiv.append(browserList);
		}

		// if there's a poster, show that as well
		this.injectPoster($fallbackDiv, 'fallback');

		// inject $fallbackDiv into the DOM and remove broken content
		if (typeof this.$ableWrapper !== 'undefined') {
			this.$ableWrapper.before($fallbackDiv);
			this.$ableWrapper.remove();
		}
		else if (typeof this.$media !== 'undefined') {
			this.$media.before($fallbackDiv);
			this.$media.remove();
		}
		else {
			$('body').prepend($fallbackDiv);
		}
	};

	AblePlayer.prototype.getSupportingBrowsers = function() {

		var browsers = [];
		browsers[0] = {
			name:'Chrome',
			minVersion: '31'
		};
		browsers[1] = {
			name:'Firefox',
			minVersion: '34'
		};
		browsers[2] = {
			name:'Internet Explorer',
			minVersion: '10'
		};
		browsers[3] = {
			name:'Opera',
			minVersion: '26'
		};
		browsers[4] = {
			name:'Safari for Mac OS X',
			minVersion: '7.1'
		};
		browsers[5] = {
			name:'Safari for iOS',
			minVersion: '7.1'
		};
		browsers[6] = {
			name:'Android Browser',
			minVersion: '4.1'
		};
		browsers[7] = {
			name:'Chrome for Android',
			minVersion: '40'
		};
		return browsers;
	}

	AblePlayer.prototype.calculateControlLayout = function () {

		// Calculates the layout for controls based on media and options.
		// Returns an object with keys 'ul', 'ur', 'bl', 'br' for upper-left, etc.
		// Each associated value is array of control names to put at that location.

		var controlLayout = {
			'ul': ['play','restart','rewind','forward'],
			'ur': ['seek'],
			'bl': [],
			'br': []
		}

		// test for browser support for volume before displaying volume button
		if (this.browserSupportsVolume()) {
			// volume buttons are: 'mute','volume-soft','volume-medium','volume-loud'
			// previously supported button were: 'volume-up','volume-down'
			this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
			controlLayout['ur'].push('volume');
		}
		else {
			this.volume = false;
		}

		// Calculate the two sides of the bottom-left grouping to see if we need separator pipe.
		var bll = [];
		var blr = [];

		if (this.isPlaybackRateSupported()) {
			bll.push('slower');
			bll.push('faster');
		}

		if (this.mediaType === 'video') {
			if (this.hasCaptions) {
				bll.push('captions'); //closed captions
			}
			if (this.hasSignLanguage) {
				bll.push('sign'); // sign language
			}
			if ((this.hasOpenDesc || this.hasClosedDesc) && (this.useDescriptionsButton)) {
				bll.push('descriptions'); //audio description
			}
		}
		if (this.transcriptType === 'popup') {
			bll.push('transcript');
		}

		if (this.mediaType === 'video' && this.hasChapters && this.useChaptersButton) {
			bll.push('chapters');
		}

		controlLayout['br'].push('preferences');

		if (this.mediaType === 'video' && this.allowFullScreen) {
			controlLayout['br'].push('fullscreen');
		}

		// Include the pipe only if we need to.
		if (bll.length > 0 && blr.length > 0) {
			controlLayout['bl'] = bll;
			controlLayout['bl'].push('pipe');
			controlLayout['bl'] = controlLayout['bl'].concat(blr);
		}
		else {
			controlLayout['bl'] = bll.concat(blr);
		}

		return controlLayout;
	};

	AblePlayer.prototype.addControls = function() {

		// determine which controls to show based on several factors:
		// mediaType (audio vs video)
		// availability of tracks (e.g., for closed captions & audio description)
		// browser support (e.g., for sliders and speedButtons)
		// user preferences (???)
		// some controls are aligned on the left, and others on the right
		var thisObj, baseSliderWidth, controlLayout, sectionByOrder, useSpeedButtons, useFullScreen,
		i, j, k, controls, $controllerSpan, $sliderDiv, sliderLabel, mediaTimes, duration, $pipe, $pipeImg,
		tooltipId, tooltipX, tooltipY, control,
		buttonImg, buttonImgSrc, buttonTitle, $newButton, iconClass, buttonIcon, buttonUse, svgPath,
		leftWidth, rightWidth, totalWidth, leftWidthStyle, rightWidthStyle,
		controllerStyles, vidcapStyles, captionLabel, popupMenuId;

		thisObj = this;

		baseSliderWidth = 100; // arbitrary value, will be recalculated in refreshControls()

		// Initialize the layout into the this.controlLayout variable.
		controlLayout = this.calculateControlLayout();

		sectionByOrder = {0: 'ul', 1:'ur', 2:'bl', 3:'br'};

		// add an empty div to serve as a tooltip
		tooltipId = this.mediaId + '-tooltip';
		this.$tooltipDiv = $('<div>',{
			'id': tooltipId,
			'class': 'able-tooltip'
		}).hide();
		this.$controllerDiv.append(this.$tooltipDiv);

		// step separately through left and right controls
		for (i = 0; i <= 3; i++) {
			controls = controlLayout[sectionByOrder[i]];
			if ((i % 2) === 0) {
				$controllerSpan = $('<div>',{
					'class': 'able-left-controls'
				});
			}
			else {
				$controllerSpan = $('<div>',{
					'class': 'able-right-controls'
				});
			}
			this.$controllerDiv.append($controllerSpan);
			for (j=0; j<controls.length; j++) {
				control = controls[j];
				if (control === 'seek') {
					$sliderDiv = $('<div class="able-seekbar"></div>');
					sliderLabel = this.mediaType + ' ' + this.tt.seekbarLabel;
					$controllerSpan.append($sliderDiv);
					if (typeof this.duration === 'undefined' || this.duration === 0) {
						// set arbitrary starting duration, and change it when duration is known
						this.duration = 100;
						// also set elapsed to 0
						this.elapsed = 0;
					}
					this.seekBar = new AccessibleSlider(this.mediaType, $sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
				}
				else if (control === 'pipe') {
					// TODO: Unify this with buttons somehow to avoid code duplication
					$pipe = $('<span>', {
						'tabindex': '-1',
						'aria-hidden': 'true'
					});
					if (this.iconType === 'font') {
						$pipe.addClass('icon-pipe');
					}
					else {
						$pipeImg = $('<img>', {
							src: this.rootPath + 'button-icons/' + this.iconColor + '/pipe.png',
							alt: '',
							role: 'presentation'
						});
						$pipe.append($pipeImg);
					}
					$controllerSpan.append($pipe);
				}
				else {
					// this control is a button
					if (control === 'volume') {
						buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/' + this.volumeButton + '.png';
					}
					else if (control === 'fullscreen') {
						buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/fullscreen-expand.png';
					}
					else if (control === 'slower') {
						if (this.speedIcons === 'animals') {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/turtle.png';
						}
						else {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/slower.png';
						}
					}
					else if (control === 'faster') {
						if (this.speedIcons === 'animals') {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/rabbit.png';
						}
						else {
							buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/faster.png';
						}
					}
					else {
						buttonImgSrc = this.rootPath + 'button-icons/' + this.iconColor + '/' + control + '.png';
					}
					buttonTitle = this.getButtonTitle(control);

					// icomoon documentation recommends the following markup for screen readers:
					// 1. link element (or in our case, button). Nested inside this element:
					// 2. span that contains the icon font (in our case, buttonIcon)
					// 3. span that contains a visually hidden label for screen readers (buttonLabel)
					// In addition, we are adding aria-label to the button (but not title)
					// And if iconType === 'image', we are replacing #2 with an image (with alt="" and role="presentation")
					// This has been thoroughly tested and works well in all screen reader/browser combinations
					// See https://github.com/ableplayer/ableplayer/issues/81
					$newButton = $('<button>',{
						'type': 'button',
						'tabindex': '0',
						'aria-label': buttonTitle,
						'class': 'able-button-handler-' + control
					});
					if (control === 'volume' || control === 'preferences') {
						if (control == 'preferences') {
							popupMenuId = this.mediaId + '-prefs-menu';
						}
						else if (control === 'volume') {
							popupMenuId = this.mediaId + '-volume-slider';
						}
						$newButton.attr({
							'aria-controls': popupMenuId,
							'aria-expanded': 'false'
						});
					}
					if (this.iconType === 'font') {
						if (control === 'volume') {
							iconClass = 'icon-' + this.volumeButton;
						}
						else if (control === 'slower') {
							if (this.speedIcons === 'animals') {
								iconClass = 'icon-turtle';
							}
							else {
								iconClass = 'icon-slower';
							}
						}
						else if (control === 'faster') {
							if (this.speedIcons === 'animals') {
								iconClass = 'icon-rabbit';
							}
							else {
								iconClass = 'icon-faster';
							}
						}
						else {
							iconClass = 'icon-' + control;
						}
						buttonIcon = $('<span>',{
							'class': iconClass,
							'aria-hidden': 'true'
						});
						$newButton.append(buttonIcon);
					}
					else if (this.iconType === 'svg') {

					/*
						// Unused option for adding SVG:
						// Use <use> element to link to button-icons/able-icons.svg
						// Advantage: SVG file can be cached
						// Disadvantage: Not supported by Safari 6, IE 6-11, or Edge 12
						// Instead, adding <svg> element within each <button>
						if (control === 'volume') {
							iconClass = 'svg-' + this.volumeButton;
						}
						else if (control === 'fullscreen') {
							iconClass = 'svg-fullscreen-expand';
						}
						else if (control === 'slower') {
							if (this.speedIcons === 'animals') {
								iconClass = 'svg-turtle';
							}
							else {
								iconClass = 'svg-slower';
							}
						}
						else if (control === 'faster') {
							if (this.speedIcons === 'animals') {
								iconClass = 'svg-rabbit';
							}
							else {
								iconClass = 'svg-faster';
							}
						}
						else {
							iconClass = 'svg-' + control;
						}
						buttonIcon = $('<svg>',{
							'class': iconClass
						});
						buttonUse = $('<use>',{
							'xlink:href': this.rootPath + 'button-icons/able-icons.svg#' + iconClass
						});
						buttonIcon.append(buttonUse);
						*/
						var svgData;
						if (control === 'volume') {
							svgData = this.getSvgData(this.volumeButton);
						}
						else if (control === 'fullscreen') {
							svgData = this.getSvgData('fullscreen-expand');
						}
						else if (control === 'slower') {
							if (this.speedIcons === 'animals') {
								svgData = this.getSvgData('turtle');
							}
							else {
								svgData = this.getSvgData('slower');
							}
						}
						else if (control === 'faster') {
							if (this.speedIcons === 'animals') {
								svgData = this.getSvgData('rabbit');
							}
							else {
								svgData = this.getSvgData('faster');
							}
						}
						else {
							svgData = this.getSvgData(control);
						}
						buttonIcon = $('<svg>',{
							'focusable': 'false',
							'aria-hidden': 'true',
							'viewBox': svgData[0]
						});
						svgPath = $('<path>',{
							'd': svgData[1]
						});
						buttonIcon.append(svgPath);
						$newButton.html(buttonIcon);

						// Final step: Need to refresh the DOM in order for browser to process & display the SVG
						$newButton.html($newButton.html());
					}
					else {
						// use images
						buttonImg = $('<img>',{
							'src': buttonImgSrc,
							'alt': '',
							'role': 'presentation'
						});
						$newButton.append(buttonImg);
					}
					// add the visibly-hidden label for screen readers that don't support aria-label on the button
					var buttonLabel = $('<span>',{
						'class': 'able-clipped'
					}).text(buttonTitle);
					$newButton.append(buttonLabel);
					// add an event listener that displays a tooltip on mouseenter or focus
					$newButton.on('mouseenter focus',function(e) {
						var label = $(this).attr('aria-label');
						// get position of this button
						var position = $(this).position();
						var buttonHeight = $(this).height();
						var buttonWidth = $(this).width();
						var tooltipY = position.top - buttonHeight - 15;
						var centerTooltip = true;
						if ($(this).closest('div').hasClass('able-right-controls')) {
							// this control is on the right side
							if ($(this).closest('div').find('button:last').get(0) == $(this).get(0)) {
								// this is the last control on the right
								// position tooltip using the "right" property
								centerTooltip = false;
								var tooltipX = 0;
								var tooltipStyle = {
									left: '',
									right: tooltipX + 'px',
									top: tooltipY + 'px'
								};
							}
						}
						else {
							// this control is on the left side
							if ($(this).is(':first-child')) {
								// this is the first control on the left
								centerTooltip = false;
								var tooltipX = position.left;
								var tooltipStyle = {
									left: tooltipX + 'px',
									right: '',
									top: tooltipY + 'px'
								};
							}
						}
						if (centerTooltip) {
							// populate tooltip, then calculate its width before showing it
							var tooltipWidth = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).width();
							// center the tooltip horizontally over the button
							var tooltipX = position.left - tooltipWidth/2;
							var tooltipStyle = {
								left: tooltipX + 'px',
								right: '',
								top: tooltipY + 'px'
							};
						}
						var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).css(tooltipStyle);
						thisObj.showTooltip(tooltip);
						$(this).on('mouseleave blur',function() {
							AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
						})
					});

					if (control === 'captions') {
						if (!this.prefCaptions || this.prefCaptions !== 1) {
							// captions are available, but user has them turned off
							if (this.captions.length > 1) {
								captionLabel = this.tt.captions;
							}
							else {
								captionLabel = this.tt.showCaptions;
							}
							$newButton.addClass('buttonOff').attr('title',captionLabel);
						}
					}
					else if (control === 'descriptions') {
						if (!this.prefDesc || this.prefDesc !== 1) {
							// user prefer non-audio described version
							// Therefore, load media without description
							// Description can be toggled on later with this button
							$newButton.addClass('buttonOff').attr('title',this.tt.turnOnDescriptions);
						}
					}

					$controllerSpan.append($newButton);

					// create variables of buttons that are referenced throughout the AblePlayer object
					if (control === 'play') {
						this.$playpauseButton = $newButton;
					}
					else if (control === 'captions') {
						this.$ccButton = $newButton;
					}
					else if (control === 'sign') {
						this.$signButton = $newButton;
						// gray out sign button if sign language window is not active
						if (!(this.$signWindow.is(':visible'))) {
							this.$signButton.addClass('buttonOff');
						}
					}
					else if (control === 'descriptions') {
						this.$descButton = $newButton;
						// button will be enabled or disabled in description.js > initDescription()
					}
					else if (control === 'mute') {
						this.$muteButton = $newButton;
					}
					else if (control === 'transcript') {
						this.$transcriptButton = $newButton;
						// gray out transcript button if transcript is not active
						if (!(this.$transcriptDiv.is(':visible'))) {
							this.$transcriptButton.addClass('buttonOff').attr('title',this.tt.showTranscript);
						}
					}
					else if (control === 'fullscreen') {
						this.$fullscreenButton = $newButton;
					}
					else if (control === 'chapters') {
						this.$chaptersButton = $newButton;
					}
					else if (control === 'preferences') {
						this.$prefsButton = $newButton;
					}
					else if (control === 'volume') {
						this.$volumeButton = $newButton;
					}
				}
				if (control === 'volume') {
					// in addition to the volume button, add a hidden slider
					this.addVolumeSlider($controllerSpan);
				}
			}
			if ((i % 2) == 1) {
				this.$controllerDiv.append('<div style="clear:both;"></div>');
			}
		}

		if (this.mediaType === 'video') {

			if (typeof this.$captionsDiv !== 'undefined') {
				// stylize captions based on user prefs
				this.stylizeCaptions(this.$captionsDiv);
			}
			if (typeof this.$descDiv !== 'undefined') {
				// stylize descriptions based on user's caption prefs
				this.stylizeCaptions(this.$descDiv);
			}
		}

		// combine left and right controls arrays for future reference
		this.controls = [];
		for (var sec in controlLayout) if (controlLayout.hasOwnProperty(sec)) {
			this.controls = this.controls.concat(controlLayout[sec]);
		}

		// Update state-based display of controls.
		this.refreshControls('init');
	};

	AblePlayer.prototype.useSvg = function () {

		// Modified from IcoMoon.io svgxuse
		// @copyright Copyright (c) 2016 IcoMoon.io
		// @license		Licensed under MIT license
		// See https://github.com/Keyamoon/svgxuse
		// @version		1.1.16

		var cache = Object.create(null); // holds xhr objects to prevent multiple requests
		var checkUseElems,
				tid; // timeout id
		var debouncedCheck = function () {
			clearTimeout(tid);
			tid = setTimeout(checkUseElems, 100);
		};
		var unobserveChanges = function () {
			return;
		};
		var observeChanges = function () {
			var observer;
			window.addEventListener('resize', debouncedCheck, false);
			window.addEventListener('orientationchange', debouncedCheck, false);
			if (window.MutationObserver) {
				observer = new MutationObserver(debouncedCheck);
				observer.observe(document.documentElement, {
					childList: true,
					subtree: true,
					attributes: true
				});
				unobserveChanges = function () {
					try {
						observer.disconnect();
						window.removeEventListener('resize', debouncedCheck, false);
						window.removeEventListener('orientationchange', debouncedCheck, false);
					} catch (ignore) {}
				};
			}
			else {
				document.documentElement.addEventListener('DOMSubtreeModified', debouncedCheck, false);
				unobserveChanges = function () {
					document.documentElement.removeEventListener('DOMSubtreeModified', debouncedCheck, false);
					window.removeEventListener('resize', debouncedCheck, false);
					window.removeEventListener('orientationchange', debouncedCheck, false);
				};
			}
		};
		var xlinkNS = 'http://www.w3.org/1999/xlink';
		checkUseElems = function () {
			var base,
					bcr,
					fallback = '', // optional fallback URL in case no base path to SVG file was given and no symbol definition was found.
					hash,
					i,
					Request,
					inProgressCount = 0,
					isHidden,
					url,
					uses,
					xhr;
			if (window.XMLHttpRequest) {
				Request = new XMLHttpRequest();
				if (Request.withCredentials !== undefined) {
					Request = XMLHttpRequest;
				}
				else {
					Request = XDomainRequest || undefined;
				}
			}
			if (Request === undefined) {
				return;
			}
			function observeIfDone() {
				// If done with making changes, start watching for chagnes in DOM again
				inProgressCount -= 1;
				if (inProgressCount === 0) { // if all xhrs were resolved
					observeChanges(); // watch for changes to DOM
				}
			}
			function attrUpdateFunc(spec) {
				return function () {
					if (cache[spec.base] !== true) {
						spec.useEl.setAttributeNS(xlinkNS, 'xlink:href', '#' + spec.hash);
					}
				};
			}
			function onloadFunc(xhr) {
				return function () {
					var body = document.body;
					var x = document.createElement('x');
					var svg;
					xhr.onload = null;
					x.innerHTML = xhr.responseText;
					svg = x.getElementsByTagName('svg')[0];
					if (svg) {
						svg.setAttribute('aria-hidden', 'true');
						svg.style.position = 'absolute';
						svg.style.width = 0;
						svg.style.height = 0;
						svg.style.overflow = 'hidden';
						body.insertBefore(svg, body.firstChild);
					}
					observeIfDone();
				};
			}
			function onErrorTimeout(xhr) {
				return function () {
					xhr.onerror = null;
					xhr.ontimeout = null;
					observeIfDone();
				};
			}
			unobserveChanges(); // stop watching for changes to DOM
			// find all use elements
			uses = document.getElementsByTagName('use');
			for (i = 0; i < uses.length; i += 1) {
				try {
					bcr = uses[i].getBoundingClientRect();
				} catch (ignore) {
					// failed to get bounding rectangle of the use element
					bcr = false;
				}
				url = uses[i].getAttributeNS(xlinkNS, 'href').split('#');
				base = url[0];
				hash = url[1];
				isHidden = bcr && bcr.left === 0 && bcr.right === 0 && bcr.top === 0 && bcr.bottom === 0;
				if (bcr && bcr.width === 0 && bcr.height === 0 && !isHidden) {
					// the use element is empty
					// if there is a reference to an external SVG, try to fetch it
					// use the optional fallback URL if there is no reference to an external SVG
					if (fallback && !base.length && hash && !document.getElementById(hash)) {
						base = fallback;
					}
					if (base.length) {
						// schedule updating xlink:href
						xhr = cache[base];
						if (xhr !== true) {
							// true signifies that prepending the SVG was not required
							setTimeout(attrUpdateFunc({
								useEl: uses[i],
								base: base,
								hash: hash
							}), 0);
						}
						if (xhr === undefined) {
							xhr = new Request();
							cache[base] = xhr;
							xhr.onload = onloadFunc(xhr);
							xhr.onerror = onErrorTimeout(xhr);
							xhr.ontimeout = onErrorTimeout(xhr);
							xhr.open('GET', base);
							xhr.send();
							inProgressCount += 1;
						}
					}
				}
				else {
					if (!isHidden) {
						if (cache[base] === undefined) {
							// remember this URL if the use element was not empty and no request was sent
							cache[base] = true;
						}
						else if (cache[base].onload) {
							// if it turns out that prepending the SVG is not necessary,
							// abort the in-progress xhr.
							cache[base].abort();
							cache[base].onload = undefined;
							cache[base] = true;
						}
					}
				}
			}
			uses = '';
			inProgressCount += 1;
			observeIfDone();
		};
/*
		// The load event fires when all resources have finished loading, which allows detecting whether SVG use elements are empty.
		window.addEventListener('load', function winLoad() {
			window.removeEventListener('load', winLoad, false); // to prevent memory leaks
			tid = setTimeout(checkUseElems, 0);
		}, false);
*/
	};

	AblePlayer.prototype.cuePlaylistItem = function(sourceIndex) {

		// Move to a new item in a playlist.
		// NOTE: Swapping source for audio description is handled elsewhere;
		// see description.js > swapDescription()

		/*
			// Decided against preventing a reload of the current item in the playlist.
			// If it's clickable, users should be able to click on it and expect something to happen.
			// Leaving here though in case it's determined to be desirable.
		if (sourceIndex === this.playlistItemIndex) {
			// user has requested the item that's currently playing
			// just ignore the request
			return;
		}
		this.playlistItemIndex = sourceIndex;
		*/

		var $newItem, prevPlayer, newPlayer, itemTitle, itemLang, sources, s, i, $newSource, nowPlayingSpan;

		var thisObj = this;

		prevPlayer = this.player;

		if (this.initializing) { // this is the first track - user hasn't pressed play yet
			// do nothing.
		}
		else {
				if (this.playerCreated) {
				// remove the old
				this.deletePlayer();
			}
		}

		// Determine appropriate player to play this media
		$newItem = this.$playlist.eq(sourceIndex);
		if (this.hasAttr($newItem,'data-youtube-id')) {
			this.youTubeId = $newItem.attr('data-youtube-id');
			newPlayer = 'youtube';
		}
		else {
				newPlayer = 'html5';
		}

		if (newPlayer === 'youtube') {
			if (prevPlayer === 'html5') {
				// pause and hide the previous media
				if (this.playing) {
					this.pauseMedia();
				}
				this.$media.hide();
			}
		}
		else {
				// the new player is not youtube
			this.youTubeId = false;
			if (prevPlayer === 'youtube') {
				// unhide the media element
				this.$media.show();
			}
		}
		this.player = newPlayer;

		// set swappingSrc; needs to be true within recreatePlayer(), called below
		this.swappingSrc = true;

		// transfer media attributes from playlist to media element
		if (this.hasAttr($newItem,'data-poster')) {
			this.$media.attr('poster',$newItem.attr('data-poster'));
		}
		if (this.hasAttr($newItem,'data-width')) {
			this.$media.attr('width',$newItem.attr('data-width'));
		}
		if (this.hasAttr($newItem,'data-height')) {
			this.$media.attr('height',$newItem.attr('data-height'));
		}
		if (this.hasAttr($newItem,'data-youtube-desc-id')) {
			this.$media.attr('data-youtube-desc-id',$newItem.attr('data-youtube-desc-id'));
		}
		if (this.youTubeId) {
			this.$media.attr('data-youtube-id',$newItem.attr('data-youtube-id'));
		}

		// add new <source> elements from playlist data
		var $sourceSpans = $newItem.children('span.able-source');
		if ($sourceSpans.length) {
			$sourceSpans.each(function() {
				if (thisObj.hasAttr($(this),'data-src')) {
					// this is the only required attribute
					var $newSource = $('<source>',{
						'src': $(this).attr('data-src')
					});
					if (thisObj.hasAttr($(this),'data-type')) {
						$newSource.attr('type',$(this).attr('data-type'));
					}
					if (thisObj.hasAttr($(this),'data-desc-src')) {
						$newSource.attr('data-desc-src',$(this).attr('data-desc-src'));
					}
					if (thisObj.hasAttr($(this),'data-sign-src')) {
						$newSource.attr('data-sign-src',$(this).attr('data-sign-src'));
					}
					thisObj.$media.append($newSource);
				}
			});
		}

		// add new <track> elements from playlist data
		var $trackSpans = $newItem.children('span.able-track');
		if ($trackSpans.length) {
			 // for each element in $trackSpans, create a new <track> element
			$trackSpans.each(function() {
				if (thisObj.hasAttr($(this),'data-src') &&
					thisObj.hasAttr($(this),'data-kind') &&
					thisObj.hasAttr($(this),'data-srclang')) {
					// all required attributes are present
					var $newTrack = $('<track>',{
						'src': $(this).attr('data-src'),
						'kind': $(this).attr('data-kind'),
						'srclang': $(this).attr('data-srclang')
					});
					if (thisObj.hasAttr($(this),'data-label')) {
						$newTrack.attr('label',$(this).attr('data-label'));
					}
					thisObj.$media.append($newTrack);
				}
			});
		}

		itemTitle = $newItem.text();
		if (this.hasAttr($newItem,'lang')) {
			itemLang = $newItem.attr('lang');
		}
		// Update relevant arrays
		this.$sources = this.$media.find('source');

		// recreate player, informed by new attributes and track elements
		this.recreatePlayer();

		// update playlist to indicate which item is playing
		//$('.able-playlist li').removeClass('able-current');
		this.$playlist.removeClass('able-current');
		this.$playlist.eq(sourceIndex).addClass('able-current');

		// update Now Playing div
		if (this.showNowPlaying === true) {
			if (typeof this.$nowPlayingDiv !== 'undefined') {
				nowPlayingSpan = $('<span>');
				if (typeof itemLang !== 'undefined') {
					nowPlayingSpan.attr('lang',itemLang);
				}
				nowPlayingSpan.html('<span>' + this.tt.selectedTrack + ':</span>' + itemTitle);
				this.$nowPlayingDiv.html(nowPlayingSpan);
			}
		}

		// finished swapping src, now reload the new source file.
		this.swappingSrc = false;

		if (this.player === 'html5') {
			this.media.load();
		}
		else if (this.player === 'youtube') {
			// TODO: Load new youTubeId
		}

		// if this.swappingSrc is true, media will autoplay when ready
		if (this.initializing) { // this is the first track - user hasn't pressed play yet
			this.swappingSrc = false;
		}
		else {
			this.swappingSrc = true;
			if (this.player === 'html5') {
				this.media.load();
			}
			else if (this.player === 'youtube') {
				this.okToPlay = true;
			}
		}
	};

	AblePlayer.prototype.deletePlayer = function() {

		// remove previous video's attributes and child elements from media element
		if (this.player == 'youtube') {
				var $youTubeIframe = this.$mediaContainer.find('iframe');
				$youTubeIframe.remove();
		}
		this.$media.removeAttr('poster width height');
		this.$media.empty();

		// Empty elements that will be rebuilt
		this.$controllerDiv.empty();
		// this.$statusBarDiv.empty();
		// this.$timer.empty();
		this.$elapsedTimeContainer.empty().text('0:00'); // span.able-elapsedTime
		this.$durationContainer.empty(); // span.able-duration

		// Remove popup windows and modal dialogs; these too will be rebuilt
		if (this.$signWindow) {
				this.$signWindow.remove();
		}
		if (this.$transcriptArea) {
				this.$transcriptArea.remove();
		}
		$('.able-modal-dialog').remove();

		// reset key variables
		this.hasCaptions = false;
		this.hasChapters = false;
		this.captionsPopup = null;
		this.chaptersPopup = null;
	};

	AblePlayer.prototype.getButtonTitle = function(control) {

		if (control === 'playpause') {
			return this.tt.play;
		}
		else if (control === 'play') {
			return this.tt.play;
		}
		else if (control === 'pause') {
			return this.tt.pause;
		}
		else if (control === 'restart') {
			return this.tt.restart;
		}
		else if (control === 'rewind') {
			return this.tt.rewind;
		}
		else if (control === 'forward') {
			return this.tt.forward;
		}
		else if (control === 'captions') {
			if (this.captions.length > 1) {
				return this.tt.captions;
			}
			else {
				if (this.captionsOn) {
					return this.tt.hideCaptions;
				}
				else {
					return this.tt.showCaptions;
				}
			}
		}
		else if (control === 'descriptions') {
			if (this.descOn) {
				return this.tt.turnOffDescriptions;
			}
			else {
				return this.tt.turnOnDescriptions;
			}
		}
		else if (control === 'transcript') {
			if (this.$transcriptDiv.is(':visible')) {
				return this.tt.hideTranscript;
			}
			else {
				return this.tt.showTranscript;
			}
		}
		else if (control === 'chapters') {
			return this.tt.chapters;
		}
		else if (control === 'sign') {
			return this.tt.sign;
		}
		else if (control === 'volume') {
			return this.tt.volume;
		}
		else if (control === 'faster') {
			return this.tt.faster;
		}
		else if (control === 'slower') {
			return this.tt.slower;
		}
		else if (control === 'preferences') {
			return this.tt.preferences;
		}
		else if (control === 'help') {
			// return this.tt.help;
		}
		else {
			// there should be no other controls, but just in case:
			// return the name of the control with first letter in upper case
			// ultimately will need to get a translated label from this.tt
			if (this.debug) {
				console.log('Found an untranslated label: ' + control);
			}
			return control.charAt(0).toUpperCase() + control.slice(1);
		}
	};


})(jQuery);
