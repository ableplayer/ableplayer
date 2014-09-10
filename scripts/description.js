(function () {
  AblePlayer.prototype.initDescription = function() { 
    // set default mode for delivering description (open vs closed) 
    // based on availability and user preference        

    // first, check to see if there's an open-described version of this video  
    // checks only the first source 
    // Therefore, if a described version is provided, 
    // it must be provided for all sources  
    this.descFile = this.$sources.first().attr('data-desc-src');
    if (this.descFile) { 
      if (this.debug) {
        console.log('This video has a described version: ' + this.descFile);      
      }
      this.hasOpenDesc = true;
      if (this.prefDesc) {
        this.descOn = true;
      }
    }
    else { 
      if (this.debug) {
        console.log('This video does not have a described version');      
      }
      this.hasOpenDesc = false;              
    }
    
    this.updateDescription();
  };

  AblePlayer.prototype.updateDescription = function (time) {
    var useAudioDesc;
    
    if (this.descOn) {
      if (this.prefClosedDesc) {
        useAudioDesc = false;
        if (this.hasClosedDesc) {
          if (this.prefVisibleDesc) {
            this.$descDiv.show();
            this.$descDiv.removeClass('able-clipped');
          }
          else {
            this.$descDiv.hide();
            this.$descDiv.addClass('able-clipped');
          }
          this.showDescription(time || this.getElapsed());
        }
      }
      else {
        useAudioDesc = true;
      }
    }
    else {
      this.$descDiv.hide();
      useAudioDesc = false;
    }
    
    if (this.hasOpenDesc && this.usingAudioDescription() !== useAudioDesc) {
      this.swapDescription();   
    }
  };

  // Returns true if currently using audio description, false otherwise.
  AblePlayer.prototype.usingAudioDescription = function () {
    return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
  };

  AblePlayer.prototype.swapDescription = function() { 
    // swap described and non-described source media, depending on which is playing
    // this function is only called in two circumstances: 
    // 1. Swapping to described version when initializing player (based on user prefs & availability)
    // 2. User is toggling description 

    var i, origSrc, descSrc, srcType, jwSourceIndex, newSource;

    if (!this.usingAudioDescription()) {
      for (i=0; i < this.$sources.length; i++) { 
        // for all <source> elements, replace src with data-desc-src (if one exists)
        // then store original source in a new data-orig-src attribute 
        origSrc = this.$sources[i].getAttribute('src');
        descSrc = this.$sources[i].getAttribute('data-desc-src'); 
        srcType = this.$sources[i].getAttribute('type');
        if (descSrc) {
          this.$sources[i].setAttribute('src',descSrc);
          this.$sources[i].setAttribute('data-orig-src',origSrc);
        }       
        if (srcType === 'video/mp4') { 
          jwSourceIndex = i;
        }       
      }
      if (this.initializing) { // user hasn't pressed play yet 
        this.swappingSrc = false; 
      }
      else { 
        this.swappingSrc = true; 
      }
    }   
    else { 
      // the described version is currently playing
      // swap back to the original 
      for (i=0; i < this.$sources.length; i++) { 
        // for all <source> elements, replace src with data-orig-src
        origSrc = this.$sources[i].getAttribute('data-orig-src');
        srcType = this.$sources[i].getAttribute('type');        
        if (origSrc) {
          this.$sources[i].setAttribute('src',origSrc);
        }       
        if (srcType === 'video/mp4') { 
          jwSourceIndex = i;
        }
      }
      // No need to check for this.initializing 
      // This function is only called during initialization 
      // if swapping from non-described to described
      this.swappingSrc = true; 
    }
    // now reload the source file.
    if (this.player === 'html5') {
      this.media.load();
    }
    else if (this.player === 'jw') { 
      newSource = this.$sources[jwSourceIndex].getAttribute('src');
      this.jwPlayer.load({file: newSource}); 
    }
    else if (this.player === 'youtube') {
      // Can't switch youtube tracks, so do nothing.
      // TODO: Disable open descriptions button with Youtube.
    }
  };

  AblePlayer.prototype.showDescription = function(now) { 

    // there's a lot of redundancy between this function and showCaptions 
    // Trying to combine them ended up in a mess though. Keeping as is for now. 

    var d, thisDescription;

    var flattenComponentForDescription = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponentForDescription(component.children[ii]));
        }
      }
      return result.join('');
    }
  
    var cues;
    if (this.selectedDescriptions) {
      cues = this.selectedDescriptions.cues;
    }
    else if (this.descriptions.length >= 1) {
      cues = this.descriptions[0].cues;
    }
    else {
      cues = [];
    }
    for (d in cues) {
      if ((cues[d].start <= now) && (cues[d].end > now)) {      
        thisDescription = d;
        break;
      }
    }
    if (typeof thisDescription !== 'undefined') {  
      if (this.currentDescription !== thisDescription) { 
        // load the new description into the container div 
        this.$descDiv.html(flattenComponentForDescription(cues[thisDescription].components));
        this.currentDescription = thisDescription;
        if (this.$descDiv.is(':hidden')) { 
          this.$descDiv.show();
        }
      } 
    }
    else {     
      this.$descDiv.html('');
      this.currentDescription = -1;
    } 
  };

})();
