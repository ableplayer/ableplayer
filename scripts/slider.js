(function ($) {


  // Events:
  //   startTracking(event, position)
  //   tracking(event, position)
  //   stopTracking(event, position)

  window. AccessibleSlider = function(mediaType, div, orientation, length, min, max, bigInterval, label, className, trackingMedia, initialState) {

    // mediaType is either 'audio' or 'video'
    // div is the host element around which the slider will be built
    // orientation is either 'horizontal' or 'vertical'
    // length is the width or height of the slider, depending on orientation
    // min is the low end of the slider scale
    // max is the high end of the slider scale
    // bigInterval is the number of steps supported by page up/page down (set to 0 if not supported)
    // (smallInterval, defined as nextStep below, is always set to 1) - this is the interval supported by arrow keys
    // label is used within an aria-label attribute to identify the slider to screen reader users
    // className is used as the root within class names (e.g., 'able-' + classname + '-head')
    // trackingMedia is true if this is a media timeline; otherwise false
    // initialState is either 'visible' or 'hidden'

    var thisObj;

    thisObj = this;

    // Initialize some variables.
    this.position = 0; // Note: position does not change while tracking.
    this.tracking = false;
    this.trackDevice = null; // 'mouse' or 'keyboard'
    this.keyTrackPosition = 0;
    this.lastTrackPosition = 0;
    this.nextStep = 1;
    this.inertiaCount = 0;

    this.bodyDiv = $(div);

    // Add divs for tracking amount of media loaded and played
    if (trackingMedia) {
      this.loadedDiv = $('<div></div>');
      this.playedDiv = $('<div></div>');
    }

    // Add a seekhead
    this.seekHead = $('<div>',{
      'orientation': orientation,
      'class': 'able-' + className + '-head'
    });

    if (initialState === 'visible') {
      this.seekHead.attr('tabindex', '0');
    }
    else {
      this.seekHead.attr('tabindex', '-1');
    }
    // Since head is focusable, it gets the aria roles/titles.
    this.seekHead.attr({
      'role': 'slider',
      'aria-label': label,
      'aria-valuemin': min,
      'aria-valuemax': max
    });

    this.timeTooltip = $('<div>');
    this.bodyDiv.append(this.timeTooltip);

    this.timeTooltip.attr('role', 'tooltip');
    this.timeTooltip.addClass('able-tooltip');
    this.timeTooltip.hide();

    this.bodyDiv.append(this.loadedDiv);
    this.bodyDiv.append(this.playedDiv);
    this.bodyDiv.append(this.seekHead);

    this.bodyDiv.wrap('<div></div>');
    this.wrapperDiv = this.bodyDiv.parent();

    if (orientation === 'horizontal') {
      this.wrapperDiv.width(length);
      this.loadedDiv.width(0);
    }
    else {
      this.wrapperDiv.height(length);
      this.loadedDiv.height(0);
    }
    this.wrapperDiv.addClass('able-' + className + '-wrapper');

    if (trackingMedia) {
      this.loadedDiv.addClass('able-' + className + '-loaded');

      this.playedDiv.width(0);
      this.playedDiv.addClass('able-' + className + '-played');

      // Set a default duration. User can call this dynamically if duration changes.
      this.setDuration(max);
    }

    this.seekHead.hover(function (e) {
      thisObj.overHead = true;
      thisObj.refreshTooltip();
    }, function (e) {
      thisObj.overHead = false;

      if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(e.pageX));
      }
      thisObj.refreshTooltip();
    });

    this.seekHead.mousemove(function (e) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.trackHeadAtPageX(e.pageX);
      }
    });

    this.seekHead.focus(function (e) {
      thisObj.overHead = true;
      thisObj.refreshTooltip();
    });

    this.seekHead.blur(function (e) {
      thisObj.overHead = false;
      thisObj.refreshTooltip();
    });

    this.bodyDiv.hover(function () {
      thisObj.overBody = true;
      thisObj.refreshTooltip();
    }, function (e) {
      thisObj.overBody = false;
      thisObj.overBodyMousePos = null;
      thisObj.refreshTooltip();

      if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(e.pageX));
      }
    });

    this.bodyDiv.mousemove(function (e) {
      thisObj.overBodyMousePos = {
        x: e.pageX,
        y: e.pageY
      };
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.trackHeadAtPageX(e.pageX);
      }
      thisObj.refreshTooltip();
    });

    this.bodyDiv.mousedown(function (e) {
      thisObj.startTracking('mouse', thisObj.pageXToPosition(e.pageX));
      thisObj.trackHeadAtPageX(e.pageX);
      if (!thisObj.seekHead.is(':focus')) {
        thisObj.seekHead.focus();
      }
      e.preventDefault();
    });

    this.seekHead.mousedown(function (e) {
      thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
      if (!thisObj.bodyDiv.is(':focus')) {
        thisObj.bodyDiv.focus();
      }
      e.preventDefault();
    });

    this.bodyDiv.mouseup(function (e) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(e.pageX));
      }
    })

    this.seekHead.mouseup(function (e) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(e.pageX));
      }
    });

    this.bodyDiv.keydown(function (e) {
      // Home
      if (e.which === 36) {
        thisObj.trackImmediatelyTo(0);
      }
      // End
      else if (e.which === 35) {
        thisObj.trackImmediatelyTo(thisObj.duration);
      }
      // Left arrow or down arrow
      else if (e.which === 37 || e.which === 40) {
        thisObj.arrowKeyDown(-1);
      }
      // Right arrow or up arrow
      else if (e.which === 39 || e.which === 38) {
        thisObj.arrowKeyDown(1);
      }
      // Page up
      else if (e.which === 33 && bigInterval > 0) {
        thisObj.arrowKeyDown(bigInterval);
      }
      // Page down
      else if (e.which === 34 && bigInterval > 0) {
        thisObj.arrowKeyDown(-bigInterval);
      }

      else {
        return;
      }
      e.preventDefault();
    });

    this.bodyDiv.keyup(function (e) {
      if (e.which >= 33 && e.which <= 40) {
        if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
          thisObj.stopTracking(thisObj.keyTrackPosition);
        }
        e.preventDefault();
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
    }
    else {
      this.nextStep = 1;
      this.inertiaCount = 0;
      this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
      this.startTracking('keyboard', this.keyTrackPosition);
      this.trackHeadAtPosition(this.keyTrackPosition);
    }
  };
