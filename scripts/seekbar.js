(function ($) {


  // Events:
  //   startTracking(event, position)
  //   tracking(event, position)
  //   stopTracking(event, position)

  window. AccessibleSeekBar = function(div, width) {
    var thisObj = this;

    // Initialize some variables.
    this.position = 0; // Note: position does not change while tracking.
    this.tracking = false;
    this.trackDevice = null; // 'mouse' or 'keyboard'
    this.keyTrackPosition = 0;
    this.lastTrackPosition = 0;
    this.nextStep = 1;
    this.inertiaCount = 0;

    this.bodyDiv = $(div);

    // Add a loaded indicator and a seek head.
    this.loadedDiv = $('<div></div>');
    this.playedDiv = $('<div></div>');
    this.seekHead = $('<div class="able-seek-head"></div>');
    // Make head focusable.
    this.seekHead.attr('tabindex', '0');
    // Since head is focusable, it gets the aria roles/titles.
    this.seekHead.attr('role', 'slider');
    this.seekHead.attr('aria-value-min', 0);

    this.timeTooltip = $('<div>');
    this.bodyDiv.append(this.timeTooltip);
  
    this.timeTooltip.attr('role', 'tooltip');
    this.timeTooltip.addClass('able-tooltip');

    this.bodyDiv.append(this.loadedDiv);
    this.bodyDiv.append(this.playedDiv);
    this.bodyDiv.append(this.seekHead);

    this.bodyDiv.wrap('<div></div>');
    this.wrapperDiv = this.bodyDiv.parent();

    this.wrapperDiv.width(width);
    this.wrapperDiv.addClass('able-seekbar-wrapper');

    this.loadedDiv.width(0);
    this.loadedDiv.addClass('able-seekbar-loaded'); 

    this.playedDiv.width(0);
    this.playedDiv.addClass('able-seekbar-played'); 

    var seekHeadSize = '0.8em';
    this.seekHead.addClass('able-seekhead').css({
      'height': seekHeadSize,
      'width': seekHeadSize,
      'border-radius': seekHeadSize,
      '-webkit-border-radius': seekHeadSize,
      '-moz-border-radius': seekHeadSize,
      '-o-border-radius': seekHeadSize
    });
    
    // Set a default duration.  User should call this and change it.
    this.setDuration(100);

    this.seekHead.hover(function (event) {
      thisObj.overHead = true;
      thisObj.refreshTooltip();
    }, function (event) {
      thisObj.overHead = false;

      if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
      thisObj.refreshTooltip();
    });

    this.seekHead.mousemove(function (event) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.trackHeadAtPageX(event.pageX);
      }
    });

    this.bodyDiv.hover(function () {
      thisObj.overBody = true;
      thisObj.refreshTooltip();
    }, function (event) {
      thisObj.overBody = false;
      thisObj.overBodyMousePos = null;
      thisObj.refreshTooltip();
      
      if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
    });
    
    this.bodyDiv.mousemove(function (event) {
      thisObj.overBodyMousePos = {
        x: event.pageX,
        y: event.pageY
      };
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.trackHeadAtPageX(event.pageX);
      }
      thisObj.refreshTooltip();
    });
    
    this.bodyDiv.mousedown(function (event) {
      thisObj.startTracking('mouse', thisObj.pageXToPosition(event.pageX));
      thisObj.trackHeadAtPageX(event.pageX);
      if (!thisObj.seekHead.is(':focus')) {
        thisObj.seekHead.focus();
      }
      event.preventDefault();
    });
    
    this.seekHead.mousedown(function (event) {
      thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
      if (!thisObj.bodyDiv.is(':focus')) {
        thisObj.bodyDiv.focus();
      }
      event.preventDefault();
    });
    
    this.bodyDiv.mouseup(function (event) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
    })
    
    this.seekHead.mouseup(function (event) {
      if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
        thisObj.stopTracking(thisObj.pageXToPosition(event.pageX));
      }
    });
    
    this.bodyDiv.keydown(function (event) {
      // Home
      if (event.which === 36) {
        thisObj.trackImmediatelyTo(0);
      }
      // End
      else if (event.which === 35) {
        thisObj.trackImmediatelyTo(thisObj.duration);
      }
      // Left arrow or down arrow
      else if (event.which === 37 || event.which === 40) {
        thisObj.arrowKeyDown(-1);
      }
      // Right arrow or up arrow
      else if (event.which === 39 || event.which === 38) {
        thisObj.arrowKeyDown(1);
      }
      else {
        return;
      }
      event.preventDefault();
    });
    
    this.bodyDiv.keyup(function (event) {
      if (event.which === 35 || event.which === 36 || event.which === 37 || event.which === 38 || event.which === 39 || event.which === 40) {
        if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
          thisObj.stopTracking(thisObj.keyTrackPosition);
        }
        event.preventDefault();
      }
    });
  }
  
  AccessibleSeekBar.prototype.arrowKeyDown = function (multiplier) {
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
  
  AccessibleSeekBar.prototype.pageXToPosition = function (pageX) {
    var offset = pageX - this.bodyDiv.offset().left;
    var position = this.duration * (offset / this.bodyDiv.width());
    return this.boundPos(position);
  };
  
  AccessibleSeekBar.prototype.boundPos = function (position) {
    return Math.max(0, Math.min(position, this.duration));
  }
  
  AccessibleSeekBar.prototype.setDuration = function (duration) {
    if (duration !== this.duration) {
      this.duration = duration;
      this.resetHeadLocation();
      this.seekHead.attr('aria-value-max', duration);
    }
  };
  
  AccessibleSeekBar.prototype.setWidth = function (width) {
    this.wrapperDiv.width(width);
    this.resizeDivs();
    this.resetHeadLocation();
  };

  AccessibleSeekBar.prototype.getWidth = function () {
    return this.wrapperDiv.width();
  };

  AccessibleSeekBar.prototype.resizeDivs = function () {
    this.playedDiv.width(this.bodyDiv.width() * (this.position / this.duration));
    this.loadedDiv.width(this.bodyDiv.width() * this.buffered);
  };
  
  // Stops tracking, sets the head location to the current position.
  AccessibleSeekBar.prototype.resetHeadLocation = function () {
    var ratio = this.position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.seekHead.css('left', center - (this.seekHead.width() / 2));
    
    if (this.tracking) {
      this.stopTracking(this.position);
    }
  };
  
  AccessibleSeekBar.prototype.setPosition = function (position, updateLive) {
    this.position = position;
    this.resetHeadLocation();
    this.refreshTooltip();
    this.resizeDivs();
    this.updateAriaValues(position, updateLive);
  }
  
  // TODO: Native HTML5 can have several buffered segments, and this actually happens quite often.  Change this to display them all.
  AccessibleSeekBar.prototype.setBuffered = function (ratio) {
    this.buffered = ratio;
    this.redrawDivs;
  }
  
  AccessibleSeekBar.prototype.startTracking = function (device, position) {
    if (!this.tracking) {
      this.trackDevice = device;
      this.tracking = true;
      this.bodyDiv.trigger('startTracking', [position]);
    }
  };
  
  AccessibleSeekBar.prototype.stopTracking = function (position) {
    this.trackDevice = null;
    this.tracking = false;
    this.bodyDiv.trigger('stopTracking', [position]);
    this.setPosition(position, true);
  };
  
  AccessibleSeekBar.prototype.trackHeadAtPageX = function (pageX) {
    var position = this.pageXToPosition(pageX);
    var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
    newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
    this.lastTrackPosition = position;
    this.seekHead.css('left', newLeft);
    this.reportTrackAtPosition(position);
  };
  
  AccessibleSeekBar.prototype.trackHeadAtPosition = function (position) {
    var ratio = position / this.duration;
    var center = this.bodyDiv.width() * ratio;
    this.lastTrackPosition = position;
    this.seekHead.css('left', center - (this.seekHead.width() / 2));
    this.reportTrackAtPosition(position);
  };
  
  AccessibleSeekBar.prototype.reportTrackAtPosition = function (position) {
    this.bodyDiv.trigger('tracking', [position]);
    this.updateAriaValues(position, true);
  };
  
  AccessibleSeekBar.prototype.updateAriaValues = function (position, updateLive) {
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

    /* Uncomment to use aria values instead of separate live region.    
    this.seekHead.attr('aria-value-text', descriptionText);
    this.seekHead.attr('aria-valuenow', Math.floor(position).toString());*/
  };
  
  AccessibleSeekBar.prototype.trackImmediatelyTo = function (position) {
    this.startTracking('keyboard', position);
    this.trackHeadAtPosition(position);
    this.keyTrackPosition = position;
  };
  
  AccessibleSeekBar.prototype.refreshTooltip = function () {    
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
  
  AccessibleSeekBar.prototype.setTooltipPosition = function (x) {
    this.timeTooltip.css({
      left: x - (this.timeTooltip.width() / 2) - 10,
      bottom: this.seekHead.height() + 10
    });
  };
  
  AccessibleSeekBar.prototype.positionToStr = function (seconds) {
    
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
