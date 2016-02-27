(function ($) {
  AblePlayer.prototype.setCookie = function(cookieValue) {
    Cookies.set('Able-Player', cookieValue, { expires:90 });
    // set the cookie lifetime for 90 days
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
      // Original cookie can't be parsed; update to default
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
  AblePlayer.prototype.updateCookie = function( setting ) {

    // called when a particular setting had been updated
    // useful for settings updated indpedently of Preferences dialog
    // e.g., prefAutoScrollTranscript, which is updated in control.js > handleTranscriptLockToggle()

    var cookie, available, i, prefName;
    cookie = this.getCookie();
    available = this.getAvailablePreferences();

    // Rebuild cookie with current cookie values,
    // replacing the one value that's been changed
    for (i = 0; i < available.length; i++) {
      prefName = available[i]['name'];
      if (prefName == setting) {
        // this is the one that requires an update
        cookie.preferences[prefName] = this[prefName];
      }
    }
    // Save updated cookie
    this.setCookie(cookie);
  };

  AblePlayer.prototype.getAvailablePreferences = function() {

    // Return the list of currently available preferences.
    // Preferences with no 'label' are set within player, not shown in Prefs dialog
    var prefs = [];

    // Modifier keys preferences
    prefs.push({
      'name': 'prefAltKey', // use alt key with shortcuts
      'label': this.tt.prefAltKey,
      'group': 'keys',
      'default': 1
    });
    prefs.push({
      'name': 'prefCtrlKey', // use ctrl key with shortcuts
      'label': this.tt.prefCtrlKey,
      'group': 'keys',
      'default': 1
    });
    prefs.push({
      'name': 'prefShiftKey',
      'label': this.tt.prefShiftKey,
      'group': 'keys',
      'default': 0
    });
    
    // Transcript preferences 
    prefs.push({
      'name': 'prefTranscript', // transcript default state
      'label': null,
      'group': 'transcript',
      'default': 0 // off because turning it on has a certain WOW factor
    });
    prefs.push({
      'name': 'prefHighlight', // highlight transcript as media plays
      'label': this.tt.prefHighlight,
      'group': 'transcript',
      'default': 1 // on because many users can benefit
    });
    prefs.push({
      'name': 'prefAutoScrollTranscript',
      'label': null,
      'group': 'transcript',
      'default': 1
    });
    prefs.push({
      'name': 'prefTabbable', // tab-enable transcript
      'label': this.tt.prefTabbable,
      'group': 'transcript',
      'default': 0 // off because if users don't need it, it impedes tabbing elsewhere on the page
    });
    
    if (this.mediaType === 'video') { 

      // Caption preferences       
      prefs.push({
        'name': 'prefCaptions', // closed captions default state
        'label': null,
        'group': 'captions',
        'default': 1
      });
/* // not supported yet       
      prefs.push({
        'name': 'prefCaptionsStyle', 
        'label': this.tt.prefCaptionsStyle,
        'group': 'captions',
        'default': this.tt.captionsStylePopOn
      });
*/      
      prefs.push({
        'name': 'prefCaptionsPosition', 
        'label': this.tt.prefCaptionsPosition,
        'group': 'captions',
        'default': 'overlay'
      });
      prefs.push({
        'name': 'prefCaptionsFont', 
        'label': this.tt.prefCaptionsFont,
        'group': 'captions',
        'default': this.tt.sans
      });
      prefs.push({
        'name': 'prefCaptionsSize', 
        'label': this.tt.prefCaptionsSize,
        'group': 'captions',
        'default': '100%'
      });
      prefs.push({
        'name': 'prefCaptionsColor', 
        'label': this.tt.prefCaptionsColor,
        'group': 'captions',
        'default': this.tt.white
      });
      prefs.push({
        'name': 'prefCaptionsBGColor', 
        'label': this.tt.prefCaptionsBGColor,
        'group': 'captions',
        'default': this.tt.black
      });
      prefs.push({
        'name': 'prefCaptionsOpacity', 
        'label': this.tt.prefCaptionsOpacity,
        'group': 'captions',
        'default': '75%'
      });      

      // Sign lanuage preferences 
      prefs.push({
        'name': 'prefSignLanguage', // use sign language if available
        'label': null,
        'group': 'sign',
        'default': 1 // on because in rare cases that it's actually available, users should be exposed to it
      });

      // Description preferences 
      prefs.push({
        'name': 'prefDesc', // audio description default state
        'label': null,
        'group': 'description',
        'default': 0 // off because users who don't need it might find it distracting
      });
      prefs.push({
        'name': 'prefDescFormat', // audio description default state
        'label': this.tt.prefDescFormat,
        'group': 'description',
        'default': 'video'
      });
      prefs.push({
        'name': 'prefDescPause', // automatically pause when closed description starts
        'label': this.tt.prefDescPause,
        'group': 'text-description',
        'default': 0 // off because it burdens user with restarting after every pause
      });
      prefs.push({
        'name': 'prefVisibleDesc', // visibly show closed description (if avilable and used)
        'label': this.tt.prefVisibleDesc,
        'group': 'text-description',
        'default': 1 // on because sighted users probably want to see this cool feature in action
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
      groups, fieldset, fieldsetClass, fieldsetId, legend, heading, 
      i, j, k, thisPref, thisDiv, thisClass, thisId, thisLabel, thisField,      
      radioPromptId,radioPrompt,hiddenSpanText,      
      div1,id1,radio1,label1,hiddenSpan1, 
      div2,id2,radio2,label2,hiddenSpan2, 
      options,thisOption,optionText,sampleCapsDiv,changedPref,
      thisObj, available;

    thisObj = this;
    available = this.getAvailablePreferences();

    // outer container, will be assigned role="dialog"
    prefsDiv = $('<div>',{
      'class': 'able-prefs-form'
    });

    // add intro
    introText = '<p>' + this.tt.prefIntro + '</p>\n';
    prefsIntro = $('<p>',{
      html: introText
    });
    prefsDiv.append(prefsIntro)

    // add preference fields in groups
    if (this.mediaType === 'video') { 
      groups = ['keys','description','text-description','transcript','captions']; 
    }
    else { 
      groups = ['keys','transcript']; 
    }
    for (i=0; i < groups.length; i++) { 
      fieldset = $('<fieldset>');
      fieldsetClass = 'able-prefs-' + groups[i];
      fieldsetId = this.mediaId + '-prefs-' + groups[i];
      fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
      switch (groups[i]) { 
        case 'keys': 
          heading = this.tt.prefHeadingKeys;
          break; 
        case 'description': 
          heading = this.tt.prefHeadingDescription;
          break; 
        case 'text-description': 
          heading = this.tt.prefHeadingTextDescription;
          break; 
        case 'transcript': 
          heading = this.tt.prefHeadingTranscript;
          break; 
        case 'captions': 
          heading = this.tt.prefHeadingCaptions;
          break;           
      }
      legend = $('<legend>' + heading + '</legend>');
      fieldset.append(legend);

      for (j=0; j<available.length; j++) {
        // only include prefs in the current group if they have a label
        if ((available[j]['group'] == groups[i]) && available[j]['label']) { 
          thisPref = available[j]['name'];
          thisClass = 'able-' + thisPref;
          thisId = this.mediaId + '_' + thisPref;          
          thisDiv = $('<div>').addClass(thisClass);
          if (thisPref == 'prefDescFormat') { 
            radioPromptId = thisId + '_prompt';
            radioPrompt = $('<div>')
              .attr('id',radioPromptId)
              .addClass('able-desc-pref-prompt')
              .text(available[j]['label'] + ':'); 

            // screen-reader-only text, as prefix to label 
            hiddenSpanText = 'I prefer audio description as ';
            
            // option 1 radio button
            div1 = $('<div>');
            id1 = thisId + '_1';
            hiddenSpan1 = $('<span>')
              .addClass('able-clipped')
              .text(hiddenSpanText);
            label1 = $('<label>')
              .attr('for',id1)
              .text(this.tt.prefDescFormatOption1)
              .prepend(hiddenSpan1); 
            radio1 = $('<input>',{
              type: 'radio',
              name: thisPref,
              id: id1,
              value: 'video'
            });
            if (this.prefDescFormat === 'video') { 
              radio1.attr('checked','checked');
            };
            div1.append(radio1,label1);

            // option 2 radio button
            div2 = $('<div>');
            id2 = thisId + '_2';
            hiddenSpan2 = $('<span>')
              .addClass('able-clipped')
              .text(hiddenSpanText);
            label2 = $('<label>')
              .attr('for',id2)
              .text(this.tt.prefDescFormatOption2) 
              .prepend(hiddenSpan2); 
            radio2 = $('<input>',{
              type: 'radio',
              name: thisPref,
              id: id2,
              value: 'text'
            });
            if (this.prefDescFormat === 'text') { 
              radio2.attr('checked','checked');
            };
            div2.append(radio2,label2);
            thisDiv.append(radioPrompt,div1,div2);
          }
          else if (groups[i] == 'captions') { 
            thisLabel = $('<label for="' + thisId + '"> ' + available[j]['label'] + '</label>');
            thisField = $('<select>',{
              name: thisPref,
              id: thisId, 
            });
            if (thisPref !== 'prefCaptions' && thisPref !== 'prefCaptionsStyle') { 
              // add a change handler that updates the style of the sample caption text
              thisField.change(function() { 
                changedPref = $(this).attr('name');
                thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
              }); 
            }
            options = this.getCaptionsOptions(thisPref);
            for (k=0; k < options.length; k++) { 
              if (thisPref === 'prefCaptionsPosition') { 
                if (options[k] === 'overlay') { 
                  optionText = this.tt.captionsPositionOverlay; 
                }
                else if (options[k] === 'below') { 
                  optionText = this.tt.captionsPositionBelow; 
                }
              }
              else { 
                optionText = options[k];
              }
              thisOption = $('<option>',{
                value: options[k],
                text: optionText
              });
              if (this[thisPref] === options[k]) {
                thisOption.attr('selected','selected');
              }
              thisField.append(thisOption);              
            }
            thisDiv.append(thisLabel,thisField);            
          }
          else { // all other fields are checkboxes
            thisLabel = $('<label for="' + thisId + '"> ' + available[j]['label'] + '</label>');
            thisField = $('<input>',{
              type: 'checkbox',
              name: thisPref,
              id: thisId,
              value: 'true'
            });
            // check current active value for this preference
            if (this[thisPref] === 1) {
              thisField.attr('checked','checked');
            }
            thisDiv.append(thisField,thisLabel);
          }
          fieldset.append(thisDiv);
        }
      }
      prefsDiv.append(fieldset);
    }
    
    // add a sample closed caption div to prefs dialog 
    if (this.mediaType === 'video') { 
      this.$sampleCapsDiv = $('<div>',{ 
        'class': 'able-captions-sample'
      }).text(this.tt.sampleCaptionText);
      prefsDiv.append(this.$sampleCapsDiv);
      this.stylizeCaptions(this.$sampleCapsDiv);
    }
    
    // prefsDiv (dialog) must be appended to the BODY!
    // otherwise when aria-hidden="true" is applied to all background content
    // that will include an ancestor of the dialog,
    // which will render the dialog unreadable by screen readers
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
      thisObj.resetPrefsForm(); 
    });

    prefsDiv.append(saveButton);
    prefsDiv.append(cancelButton);
    this.prefsDialog = dialog;
    
    // Add click handler for dialog close button 
    // (button is added in dialog.js) 
    $('div.able-prefs-form button.modalCloseButton').click(function() { 
      thisObj.resetPrefsForm(); 
    }) 
    // Add handler for escape key 
    $('div.able-prefs-form').keydown(function(event) { 
      if (event.which === 27) { // escape
        thisObj.resetPrefsForm();
      }      
    });
  };

   // Reset preferences form with default values from cookie
   // Called when user clicks cancel or close button in Prefs Dialog
   // also called when user presses Escape
    
   AblePlayer.prototype.resetPrefsForm = function () {
 
     var thisObj, cookie, available, i, prefName, thisDiv, thisId;  

     thisObj = this;
     cookie = this.getCookie();
     available = this.getAvailablePreferences();
     for (i=0; i<available.length; i++) { 
       prefName = available[i]['name'];
       if (prefName === 'prefDescFormat') { 
         if (this[prefName] === 'text') { 
           $('input[value="text"]').prop('checked',true);   
         }
         else { 
           $('input[value="video"]').prop('checked',true);              
         } 
       }
       else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) { 
         // this is a caption-related select box 
         $('select[name="' + prefName + '"]').val(cookie.preferences[prefName]);
       }
       else { // all others are checkboxes 
         if (this[prefName] === 1) { 
           $('input[name="' + prefName + '"]').prop('checked',true); 
          } 
          else { 
            $('input[name="' + prefName + '"]').prop('checked',false); 
          }
        }
      }
      // also restore style of sample caption div 
      this.stylizeCaptions(this.$sampleCapsDiv); 
   };
   
  // Return a prefs object constructed from the form.
  AblePlayer.prototype.savePrefsFromForm = function () {
    // called when user saves the Preferences form
    // update cookie with new value
    var numChanges, numCapChanges, capSizeChanged, capSizeValue, newValue;

    numChanges = 0;
    numCapChanges = 0; // changes to caption-style-related preferences
    capSizeChanged = false; 
    var cookie = this.getCookie();
    var available = this.getAvailablePreferences();
    for (var i=0; i < available.length; i++) {
      // only prefs with labels are used in the Prefs form 
      if (available[i]['label']) { 
        var prefName = available[i]['name'];
        if (prefName == 'prefDescFormat') { 
          this.prefDescFormat = $('input[name="' + prefName + '"]:checked').val();
          if (this.prefDescFormat !== cookie.preferences['prefDescFormat']) { // user changed setting           
            cookie.preferences['prefDescFormat'] = this.prefDescFormat;
            numChanges++; 
          }
        }
        else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) { 
          // this is one of the caption-related select fields 
          newValue = $('select[name="' + prefName + '"]').val(); 
          if (cookie.preferences[prefName] !== newValue) { // user changed setting
            cookie.preferences[prefName] = newValue;
            // also update global var for this pref (for caption fields, not done elsewhere) 
            this[prefName] = newValue;
            numChanges++; 
            numCapChanges++; 
          }
          if (prefName === 'prefCaptionsSize') { 
            capSizeChanged = true;             
            capSizeValue = newValue;
          }
        }
        else { // all other fields are checkboxes
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
      }
    }
    if (numChanges > 0) {
      this.setCookie(cookie);
      this.showAlert(this.tt.prefSuccess);
    }
    else {
      this.showAlert(this.tt.prefNoChange);
    }
    if (this.player === 'youtube' && 
      (typeof this.usingYouTubeCaptions !== 'undefined' && this.usingYouTubeCaptions) && 
      capSizeChanged) { 
        // update font size of YouTube captions 
        this.youTubePlayer.setOption(this.ytCaptionModule,'fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
    }
    this.updatePrefs();
    if (numCapChanges > 0) { 
      this.stylizeCaptions(this.$captionDiv);
    }
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
    // In case description-related settings have changed, re-initialize description 
    this.refreshingDesc = true; 
    this.initDescription();
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
