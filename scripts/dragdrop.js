(function ($) {

	AblePlayer.prototype.initDragDrop = function ( which ) {

		// supported values of which: 'sign', 'transcript'

		// NOTE: "Drag and Drop" for Able Player is a metaphor only!!!
		// HTML5 Drag & Drop API enables moving elements to new locations in the DOM
		// Thats not our purpose; we're simply changing the visible position on-screen
		// Therefore, the drag & drop interface was overhauled in v2.3.41 to simple
		// use mouse (and keyboard) events to change CSS positioning properties

		// There are nevertheless lessons to be learned from Drag & Drop about accessibility:
		// http://dev.opera.com/articles/accessible-drag-and-drop/

		var thisObj, $window, $toolbar, windowName, $resizeHandle, $resizeSvg, 
			i, x1, y1, x2, y2, $resizeLine, resizeZIndex;

		thisObj = this;

		if (which === 'transcript') {
			$window = this.$transcriptArea;
			windowName = 'transcript-window';
			$toolbar = this.$transcriptToolbar;
		}
		else if (which === 'sign') {
			$window = this.$signWindow;
			windowName = 'sign-window';
			$toolbar = this.$signToolbar;
		}

		// add class to trigger change in cursor on hover
		$toolbar.addClass('able-draggable');

		// add resize handle selector to bottom right corner
		$resizeHandle = $('<div>',{
			'class': 'able-resizable'
		});

		// fill it with three parallel diagonal lines 
		$resizeSvg = $('<svg>').attr({
			'width': '100%',
			'height': '100%',
			'viewBox': '0 0 100 100',
			'preserveAspectRatio': 'none'
		});
		for (i=1; i<=3; i++) { 
			if (i === 1) { 
				x1 = '100'; 
				y1 = '0'; 
				x2 = '0'; 
				y2 = '100'; 
			}
			else if (i === 2) { 
				x1 = '33'; 
				y1 = '100'; 
				x2 = '100'; 
				y2 = '33'; 
			}
			else if (i === 3) { 
				x1 = '67'; 
				y1 = '100'; 
				x2 = '100'; 
				y2 = '67'; 
			}
			$resizeLine = $('<line>').attr({ 
				'x1': x1,
				'y1': y1,
				'x2': x2,
				'y2': y2,
				'vector-effect': 'non-scaling-stroke'				
			})
			$resizeSvg.append($resizeLine); 
		}
		$resizeHandle.html($resizeSvg); 

		// assign z-index that's slightly higher than parent window
		resizeZIndex = parseInt($window.css('z-index')) + 100;
		$resizeHandle.css('z-index',resizeZIndex);
		$window.append($resizeHandle);

		// Final step: Need to refresh the DOM in order for browser to process & display the SVG
		$resizeHandle.html($resizeHandle.html());

		// add event listener to toolbar to start and end drag
		// other event listeners will be added when drag starts
		$toolbar.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart') {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.dragDevice = 'mouse'; // ok to use this even if device is a touchpad
					thisObj.startDrag(which, $window);
				}
			}
			else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.dragging && thisObj.dragDevice === 'mouse') {
					thisObj.endDrag(which);
				}
			}
			return false;
		});

		// add event listeners for resizing
		$resizeHandle.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart') {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.startResize(which, $window);
				}
			}
			else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.resizing) {
					thisObj.endResize(which);
				}
			}
			return false;
		});

		// whenever a window is clicked, bring it to the foreground
		$window.on('click', function() {

			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
				thisObj.updateZIndex(which);
			}
			thisObj.finishingDrag = false;
		});

		this.addWindowMenu(which,$window,windowName);
	};

	AblePlayer.prototype.addWindowMenu = function(which, $window, windowName) {

		var thisObj, $windowAlert, menuId, $newButton, $buttonIcon, buttonImgSrc, $buttonImg,
			$buttonLabel, tooltipId, $tooltip, $popup,
			label, position, buttonHeight, buttonWidth, tooltipY, tooltipX, tooltipStyle, tooltip,
			$optionList, menuBaseId, options, i, $optionItem, option, menuId;

		thisObj = this;

		// Add a Boolean that will be set to true temporarily if window button or a menu item is clicked
		// This will prevent the click event from also triggering a mousedown event on the toolbar
		// (which would unexpectedly send the window into drag mode)
		this.windowMenuClickRegistered = false;

		// Add another Boolean that will be set to true temporarily when mouseup fires at the end of a drag
		// this will prevent the click event from being triggered
		this.finishingDrag = false;

		// create an alert div and add it to window
		$windowAlert = $('<div role="alert"></div>');
		$windowAlert.addClass('able-alert');
		$windowAlert.hide();
		$windowAlert.appendTo(this.$activeWindow);
		$windowAlert.css({
			top: $window.offset().top
		});

		// add button to draggable window which triggers a popup menu
		// for now, re-use preferences icon for this purpose
		menuId = this.mediaId + '-' + windowName + '-menu';
		$newButton = $('<button>',{
			'type': 'button',
			'tabindex': '0',
			'aria-label': this.tt.windowButtonLabel,
			'aria-haspopup': 'true',
			'aria-controls': menuId,
			'aria-expanded': 'false',
			'class': 'able-button-handler-preferences'
		});
		if (this.iconType === 'font') {
			$buttonIcon = $('<span>',{
				'class': 'icon-preferences',
				'aria-hidden': 'true'
			});
			$newButton.append($buttonIcon);
		}
		else {
			// use image
			buttonImgSrc = this.rootPath + 'button-icons/' + this.toolbarIconColor + '/preferences.png';
			$buttonImg = $('<img>',{
				'src': buttonImgSrc,
				'alt': '',
				'role': 'presentation'
			});
			$newButton.append($buttonImg);
		}

		// add the visibly-hidden label for screen readers that don't support aria-label on the button
		$buttonLabel = $('<span>',{
			'class': 'able-clipped'
		}).text(this.tt.windowButtonLabel);
		$newButton.append($buttonLabel);

		// add a tooltip that displays aria-label on mouseenter or focus
		tooltipId = this.mediaId + '-' + windowName + '-tooltip';
		$tooltip = $('<div>',{
			'class' : 'able-tooltip',
			'id' : tooltipId
		}).hide();
		$newButton.on('mouseenter focus',function(e) {
			var label = $(this).attr('aria-label');
			// get position of this button
			var position = $(this).position();
			var buttonHeight = $(this).height();
			var buttonWidth = $(this).width();
			var tooltipY = position.top - buttonHeight - 5;
			var tooltipX = 0;
			var tooltipStyle = {
				left: '',
				right: tooltipX + 'px',
				top: tooltipY + 'px'
			};
			var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label).css(tooltipStyle);
			thisObj.showTooltip(tooltip);
			$(this).on('mouseleave blur',function() {
				AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
			});
		});

		// setup popup menu
		$popup = this.setupPopups(windowName); // 'transcript-window' or 'sign-window'
		// define vars and assemble all the parts
		if (which === 'transcript') {
			this.$transcriptAlert = $windowAlert;
			this.$transcriptPopupButton = $newButton;
			this.$transcriptPopup = $popup;
			this.$transcriptToolbar.prepend($windowAlert,$newButton,$tooltip,$popup);
		}
		else if (which === 'sign') {
			this.$signAlert = $windowAlert;
			this.$signPopupButton = $newButton;
			this.$signPopup = $popup;
			this.$signToolbar.append($windowAlert,$newButton,$tooltip,$popup);
		}

		// handle button click
		$newButton.on('click mousedown keydown',function(e) {

			if (thisObj.focusNotClick) {
				return false;
			}
			if (thisObj.dragging) {
				thisObj.dragKeys(which, e);
				return false;
			}
			e.stopPropagation();
			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
				// don't set windowMenuClickRegistered yet; that happens in handler function
				thisObj.handleWindowButtonClick(which, e);
			}
			thisObj.finishingDrag = false;
		});

		this.addResizeDialog(which, $window);
	};

	AblePlayer.prototype.addResizeDialog = function (which, $window) {

		var thisObj, $windowPopup, $windowButton,
			widthId, heightId, startingWidth, startingHeight, aspectRatio,
			$resizeForm, $resizeWrapper,
			$resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel,
			$resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel,
			tempWidth, tempHeight,
			$saveButton, $cancelButton, newWidth, newHeight, resizeDialog;

		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		widthId = this.mediaId + '-resize-' + which + '-width';
		heightId = this.mediaId + '-resize-' + which + '-height';
		startingWidth = $window.width();
		startingHeight = $window.height();
		aspectRatio = startingWidth / startingHeight;

		$resizeForm = $('<div></div>',{
			'class' : 'able-resize-form'
		});

		// inner container for all content, will be assigned to modal div's aria-describedby
		$resizeWrapper = $('<div></div>');

		// width field
		$resizeWidthDiv = $('<div></div>');
		$resizeWidthInput = $('<input>',{
			'type': 'text',
			'id': widthId,
			'value': startingWidth
		});
		$resizeWidthLabel = $('<label>',{
			'for': widthId
		}).text(this.tt.width);

		// height field
		$resizeHeightDiv = $('<div></div>');
		$resizeHeightInput = $('<input>',{
			'type': 'text',
			'id': heightId,
			'value': startingHeight
		});
		$resizeHeightLabel = $('<label>',{
			'for': heightId
		}).text(this.tt.height);

		if (which === 'sign') {
			// make height a read-only field
			// and calculate its value based on width to preserve aspect ratio
			$resizeHeightInput.prop('readonly',true);
			$resizeWidthInput.on('input',function() {
				tempWidth = $(this).val();
				tempHeight = Math.round(tempWidth/aspectRatio, 0);
				$resizeHeightInput.val(tempHeight);
			})
		}

		// Add save and cancel buttons.
		$saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
		$saveButton.on('click',function () {
			newWidth = $('#' + widthId).val();
			newHeight = $('#' + heightId).val();
			if (newWidth !== startingWidth || newHeight !== startingHeight) {
				thisObj.resizeObject(which,newWidth,newHeight);
				thisObj.updateCookie(which);
			}
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.focus();
		});
		$cancelButton.on('click',function () {
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.focus();
		});

		// Now assemble all the parts
		$resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
		$resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeForm.append($resizeWrapper,'<hr>',$saveButton,$cancelButton);

		// must be appended to the BODY!
		// otherwise when aria-hidden="true" is applied to all background content
		// that will include an ancestor of the dialog,
		// which will render the dialog unreadable by screen readers
		$('body').append($resizeForm);
		resizeDialog = new AccessibleDialog($resizeForm, $windowButton, 'dialog', true, this.tt.windowResizeHeading, $resizeWrapper, this.tt.closeButtonLabel, '20em');
		if (which === 'transcript') {
			this.transcriptResizeDialog = resizeDialog;
		}
		else if (which === 'sign') {
			this.signResizeDialog = resizeDialog;
		}
	};

	AblePlayer.prototype.handleWindowButtonClick = function (which, e) {

		var thisObj, $windowPopup, $windowButton, $toolbar, popupTop;

		thisObj = this;

		if (this.focusNotClick) {
			// transcript or sign window has just opened,
			// and focus moved to the window button
			// ignore the keystroke that triggered the popup
			return false;
		}

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			$toolbar = this.$transcriptToolbar;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			$toolbar = this.$signToolbar;
		}

		if (e.type === 'keydown') {
			// user pressed a key
			if (e.which === 32 || e.which === 13) {
				// this was Enter or space
				this.windowMenuClickRegistered = true;
			}
			else if (e.which === 27) { // escape
				if ($windowPopup.is(':visible')) {
					// close the popup menu
					$windowPopup.hide('fast', function() {
						// also reset the Boolean
						thisObj.windowMenuClickRegistered = false;
						// also restore menu items to their original state
						$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
						// also return focus to window options button
						$windowButton.focus();
					});
				}
				else {
					// popup isn't open. Close the window
					if (which === 'sign') {
						this.handleSignToggle();
					}
					else if (which === 'transcript') {
						this.handleTranscriptToggle();
					}
				}
			}
			else {
				return false;
			}
		}
		else {
			// this was a mouse event
			this.windowMenuClickRegistered = true;
		}

		if ($windowPopup.is(':visible')) {
			$windowPopup.hide(200,'',function() {
				thisObj.windowMenuClickRegistered = false; // reset
			});
			$windowPopup.find('li').removeClass('able-focus');
			$windowButton.attr('aria-expanded','false').focus();
		}
		else {
			// first, be sure window is on top
			this.updateZIndex(which);
			popupTop = $windowButton.position().top + $windowButton.outerHeight();
			$windowPopup.css('top', popupTop);
			$windowPopup.show(200,'',function() {
				$windowButton.attr('aria-expanded','true');
				$(this).find('li').first().focus().addClass('able-focus');
				thisObj.windowMenuClickRegistered = false; // reset
			});
		}
	};

	AblePlayer.prototype.handleMenuChoice = function (which, choice, e) {

		var thisObj, $window, $windowPopup, $windowButton, resizeDialog, width, height, $thisRadio;

		thisObj = this;
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			resizeDialog = this.transcriptResizeDialog;
		}
		else if (which === 'sign') {
			$window = this.$signWindow;
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			resizeDialog = this.signResizeDialog;
		}
		this.$activeWindow = $window;

		if (e.type === 'keydown') {
			if (e.which === 27) { // escape
				// hide the popup menu
				$windowPopup.hide('fast', function() {
					// also reset the Boolean
					thisObj.windowMenuClickRegistered = false;
					// also restore menu items to their original state
					$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
					$windowButton.attr('aria-expanded','false');
					// also return focus to window options button
					$windowButton.focus();
				});
				return false;
			}
			else {
				// all other keys will be handled by upstream functions
				if (choice !== 'close') {
					this.$activeWindow = $window;
				}
				return false;
			}
		}

		// hide the popup menu
		$windowPopup.hide('fast', function() {
			// also reset the boolean
			thisObj.windowMenuClickRegistered = false;
			// also restore menu items to their original state
			$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			$windowButton.attr('aria-expanded','false');
		});
		if (choice !== 'close') {
			$windowButton.focus();
		}
		if (choice === 'move') {

			// temporarily add role="application" to activeWindow
			// otherwise, screen readers incercept arrow keys and moving window will not work
			this.$activeWindow.attr('role','application');

			if (!this.showedAlert(which)) {
				this.showAlert(this.tt.windowMoveAlert,which);
				if (which === 'transcript') {
					this.showedTranscriptAlert = true;
				}
				else if (which === 'sign') {
					this.showedSignAlert = true;
				}
			}
			if (e.type === 'keydown') {
				this.dragDevice = 'keyboard';
			}
			else {
				this.dragDevice = 'mouse';
			}
			this.startDrag(which, $window);
			$windowPopup.hide().parent().focus();
		}
		else if (choice == 'resize') {
			// resize through the menu uses a form, not drag
			var resizeFields = resizeDialog.getInputs();
			if (resizeFields) {
				// reset width and height values in form
				resizeFields[0].value = $window.width();
				resizeFields[1].value = $window.height();
			}
			resizeDialog.show();
		}
		else if (choice == 'close') {
			// close window, place focus on corresponding button on controller bar
			if (which === 'transcript') {
				this.closingTranscript = true; // stopgrap to prevent double-firing of keypress
				this.handleTranscriptToggle();
			}
			else if (which === 'sign') {
				this.closingSign = true; // stopgrap to prevent double-firing of keypress
				this.handleSignToggle();
			}
		}
	};

	AblePlayer.prototype.startDrag = function(which, $element) {

		var thisObj, $windowPopup, zIndex, startPos, newX, newY;

		thisObj = this;

		if (!this.$activeWindow) {
			this.$activeWindow = $element;
		}
		this.dragging = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
		}

		if (!this.showedAlert(which)) {
			this.showAlert(this.tt.windowMoveAlert,which);
			if (which === 'transcript') {
				this.showedTranscriptAlert = true;
			}
			else if (which === 'sign') {
				this.showedSignAlert = true;
			}
		}

		// if window's popup menu is open, close it
		if ($windowPopup.is(':visible')) {
			$windowPopup.hide();
		}

		// be sure this window is on top
		this.updateZIndex(which);

		// get starting position of element
		startPos = this.$activeWindow.position();
		this.dragStartX = startPos.left;
		this.dragStartY = startPos.top;

		if (typeof this.startMouseX === 'undefined') {
			this.dragDevice = 'keyboard';
			this.dragKeyX = this.dragStartX;
			this.dragKeyY = this.dragStartY;
			// add stopgap to prevent the Enter that triggered startDrag() from also triggering dragEnd()
			this.startingDrag = true;
		}
		else {
			this.dragDevice = 'mouse';
			// get offset between mouse position and top left corner of draggable element
			this.dragOffsetX = this.startMouseX - this.dragStartX;
			this.dragOffsetY = this.startMouseY - this.dragStartY;
		}

		// prepare element for dragging
		this.$activeWindow.addClass('able-drag').css({
			'position': 'absolute',
			'top': this.dragStartY + 'px',
			'left': this.dragStartX + 'px'
		}).focus();

		// add device-specific event listeners
		if (this.dragDevice === 'mouse') { // might also be a touchpad
			$(document).on('mousemove touchmove',function(e) {
				if (thisObj.dragging) {
					// calculate new top left based on current mouse position - offset
					newX = e.pageX - thisObj.dragOffsetX;
					newY = e.pageY - thisObj.dragOffsetY;
					thisObj.resetDraggedObject( newX, newY );
				}
			});
		}
		else if (this.dragDevice === 'keyboard') {
			this.$activeWindow.on('keydown',function(e) {
				if (thisObj.dragging) {
					thisObj.dragKeys(which, e);
				}
			});
		}
		return false;
	};

	AblePlayer.prototype.dragKeys = function(which, e) {

		var key, keySpeed;

		var thisObj = this;

		// stopgap to prevent firing on initial Enter or space
		// that selected "Move" from menu
		if (this.startingDrag) {
			this.startingDrag = false;
			return false;
		}
		key = e.which;
		keySpeed = 10; // pixels per keypress event

		switch (key) {
			case 37:	// left
			case 63234:
				 this.dragKeyX -= keySpeed;
				break;
			case 38:	// up
			case 63232:
				this.dragKeyY -= keySpeed;
				break;
			case 39:	// right
			case 63235:
				this.dragKeyX += keySpeed;
				break;
			case 40:	// down
			case 63233:
				this.dragKeyY += keySpeed;
				break;
			case 13: 	// enter
			case 27: 	// escape
				this.endDrag(which);
				return false;
			default:
				return false;
		}
		this.resetDraggedObject(this.dragKeyX,this.dragKeyY);
		if (e.preventDefault) {
			e.preventDefault();
		}
		return false;
	};

	AblePlayer.prototype.resetDraggedObject = function ( x, y) {

		this.$activeWindow.css({
			'left': x + 'px',
			'top': y + 'px'
		});
	},

	AblePlayer.prototype.resizeObject = function ( which, width, height ) {

		var innerHeight;

		// which is either 'transcript' or 'sign'
		this.$activeWindow.css({
			'width': width + 'px',
			'height': height + 'px'
		});

		if (which === 'transcript') {
			// $activeWindow is the outer $transcriptArea
			// but the inner able-transcript also needs to be resized proporitionally
			// (it's 50px less than its outer container)
			innerHeight = height - 50;
			this.$transcriptDiv.css('height', innerHeight + 'px');
		}
	};

	AblePlayer.prototype.endDrag = function(which) {

		var thisObj, $window, $windowPopup, $windowButton;
		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown').removeClass('able-drag');
		// restore activeWindow role from 'application' to 'dialog'
		this.$activeWindow.attr('role','dialog');
		this.$activeWindow = null;

		if (this.dragDevice === 'keyboard') {
			$windowButton.focus();
		}
		this.dragging = false;

		// save final position of dragged element
		this.updateCookie(which);

		// reset starting mouse positions
		this.startMouseX = undefined;
		this.startMouseY = undefined;

		// Boolean to stop stray events from firing
		this.windowMenuClickRegistered = false;
		this.finishingDrag = true; // will be reset after window click event
		// finishingDrag should e reset after window click event,
		// which is triggered automatically after mouseup
		// However, in case that's not reliable in some browsers
		// need to ensure this gets cancelled
		setTimeout(function() {
			thisObj.finishingDrag = false;
		}, 100);
	};

	AblePlayer.prototype.isCloseToCorner = function($window, mouseX, mouseY) {

		// return true if mouse is close to bottom right corner (resize target)
		var tolerance, position, top, left, width, height, bottom, right;

		tolerance = 10; // number of pixels in both directions considered "close enough"

		// first, get position of element
		position = $window.offset();
		top = position.top;
		left = position.left;
		width = $window.width();
		height = $window.height();
		bottom = top + height;
		right = left + width;
		if ((Math.abs(bottom-mouseY) <= tolerance) && (Math.abs(right-mouseX) <= tolerance)) {
			return true;
		}
		return false;
	};

	AblePlayer.prototype.startResize = function(which, $element) {

		var thisObj, $windowPopup, zIndex, startPos, newWidth, newHeight;

		thisObj = this;
		this.$activeWindow = $element;
		this.resizing = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
		}

		// if window's popup menu is open, close it & place focus on button (???)
		if ($windowPopup.is(':visible')) {
			$windowPopup.hide().parent().focus();
		}

		// get starting width and height
		startPos = this.$activeWindow.position();
		this.dragKeyX = this.dragStartX;
		this.dragKeyY = this.dragStartY;
		this.dragStartWidth = this.$activeWindow.width();
		this.dragStartHeight = this.$activeWindow.height();

		// add event listeners
		$(document).on('mousemove touchmove',function(e) {
			if (thisObj.resizing) {
				// calculate new width and height based on changes to mouse position
				newWidth = thisObj.dragStartWidth + (e.pageX - thisObj.startMouseX);
				newHeight = thisObj.dragStartHeight + (e.pageY - thisObj.startMouseY);
				thisObj.resizeObject( which, newWidth, newHeight );
			}
		});
		return false;
	};

	AblePlayer.prototype.endResize = function(which) {

		var $window, $windowPopup, $windowButton;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		}
		else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown');
		$windowButton.show().focus();
		this.resizing = false;
		this.$activeWindow.removeClass('able-resize');

		// save final width and height of dragged element
		this.updateCookie(which);

		// Booleans for preventing stray events
		this.windowMenuClickRegistered = false;
		this.finishingDrag = true;

		// finishingDrag should e reset after window click event,
		// which is triggered automatically after mouseup
		// However, in case that's not reliable in some browsers
		// need to ensure this gets cancelled
		setTimeout(function() {
			this.finishingDrag = false;
		}, 100);
	};

})(jQuery);