/*
  AccessibleSlider.prototype.pageUp = function (multiplier) {
    if (this.tracking && this.trackDevice === 'keyboard') {
      this.keyTrackPosition = this.boundPos(this.keyTrackPosition + (this.nextStep * multiplier));
      this.inertiaCount += 1;
      if (this.inertiaCount === 20) {
        this.inertiaCount = 0;
        this.nextStep *= 2;
      }
      this.trackHeadAtPosition(this.keyTrackPosition);
    }
    else {
      this.nextStep = 1;
      this.inertiaCount = 0;
      this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
      this.startTracking('keyboard', this.keyTrackPosition);
      this.trackHeadAtPosition(this.keyTrackPosition);
    }
  };
*/
  AccessibleSlider.prototype.pageXToPosition = function (pageX) {
    var offset = pageX - this.bodyDiv.offset().left;
    var position = this.duration * (offset / this.bodyDiv.width());
    return this.boundPos(position);
  };

  AccessibleSlider.prototype.boundPos = function (position) {
    return Math.max(0, Math.min(position, this.duration));
  }

  AccessibleSlider.prototype.setDuration = function (duration) {
    if (duration !== this.duration) {
      this.duration = duration;
      this.resetHeadLocation();
      this.seekHead.attr('aria-valuemax', duration);
    }
  };

  AccessibleSlider.prototype.setWidth = function (width) {
    this.wrapperDiv.width(width);
    this.resizeDivs();
    this.resetHeadLocation();
  };

  AccessibleSlider.prototype.getWidth = function () {
    return this.wrapperDiv.width();
  };

  AccessibleSlider.prototype.resizeDivs = function () {
    this.playedDiv.width(this.bodyDiv.width() * (this.position / this.duration));
    this.loadedDiv.width(this.bodyDiv.width() * this.buffered);
  };

  // Stops tracking, sets the head location to the current position.
  AccessibleSlider.prototype.resetHeadLocation = function () {
    var ratio = this.position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.seekHead.css('left', center - (this.seekHead.width() / 2));

    if (this.tracking) {
      this.stopTracking(this.position);
    }
  };

  AccessibleSlider.prototype.setPosition = function (position, updateLive) {
    this.position = position;
    this.resetHeadLocation();
    this.refreshTooltip();
    this.resizeDivs();
    this.updateAriaValues(position, updateLive);
  }

  // TODO: Native HTML5 can have several buffered segments, and this actually happens quite often.  Change this to display them all.
  AccessibleSlider.prototype.setBuffered = function (ratio) {
    this.buffered = ratio;
    this.redrawDivs;
  }

  AccessibleSlider.prototype.startTracking = function (device, position) {
    if (!this.tracking) {
      this.trackDevice = device;
      this.tracking = true;
      this.bodyDiv.trigger('startTracking', [position]);
    }
  };

  AccessibleSlider.prototype.stopTracking = function (position) {
    this.trackDevice = null;
    this.tracking = false;
    this.bodyDiv.trigger('stopTracking', [position]);
    this.setPosition(position, true);
  };

  AccessibleSlider.prototype.trackHeadAtPageX = function (pageX) {
    var position = this.pageXToPosition(pageX);
    var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
    newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
    this.lastTrackPosition = position;
    this.seekHead.css('left', newLeft);
    this.reportTrackAtPosition(position);
  };

  AccessibleSlider.prototype.trackHeadAtPosition = function (position) {
    var ratio = position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.lastTrackPosition = position;
    this.seekHead.css('left', center - (this.seekHead.width() / 2));
    this.reportTrackAtPosition(position);
  };

  AccessibleSlider.prototype.reportTrackAtPosition = function (position) {
    this.bodyDiv.trigger('tracking', [position]);
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
    }
    else if (pMinutes > 0) {
      descriptionText  = pMinutes +
        ' ' + pMinuteWord +
        ', ' + pSeconds +
        ' ' + pSecondWord;
    }
    else {
      descriptionText = pSeconds + ' ' + pSecondWord;
    }

    /* Comment to stop live region from generating or being used. */
    if (!this.liveAriaRegion) {
      this.liveAriaRegion = $('<span>', {
        'class': 'able-offscreen',
        'aria-live': 'polite'
      });
      this.wrapperDiv.append(this.liveAriaRegion);
    }
    if (updateLive && (this.liveAriaRegion.text() !== descriptionText)) {
      this.liveAriaRegion.text(descriptionText);
    }

    // Uncomment the following lines to use aria values instead of separate live region.
    this.seekHead.attr('aria-valuetext', descriptionText);
    this.seekHead.attr('aria-valuenow', Math.floor(position).toString());
  };

  AccessibleSlider.prototype.trackImmediatelyTo = function (position) {
    this.startTracking('keyboard', position);
    this.trackHeadAtPosition(position);
    this.keyTrackPosition = position;
  };

  AccessibleSlider.prototype.refreshTooltip = function () {
    if (this.overHead) {
      this.timeTooltip.show();
      if (this.tracking) {
        this.timeTooltip.text(this.positionToStr(this.lastTrackPosition));
      }
      else {
        this.timeTooltip.text(this.positionToStr(this.position));
      }
      this.setTooltipPosition(this.seekHead.position().left + (this.seekHead.width() / 2));
    }
    else if (this.overBody && this.overBodyMousePos) {
      this.timeTooltip.show();
      this.timeTooltip.text(this.positionToStr(this.pageXToPosition(this.overBodyMousePos.x)));
      this.setTooltipPosition(this.overBodyMousePos.x - this.bodyDiv.offset().left);
    }
    else {
      this.timeTooltip.hide();
    }
  };

  AccessibleSlider.prototype.setTooltipPosition = function (x) {
    this.timeTooltip.css({
      left: x - (this.timeTooltip.width() / 2) - 10,
      bottom: this.seekHead.height() + 10
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
    }
    else {
      return dMinutes + ':' + dSeconds;
    }
  };

})(jQuery);
