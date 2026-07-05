import $ from 'jquery';


	// Events:
	// - startTracking(event, position)
	// - tracking(event, position)
	// - stopTracking(event, position)

	function AccessibleSlider(div, max, bigInterval, label) {

		// div is the host element around which the slider will be built
		// max is the high end of the slider scale
		// bigInterval is the number of steps supported by page up/page down (set to 0 if not supported)
		// (smallInterval, defined as nextStep below, is always set to 1) - this is the interval supported by arrow keys
		// label is used within an aria-label attribute to identify the slider to screen reader users

		var thisObj, coords;

		thisObj = this;

		// Initialize some variables.
		this.position = 0; // Note: position does not change while tracking.
		this.tracking = false;
		this.trackDevice = null; // 'mouse' or 'keyboard'
		this.keyTrackPosition = 0;
		this.lastTrackPosition = 0;
		this.nextStep = 1;
		this.inertiaCount = 0;
		this.trackFrameRequestId = null;
		this.queuedTrackPosition = null;
		this.queuedTrackLeft = null;
		this.trackGeometry = null;
		this.hoverGeometry = null;

		this.$seekbarDiv = $(div);

		// Add divs for tracking amount of media loaded and played
		this.loadedDiv = $('<div></div>');
		this.playedDiv = $('<div></div>');

		// Add a seekhead
		this.$seekHead = $('<div>',{
			'aria-orientation': 'horizontal',
			'class': 'able-seekbar-head'
		});

		this.$seekHead.attr('tabindex', '0');

		// Since head is focusable, it gets the aria roles/titles.
		this.$seekHead.attr({
			'role': 'slider',
			'aria-label': label,
			'aria-valuemin': 0,
			'aria-valuemax': max
		});

		this.timeTooltipTimeoutId = null;
		this.overTooltip = false;
		this.$timeTooltip = $('<div>');
		this.$seekbarDiv.append(this.$timeTooltip);

		this.$timeTooltip.attr('role', 'tooltip');
		this.$timeTooltip.addClass('able-tooltip');
		this.$timeTooltip.on('mouseenter focus', function(){
			thisObj.overTooltip = true;
			clearInterval(thisObj.timeTooltipTimeoutId);
		});
		this.$timeTooltip.on('mouseleave blur', function(){
			thisObj.overTooltip = false;
			$(this).hide();
		});
		this.$timeTooltip.hide();

		this.$seekbarDiv.append(this.loadedDiv);
		this.$seekbarDiv.append(this.playedDiv);
		this.$seekbarDiv.append(this.$seekHead);
		this.$seekbarDiv.wrap('<div></div>');
		this.$wrapperDiv = this.$seekbarDiv.parent();

		if (this.skin === 'legacy') {
			this.$wrapperDiv.width( 100 );
			this.loadedDiv.width(0);
		}
		this.$wrapperDiv.addClass('able-seekbar-wrapper');
		this.loadedDiv.addClass('able-seekbar-loaded');
		this.playedDiv.width(0);
		this.playedDiv.addClass('able-seekbar-played');

		// Set a default duration. User can call this dynamically if duration changes.
		this.setDuration(max);

		// handle seekHead events
		this.$seekHead.on('mouseenter mouseleave mousedown mouseup focus blur touchstart touchend', function (e) {

			coords = thisObj.pointerEventToXY(e);

			if (e.type === 'mouseenter' || e.type === 'focus') {
				thisObj.overHead = true;
				thisObj.cacheHoverGeometry();
			} else if (e.type === 'mouseleave' || e.type === 'blur') {
				thisObj.overHead = false;
				if (!thisObj.overBody) {
					thisObj.clearHoverGeometry();
				}
			} else if (e.type === 'mousedown' || e.type === 'touchstart') {
				thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.$seekHead.offset() + (thisObj.$seekHead.width() / 2)));
				if (!thisObj.$seekbarDiv.is(':focus')) {
					thisObj.$seekbarDiv.focus();
				}
				e.preventDefault();
			}
			if (e.type !== 'mousedown' && e.type !== 'touchstart') {
				thisObj.refreshTooltip();
			}
		});

		// handle seekbarDiv events
		this.$seekbarDiv.on(
			'mouseenter mouseleave mousemove mousedown mouseup keydown keyup touchstart touchmove touchend', function (e) {

			// Don't trigger move on right click.
			if ( e.button == 2 && e.type == 'mousedown' ) {
				return;
			}
			coords = thisObj.pointerEventToXY(e);
			let keyPressed = e.key;

			if (e.type === 'mouseenter') {
				thisObj.overBody = true;
				thisObj.cacheHoverGeometry();
				thisObj.overBodyMousePos = {
					x: coords.x,
					y: coords.y
				};
			} else if (e.type === 'mouseleave') {
				thisObj.overBody = false;
				thisObj.overBodyMousePos = null;
				if (!thisObj.overHead) {
					thisObj.clearHoverGeometry();
				}
			} else if (e.type === 'mousemove' || e.type === 'touchmove') {
				thisObj.overBodyMousePos = {
					x: coords.x,
					y: coords.y
				};
			} else if (e.type === 'mousedown' || e.type === 'touchstart') {
				thisObj.startTracking('mouse', thisObj.pageXToPosition(coords.x));
				thisObj.trackHeadAtPageX(coords.x);
				if (!thisObj.$seekHead.is(':focus')) {
					thisObj.$seekHead.focus();
				}
				e.preventDefault();
			} else if (e.type === 'keydown') {
				if (e.key === 'Home') {
					thisObj.trackImmediatelyTo(0);
				} else if (e.key === 'End') {
					thisObj.trackImmediatelyTo(thisObj.duration);
				} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
					thisObj.arrowKeyDown(-1);
				} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
					thisObj.arrowKeyDown(1);
				} else if (e.key === 'PageUp' && bigInterval > 0) {
					thisObj.arrowKeyDown(bigInterval);
				} else if (e.key === 'PageDown' && bigInterval > 0) {
					thisObj.arrowKeyDown(-bigInterval);
				} else {
					return;
				}
				e.preventDefault();
			} else if (e.type === 'keyup') {
				if ( keyPressed === e.key ) {
					if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
						thisObj.stopTracking(thisObj.keyTrackPosition);
					}
					e.preventDefault();
				}
			}
			if (!thisObj.overTooltip && e.type !== 'mouseup' && e.type !== 'keydown' && e.type !== 'keydown') {
				thisObj.refreshTooltip();
			}
		});
	}

	AccessibleSlider.prototype.arrowKeyDown = function (multiplier) {
		if (this.tracking && this.trackDevice === 'keyboard') {
			this.keyTrackPosition = this.boundPos(this.keyTrackPosition + (this.nextStep * multiplier));
			this.inertiaCount += 1;
			if (this.inertiaCount === 20) {
				this.inertiaCount = 0;
				this.nextStep *= 2;
			}
			this.trackHeadAtPosition(this.keyTrackPosition);
		} else {
			this.nextStep = 1;
			this.inertiaCount = 0;
			this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
			this.startTracking('keyboard', this.keyTrackPosition);
			this.trackHeadAtPosition(this.keyTrackPosition);
		}
	};

	AccessibleSlider.prototype.pageXToPosition = function (pageX) {
		var geometry = this.getTrackingGeometry();
		var offset = pageX - geometry.left;
		if (geometry.width === 0) {
			return 0;
		}
		var position = this.duration * (offset / geometry.width);
		return this.boundPos(position);
	};

	AccessibleSlider.prototype.boundPos = function (position) {
		return Math.max(0, Math.min(position, this.duration));
	}

	AccessibleSlider.prototype.setDuration = function (duration) {
		if (duration !== this.duration) {
			this.duration = duration;
			this.resetHeadLocation();
			this.$seekHead.attr('aria-valuemax', duration);
		}
	};

	// Set width of the legacy seekbar.
	AccessibleSlider.prototype.setWidth = function (width) {
		this.$wrapperDiv.width(width);
		this.resizeDivs();
		this.resetHeadLocation();
	};

	AccessibleSlider.prototype.getWidth = function () {
		return this.$wrapperDiv.width();
	};

	AccessibleSlider.prototype.resizeDivs = function () {
		this.playedDiv.width( 100 * (this.position / this.duration) + '%' );
		this.loadedDiv.width( 100 * this.buffered + '%' );
	};

	// Stops tracking, sets the head location to the current position.
	AccessibleSlider.prototype.resetHeadLocation = function () {
		var ratio = this.position / this.duration;
		var center = this.$seekbarDiv.width() * ratio;
		this.$seekHead.css('left', center - (this.$seekHead.width() / 2));

		if (this.tracking) {
			this.stopTracking(this.position);
		}
	};

	AccessibleSlider.prototype.setPosition = function (position, updateLive) {
		this.position = position;
		this.resetHeadLocation();
		if (this.overHead) {
			this.refreshTooltip();
		}
		this.resizeDivs();
		this.updateAriaValues(position, updateLive);
	}

	// TODO: Native HTML5 can have several buffered segments, and this actually happens quite often. Change this to display them all.
	AccessibleSlider.prototype.setBuffered = function (ratio) {
		if (!isNaN(ratio)) {
			this.buffered = ratio;
			this.redrawDivs;
		}
	}

	AccessibleSlider.prototype.startTracking = function (device, position) {
		if (!this.tracking) {
			this.trackDevice = device;
			this.tracking = true;
			if (device === 'mouse') {
				this.trackGeometry = this.hoverGeometry || this.buildTrackingGeometry();
				this.bindGlobalTrackingEvents();
			} else {
				this.clearTrackingGeometry();
				this.unbindGlobalTrackingEvents();
			}
			this.$seekbarDiv.trigger('startTracking', [position]);
		}
	};

	AccessibleSlider.prototype.stopTracking = function (position) {
		this.unbindGlobalTrackingEvents();
		if (this.trackFrameRequestId !== null) {
			window.cancelAnimationFrame(this.trackFrameRequestId);
			this.trackFrameRequestId = null;
		}
		this.flushQueuedTrackUpdate();
		this.clearTrackingGeometry();
		this.trackDevice = null;
		this.tracking = false;
		this.$seekbarDiv.trigger('stopTracking', [position]);
		this.setPosition(position, true);
	};

	AccessibleSlider.prototype.bindGlobalTrackingEvents = function () {
		var thisObj = this;
		$(window).off('.ableSliderTrack');
		$(window).on('mousemove.ableSliderTrack touchmove.ableSliderTrack', function (e) {
			var coords;
			if (!(thisObj.tracking && thisObj.trackDevice === 'mouse')) {
				return;
			}
			coords = thisObj.pointerEventToXY(e);
			thisObj.trackHeadAtPageX(coords.x);
		});
		$(window).on('mouseup.ableSliderTrack touchend.ableSliderTrack touchcancel.ableSliderTrack', function (e) {
			var coords;
			if (!(thisObj.tracking && thisObj.trackDevice === 'mouse')) {
				return;
			}
			coords = thisObj.pointerEventToXY(e);
			if (e.type === 'touchcancel') {
				thisObj.stopTracking(thisObj.lastTrackPosition);
			} else {
				thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
			}
		});
	};

	AccessibleSlider.prototype.unbindGlobalTrackingEvents = function () {
		$(window).off('.ableSliderTrack');
	};

	AccessibleSlider.prototype.trackHeadAtPageX = function (pageX) {
		var geometry = this.getTrackingGeometry();
		var position = this.pageXToPosition(pageX);
		var newLeft = pageX - geometry.left - geometry.headHalf;
		newLeft = Math.max(0, Math.min(newLeft, geometry.maxLeft));
		this.queueTrackUpdate(position, newLeft);
	};

	AccessibleSlider.prototype.cacheTrackingGeometry = function () {
		this.trackGeometry = this.buildTrackingGeometry();
	};

	AccessibleSlider.prototype.clearTrackingGeometry = function () {
		this.trackGeometry = null;
	};

	AccessibleSlider.prototype.cacheHoverGeometry = function () {
		this.hoverGeometry = this.buildTrackingGeometry();
	};

	AccessibleSlider.prototype.clearHoverGeometry = function () {
		this.hoverGeometry = null;
	};

	AccessibleSlider.prototype.buildTrackingGeometry = function () {
		var seekbarOffset = this.$seekbarDiv.offset();
		var seekbarWidth = this.$seekbarDiv.width();
		var seekHeadWidth = this.$seekHead.width();
		return {
			left: seekbarOffset.left,
			width: seekbarWidth,
			headHalf: seekHeadWidth / 2,
			maxLeft: Math.max(0, seekbarWidth - seekHeadWidth)
		};
	};

	AccessibleSlider.prototype.getTrackingGeometry = function () {
		if (this.tracking && this.trackDevice === 'mouse') {
			if (!this.trackGeometry) {
				this.cacheTrackingGeometry();
			}
			return this.trackGeometry;
		}
		if (this.overBody || this.overHead) {
			if (!this.hoverGeometry) {
				this.cacheHoverGeometry();
			}
			return this.hoverGeometry;
		}
		return this.buildTrackingGeometry();
	};

	AccessibleSlider.prototype.trackHeadAtPosition = function (position) {
		this.flushQueuedTrackUpdate();
		var ratio = position / this.duration;
		var center = this.$seekbarDiv.width() * ratio;
		this.lastTrackPosition = position;
		this.$seekHead.css('left', center - (this.$seekHead.width() / 2));
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.queueTrackUpdate = function (position, left) {
		var thisObj = this;
		this.queuedTrackPosition = position;
		this.queuedTrackLeft = left;

		if (this.trackFrameRequestId !== null) {
			return;
		}

		this.trackFrameRequestId = window.requestAnimationFrame(function () {
			thisObj.trackFrameRequestId = null;
			thisObj.flushQueuedTrackUpdate();
		});
	};

	AccessibleSlider.prototype.flushQueuedTrackUpdate = function () {
		if (this.queuedTrackPosition === null) {
			return;
		}

		this.lastTrackPosition = this.queuedTrackPosition;
		this.$seekHead.css('left', this.queuedTrackLeft);
		this.reportTrackAtPosition(this.queuedTrackPosition);

		this.queuedTrackPosition = null;
		this.queuedTrackLeft = null;
	};

	AccessibleSlider.prototype.reportTrackAtPosition = function (position) {
		this.$seekbarDiv.trigger('tracking', [position]);
		this.updateAriaValues(position, true);
	};

	AccessibleSlider.prototype.updateAriaValues = function (position, updateLive) {
		// TODO: Localize, move to another function.
		var pHours = Math.floor(position / 3600);
		var pMinutes = Math.floor((position % 3600) / 60);
		var pSeconds = Math.floor(position % 60);

		var pHourWord = pHours === 1 ? 'hour' : 'hours';
		var pMinuteWord = pMinutes === 1 ? 'minute' : 'minutes';
		var pSecondWord = pSeconds === 1 ? 'second' : 'seconds';

		var descriptionText;
		if (pHours > 0) {
			descriptionText = pHours +
				' ' + pHourWord +
				', ' + pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		} else if (pMinutes > 0) {
			descriptionText	 = pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		} else {
			descriptionText = pSeconds + ' ' + pSecondWord;
		}

		/* Comment to stop live region from generating or being used. */
		if (!this.liveAriaRegion) {
			this.liveAriaRegion = $('<span>', {
				'class': 'able-offscreen',
				'aria-live': 'polite'
			});
			this.$wrapperDiv.append(this.liveAriaRegion);
		}
		if (updateLive && (this.liveAriaRegion.text() !== descriptionText)) {
			this.liveAriaRegion.text(descriptionText);
		}

		// Uncomment the following lines to use aria values instead of separate live region.
		this.$seekHead.attr('aria-valuetext', descriptionText);
		this.$seekHead.attr('aria-valuenow', Math.floor(position).toString());
	};

	AccessibleSlider.prototype.trackImmediatelyTo = function (position) {
		this.startTracking('keyboard', position);
		this.trackHeadAtPosition(position);
		this.keyTrackPosition = position;
	};

	AccessibleSlider.prototype.refreshTooltip = function () {
		if (this.overHead) {
			this.$timeTooltip.show();
			if (this.tracking) {
				this.$timeTooltip.text(this.positionToStr(this.lastTrackPosition));
			} else {
				this.$timeTooltip.text(this.positionToStr(this.position));
			}
			this.setTooltipPosition(this.$seekHead.position().left + (this.$seekHead.width() / 2));
		} else if (this.overBody && this.overBodyMousePos) {
			var geometry = this.getTrackingGeometry();
			this.$timeTooltip.show();
			this.$timeTooltip.text(this.positionToStr(this.pageXToPosition(this.overBodyMousePos.x)));
			this.setTooltipPosition(this.overBodyMousePos.x - geometry.left);
		} else {

			clearTimeout(this.timeTooltipTimeoutId);
			var _this = this;
			this.timeTooltipTimeoutId = setTimeout(function() {
				// give user a half second move cursor over tooltip
				_this.$timeTooltip.hide();
			}, 500);
		}
	};

	AccessibleSlider.prototype.hideSliderTooltips = function () {
		this.overHead = false;
		this.overBody = false;
		this.clearHoverGeometry();
		this.$timeTooltip.hide();
	};

	AccessibleSlider.prototype.setTooltipPosition = function (x) {
		this.$timeTooltip.css({
			left: x - (this.$timeTooltip.width() / 2) - 10,
		});
	};

	AccessibleSlider.prototype.positionToStr = function (seconds) {

		// same logic as misc.js > formatSecondsAsColonTime()
		var dHours = Math.floor(seconds / 3600);
		var dMinutes = Math.floor(seconds / 60) % 60;
		var dSeconds = Math.floor(seconds % 60);
		if (dSeconds < 10) {
			dSeconds = '0' + dSeconds;
		}
		if (dHours > 0) {
			if (dMinutes < 10) {
				dMinutes = '0' + dMinutes;
			}
			return dHours + ':' + dMinutes + ':' + dSeconds;
		} else {
			return dMinutes + ':' + dSeconds;
		}
	};

	AccessibleSlider.prototype.pointerEventToXY = function(e) {

		// returns array of coordinates x and y in response to both mouse and touch events
		// for mouse events, this comes from e.pageX and e.pageY
		// for touch events, it's a bit more complicated
		var out = {x:0, y:0};
		if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
			var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
			out.x = touch.pageX;
			out.y = touch.pageY;
		} else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover'|| e.type=='mouseout' || e.type=='mouseenter' || e.type=='mouseleave') {
			out.x = e.pageX;
			out.y = e.pageY;
		}
		return out;
	};

export default AccessibleSlider;
