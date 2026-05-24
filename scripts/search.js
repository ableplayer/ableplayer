import $ from 'jquery';
import DOMPurify from 'dompurify';

function addSearchFunctions(AblePlayer) {
  AblePlayer.prototype.showSearchResults = function () {
    // search VTT file for all instances of searchTerms
    // Currently just supports search terms separated with one or more spaces

    // TODO: Add support for more robust search syntax:
    // Search terms wrapped in quotation marks ("") must occur exactly as they appear in the quotes
    // Search terms with an attached minus sign (e.g., -term) are to be excluded from results
    // Boolean AND/OR operators
    // ALSO: Add localization support

    var thisObj = this;
    if (this.searchDiv && this.searchString) {
      // sanitize search string
      var cleanSearchString = DOMPurify.sanitize(this.searchString);
      if ($("#" + this.SearchDiv)) {
        var searchStringHtml = "<p>" + this.translate( 'resultsSummary1', 'You searched for:') + ' ';
        searchStringHtml +=
          '<span id="able-search-term-echo">' + cleanSearchString + "</span>";
        searchStringHtml += "</p>";
        var resultsArray = this.searchFor(
          cleanSearchString,
          this.searchIgnoreCaps
        );
        if (resultsArray.length > 0) {
          var $resultsSummary = $("<p>", {
            class: "able-search-results-summary",
          });
          var resultsSummaryText = this.translate( 'resultsSummary2', 'Found %1 matching items.', [ '<strong>' + resultsArray.length + '</strong>' ] );
          resultsSummaryText += ' ' + this.translate( 'resultsSummary3', 'Click the time associated with any item to play the video from that point.' );
          $resultsSummary.html( resultsSummaryText );
          var $resultsList = $("<ul>");
          for (var i = 0; i < resultsArray.length; i++) {
            var resultId = "aria-search-result-" + i;
            var $resultsItem = $("<li>", {});
            var itemStartTime = this.secondsToTime(resultsArray[i]["start"]);
            var itemLabel =
              this.translate( 'searchButtonLabel', 'Play at %1', [ itemStartTime["title"] ] );
            var itemStartSpan = $("<button>", {
              class: "able-search-results-time",
              "data-start": resultsArray[i]["start"],
              title: itemLabel,
              "aria-label": itemLabel,
              "aria-describedby": resultId,
            });
            itemStartSpan.text(itemStartTime["value"]);
            // add a listener for clisk on itemStart
            itemStartSpan.on("click", function (e) {
              thisObj.seekTrigger = "search";
              var spanStart = parseFloat($(this).attr("data-start"));
              // Add a tiny amount so that we're inside the span.
              spanStart += 0.01;
              thisObj.seeking = true;
              thisObj.seekTo(spanStart);
            });

            var itemText = $("<span>", {
              class: "able-search-result-text",
              id: resultId,
            });
            itemText.html('...' + resultsArray[i]["caption"] + '...');
            $resultsItem.append(itemStartSpan, itemText);
            $resultsList.append($resultsItem);
          }
          $('#' + this.searchDiv)
            .html(searchStringHtml)
            .append($resultsSummary, $resultsList);
        } else {
          var noResults = $('<p>').text( this.translate( 'noResultsFound', 'No results found.' ) );
          $('#' + this.searchDiv)
            .html(searchStringHtml)
            .append(noResults);
        }
      }
    }
  };

  AblePlayer.prototype.searchFor = function (searchString, ignoreCaps) {
    // return chronological array of caption cues that match searchTerms
    var captionLang, captions, results, caption, c, i, j;
    results = [];
    // split searchTerms into an array
    var searchTerms = searchString.split(" ");
    if (this.captions.length > 0) {
      // Get caption track that matches this.searchLang
      for (i = 0; i < this.captions.length; i++) {
        if (this.captions[i].language === this.searchLang) {
          captionLang = this.searchLang;
          captions = this.captions[i].cues;
        }
      }
      if (captions.length > 0) {
        c = 0;
        for (i = 0; i < captions.length; i++) {
          if (
            $.inArray(captions[i].components.children[0]["type"], [
              "string",
              "i",
              "b",
              "u",
              "v",
              "c",
            ]) !== -1
          ) {
            caption = this.flattenCueForCaption(captions[i]);
            var captionNormalized = ignoreCaps
              ? caption.toLowerCase()
              : caption;
            for (j = 0; j < searchTerms.length; j++) {
              var searchTermNormalized = ignoreCaps
                ? searchTerms[j].toLowerCase()
                : searchTerms[j];
              if (captionNormalized.indexOf(searchTermNormalized) !== -1) {
                results[c] = [];
                results[c]["start"] = captions[i].start;
                results[c]["lang"] = captionLang;
                results[c]["caption"] = this.highlightSearchTerm(
                  searchTerms,
                  caption
                );
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

  AblePlayer.prototype.highlightSearchTerm = function (
    searchTerms,
    resultString
  ) {
    // highlight ALL found searchTerms in the current resultString
    // Need to step through the remaining terms to see if they're present as well
    searchTerms.forEach(function (searchTerm) {
      var reg = new RegExp(searchTerm, "gi");
      resultString = resultString.replace(
        reg,
        '<span class="able-search-term">$&</span>'
      );
    });
    return resultString;
  };

  /**
   * Convert a number of seconds into readable time information.
   *
   * @param {int} totalSecondsFloat
   *
   * @returns {string[]} array 'value' HH:MM:SS and 'title' speakable time.
   */
  AblePlayer.prototype.secondsToTime = function (totalSecondsFloat) {
    // return an array of totalSeconds converted into two formats
    // time['value'] = HH:MM:SS with hours dropped if there are none
    // time['title'] = a speakable rendering, so speech rec users can easily speak the link
    var totalSeconds = Math.floor(totalSecondsFloat);

    var h = parseInt(totalSeconds / 3600, 10) % 24;
    var m = parseInt(totalSeconds / 60, 10) % 60;
    var s = totalSeconds % 60;
    var value = '';
    var title = '';
    if (h > 0) {
      value += String(h).padStart(2, '0') + ':';
      title += h > 0 ? h + ' ' + (h === 1 ? this.translate( 'hour', 'hour' ) : this.translate( 'hours', 'hours' ) ) : '';
    }

    value += String(m).padStart(2, '0') + ':';
    title += m > 0 ? m + ' ' + (m === 1 ? this.translate( 'minute', 'minute' ) : this.translate( 'minutes', 'minutes' ) ) : '';

	value += String(s).padStart(2, '0');
    title += s > 0 ? s + ' ' + (s === 1 ? this.translate( 'second', 'second' ) : this.translate( 'seconds', 'seconds' ) ) : '';

    var time = [];
    time["value"] = value;
    time["title"] = title;

    return time;
  };
}

export default addSearchFunctions;
