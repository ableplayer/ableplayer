(function ($) {
  AblePlayer.prototype.setCookie = function(cookieValue) {
    if (Cookies.enabled) {
      Cookies.set('Able-Player', cookieValue, {expires: 90});
    }
  };

  AblePlayer.prototype.getCookie = function() {
    var defaultCookie = {
      preferences: {}
    };

      var cookie;
      try {
        cookie = Cookies.getJSON('Able-Player');
      }
      catch (err) {
        // Original cookie can't be parsed; update to defau
        Cookies.getJSON(defaultCookie);
        cookie = defaultCookie;
      }
      if (cookie) {
        return cookie;
      }
      else {
        return defaultCookie;
      }
  };

  AblePlayer.prototype.getAvailablePreferences = function() {
    // Return the list of currently available preferences.

    var prefs = [];

    // modifier keys preferences apply to both audio and video
    prefs.push({
      'name': 'prefAltKey', // use alt key with shortcuts
      'label': this.tt.prefAltKey,
      'default': 1
    });

    prefs.push({
      'name': 'prefCtrlKey', // use ctrl key with shortcuts
      'label': this.tt.prefCtrlKey,
      'default': 1
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
        'name': 'prefSignLanguage', // use sign language if available
        'label': this.tt.prefSignLanguage,
        'default': 1 // on because in rare cases that it's actually available, users should be exposed to it
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

    // outer container, will be assigned role="dialog"
    prefsDiv = $('<div>',{
      'class': 'able-prefs-form'
    });

    introText = '<p>' + this.tt.prefIntro + '</p>\n';

    prefsIntro = $('<p>',{
      html: introText
    });

    featuresFieldset = $('<fieldset>');
    featuresLegend = $('<legend>' + this.tt.prefFeatures + '</legend>');
    featuresFieldset.append(featuresLegend);

    keysFieldset = $('<fieldset>');
    keysLegend = $('<legend>' + this.tt.prefKeys + '</legend>');
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
      .append(keysFieldset)
      .append(featuresFieldset);

    // must be appended to the BODY!
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog,
    // which will render the dialog unreadable by screen readers
    // this.$ableDiv.append(prefsDiv);
    $('body').append(prefsDiv);

    var dialog = new AccessibleDialog(prefsDiv, 'dialog', thisObj.tt.prefTitle, prefsIntro, thisObj.tt.closeButtonLabel, '32em');

    // Add save and cancel buttons.
    prefsDiv.append('<hr>');
    var saveButton = $('<button class="modal-button">' + this.tt.save + '</button>');
    var cancelButton = $('<button class="modal-button">' + this.tt.cancel + '</button>');
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

})(jQuery);
