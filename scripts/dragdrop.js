(function ($) {
	AblePlayer.prototype.initDragDrop = function ( which ) {

		// supported values of which: 'sign', 'transcript'

		// NOTE: "Drag and Drop" for Able Player is a metaphor only!!!
		// HTML5 Drag & Drop API enables moving elements to new locations in the DOM
		// Thats not our purpose; we're simply changing the visible position on-screen
		// Therefore, the drag & drop interface was overhauled in v2.3.41 to simply
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
			$toolbar.attr( 'aria-label', this.translate( 'transcriptControls', 'Transcript Window Controls' ) );
		} else if (which === 'sign') {
			$window = this.$signWindow;
			windowName = 'sign-window';
			$toolbar = this.$signToolbar;
			$toolbar.attr( 'aria-label', this.translate( 'signControls', 'Sign Language Window Controls' ) );
		}

		// add class to trigger change in cursor on hover
		$toolbar.addClass('able-draggable');
		$toolbar.attr( 'role', 'application' );

		$dragHandle = $('<div>',{
			'class': 'able-drag-handle'
		});

		$dragHandle.html('<svg version="1.1" viewBox="262.48 487.5 675.03 225" xmlns="http://www.w3.org/2000/svg"><path d="m900 562.5h-600c-13.398 0-25.777-7.1484-32.477-18.75-6.6992-11.602-6.6992-25.898 0-37.5 6.6992-11.602 19.078-18.75 32.477-18.75h600c13.398 0 25.777 7.1484 32.477 18.75 6.6992 11.602 6.6992 25.898 0 37.5-6.6992 11.602-19.078 18.75-32.477 18.75z" fill="#fff"></path>  <path d="m900 712.5h-600c-13.398 0-25.777-7.1484-32.477-18.75-6.6992-11.602-6.6992-25.898 0-37.5 6.6992-11.602 19.078-18.75 32.477-18.75h600c13.398 0 25.777 7.1484 32.477 18.75 6.6992 11.602 6.6992 25.898 0 37.5-6.6992 11.602-19.078 18.75-32.477 18.75z" fill="#fff"></path></svg>');
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
			} else if (i === 2) {
				x1 = '33';
				y1 = '100';
				x2 = '100';
				y2 = '33';
			} else if (i === 3) {
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
		$toolbar.append($dragHandle);

		// Final step: Need to refresh the DOM in order for browser to process & display the SVG
		$resizeHandle.html($resizeHandle.html());

		// add event listener to toolbar to start and end drag
		// other event listeners will be added when drag starts
		$dragHandle.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart' ) {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.dragDevice = 'mouse'; // ok to use this even if device is a touchpad
					thisObj.startDrag(which, $window);
				}
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
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
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
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

		var thisObj, $windowAlert, menuId, $newButton, tooltipId, $tooltip, $popup, menuId;

		thisObj = this;

		// Add a Boolean that will be set to true temporarily if window button or a menu item is clicked
		// This will prevent the click event from also triggering a mousedown event on the toolbar
		// (which would unexpectedly send the window into drag mode)
		this.windowMenuClickRegistered = false;

		// Add another Boolean that will be set to true temporarily when mouseup fires at the end of a drag
		// this will prevent the click event from being triggered
		this.finishingDrag = false;

		// add button to draggable window which triggers a popup menu
		menuId = this.mediaId + '-' + windowName + '-menu';
		$newButton = $('<button>',{
			'type': 'button',
			'tabindex': '0',
			'aria-haspopup': 'true',
			'aria-controls': menuId,
			'aria-expanded': 'false',
			'class': 'able-button-handler-preferences'
		});
		this.getIcon( $newButton, 'preferences' );
		this.setText( $newButton, this.translate( 'windowButtonLabel', 'Window options' ) );

		// add a tooltip that displays aria-label on mouseenter or focus
		tooltipId = this.mediaId + '-' + windowName + '-tooltip';
		$tooltip = $('<div>',{
			'class' : 'able-tooltip',
			'id' : tooltipId
		}).hide();

		$newButton.on('mouseenter focus',function(e) {
			var label = $(this).attr('aria-label');
			var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label);
			// get height of the tooltip
			var tooltipHeight = tooltip.height();
			var tooltipY = ( tooltipHeight + 2 ) * -1;
			var tooltipX = 0;
			var tooltipStyle = {
				right: '',
				left: tooltipX + 'px',
				top: tooltipY + 'px'
			};
			tooltip.css(tooltipStyle);
			thisObj.showTooltip(tooltip);
			$(this).on('mouseleave blur',function() {
				AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
			});
		});

		// setup popup menu
		$popup = this.setupPopups(windowName); // 'transcript-window' or 'sign-window'
		// define vars and assemble all the parts
		if (which === 'transcript') {
			this.$transcriptPopupButton = $newButton;
			this.$transcriptPopup = $popup;
			this.$transcriptToolbar.prepend($windowAlert,$newButton,$tooltip,$popup);
		} else if (which === 'sign') {
			this.$signPopupButton = $newButton;
			this.$signPopup = $popup;
			this.$signToolbar.append($windowAlert,$newButton,$tooltip,$popup);
		}

		// handle button click
		$newButton.on('click keydown',function(e) {

			if (thisObj.focusNotClick) {
				return false;
			}
			if (thisObj.dragging) {
				thisObj.dragKeys(which, e);
				return false;
			}
			e.stopPropagation();
			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
				console.log( 'firing' );
				// don't set windowMenuClickRegistered yet; that happens in handler function
				thisObj.handleWindowButtonClick(which, e);
			}
			thisObj.finishingDrag = false;
		});

		this.addResizeDialog(which, $window);
	};

	AblePlayer.prototype.addResizeDialog = function (which, $window) {

		var thisObj, $windowPopup, $windowButton, widthId, heightId,
			$resizeForm, $resizeWrapper, $resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel,
			$resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel, $saveButton, $cancelButton,
			newWidth, newHeight, resizeDialog;

		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		widthId = this.mediaId + '-resize-' + which + '-width';
		heightId = this.mediaId + '-resize-' + which + '-height';

		$resizeForm = $('<div></div>',{
			'class' : 'able-resize-form'
		});

		// inner container for all content, will be assigned to modal div's aria-describedby
		$resizeWrapper = $('<div></div>');
		$resizeControls = $( '<div class="able-prefs-buttons"></div>' );

		// width field
		$resizeWidthDiv = $('<div></div>');
		$resizeWidthInput = $('<input>',{
			'type': 'number',
			'id': widthId,
			'min': 0,
			'value': '',
		});
		$resizeWidthLabel = $('<label>',{
			'for': widthId
		}).text( this.translate( 'width', 'Width' ) );

		// height field
		$resizeHeightDiv = $('<div></div>');
		$resizeHeightInput = $('<input>',{
			'type': 'number',
			'id': heightId,
			'min': 0,
			'value': '',
		});
		$resizeHeightLabel = $('<label>',{
			'for': heightId
		}).text( this.translate( 'height', 'Height' ) );

		// Add save and cancel buttons.
		$saveButton = $('<button class="modal-button">' + this.translate( 'save', 'Save' ) + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.translate( 'cancel', 'Cancel' ) + '</button>');
		$saveButton.on('click',function () {
			newWidth = $('#' + widthId).val();
			newHeight = $('#' + heightId).val();
			thisObj.resizeObject(which,newWidth,newHeight);
			thisObj.updatePreferences(which);

			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.trigger('focus');
		});
		$cancelButton.on('click',function () {
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.trigger('focus');
		});

		// Now assemble all the parts
		$resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
		$resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeControls.append($saveButton,$cancelButton);
		$resizeForm.append($resizeWrapper,$resizeControls);

		// must be appended to the BODY!
		// otherwise when aria-hidden="true" is applied to all background content
		// that will include an ancestor of the dialog,
		// which will render the dialog unreadable by screen readers
		$('body').append($resizeForm);
		resizeDialog = new AccessibleDialog(
			$resizeForm,
			$windowButton,
			this.translate( 'windowResizeHeading', 'Resize Window' ),
			this.translate( 'closeButtonLabel', 'Close' ),
		);
		if (which === 'transcript') {
			this.transcriptResizeDialog = resizeDialog;
		} else if (which === 'sign') {
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
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			$toolbar = this.$signToolbar;
		}
		if (e.type === 'keydown') {
			// user pressed a key
			if (e.key === ' ' || e.key === 'Enter') {
				this.windowMenuClickRegistered = true;
			} else if (e.key === 'Escape') {
				if ($windowPopup.is(':visible')) {
					// close the popup menu
					$windowPopup.hide();
					// also reset the Boolean
					thisObj.windowMenuClickRegistered = false;
					// also restore menu items to their original state
					$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
					// also return focus to window options button
					$windowButton.trigger('focus');
				} else {
					// popup isn't open. Close the window
					if (which === 'sign') {
						this.handleSignToggle();
					} else if (which === 'transcript') {
						this.handleTranscriptToggle();
					}
				}
			} else {
				return false;
			}
		} else {
			// this was a mouse event
			this.windowMenuClickRegistered = true;
		}

		if ( $windowPopup.is(':visible') ) {
			$windowPopup.hide();
			thisObj.windowMenuClickRegistered = false; // reset
			$windowPopup.find('li').removeClass('able-focus');
			$windowButton.attr('aria-expanded','false').trigger('focus');
		} else {
			// first, be sure window is on top
			this.updateZIndex(which);
			popupTop = $toolbar.outerHeight() - 1;
			$windowPopup.css('top', popupTop);
			$windowPopup.show();
			$windowButton.attr('aria-expanded','true');
			$(this).find('li').first().trigger('focus').addClass('able-focus');
			thisObj.windowMenuClickRegistered = false; // reset
		}
	};

	AblePlayer.prototype.handleMenuChoice = function (which, choice, e) {

		var thisObj, $window, $windowPopup, $windowButton, resizeDialog, startingWidth, startingHeight,
		aspectRatio, tempWidth, tempHeight;

		thisObj = this;
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			resizeDialog = this.transcriptResizeDialog;
		} else if (which === 'sign') {
			$window = this.$signWindow;
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			resizeDialog = this.signResizeDialog;

			startingWidth = $window.outerWidth();
			startingHeight = $window.outerHeight();
			aspectRatio = startingWidth / startingHeight;
			// make height a read-only field
			// and calculate its value based on width to preserve aspect ratio
			widthId = this.mediaId + '-resize-' + which + '-width';
			heightId = this.mediaId + '-resize-' + which + '-height';
			$( '#' + heightId ).prop('readonly',true);
			$( '#' + widthId ).on('input',function() {
				tempWidth = $(this).val();
				tempHeight = Math.round(tempWidth/aspectRatio);
				$( '#' + heightId ).val(tempHeight);
			});
		}
		this.$activeWindow = $window;

		if (e.type === 'keydown') {
			if (e.key === 'Escape') { // escape
				// hide the popup menu
				$windowPopup.hide();
				// also reset the Boolean
				thisObj.windowMenuClickRegistered = false;
				// also restore menu items to their original state
				$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
				$windowButton.attr('aria-expanded','false');
				// also return focus to window options button
				$windowButton.trigger('focus');

				return false;
			} else {
				// all other keys will be handled by upstream functions
				if (choice !== 'close') {
					this.$activeWindow = $window;
				}
				return false;
			}
		}

		// hide the popup menu
		$windowPopup.hide();
		// also reset the boolean
		thisObj.windowMenuClickRegistered = false;
		// also restore menu items to their original state
		$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
		$windowButton.attr('aria-expanded','false');

		if (choice !== 'close') {
			$windowButton.trigger('focus');
		}
		if (choice === 'move') {
			// temporarily add role="application" to activeWindow
			// otherwise, screen readers incercept arrow keys and moving window will not work
			this.$activeWindow.attr('role','application');

			if (!this.showedAlert(which)) {
				this.showAlert( this.translate( 'windowMoveAlert', 'Drag or use arrow keys to move the window; Enter to stop' ),which);
				if (which === 'transcript') {
					this.showedTranscriptAlert = true;
				} else if (which === 'sign') {
					this.showedSignAlert = true;
				}
			}
			this.dragDevice = (e.type === 'keydown') ? 'keyboard' : 'mouse';
			this.startDrag(which, $window);
			$windowPopup.hide().parent().attr( 'tabindex', '-1' ).trigger('focus');
		} else if (choice == 'resize') {
			// resize through the menu uses a form, not drag
			var resizeFields = resizeDialog.getInputs();
			if (resizeFields) {
				// reset width and height values in form
				resizeFields[0].value = Math.round( $window.outerWidth() );
				resizeFields[1].value = Math.round( $window.outerHeight() );
			}
			resizeDialog.show();
		} else if (choice == 'close') {
			// close window, place focus on corresponding button on controller bar
			if (which === 'transcript') {
				this.closingTranscript = true; // stopgap to prevent double-firing of keypress
				this.handleTranscriptToggle();
			} else if (which === 'sign') {
				this.closingSign = true; // stopgap to prevent double-firing of keypress
				this.handleSignToggle();
			}
		}
	};

	AblePlayer.prototype.startDrag = function(which, $element) {

		var thisObj, $windowPopup, startPos, newX, newY;

		thisObj = this;

		if (!this.$activeWindow) {
			this.$activeWindow = $element;
		}
		this.dragging = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
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
		} else {
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
		}).trigger('focus');

		var dragDevice = this.dragDevice;
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
		} else if (this.dragDevice === 'keyboard') {
			this.$activeWindow.on('keydown',function(e) {
				if (thisObj.dragging) {
					thisObj.dragKeys(which, e);
				}
			});
		}
		return false;
	};

	/**
	 * Handle moving the transcript or sign window from the keyboard.
	 *
	 * @param {string} which 'transcript' or 'sign' window.
	 * @param {Event} e Triggered event.
	 */
	AblePlayer.prototype.dragKeys = function(which, e) {

		var key, keySpeed;

		// stopgap to prevent firing on initial Enter or space
		// that selected "Move" from menu
		if (this.startingDrag) {
			this.startingDrag = false;
			return false;
		}
		key = e.key;
		keySpeed = 10; // pixels per keypress event

		switch (key) {
			case 'ArrowLeft':	// left
				 this.dragKeyX -= keySpeed;
				 this.$srAlertBox.text( this.translate( 'windowMoveLeft', 'Window moved left' ) );
				break;
			case 'ArrowUp':	// up
				this.dragKeyY -= keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveUp', 'Window moved up' ) );
				break;
			case 'ArrowRight':	// right
				this.dragKeyX += keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveRight', 'Window moved right' ) );
				break;
			case 'ArrowDown':	// down
				this.dragKeyY += keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveDown', 'Window moved down' ) );
				break;
			case 'Enter': 	// enter
			case 'Escape': 	// escape
				this.$srAlertBox.text( this.translate( 'windowMoveStopped', 'Window move stopped' ) );
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
		setTimeout( () => {
			this.$srAlertBox.text( '' );
		}, 2000 );

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
			// but the inner able-transcript also needs to be resized proportionally
			// (it's 50px less than its outer container)
			innerHeight = height - 50;
			this.$transcriptDiv.css('height', innerHeight + 'px');
		}
	};

	AblePlayer.prototype.endDrag = function(which) {

		var thisObj, $windowPopup, $windowButton;
		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown').removeClass('able-drag');
		// restore activeWindow role from 'application' to 'dialog'
		this.$activeWindow.attr('role','dialog');
		this.$activeWindow = null;

		if (this.dragDevice === 'keyboard') {
			$windowButton.trigger('focus');
		}
		this.dragging = false;

		// save final position of dragged element
		this.updatePreferences(which);

		// reset starting mouse positions
		this.startMouseX = undefined;
		this.startMouseY = undefined;

		// Boolean to stop stray events from firing
		this.windowMenuClickRegistered = false;
		this.finishingDrag = true; // will be reset after window click event
		// finishingDrag should be reset after window click event,
		// which is triggered automatically after mouseup
		// However, in case that's not reliable in some browsers
		// need to ensure this gets cancelled
		setTimeout(function() {
			thisObj.finishingDrag = false;
		}, 100);
	};

	AblePlayer.prototype.startResize = function(which, $element) {

		var thisObj, $windowPopup, newWidth, newHeight;

		thisObj = this;
		this.$activeWindow = $element;
		this.resizing = true;

		$windowPopup = (which === 'transcript') ? this.$transcriptPopup : this.$signPopup;

		// if window's popup menu is open, close it & place focus on button (???)
		if ($windowPopup.is(':visible')) {
			$windowPopup.hide().parent().trigger('focus');
		}

		// get starting width and height
		startPos = this.$activeWindow.position();
		this.dragKeyX = this.dragStartX;
		this.dragKeyY = this.dragStartY;
		this.dragStartWidth = this.$activeWindow.width();
		this.dragStartHeight = this.$activeWindow.outerHeight();

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

		var $windowPopup, $windowButton;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown');
		$windowButton.show().trigger('focus');
		this.resizing = false;
		this.$activeWindow.removeClass('able-resize');

		// save final width and height of dragged element
		this.updatePreferences(which);

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
