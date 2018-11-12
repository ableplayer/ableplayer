(function ($) {
  AblePlayer.prototype.showSearchResults = function() {

    // search VTT file for all instances of searchTerms
    // Currently just supports search terms separated with one or more spaces

    // TODO: Add support for more robust search syntax:
    // Search terms wrapped in quotation marks ("") must occur exactly as they appear in the quotes
    // Search terms with an attached minus sign (e.g., -term) are to be excluded from results
    // Boolean AND/OR operators
    // ALSO: Add localization support

    var thisObj = this;

    if (this.searchDiv && this.searchString) {
      if ($('#' + this.SearchDiv)) {
        var resultsArray = this.searchFor(this.searchString);
        if (resultsArray.length > 0) {
          var resultsSummary = $('<p>',{
            'class': 'able-search-results-summary'
          });
          var resultsSummaryText = 'Found <strong>' + resultsArray.length + '</strong> matching items. ';
          resultsSummaryText += 'Click the time associated with any item ';
          resultsSummaryText += 'to play the video from that point.';
          resultsSummary.html(resultsSummaryText);
          var resultsList = $('<ul>');
          for (var i = 0; i < resultsArray.length; i++) {
            var resultsItem = $('<li>',{
            });
            var itemStartTime = this.secondsToTime(resultsArray[i]['start']);
            var itemStartSpan = $('<span>',{
              'class': 'able-search-results-time',
              'data-start': resultsArray[i]['start'],
              'title': itemStartTime['title'],
              'tabindex': '0'
            });
            itemStartSpan.text(itemStartTime['value']);
            // add a listener for clisk on itemStart
            itemStartSpan.click(function(e) {
              var spanStart = parseFloat($(this).attr('data-start'));
              // Add a tiny amount so that we're inside the span.
              spanStart += .01;
              thisObj.seeking = true;
              thisObj.seekTo(spanStart);
            });

            var itemText = $('<span>',{
              'class': 'able-search-result-text'
            })
            itemText.html('...' + resultsArray[i]['caption'] + '...');
            resultsItem.append(itemStartSpan, itemText);
            resultsList.append(resultsItem);
          }
          $('#' + this.searchDiv).append(resultsSummary, resultsList);
        }
        else {
          var noResults = $('<p>').text('No results found.');
          $('#' + this.searchDiv).append(noResults);
        }
      }
    }
  };

  AblePlayer.prototype.searchFor = function(searchString) {

    // return chronological array of caption cues that match searchTerms
    var captionLang, captions, results, caption, c, i, j;
    results = [];
    // split searchTerms into an array
    var searchTerms = searchString.split(' ');
    if (this.captions.length > 0) {
      // Get caption track that matches this.searchLang
      for (i=0; i < this.captions.length; i++) {
        if (this.captions[i].language === this.searchLang) {
          captionLang = this.searchLang;
          captions = this.captions[i].cues;
        }
      }
      if (captions.length > 0) {
        c = 0;
        for (i = 0; i < captions.length; i++) {
          if ($.inArray(captions[i].components.children[0]['type'], ['string','i','b','u','v','c']) !== -1) {
            caption = this.flattenCueForCaption(captions[i]);
            for (j = 0; j < searchTerms.length; j++) {
              if (caption.indexOf(searchTerms[j]) !== -1) {
                results[c] = [];
                results[c]['start'] = captions[i].start;
                results[c]['lang'] = captionLang;
                results[c]['caption'] = this.highlightSearchTerm(searchTerms,j,caption);
                c++;
                break;
              }
            }
          }
        }
      }
    }
    return results;
  };

  AblePlayer.prototype.highlightSearchTerm = function(searchTerms, index, resultString) {

    // highlight ALL found searchTerms in the current resultString
    // index is the first index in the searchTerm array where a match has already been found
    // Need to step through the remaining terms to see if they're present as well

    var i, searchTerm, termIndex, termLength, str1, str2, str3;

    for (i=index; i<searchTerms.length; i++) {

      searchTerm = searchTerms[i];
      termIndex = resultString.indexOf(searchTerm);
      if (termIndex !== -1) {
        termLength = searchTerm.length;
        if (termLength > 0) {
          str1 = resultString.substring(0, termIndex);
          str2 = '<span class="able-search-term">' + searchTerm + '</span>';
          str3 = resultString.substring(termIndex+termLength);
          resultString = str1 + str2 + str3;
        }
        else {
          str1 = '<span class="able-search-term">' + searchTerm + '</span>';
          str2 = resultString.substring(termIndex+termLength);
          resultString = str1 + str2;
        }
      }
    }
    return resultString;
  };

  AblePlayer.prototype.secondsToTime = function(totalSeconds) {

    // return an array of totalSeconds converted into two formats
    // time['value'] = HH:MM:SS with hours dropped if there are none
    // time['title'] = a speakable rendering, so speech rec users can easily speak the link

    // first, round down to nearest second
    var totalSeconds = Math.floor(totalSeconds);

    var hours = parseInt( totalSeconds / 3600 , 10) % 24;
    var minutes = parseInt( totalSeconds / 60 , 10) % 60;
    var seconds = totalSeconds % 60;
    var value = '';
    var title = '';
    if (hours > 0) {
      value += hours + ':';
      title + hours + ' hours ';
    }
    if (minutes < 10) {
      value += '0' + minutes + ':';
      if (minutes > 0) {
        title += minutes + ' minutes ';
      }
    }
    else {
      value += minutes + ':';
      title += minutes + ' minutes ';
    }
    if (seconds < 10) {
      value += '0' + seconds;
      if (seconds > 0) {
        title += seconds + ' seconds ';
      }
    }
    else {
      value += seconds;
      title += seconds + ' seconds ';
    }
    var time = [];
    time['value'] = value;
    time['title'] = title;
    return time;
  };
})(jQuery);
