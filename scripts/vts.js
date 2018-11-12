/* Video Transcript Sorter (VTS)
 * Used to synchronize time stamps from WebVTT resources
 * so they appear in the proper sequence within an auto-generated interactive transcript
*/

(function ($) {
  AblePlayer.prototype.injectVTS = function() {

    // To add a transcript sorter to a web page:
    // Add <div id="able-vts"></div> to the web page

    // Define all variables
    var thisObj, tracks, $heading;
    var $instructions, $p1, $p2, $ul, $li1, $li2, $li3;
    var $fieldset, $legend, i, $radioDiv, radioId, $label, $radio;
    var $saveButton, $savedTable;

    thisObj = this;

    if ($('#able-vts').length) {
      // Page includes a container for a VTS instance

      // Are they qualifying tracks?
      if (this.vtsTracks.length) {
        // Yes - there are!

        // Build an array of unique languages
        this.langs = [];
        this.getAllLangs(this.vtsTracks);

        // Set the default VTS language
        this.vtsLang = this.lang;

        // Inject a heading
        $heading = $('<h2>').text('Video Transcript Sorter'); // TODO: Localize; intelligently assign proper heading level
        $('#able-vts').append($heading);

        // Inject an empty div for writing messages
        this.$vtsAlert = $('<div>',{
          'id': 'able-vts-alert',
          'aria-live': 'polite',
          'aria-atomic': 'true'
        })
        $('#able-vts').append(this.$vtsAlert);

        // Inject instructions (TODO: Localize)
        $instructions = $('<div>',{
          'id': 'able-vts-instructions'
        });
        $p1 = $('<p>').text('Use the Video Transcript Sorter to perform any of the following tasks:');
        $ul = $('<ul>');
        $li1 = $('<li>').text('Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player\'s auto-generated transcript.');
        $li2 = $('<li>').text('Modify content or start/end times (all are directly editable within the table).');
        $li3 = $('<li>').text('Insert new content, such as chapters or descriptions.');
        $p2 = $('<p>').text('When finished editing, click the "Save Changes" button. This will auto-generate new content for all relevant timed text files (chapters, descriptions, captions, and/or subtitles), which can be copied and pasted into separate WebVTT files for use by Able Player.');
        $ul.append($li1,$li2,$li3);
        $instructions.append($p1,$ul,$p2);
        $('#able-vts').append($instructions);

        // Inject a fieldset with radio buttons for each language
        $fieldset = $('<fieldset>');
        $legend = $('<legend>').text('Select a language'); // TODO: Localize this
        $fieldset.append($legend)
        for (i in this.langs) {
          radioId = 'vts-lang-radio-' + this.langs[i];
          $radioDiv = $('<div>',{
            // uncomment the following if label is native name
            // 'lang': this.langs[i]
          });
          $radio = $('<input>', {
            'type': 'radio',
            'name': 'vts-lang',
            'id': radioId,
            'value': this.langs[i]
          }).on('click',function() {
            thisObj.vtsLang = $(this).val();
            thisObj.showVtsAlert('Loading ' + thisObj.getLanguageName(thisObj.vtsLang) + ' tracks');
            thisObj.injectVtsTable('update',thisObj.vtsLang);
          });
          if (this.langs[i] == this.lang) {
            // this is the default language.
            $radio.prop('checked',true);
          }
          $label = $('<label>', {
            'for': radioId
            // Two options for label:
            // getLanguageNativeName() - returns native name; if using this be sure to add lang attr to <div> (see above)
            // getLanguageName() - returns name in English; doesn't require lang attr on <label>
          }).text(this.getLanguageName(this.langs[i]));
          $radioDiv.append($radio,$label);
          $fieldset.append($radioDiv);
        }
        $('#able-vts').append($fieldset);

        // Inject a 'Save Changes' button
        $saveButton = $('<button>',{
          'type': 'button',
          'id': 'able-vts-save',
          'value': 'save'
        }).text('Save Changes'); // TODO: Localize this
        $('#able-vts').append($saveButton);

        // Inject a table with one row for each cue in the default language
        this.injectVtsTable('add',this.vtsLang);

        // TODO: Add drag/drop functionality for mousers

        // Add event listeners for contenteditable cells
        var kindOptions, beforeEditing, editedCell, editedContent, i, closestKind;
        kindOptions = ['captions','chapters','descriptions','subtitles'];
        $('td[contenteditable="true"]').on('focus',function() {
          beforeEditing = $(this).text();
        }).on('blur',function() {
          if (beforeEditing != $(this).text()) {
            editedCell = $(this).index();
            editedContent = $(this).text();
            if (editedCell === 1) {
              // do some simple spelling auto-correct
              if ($.inArray(editedContent,kindOptions) === -1) {
                // whatever user typed is not a valid kind
                // assume they correctly typed the first character
                if (editedContent.substr(0,1) === 's') {
                  $(this).text('subtitles');
                }
                else if (editedContent.substr(0,1) === 'd') {
                  $(this).text('descriptions');
                }
                else if (editedContent.substr(0,2) === 'ch') {
                  $(this).text('chapters');
                }
                else {
                  // whatever else they types, assume 'captions'
                  $(this).text('captions');
                }
              }
            }
            else if (editedCell === 2 || editedCell === 3) {
              // start or end time
              // ensure proper formatting (with 3 decimal places)
              $(this).text(thisObj.formatTimestamp(editedContent));
            }
          }
        }).on('keydown',function(e) {
          // don't allow keystrokes to trigger Able Player (or other) functions
          // while user is editing
          e.stopPropagation();
        });

        // handle click on the Save button

        // handle click on the Save button
        $('#able-vts-save').on('click',function(e) {
          e.stopPropagation();
          if ($(this).attr('value') == 'save') {
            // replace table with WebVTT output in textarea fields (for copying/pasting)
            $(this).attr('value','cancel').text('Return to Editor'); // TODO: Localize this
            $savedTable = $('#able-vts table');
            $('#able-vts-instructions').hide();
            $('#able-vts > fieldset').hide();
            $('#able-vts table').remove();
            $('#able-vts-icon-credit').remove();
            thisObj.parseVtsOutput($savedTable);
          }
          else {
            // cancel saving, and restore the table using edited content
            $(this).attr('value','save').text('Save Changes'); // TODO: Localize this
            $('#able-vts-output').remove();
            $('#able-vts-instructions').show();
            $('#able-vts > fieldset').show();
            $('#able-vts').append($savedTable);
            $('#able-vts').append(thisObj.getIconCredit());
            thisObj.showVtsAlert('Cancelling saving. Any edits you made have been restored in the VTS table.'); // TODO: Localize this
          }
        });
      }
    }
  };

  AblePlayer.prototype.setupVtsTracks = function(kind, lang, label, src, contents) {

    // Called from tracks.js

    var srcFile, vtsCues;

    srcFile = this.getFilenameFromPath(src);
    vtsCues = this.parseVtsTracks(contents);

    this.vtsTracks.push({
      'kind': kind,
      'language': lang,
      'label': label,
      'srcFile': srcFile,
      'cues': vtsCues
    });
  };

  AblePlayer.prototype.getFilenameFromPath = function(path) {

    var lastSlash;

    lastSlash = path.lastIndexOf('/');
    if (lastSlash === -1) {
      // there are no slashes in path.
      return path;
    }
    else {
      return path.substr(lastSlash+1);
    }
  };

  AblePlayer.prototype.getFilenameFromTracks = function(kind,lang) {

    for (var i=0; i<this.vtsTracks.length; i++) {
      if (this.vtsTracks[i].kind === kind && this.vtsTracks[i].language === lang) {
        // this is a matching track
        // srcFile has already been converted to filename from path before saving to vtsTracks
        return this.vtsTracks[i].srcFile;
      }
    }
    // no matching track found
    return false;
  };

  AblePlayer.prototype.parseVtsTracks = function(contents) {

    var rows, timeParts, cues, i, j, thisRow, nextRow, content, blankRow;
    rows = contents.split("\n");
    cues = [];
    i = 0;
    while (i < rows.length) {
      thisRow = rows[i];
      if (thisRow.indexOf(' --> ') !== -1) {
        // this is probably a time row
        timeParts = thisRow.trim().split(' ');
        if (this.isValidTimestamp(timeParts[0]) && this.isValidTimestamp(timeParts[2])) {
          // both timestamps are valid. This is definitely a time row
          content = '';
          j = i+1;
          blankRow = false;
          while (j < rows.length && !blankRow) {
            nextRow = rows[j].trim();
            if (nextRow.length > 0) {
              if (content.length > 0) {
                // add back the EOL between rows of content
                content += "\n" + nextRow;
              }
              else {
                // this is the first row of content. No need for an EOL
                content += nextRow;
              }
            }
            else {
              blankRow = true;
            }
            j++;
          }
          cues.push({
            'start': timeParts[0],
            'end': timeParts[2],
            'content': content
          });
          i = j; //skip ahead
        }
      }
      else {
        i++;
      }
    }
    return cues;
  };

  AblePlayer.prototype.isValidTimestamp = function(timestamp) {

    // return true if timestamp contains only numbers or expected punctuation
    if (/^[0-9:,.]*$/.test(timestamp)) {
      return true;
    }
    else {
      return false;
    }
  };

  AblePlayer.prototype.formatTimestamp = function(timestamp) {

    // timestamp is a string in the form "HH:MM:SS.xxx"
    // Take some simple steps to ensure edited timestamp values still adhere to expected format

    var firstPart, lastPart;

    var firstPart = timestamp.substr(0,timestamp.lastIndexOf('.')+1);
    var lastPart = timestamp.substr(timestamp.lastIndexOf('.')+1);

    // TODO: Be sure each component within firstPart has only exactly two digits
    // Probably can't justify doing this automatically
    // If users enters '5' for minutes, that could be either '05' or '50'
    // This should trigger an error and prompt the user to correct the value before proceeding

    // Be sure lastPart has exactly three digits
    if (lastPart.length > 3) {
      // chop off any extra digits
      lastPart = lastPart.substr(0,3);
    }
    else if (lastPart.length < 3) {
      // add trailing zeros
      while (lastPart.length < 3) {
        lastPart += '0';
      }
    }
    return firstPart + lastPart;
  };


  AblePlayer.prototype.injectVtsTable = function(action,lang) {

    // action is either 'add' (for a new table) or 'update' (if user has selected a new lang)

    var $table, headers, i, $tr, $th, $td, rows, rowNum, rowId;

    if (action === 'update') {
      // remove existing table
      $('#able-vts table').remove();
      $('#able-vts-icon-credit').remove();
    }

    $table = $('<table>',{
      'lang': lang
    });
    $tr = $('<tr>',{
      'lang': 'en' // TEMP, until header row is localized
    });
    headers = ['Row #','Kind','Start','End','Content','Actions']; // TODO: Localize this
    for (i=0; i < headers.length; i++) {
      $th = $('<th>', {
        'scope': 'col'
      }).text(headers[i]);
      if (headers[i] === 'Actions') {
        $th.addClass('actions');
      }
      $tr.append($th);
    }
    $table.append($tr);

    // Get all rows (sorted by start time), and inject them into table
    rows = this.getAllRows(lang);
    for (i=0; i < rows.length; i++) {
      rowNum = i + 1;
      rowId = 'able-vts-row-' + rowNum;
      $tr = $('<tr>',{
        'id': rowId,
        'class': 'kind-' + rows[i].kind
      });
      // Row #
      $td = $('<td>').text(rowNum);
      $tr.append($td);

      // Kind
      $td = $('<td>',{
        'contenteditable': 'true'
      }).text(rows[i].kind);
      $tr.append($td);

      // Start
      $td = $('<td>',{
        'contenteditable': 'true'
      }).text(rows[i].start);
      $tr.append($td);

      // End
      $td = $('<td>',{
        'contenteditable': 'true'
      }).text(rows[i].end);
      $tr.append($td);

      // Content
      $td = $('<td>',{
        'contenteditable': 'true'
      }).text(rows[i].content); // TODO: Preserve tags
      $tr.append($td);

          // Actions
      $td = this.addVtsActionButtons(rowNum,rows.length);
      $tr.append($td);

      $table.append($tr);
    }
    $('#able-vts').append($table);

    // Add credit for action button SVG icons
    $('#able-vts').append(this.getIconCredit());

  };

  AblePlayer.prototype.addVtsActionButtons = function(rowNum,numRows) {

    // rowNum is the number of the current table row (starting with 1)
    // numRows is the total number of rows (excluding the header row)
    // TODO: Position buttons so they're vertically aligned, even if missing an Up or Down button
    var thisObj, $td, buttons, i, button, $button, $svg, $g, pathString, pathString2, $path, $path2;
    thisObj = this;
    $td = $('<td>');
    buttons = ['up','down','insert','delete'];

    for (i=0; i < buttons.length; i++) {
      button = buttons[i];
      if (button === 'up') {
        if (rowNum > 1) {
          $button = $('<button>',{
            'id': 'able-vts-button-up-' + rowNum,
            'title': 'Move up',
            'aria-label': 'Move Row ' + rowNum + ' up'
          }).on('click', function(el) {
            thisObj.onClickVtsActionButton(el.currentTarget);
          });
          $svg = $('<svg>',{
            'focusable': 'false',
            'aria-hidden': 'true',
            'x': '0px',
            'y': '0px',
            'width': '254.296px',
            'height': '254.296px',
            'viewBox': '0 0 254.296 254.296',
            'style': 'enable-background:new 0 0 254.296 254.296'
          });
          pathString = 'M249.628,176.101L138.421,52.88c-6.198-6.929-16.241-6.929-22.407,0l-0.381,0.636L4.648,176.101'
            + 'c-6.198,6.897-6.198,18.052,0,24.981l0.191,0.159c2.892,3.305,6.865,5.371,11.346,5.371h221.937c4.577,0,8.613-2.161,11.41-5.594'
            + 'l0.064,0.064C255.857,194.153,255.857,182.998,249.628,176.101z';
          $path = $('<path>',{
            'd': pathString
          });
          $g = $('<g>').append($path);
          $svg.append($g);
          $button.append($svg);
          // Refresh button in the DOM in order for browser to process & display the SVG
          $button.html($button.html());
          $td.append($button);
        }
      }
      else if (button === 'down') {
        if (rowNum < numRows) {
          $button = $('<button>',{
            'id': 'able-vts-button-down-' + rowNum,
            'title': 'Move down',
            'aria-label': 'Move Row ' + rowNum + ' down'
          }).on('click', function(el) {
            thisObj.onClickVtsActionButton(el.currentTarget);
          });
          $svg = $('<svg>',{
            'focusable': 'false',
            'aria-hidden': 'true',
            'x': '0px',
            'y': '0px',
            'width': '292.362px',
            'height': '292.362px',
            'viewBox': '0 0 292.362 292.362',
            'style': 'enable-background:new 0 0 292.362 292.362'
          });
          pathString = 'M286.935,69.377c-3.614-3.617-7.898-5.424-12.848-5.424H18.274c-4.952,0-9.233,1.807-12.85,5.424'
            + 'C1.807,72.998,0,77.279,0,82.228c0,4.948,1.807,9.229,5.424,12.847l127.907,127.907c3.621,3.617,7.902,5.428,12.85,5.428'
            + 's9.233-1.811,12.847-5.428L286.935,95.074c3.613-3.617,5.427-7.898,5.427-12.847C292.362,77.279,290.548,72.998,286.935,69.377z';
          $path = $('<path>',{
            'd': pathString
          });
          $g = $('<g>').append($path);
          $svg.append($g);
          $button.append($svg);
          // Refresh button in the DOM in order for browser to process & display the SVG
          $button.html($button.html());
          $td.append($button);
        }
      }
      else if (button === 'insert') {
        // Add Insert button to all rows
        $button = $('<button>',{
          'id': 'able-vts-button-insert-' + rowNum,
          'title': 'Insert row below',
          'aria-label': 'Insert row before Row ' + rowNum
        }).on('click', function(el) {
          thisObj.onClickVtsActionButton(el.currentTarget);
        });
        $svg = $('<svg>',{
          'focusable': 'false',
          'aria-hidden': 'true',
          'x': '0px',
          'y': '0px',
          'width': '401.994px',
          'height': '401.994px',
          'viewBox': '0 0 401.994 401.994',
          'style': 'enable-background:new 0 0 401.994 401.994'
        });
        pathString = 'M394,154.175c-5.331-5.33-11.806-7.994-19.417-7.994H255.811V27.406c0-7.611-2.666-14.084-7.994-19.414'
          + 'C242.488,2.666,236.02,0,228.398,0h-54.812c-7.612,0-14.084,2.663-19.414,7.993c-5.33,5.33-7.994,11.803-7.994,19.414v118.775'
          + 'H27.407c-7.611,0-14.084,2.664-19.414,7.994S0,165.973,0,173.589v54.819c0,7.618,2.662,14.086,7.992,19.411'
          + 'c5.33,5.332,11.803,7.994,19.414,7.994h118.771V374.59c0,7.611,2.664,14.089,7.994,19.417c5.33,5.325,11.802,7.987,19.414,7.987'
          + 'h54.816c7.617,0,14.086-2.662,19.417-7.987c5.332-5.331,7.994-11.806,7.994-19.417V255.813h118.77'
          + 'c7.618,0,14.089-2.662,19.417-7.994c5.329-5.325,7.994-11.793,7.994-19.411v-54.819C401.991,165.973,399.332,159.502,394,154.175z';
        $path = $('<path>',{
          'd': pathString
        });
        $g = $('<g>').append($path);
        $svg.append($g);
        $button.append($svg);
        // Refresh button in the DOM in order for browser to process & display the SVG
        $button.html($button.html());
        $td.append($button);
      }
      else if (button === 'delete') {
        // Add Delete button to all rows
        $button = $('<button>',{
          'id': 'able-vts-button-delete-' + rowNum,
          'title': 'Delete row ',
          'aria-label': 'Delete Row ' + rowNum
        }).on('click', function(el) {
          thisObj.onClickVtsActionButton(el.currentTarget);
        });
        $svg = $('<svg>',{
          'focusable': 'false',
          'aria-hidden': 'true',
          'x': '0px',
          'y': '0px',
          'width': '508.52px',
          'height': '508.52px',
          'viewBox': '0 0 508.52 508.52',
          'style': 'enable-background:new 0 0 508.52 508.52'
        });
        pathString = 'M397.281,31.782h-63.565C333.716,14.239,319.478,0,301.934,0h-95.347'
					+ 'c-17.544,0-31.782,14.239-31.782,31.782h-63.565c-17.544,0-31.782,14.239-31.782,31.782h349.607'
					+ 'C429.063,46.021,414.825,31.782,397.281,31.782z';
        $path = $('<path>',{
          'd': pathString
        });
        pathString2 = 'M79.456,476.737c0,17.544,14.239,31.782,31.782,31.782h286.042'
					+ 'c17.544,0,31.782-14.239,31.782-31.782V95.347H79.456V476.737z M333.716,174.804c0-8.772,7.151-15.891,15.891-15.891'
					+ 'c8.74,0,15.891,7.119,15.891,15.891v254.26c0,8.74-7.151,15.891-15.891,15.891c-8.74,0-15.891-7.151-15.891-15.891V174.804z'
					+ 'M238.369,174.804c0-8.772,7.119-15.891,15.891-15.891c8.74,0,15.891,7.119,15.891,15.891v254.26'
					+ 'c0,8.74-7.151,15.891-15.891,15.891c-8.772,0-15.891-7.151-15.891-15.891V174.804z M143.021,174.804'
					+ 'c0-8.772,7.119-15.891,15.891-15.891c8.772,0,15.891,7.119,15.891,15.891v254.26c0,8.74-7.119,15.891-15.891,15.891'
					+ 'c-8.772,0-15.891-7.151-15.891-15.891V174.804z';
        $path2 = $('<path>',{
          'd': pathString2
        });

        $g = $('<g>').append($path,$path2);
        $svg.append($g);
        $button.append($svg);
        // Refresh button in the DOM in order for browser to process & display the SVG
        $button.html($button.html());
        $td.append($button);
      }
    }
    return $td;
  };

  AblePlayer.prototype.updateVtsActionButtons = function($buttons,nextRowNum) {

    // TODO: Add some filters to this function to add or delete 'Up' and 'Down' buttons
    // if row is moved to/from the first/last rows
    var i, $thisButton, id, label, newId, newLabel;
    for (i=0; i < $buttons.length; i++) {
      $thisButton = $buttons.eq(i);
      id = $thisButton.attr('id');
      label = $thisButton.attr('aria-label');
      // replace the integer (id) within each of the above strings
      newId = id.replace(/[0-9]+/g, nextRowNum);
      newLabel = label.replace(/[0-9]+/g, nextRowNum);
      $thisButton.attr('id',newId);
      $thisButton.attr('aria-label',newLabel);
    }
  }

  AblePlayer.prototype.getIconCredit = function() {

    var credit;
    credit = '<div id="able-vts-icon-credit">'
      + 'Action buttons made by <a href="https://www.flaticon.com/authors/elegant-themes">Elegant Themes</a> '
      + 'from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> '
      + 'are licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" '
      + 'target="_blank">CC 3.0 BY</a>'
      + '</div>';
      return credit;
  };

  AblePlayer.prototype.getAllLangs = function(tracks) {

    // update this.langs with any unique languages found in tracks
    var i;
    for (i in tracks) {
      if (tracks[i].hasOwnProperty('language')) {
        if ($.inArray(tracks[i].language,this.langs) === -1) {
          // this language is not already in the langs array. Add it.
          this.langs[this.langs.length] = tracks[i].language;
        }
      }
    }
  };

  AblePlayer.prototype.getAllRows = function(lang) {

    // returns an array of data to be displayed in VTS table
    // includes all cues for tracks of any type with matching lang
    // cues are sorted by start time
    var i, track, c, cues;
    cues = [];
    for (i=0; i < this.vtsTracks.length; i++) {
      track = this.vtsTracks[i];
      if (track.language == lang) {
        // this track matches the language. Add its cues to array
        for (c in track.cues) {
          cues.push({
            'kind': track.kind,
            'lang': lang,
            'id': track.cues[c].id,
            'start': track.cues[c].start,
            'end': track.cues[c].end,
            'content': track.cues[c].content
          });
        }
      }
    }
    // Now sort cues by start time
    cues.sort(function(a,b) {
      return a.start > b.start ? 1 : -1;
    });
    return cues;
  };


  AblePlayer.prototype.onClickVtsActionButton = function(el) {

    // handle click on up, down, insert, or delete button
    var idParts, action, rowNum;
    idParts = $(el).attr('id').split('-');
    action = idParts[3];
    rowNum = idParts[4];
    if (action == 'up') {
      // move the row up
      this.moveRow(rowNum,'up');
    }
    else if (action == 'down') {
      // move the row down
      this.moveRow(rowNum,'down');
    }
    else if (action == 'insert') {
      // insert a row below
      this.insertRow(rowNum);
    }
    else if (action == 'delete') {
      // delete the row
      this.deleteRow(rowNum);
    }
  };

  AblePlayer.prototype.insertRow = function(rowNum) {

    // Insert empty row below rowNum
    var $table, $rows, numRows, newRowNum, newRowId, newTimes, $tr, $td;
    var $select, options, i, $option, newKind, newClass, $parentRow;
    var i, nextRowNum, $buttons;

    $table = $('#able-vts table');
    $rows = $table.find('tr');

    numRows = $rows.length - 1; // exclude header row

    newRowNum = parseInt(rowNum) + 1;
    newRowId = 'able-vts-row-' + newRowNum;

    // Create an empty row
    $tr = $('<tr>',{
      'id': newRowId
    });

    // Row #
    $td = $('<td>').text(newRowNum);
    $tr.append($td);

    // Kind (add a select field for chosing a kind)
    newKind = null;
    $select = $('<select>',{
      'id': 'able-vts-kind-' + newRowNum,
      'aria-label': 'What kind of track is this?',
      'placeholder': 'Select a kind'
    }).on('change',function() {
      newKind = $(this).val();
      newClass = 'kind-' + newKind;
      $parentRow = $(this).closest('tr');
      // replace the select field with the chosen value as text
      $(this).parent().text(newKind);
      // add a class to the parent row
      $parentRow.addClass(newClass);
    });
    options = ['','captions','chapters','descriptions','subtitles'];
    for (i=0; i<options.length; i++) {
      $option = $('<option>',{
        'value': options[i]
      }).text(options[i]);
      $select.append($option);
    }
    $td = $('<td>').append($select);
    $tr.append($td);

    // Start
    $td = $('<td>',{
      'contenteditable': 'true'
    }); // TODO; Intelligently assign a new start time (see getAdjustedTimes())
    $tr.append($td);

    // End
    $td = $('<td>',{
      'contenteditable': 'true'
    }); // TODO; Intelligently assign a new end time (see getAdjustedTimes())
    $tr.append($td);

    // Content
    $td = $('<td>',{
      'contenteditable': 'true'
    });
    $tr.append($td);

    // Actions
    $td = this.addVtsActionButtons(newRowNum,numRows);
    $tr.append($td);

    // Now insert the new row
    $table.find('tr').eq(rowNum).after($tr);

    // Update row.id, Row # cell, & action items for all rows after the inserted one
    for (i=newRowNum; i <= numRows; i++) {
      nextRowNum = i + 1;
      $rows.eq(i).attr('id','able-vts-row-' + nextRowNum); // increment tr id
      $rows.eq(i).find('td').eq(0).text(nextRowNum); // increment Row # as expressed in first td
      $buttons = $rows.eq(i).find('button');
      this.updateVtsActionButtons($buttons,nextRowNum);
    }

    // Auto-adjust times
    this.adjustTimes(newRowNum);

    // Announce the insertion
    this.showVtsAlert('A new row ' + newRowNum + ' has been inserted'); // TODO: Localize this

    // Place focus in new select field
    $select.focus();

  };

  AblePlayer.prototype.deleteRow = function(rowNum) {

    var $table, $rows, numRows, i, nextRowNum, $buttons;

    $table = $('#able-vts table');
    $table[0].deleteRow(rowNum);
    $rows = $table.find('tr'); // this does not include the deleted row
    numRows = $rows.length - 1; // exclude header row

    // Update row.id, Row # cell, & action buttons for all rows after the deleted one
    for (i=rowNum; i <= numRows; i++) {
      nextRowNum = i;
      $rows.eq(i).attr('id','able-vts-row-' + nextRowNum); // increment tr id
      $rows.eq(i).find('td').eq(0).text(nextRowNum); // increment Row # as expressed in first td
      $buttons = $rows.eq(i).find('button');
      this.updateVtsActionButtons($buttons,nextRowNum);
    }

    // Announce the deletion
    this.showVtsAlert('Row ' + rowNum + ' has been deleted'); // TODO: Localize this

  };

  AblePlayer.prototype.moveRow = function(rowNum,direction) {

    // swap two rows
    var $rows, $thisRow, otherRowNum, $otherRow, newTimes, msg;

    $rows = $('#able-vts table').find('tr');
    $thisRow = $('#able-vts table').find('tr').eq(rowNum);
    if (direction == 'up') {
      otherRowNum = parseInt(rowNum) - 1;
      $otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
      $otherRow.before($thisRow);
    }
    else if (direction == 'down') {
      otherRowNum = parseInt(rowNum) + 1;
      $otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
      $otherRow.after($thisRow);
    }
    // Update row.id, Row # cell, & action buttons for the two swapped rows
    $thisRow.attr('id','able-vts-row-' + otherRowNum);
    $thisRow.find('td').eq(0).text(otherRowNum);
    this.updateVtsActionButtons($thisRow.find('button'),otherRowNum);
    $otherRow.attr('id','able-vts-row-' + rowNum);
    $otherRow.find('td').eq(0).text(rowNum);
    this.updateVtsActionButtons($otherRow.find('button'),rowNum);

    // auto-adjust times
    this.adjustTimes(otherRowNum);

    // Announce the move (TODO: Localize this)
    msg = 'Row ' + rowNum + ' has been moved ' + direction;
    msg += ' and is now Row ' + otherRowNum;
    this.showVtsAlert(msg);
  };

  AblePlayer.prototype.adjustTimes = function(rowNum) {

    // Adjusts start and end times of the current, previous, and next rows in VTS table
    // after a move or insert
    // NOTE: Fully automating this process would be extraordinarily complicated
    // The goal here is simply to make subtle tweaks to ensure rows appear
    // in the new order within the Able Player transcript
    // Additional tweaking will likely be required by the user

    // HISTORY: Originally set minDuration to 2 seconds for captions and .500 for descriptions
    // However, this can results in significant changes to existing caption timing,
    // with not-so-positive results.
    // As of 3.1.15, setting minDuration to .001 for all track kinds
    // Users will have to make further adjustments manually if needed

    // TODO: Add WebVTT validation on save, since tweaking times is risky

    var  minDuration, $rows, prevRowNum, nextRowNum, $row, $prevRow, $nextRow,
        kind, prevKind, nextKind,
        start, prevStart, nextStart,
        end, prevEnd, nextEnd;

    // Define minimum duration (in seconds) for each kind of track
    minDuration = [];
    minDuration['captions'] = .001;
    minDuration['descriptions'] = .001;
    minDuration['chapters'] = .001;

    // refresh rows object
    $rows = $('#able-vts table').find('tr');

    // Get kind, start, and end from current row
    $row = $rows.eq(rowNum);
    if ($row.is('[class^="kind-"]')) {
      // row has a class that starts with "kind-"
      // Extract kind from the class name
      kind = this.getKindFromClass($row.attr('class'));
    }
    else {
      // Kind has not been assigned (e.g., newly inserted row)
      // Set as captions row by default
      kind = 'captions';
    }
    start = this.getSecondsFromColonTime($row.find('td').eq(2).text());
    end = this.getSecondsFromColonTime($row.find('td').eq(3).text());

    // Get kind, start, and end from previous row
    if (rowNum > 1) {
      // this is not the first row. Include the previous row
      prevRowNum = rowNum - 1;
      $prevRow = $rows.eq(prevRowNum);
      if ($prevRow.is('[class^="kind-"]')) {
        // row has a class that starts with "kind-"
        // Extract kind from the class name
       prevKind = this.getKindFromClass($prevRow.attr('class'));
      }
      else {
        // Kind has not been assigned (e.g., newly inserted row)
        prevKind = null;
      }
      prevStart = this.getSecondsFromColonTime($prevRow.find('td').eq(2).text());
      prevEnd = this.getSecondsFromColonTime($prevRow.find('td').eq(3).text());
    }
    else {
      // this is the first row
      prevRowNum = null;
      $prevRow = null;
      prevKind = null;
      prevStart = null;
      prevEnd = null;
    }

    // Get kind, start, and end from next row
    if (rowNum < ($rows.length - 1)) {
      // this is not the last row. Include the next row
      nextRowNum = rowNum + 1;
      $nextRow = $rows.eq(nextRowNum);
      if ($nextRow.is('[class^="kind-"]')) {
        // row has a class that starts with "kind-"
        // Extract kind from the class name
       nextKind = this.getKindFromClass($nextRow.attr('class'));
      }
      else {
        // Kind has not been assigned (e.g., newly inserted row)
        nextKind = null;
      }
      nextStart = this.getSecondsFromColonTime($nextRow.find('td').eq(2).text());
      nextEnd = this.getSecondsFromColonTime($nextRow.find('td').eq(3).text());
    }
    else {
      // this is the last row
      nextRowNum = null;
      $nextRow = null;
      nextKind = null;
      nextStart = null;
      nextEnd = null;
    }

    if (isNaN(start)) {
      if (prevKind == null) {
        // The previous row was probably inserted, and user has not yet selected a kind
        // automatically set it to captions
        prevKind = 'captions';
        $prevRow.attr('class','kind-captions');
        $prevRow.find('td').eq(1).html('captions');
      }
      // Current row has no start time (i.e., it's an inserted row)
      if (prevKind === 'captions') {
        // start the new row immediately after the captions end
        start = (parseFloat(prevEnd) + .001).toFixed(3);
        if (nextStart) {
          // end the new row immediately before the next row starts
          end = (parseFloat(nextStart) - .001).toFixed(3);
        }
        else {
          // this is the last row. Use minDuration to calculate end time.
          end = (parseFloat(start) + minDuration[kind]).toFixed(3);
        }
      }
      else if (prevKind === 'chapters') {
        // start the new row immediately after the chapter start (not end)
        start = (parseFloat(prevStart) + .001).toFixed(3);
        if (nextStart) {
          // end the new row immediately before the next row starts
          end = (parseFloat(nextStart) - .001).toFixed(3);
        }
        else {
          // this is the last row. Use minDuration to calculate end time.
          end = (parseFloat(start) + minDurartion[kind]).toFixed(3);
        }
      }
      else if (prevKind === 'descriptions') {
        // start the new row minDuration['descriptions'] after the description starts
        // this will theoretically allow at least a small cushion for the description to be read
        start = (parseFloat(prevStart) + minDuration['descriptions']).toFixed(3);
        end = (parseFloat(start) + minDuration['descriptions']).toFixed(3);
      }
    }
    else {
      // current row has a start time (i.e., an existing row has been moved))
      if (prevStart) {
        // this is not the first row.
        if (prevStart < start) {
          if (start < nextStart) {
            // No change is necessary
          }
          else {
            // nextStart needs to be incremented
            nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
            nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
            // TODO: Ensure nextEnd does not exceed the following start (nextNextStart)
            // Or... maybe this is getting too complicated and should be left up to the user
          }
        }
        else {
          // start needs to be incremented
          start = (parseFloat(prevStart) + minDuration[prevKind]).toFixed(3);
          end = (parseFloat(start) + minDuration[kind]).toFixed(3);
        }
      }
      else {
        // this is the first row
        if (start < nextStart) {
          // No change is necessary
        }
        else {
          // nextStart needs to be incremented
          nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
          nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
        }
      }
    }

    // check to be sure there is sufficient duration between new start & end times
    if (end - start < minDuration[kind]) {
      // duration is too short. Change end time
      end = (parseFloat(start) + minDuration[kind]).toFixed(3);
      if (nextStart) {
        // this is not the last row
        // increase start time of next row
        nextStart = (parseFloat(end) + .001).toFixed(3);
      }
    }

    // Update all affected start/end times
    $row.find('td').eq(2).text(this.formatSecondsAsColonTime(start,true));
    $row.find('td').eq(3).text(this.formatSecondsAsColonTime(end,true));
    if ($prevRow) {
      $prevRow.find('td').eq(2).text(this.formatSecondsAsColonTime(prevStart,true));
      $prevRow.find('td').eq(3).text(this.formatSecondsAsColonTime(prevEnd,true));
    }
    if ($nextRow) {
      $nextRow.find('td').eq(2).text(this.formatSecondsAsColonTime(nextStart,true));
      $nextRow.find('td').eq(3).text(this.formatSecondsAsColonTime(nextEnd,true));
    }
  };

  AblePlayer.prototype.getKindFromClass = function(myclass) {

    // This function is called when a class with prefix "kind-" is found in the class attribute
    // TODO: Rewrite this using regular expressions
    var kindStart, kindEnd, kindLength, kind;

    kindStart = myclass.indexOf('kind-')+5;
    kindEnd = myclass.indexOf(' ',kindStart);
    if (kindEnd == -1) {
      // no spaces found, "kind-" must be the only myclass
      kindLength = myclass.length - kindStart;
    }
    else {
      kindLength = kindEnd - kindStart;
    }
    kind = myclass.substr(kindStart,kindLength);
    return kind;
  };

  AblePlayer.prototype.showVtsAlert = function(message) {

    // this is distinct from greater Able Player showAlert()
    // because it's positioning needs are unique
    // For now, alertDiv is fixed at top left of screen
    // but could ultimately be modified to appear near the point of action in the VTS table
    this.$vtsAlert.text(message).show().delay(3000).fadeOut('slow');
  };

  AblePlayer.prototype.parseVtsOutput = function($table) {

    // parse table into arrays, then into WebVTT content, for each kind
    // Display the WebVTT content in textarea fields for users to copy and paste
    var lang, i, kinds, kind, vtt, $rows, start, end, content, $output;

    lang = $table.attr('lang');
    kinds = ['captions','chapters','descriptions','subtitles'];
    vtt = {};
    for (i=0; i < kinds.length; i++) {
      kind = kinds[i];
      vtt[kind] = 'WEBVTT' + "\n\n";
    }
    $rows = $table.find('tr');
    if ($rows.length > 0) {
      for (i=0; i < $rows.length; i++) {
        kind = $rows.eq(i).find('td').eq(1).text();
        if ($.inArray(kind,kinds) !== -1) {
          start = $rows.eq(i).find('td').eq(2).text();
          end = $rows.eq(i).find('td').eq(3).text();
          content = $rows.eq(i).find('td').eq(4).text();
          if (start !== undefined && end !== undefined) {
            vtt[kind] += start + ' --> ' + end + "\n";
            if (content !== 'undefined') {
              vtt[kind] += content;
            }
            vtt[kind] += "\n\n";
          }
        }
      }
    }
    $output = $('<div>',{
      'id': 'able-vts-output'
    })
    $('#able-vts').append($output);
    for (i=0; i < kinds.length; i++) {
      kind = kinds[i];
      if (vtt[kind].length > 8) {
        // some content has been added
        this.showWebVttOutput(kind,vtt[kind],lang)
      }
    }
  };

  AblePlayer.prototype.showWebVttOutput = function(kind,vttString,lang) {

    var $heading, filename, $p, pText, $textarea;

    $heading = $('<h3>').text(kind.charAt(0).toUpperCase() + kind.slice(1));
    filename = this.getFilenameFromTracks(kind,lang);
    pText = 'If you made changes, copy/paste the following content ';
    if (filename) {
      pText += 'to replace the original content of your ' + this.getLanguageName(lang) + ' ';
      pText += '<em>' + kind + '</em> WebVTT file (<strong>' + filename + '</strong>).';
    }
    else {
      pText += 'into a new ' + this.getLanguageName(lang) + ' <em>' + kind + '</em> WebVTT file.';
    }
    $p = $('<p>',{
      'class': 'able-vts-output-instructions'
    }).html(pText);
    $textarea = $('<textarea>').text(vttString);
    $('#able-vts-output').append($heading,$p,$textarea);
  };

})(jQuery);
