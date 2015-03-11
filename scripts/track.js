(function ($) {
  // Loads files referenced in track elements, and performs appropriate setup.
  // For example, captions and text descriptions.
  // This will be called whenever the player is recreated.
  AblePlayer.prototype.setupTracks = function() {
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    this.$tracks = this.$media.find('track');

    this.captions = [];
    this.captionLabels = []; 
    this.descriptions = [];
    this.chapters = [];
    this.meta = []; 
    
  
    var loadingPromises = [];
    for (var ii = 0; ii < this.$tracks.length; ii++) {      
      var track = this.$tracks[ii];
      var kind = track.getAttribute('kind');
      var trackSrc = track.getAttribute('src');
      var isDefaultTrack = track.getAttribute('default'); 

      if (!trackSrc) {
        // Nothing to load!
        continue;
      }

      var loadingPromise = this.loadTextObject(trackSrc);
      var thisObj = this;
      loadingPromises.push(loadingPromise);
      loadingPromise.then((function (track, kind) {
        return function (trackText) {
          var cues = thisObj.parseWebVTT(trackText).cues;
          if (kind === 'captions' || kind === 'subtitles') {
            thisObj.setupCaptions(track, cues);
          }
          else if (kind === 'descriptions') {
            thisObj.setupDescriptions(track, cues);
          }
          else if (kind === 'chapters') {
            thisObj.setupChapters(track, cues);
          }
          else if (kind === 'metadata') {
            thisObj.setupMetadata(track, cues);
          }
        }
      })(track, kind));
    }
    
    $.when.apply($, loadingPromises).then(function () {
      deferred.resolve();
    });

    return promise;
  };

  AblePlayer.prototype.setupCaptions = function (track, cues) {
    this.hasCaptions = true;
    
    // srcLang should always be included with <track>, but HTML5 spec doesn't require it 
    // if not provided, assume track is the same language as the default player language
    var trackLang = track.getAttribute('srclang') || this.lang; 
    var trackLabel = track.getAttribute('label') || trackLang;
    if (typeof track.getAttribute('default') == 'string') { 
      var isDefaultTrack = true; 
      // Now remove 'default' attribute from <track> 
      // Otherwise, some browsers will display the track 
      track.removeAttribute('default'); 
    }
    else { 
      var isDefaultTrack = false;
    }
    // caption cues from WebVTT are used to build a transcript for both audio and video 
    // but captions are currently only supported for video 
    if (this.mediaType === 'video') { 

      // create a div for displaying captions  
      // includes aria-hidden="true" because otherwise 
      // captions being added and removed causes sporadic changes to focus in JAWS
      // (not a problem in NVDA or VoiceOver)
      if (!this.$captionDiv) {
        this.$captionDiv = $('<div>',{
          'class': 'able-captions',
          'aria-hidden': 'true' 
        });
        this.$vidcapContainer.append(this.$captionDiv);
      }
    }

    this.currentCaption = -1;
    if (this.prefCaptions === 1) { 
      // Captions default to on.
      this.captionsOn = true; 
    }
    else { 
      this.captionsOn = false;
    }
    if (this.includeTranscript) {
      // Remove the "Unknown" option from the select box.
      if (this.$unknownTranscriptOption) {
        this.$unknownTranscriptOption.remove();
        this.$unknownTranscriptOption = null;
      }
      var option = $('<option></option>',{
        value: trackLang,
        lang: trackLang
      }).text(trackLabel); 
    }
    // alphabetize tracks by label
    if (this.includeTranscript) { 
      var options = this.$transcriptLanguageSelect.find('option');      
    }
    if (this.captions.length === 0) { // this is the first 
      this.captions.push({
        'cues': cues,
        'language': trackLang,
        'label': trackLabel,
        'def': isDefaultTrack
      });
      if (this.includeTranscript) { 
        if (isDefaultTrack) { 
          option.attr('selected', 'selected');
        }
        this.$transcriptLanguageSelect.append(option);
      }
      this.captionLabels.push(trackLabel);
    }
    else { // there are already tracks in the array 
      var inserted = false;
      for (var i = 0; i < this.captions.length; i++) {
        var capLabel = this.captionLabels[i];
        if (trackLabel.toLowerCase() < this.captionLabels[i].toLowerCase()) {
          // insert before track i 
          this.captions.splice(i,0,{
            'cues': cues,
            'language': trackLang,
            'label': trackLabel,
            'def': isDefaultTrack
          });
          if (this.includeTranscript) {
            if (isDefaultTrack) { 
              option.attr('selected', 'selected');
            }
            option.insertBefore(options.eq(i));
          }
          this.captionLabels.splice(i,0,trackLabel);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        // just add track to the end 
        this.captions.push({
          'cues': cues,
          'language': trackLang,
          'label': trackLabel,
          'def': isDefaultTrack
        });
        if (this.includeTranscript) {
          if (isDefaultTrack) { 
            option.attr('selected', 'selected');
          }
          this.$transcriptLanguageSelect.append(option);
        }
        this.captionLabels.push(trackLabel);
      }
    }
    if (this.includeTranscript) {
      if (this.$transcriptLanguageSelect.find('option').length > 1) {
        // More than one option now, so enable the select.
        this.$transcriptLanguageSelect.prop('disabled', false);
      }
    }
  };

  AblePlayer.prototype.setupDescriptions = function (track, cues) {
    var trackLang = track.getAttribute('srclang');

    // descriptions are off unless determined to be available & preferred 
    this.descOn = false;
    
    // prepare closed description, even if user doesn't prefer it 
    // this way it's available if needed 
    this.hasClosedDesc = true;
    // Display the description div.
    //this.$descDiv.show();
    this.currentDescription = -1;
    if ((this.prefDesc === 1) && (this.prefClosedDesc === 1)) { 
      this.descOn = true;
    }

    this.descriptions.push({
      cues: cues,
      language: trackLang
    });
  };

  AblePlayer.prototype.setupChapters = function (track, cues) {
    // NOTE: WebVTT supports nested timestamps (to form an outline) 
    // This is not currently supported.
    this.hasChapters = true;
    this.chapters = cues;
  };

  AblePlayer.prototype.setupMetadata = function(track, cues) {
    // NOTE: Metadata is currently only supported if data-meta-div is provided 
    // The player does not display metadata internally 
    if (this.metaDiv) {
      if ($('#' + this.metaDiv)) { 
        // container exists 
        this.$metaDiv = $('#' + this.metaDiv); 
        this.hasMeta = true;
      }
    }
    this.meta = cues;
  }
      
  AblePlayer.prototype.loadTextObject = function(src) {
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    var thisObj = this; 

    // create a temp div for holding data
    var $tempDiv = $('<div>',{ 
      style: 'display:none'
    });

    $tempDiv.load(src, function (trackText, status, req) { 
      if (status === 'error') { 
        if (thisObj.debug) {
          console.log ('error reading file ' + src + ': ' + status);
        }
        deferred.fail();
      }
      else {
        deferred.resolve(trackText);
      }
      $tempDiv.remove();
    });

    return promise;
  };
})(jQuery);
