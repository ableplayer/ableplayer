(function () {
  AblePlayer.prototype.setCookie = function(cookieValue) { 
    $.cookie.json = true;
    if ($.isFunction($.cookie)) { 
      // set cookie that expires in 90 days 
      $.cookie('Able-Player', cookieValue, 90);  
    }
  };

  AblePlayer.prototype.getCookie = function() {
    var defaultCookie = {
      preferences: {}
    };

    $.cookie.json = true;
    if ($.isFunction($.cookie)) { 
      var cookie;
      try {
        cookie = $.cookie('Able-Player');
      }
      catch (err) {
        // Original cookie can't be parsed; update to default.
        this.setCookie(defaultCookie);
        cookie = defaultCookie;
      }
      if (cookie) {
        return cookie;
      }
      else {
        return defaultCookie;
      }
    }
  };

  AblePlayer.prototype.getAvailablePreferences = function() { 
    // Return the list of currently available preferences.

    var prefs = [];
    
    // modifier keys preferences apply to both audio and video 
    prefs.push({
      'name': 'prefAltKey', // use alt key with shortcuts 
      'label': this.tt.prefAltKey,
      'default': 0  // off because currently not capturing this reliably across all browsers
    });
    
    prefs.push({
      'name': 'prefCtrlKey', // use ctrl key with shortcuts
      'label': this.tt.prefCtrlKey,
      'default': 1  // On per conversation with Ken
    });
    
    prefs.push({
      'name': 'prefShiftKey',
      'label': this.tt.prefShiftKey,
      'default': 0
    });
    if (this.mediaType === 'video') { // features prefs apply only to video
      prefs.push({
        'name': 'prefCaptions', // closed captions default state 
        'label': this.tt.prefCaptions,
        'default': 1 // on because many users can benefit
      });
      
      prefs.push({
        'name': 'prefDesc', // audio description default state 
        'label': this.tt.prefDesc,
        'default': 0 // off because users who don't need it might find it distracting
      });
      
      prefs.push({
        'name': 'prefClosedDesc', // use closed description if available
        'label': this.tt.prefClosedDesc,
        'default': 0 // off because experimental
      });
      
      prefs.push({
        'name': 'prefDescPause', // automatically pause when closed description starts
        'label': this.tt.prefDescPause,
        'default': 0 // off because it burdens user with restarting after every pause 
      });

      prefs.push({
        'name': 'prefVisibleDesc', // visibly show closed description (if avilable and used)
        'label': this.tt.prefVisibleDesc,
        'default': 1 // on because sighted users probably want to see this cool feature in action 
      });
      
      prefs.push({
        'name': 'prefTranscript', // transcript default state
        'label': this.tt.prefTranscript,
        'default': 0 // off because turning it on has a certain WOW factor 
      });

      prefs.push({
        'name': 'prefHighlight', // highlight transcript as media plays
        'label': this.tt.prefHighlight,
        'default': 1 // on because many users can benefit
      });
      
      prefs.push({
        'name': 'prefTabbable', // tab-enable transcript 
        'label': this.tt.prefTabbable,
        'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
      });
    }
    else { 

      prefs.push({
        'name': 'prefTranscript', // transcript default state
        'label': this.tt.prefTranscript,
        'default': 0 // off because turning it on has a certain WOW factor 
      });

      prefs.push({
        'name': 'prefHighlight', // highlight transcript as media plays
        'label': this.tt.prefHighlight,
        'default': 1 // on because many users can benefit
      });      

      prefs.push({
        'name': 'prefTabbable', // tab-enable transcript 
        'label': this.tt.prefTabbable,
        'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page    
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

  // Creates the preferences form and injects it.
  AblePlayer.prototype.injectPrefsForm = function () {
    var prefsDiv, introText, prefsIntro, 
    featuresFieldset, featuresLegend, 
    keysFieldset, keysLegend, 
    i, thisPref, thisDiv, thisId, thisLabel, thisCheckbox, 
    thisObj, available; 
    
    thisObj = this;
    available = this.getAvailablePreferences();
    // define all the parts
    prefsDiv = $('<div>',{ 
      'class': 'able-prefs-form',
      role: 'form'
    });
    introText = '<p>Saving your preferences requires cookies.</p>\n';
    
    prefsIntro = $('<p>',{ 
      html: introText
    });
    
    featuresFieldset = $('<fieldset>');
    featuresLegend = $('<legend>Features</legend>');      
    featuresFieldset.append(featuresLegend);  
    
    keysFieldset = $('<fieldset>');
    keysLegend = $('<legend>Modifier Keys</legend>');       
    keysFieldset.append(keysLegend);  
    
    for (i=0; i<available.length; i++) { 
      thisPref = available[i]['name'];
      thisDiv = $('<div>');
      thisId = this.mediaId + '_' + thisPref;   
      thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
      thisCheckbox = $('<input>',{
        type: 'checkbox',
        name: thisPref,
        id: thisId,
        value: 'true'
      });
      thisDiv.append(thisCheckbox).append(thisLabel);
      // check current active value for this preference 
      if (this[thisPref] === 1) { 
        thisCheckbox.prop('checked',true);
      }     
      // TODO: We need to indicate this in the prefs structure itself.
      if (i === 0 || i === 1 || i === 2) { // this is a key preference
        keysFieldset.append(thisDiv);     
      }
      else { // this is a feature preference
        featuresFieldset.append(thisDiv);
      }     
    }
    // Now assemble all the parts   
    prefsDiv
      .append(prefsIntro)
      .append(keysFieldset);
    if (this.mediaType === 'video') { 
      prefsDiv
        .append(featuresFieldset);
    }         
    this.$ableDiv.append(prefsDiv); 
    
    var dialog = new AccessibleDialog(prefsDiv, 'Preferences', 'Modal dialog of player preferences.', '32em');
    
    // Add save and cancel buttons.
    prefsDiv.append('<hr>');
    var saveButton = $('<button class="modal-button">Save</button>');
    var cancelButton = $('<button class="modal-button">Cancel</button>');
    saveButton.click(function () {
      dialog.hide();
      thisObj.savePrefsFromForm();
    });
    cancelButton.click(function () {
      dialog.hide();
    });
    
    prefsDiv.append(saveButton);
    prefsDiv.append(cancelButton);
    this.prefsDialog = dialog;
  };

  // Return a prefs object constructed from the form.
  AblePlayer.prototype.savePrefsFromForm = function () {
    // called when user saves the Preferences form
    // update cookie with new value 
  
    var numChanges;  

    numChanges = 0;
    var cookie = this.getCookie();
    var available = this.getAvailablePreferences();
    for (var ii = 0; ii < available.length; ii++) {
      var prefName = available[ii]['name'];
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
    if (numChanges > 0) {     
      this.setCookie(cookie);
      this.showAlert(this.tt.prefSuccess);
    } 
    else { 
      this.showAlert(this.tt.prefNoChange);   
    }

    this.updatePrefs();
  }

  // Updates player based on current prefs.  Safe to call multiple times.
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
    this.updateCaption();
    this.updateDescription();
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

})();
