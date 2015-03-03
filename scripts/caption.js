(function ($) {
  AblePlayer.prototype.updateCaption = function (time) {    
    if (this.captionsOn) {
      this.$captionDiv.show();
      this.showCaptions(time || this.getElapsed());
    }
    else if (this.$captionDiv) {
      this.$captionDiv.hide();
    }
  };

  // Returns the function used when a caption is clicked in the captions menu.
  AblePlayer.prototype.getCaptionClickFunction = function (track) {
    var thisObj = this;
    return function () {
      thisObj.captionsOn = true;
      thisObj.selectedCaptions = track;
      thisObj.captionLang = track.language;
      thisObj.currentCaption = -1;
      // Try and find a matching description track.
      for (var ii in thisObj.descriptions) {
        if (thisObj.descriptions[ii].language === track.language) {
          thisObj.selectedDescriptions = thisObj.descriptions[ii];
          thisObj.currentDescription = -1;
        }
      }
      thisObj.hidingPopup = true;     
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.focus();
      thisObj.refreshControls();
      thisObj.updateCaption();
      thisObj.updateDescription();
    }
  };

  // Returns the function used when the "Captions Off" button is clicked in the captions tooltip.
  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      thisObj.captionsOn = false;
      thisObj.currentCaption = -1;
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.focus();
      thisObj.refreshControls();
      thisObj.updateCaption();
    }
  };

  AblePlayer.prototype.showCaptions = function(now) { 
    var c, thisCaption; 
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
    for (c in cues) {
      if ((cues[c].start <= now) && (cues[c].end > now)) {      
        thisCaption = c;
        break;
      }
    }
    if (typeof thisCaption !== 'undefined') {  
      if (this.currentCaption !== thisCaption) { 
        // it's time to load the new caption into the container div 
        this.$captionDiv.html(this.flattenCueForCaption(cues[thisCaption]).replace('\n', '<br>'));
        this.currentCaption = thisCaption;
      } 
    }
    else {     
      this.$captionDiv.html('');
      this.currentCaption = -1;
    } 
  };

  // Takes a cue and returns the caption text to display for it.
  AblePlayer.prototype.flattenCueForCaption = function (cue) {
    var result = [];

    var flattenComponent = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else if (component.type === 'v') {
        result.push('[' + component.value + ']');
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join('');
    }
    
    for (var ii in cue.components.children) {
      result.push(flattenComponent(cue.components.children[ii]));
    }
    
    return result.join('');
  };

})(jQuery);
