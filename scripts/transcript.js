(function ($) {
  AblePlayer.prototype.updateTranscript = function() {

    if (!this.includeTranscript) {
      return;
    }
    // Update transcript.
    var chapters;
    var captions;
    var descriptions;
    var captionLang;

    // setup captions
    if (this.transcriptCaptions) {
      // use this independently of this.selectedCaptions
      // user might want captions in one language, transcript in another
      captionLang = this.transcriptCaptions.language;
      captions = this.transcriptCaptions.cues;
    }
    else if (this.selectedCaptions) {
      captionLang = this.captionLang;
      captions = this.selectedCaptions.cues;
    }

    // setup chapters
    if (this.transcriptChapters) {
      chapters = this.transcriptChapters;
    }
    else if (this.chapters.length > 0) {
      // Try and match the caption language.
      if (captionLang) {
        for (var ii in this.chapters) {
          if (this.chapters[ii].language === captionLang) {
            chapters = this.chapters[ii];
          }
        }
      }
      if (typeof chapters === 'undefined') {
        chapters = this.chapters;
      }
    }

    // setup descriptions
    if (this.transcriptDescriptions) {
      descriptions = this.transcriptDescriptions.cues;
    }
    else if (this.descriptions.length > 0) {
      // Try and match the caption language.
      if (captionLang) {
        for (var ii in this.descriptions) {
          if (this.descriptions[ii].language === captionLang) {
            descriptions = this.descriptions[ii].cues;
          }
        }
      }
      if (!descriptions) {
        descriptions = this.descriptions[0].cues;
      }
    }

    var div = this.generateTranscript(chapters || [], captions || [], descriptions || []);
    this.$transcriptDiv.html(div);

    var thisObj = this;

    // Make transcript tabbable if preference is turned on.
    if (this.prefTabbable === 1) {
      $('.able-transcript span.able-transcript-seekpoint').attr('tabindex','0');
    }

    // handle clicks on text within transcript
    // Note: This event listeners handles clicks only, not keydown events
    // Pressing Enter on an element that is not natively clickable does NOT trigger click()
    // Keydown events are handled elsehwere, both globally (ableplayer-base.js) and locally (event.js)
    if (this.$transcriptArea.length > 0) {
      this.$transcriptArea.find('.able-transcript span.able-transcript-seekpoint').click(function(event) {
        var spanStart = parseFloat($(this).attr('data-start'));
        // Add a tiny amount so that we're inside the span.
        spanStart += .01;
        thisObj.seekTo(spanStart);
      });
    }
  };

  AblePlayer.prototype.highlightTranscript = function (currentTime) {
    if (!this.includeTranscript) {
      return;
    }

    //show highlight in transcript marking current caption
    var start, end;
    var thisObj = this;

    currentTime = parseFloat(currentTime);

    // Highlight the current transcript item.
    this.$transcriptArea.find('.able-transcript span.able-transcript-caption').each(function() {
      start = parseFloat($(this).attr('data-start'));
      end = parseFloat($(this).attr('data-end'));
      if (currentTime >= start && currentTime <= end) {
        // move all previous highlights before adding one to current span
        thisObj.$transcriptArea.find('.able-highlight').removeClass('able-highlight');
        $(this).addClass('able-highlight');
        return false;
      }
    });
    thisObj.currentHighlight = $('.able-highlight');
    if (thisObj.currentHighlight.length === 0) {
      // Nothing highlighted.
      thisObj.currentHighlight = null;
    }
  };

  AblePlayer.prototype.generateTranscript = function(chapters, captions, descriptions) {

    var thisObj = this;

    var $main = $('<div class="able-transcript-container"></div>');

    var transcriptTitle = this.tt.prefMenuTranscript;
    if (typeof this.transcriptTitle !== 'undefined') {
      transcriptTitle = this.transcriptTitle;
    }
    else if (this.lyricsMode) {
      transcriptTitle = 'Lyrics'; // TODO: Localize this
    }

    if (typeof this.transcriptDivLocation === 'undefined' && transcriptTitle != '') {
      // only add an HTML heading to internal transcript
      // external transcript is expected to have its own heading
      var headingNumber = this.playerHeadingLevel;
      headingNumber += 1;
      var chapterHeadingNumber = headingNumber + 1;

      if (headingNumber <= 6) {
        var transcriptHeading = 'h' + headingNumber.toString();
      }
      else {
        var transcriptHeading = 'div';
      }
      // var transcriptHeadingTag = '<' + transcriptHeading + ' class="able-transcript-heading">';
      var $transcriptHeadingTag = $('<' + transcriptHeading + '>');
      $transcriptHeadingTag.addClass('able-transcript-heading');
      if (headingNumber > 6) {
        $transcriptHeadingTag.attr({
          'role': 'heading',
          'aria-level': headingNumber
        });
      }
      $transcriptHeadingTag.text(transcriptTitle);

      $main.append($transcriptHeadingTag);
    }

    var nextChapter = 0;
    var nextCap = 0;
    var nextDesc = 0;

    var addChapter = function(div, chap) {

      if (chapterHeadingNumber <= 6) {
        var chapterHeading = 'h' + chapterHeadingNumber.toString();
      }
      else {
        var chapterHeading = 'div';
      }

      var $chapterHeadingTag = $('<' + chapterHeading + '>',{
        'class': 'able-transcript-chapter-heading'
      });
      if (chapterHeadingNumber > 6) {
        $chapterHeadingTag.attr({
          'role': 'heading',
          'aria-level': chapterHeadingNumber
        });
      }

      var flattenComponentForChapter = function(comp) {
        var result = [];
        if (comp.type === 'string') {
          result.push(comp.value);
        }
        else {
          for (var ii in comp.children) {
            result = result.concat(flattenComponentForChapter(comp.children[ii]));
          }
        }
        return result;
      }

      var $chapSpan = $('<span>',{
        'class': 'able-transcript-seekpoint'
      });
      for (var ii in chap.components.children) {
        var results = flattenComponentForChapter(chap.components.children[ii]);
        for (var jj in results) {
          $chapSpan.append(results[jj]);
        }
      }
      $chapSpan.attr('data-start', chap.start.toString());
      $chapSpan.attr('data-end', chap.end.toString());
      $chapterHeadingTag.append($chapSpan);

      div.append($chapterHeadingTag);
    };

    var addDescription = function(div, desc) {
      var descDiv = $('<div class="able-desc"><span class="hidden">Description: </span></div>');

      var flattenComponentForDescription = function(comp) {
        var result = [];
        if (comp.type === 'string') {
          result.push(comp.value);
        }
        else {
          for (var ii in comp.children) {
            result = result.concat(flattenComponentForDescription(comp.children[ii]));
          }
        }
        return result;
      }

      var descSpan = $('<span class="able-transcript-seekpoint"></span>');
      for (var ii in desc.components.children) {
        var results = flattenComponentForDescription(desc.components.children[ii]);
        for (var jj in results) {
          descSpan.append(results[jj]);
        }
      }
      descSpan.attr('data-start', desc.start.toString());
      descSpan.attr('data-end', desc.end.toString());
      descDiv.append(descSpan);

      div.append(descDiv);
    };

    var addCaption = function(div, cap) {
      var capSpan = $('<span class="able-transcript-seekpoint able-transcript-caption"></span>');

      var flattenComponentForCaption = function(comp) {
        var result = [];
        var flattenString = function (str) {
          var result = [];
          if (str === '') {
            return result;
          }
          var openBracket = str.indexOf('[');
          var closeBracket = str.indexOf(']');
          var openParen = str.indexOf('(');
          var closeParen = str.indexOf(')');

          var hasBrackets = openBracket !== -1 && closeBracket !== -1;
          var hasParens = openParen !== -1 && closeParen !== -1;

          if ((hasParens && hasBrackets && openBracket < openParen) || hasBrackets) {
            result = result.concat(flattenString(str.substring(0, openBracket)));
            result.push($('<div></div><span class="able-unspoken">' + str.substring(openBracket, closeBracket + 1) + '</span>'));
            result = result.concat(flattenString(str.substring(closeBracket + 1)));
          }
          else if (hasParens) {
            result = result.concat(flattenString(str.substring(0, openParen)));
            result.push($('<div></div><span class="able-unspoken">' + str.substring(openParen, closeParen + 1) + '</span>'));
            result = result.concat(flattenString(str.substring(closeParen + 1)));
          }
          else {
            result.push(str);
          }
          return result;
        };

        if (comp.type === 'string') {
          result = result.concat(flattenString(comp.value));
        }
        else if (comp.type === 'v') {
          var vSpan = $('<div></div><span class="able-unspoken">[' + comp.value + ']</span>');
          result.push(vSpan);
          for (var ii in comp.children) {
            var subResults = flattenComponentForCaption(comp.children[ii]);
            for (var jj in subResults) {
              result.push(subResults[jj]);
            }
          }
        }
        else {
          for (var ii in comp.children) {
            result = result.concat(flattenComponentForCaption(comp.children[ii]));
          }
        }
        return result;
      };

      for (var ii in cap.components.children) {
        var results = flattenComponentForCaption(cap.components.children[ii]);
        for (var jj in results) {
          var result = results[jj];
          if (typeof result === 'string' && thisObj.lyricsMode) {
            // add <br> BETWEEN each caption and WITHIN each caption (if payload includes "\n")
            result = result.replace('\n','<br>') + '<br>';
          }
          capSpan.append(result);
        }
      }

      capSpan.attr('data-start', cap.start.toString());
      capSpan.attr('data-end', cap.end.toString());
      div.append(capSpan);
      div.append('\n');
    };

    // keep looping as long as any one of the three arrays has content
    while ((nextChapter < chapters.length) || (nextDesc < descriptions.length) || (nextCap < captions.length)) {

      if ((nextChapter < chapters.length) && (nextDesc < descriptions.length) && (nextCap < captions.length)) {
        // they all three have content
        var firstStart = Math.min(chapters[nextChapter].start,descriptions[nextDesc].start,captions[nextCap].start);
      }
      else if ((nextChapter < chapters.length) && (nextDesc < descriptions.length)) {
        // chapters & descriptions have content
        var firstStart = Math.min(chapters[nextChapter].start,descriptions[nextDesc].start);
      }
      else if ((nextChapter < chapters.length) && (nextCap < captions.length)) {
        // chapters & captions have content
        var firstStart = Math.min(chapters[nextChapter].start,captions[nextCap].start);
      }
      else if ((nextDesc < descriptions.length) && (nextCap < captions.length)) {
        // descriptions & captions have content
        var firstStart = Math.min(descriptions[nextDesc].start,captions[nextCap].start);
      }
      else {
        var firstStart = null;
      }
      if (firstStart !== null) {
        if (typeof chapters[nextChapter] !== 'undefined' && chapters[nextChapter].start === firstStart) {
          addChapter($main, chapters[nextChapter]);
          nextChapter += 1;
        }
        else if (typeof descriptions[nextDesc] !== 'undefined' && descriptions[nextDesc].start === firstStart) {
          addDescription($main, descriptions[nextDesc]);
          nextDesc += 1;
        }
        else {
          addCaption($main, captions[nextCap]);
          nextCap += 1;
        }
      }
      else {
        if (nextChapter < chapters.length) {
          addCaption($main, chapters[nextChapter]);
          nextChapter += 1;
        }
        else if (nextDesc < descriptions.length) {
          addDescription($main, descriptions[nextDesc]);
          nextDesc += 1;
        }
        else if (nextCap < captions.length) {
          addCaption($main, captions[nextCap]);
          nextCap += 1;
        }
      }
    }

    return $main;
  };
})(jQuery);
