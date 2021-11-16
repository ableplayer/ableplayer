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
				var searchStringHtml = '<p>' + this.tt.resultsSummary1 + ' ';
					searchStringHtml += '<span id="able-search-term-echo">' + this.searchString + '</span>';
					searchStringHtml += '</p>';
				var resultsArray = this.searchFor(this.searchString, this.searchIgnoreCaps);
				if (resultsArray.length > 0) {
					var $resultsSummary = $('<p>',{
						'class': 'able-search-results-summary'
					});
					var resultsSummaryText = this.tt.resultsSummary2;
					resultsSummaryText += ' <strong>' + resultsArray.length + '</strong> ';
					resultsSummaryText += this.tt.resultsSummary3 + ' ';
					resultsSummaryText += this.tt.resultsSummary4;
					$resultsSummary.html(resultsSummaryText);
					var $resultsList = $('<ul>');
					for (var i = 0; i < resultsArray.length; i++) {
						var resultId = 'aria-search-result-' + i;
						var $resultsItem = $('<li>',{});
						var itemStartTime = this.secondsToTime(resultsArray[i]['start']);
						var itemLabel = this.tt.searchButtonLabel + ' ' + itemStartTime['title'];
						var itemStartSpan = $('<button>',{
							'class': 'able-search-results-time',
							'data-start': resultsArray[i]['start'],
							'title': itemLabel,
							'aria-label': itemLabel,
							'aria-describedby': resultId
						});
						itemStartSpan.text(itemStartTime['value']);
						// add a listener for clisk on itemStart
						itemStartSpan.on('click',function(e) {
							thisObj.seekTrigger = 'search';
							var spanStart = parseFloat($(this).attr('data-start'));
							// Add a tiny amount so that we're inside the span.
							spanStart += .01;
							thisObj.seeking = true;
							thisObj.seekTo(spanStart);
						});

						var itemText = $('<span>',{
							'class': 'able-search-result-text',
							'id': resultId
						})
						itemText.html('...' + resultsArray[i]['caption'] + '...');
						$resultsItem.append(itemStartSpan, itemText);
						$resultsList.append($resultsItem);
					}
					$('#' + this.searchDiv).html(searchStringHtml).append($resultsSummary,$resultsList);
				}
				else {
					var noResults = $('<p>').text(this.tt.noResultsFound);
					$('#' + this.searchDiv).html(searchStringHtml).append(noResults);
				}
			}
		}
	};

	AblePlayer.prototype.searchFor = function(searchString, ignoreCaps) {

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
						var captionNormalized = ignoreCaps ? caption.toLowerCase() : caption;
						for (j = 0; j < searchTerms.length; j++) {
							var searchTermNormalized = ignoreCaps ? searchTerms[j].toLowerCase() : searchTerms[j];
							if (captionNormalized.indexOf(searchTermNormalized) !== -1) {
								results[c] = [];
								results[c]['start'] = captions[i].start;
								results[c]['lang'] = captionLang;
								results[c]['caption'] = this.highlightSearchTerm(searchTerms,caption);
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

	AblePlayer.prototype.highlightSearchTerm = function(searchTerms, resultString) {
		// highlight ALL found searchTerms in the current resultString
		// Need to step through the remaining terms to see if they're present as well
		searchTerms.forEach(function(searchTerm) {
			var reg = new RegExp(searchTerm, 'gi');
			resultString = resultString.replace(reg, '<span class="able-search-term">$&</span>');
		});
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
			if (hours == 1) {
				title += '1 ' + this.tt.hour + ' ';
			}
			else {
				title += hours + ' ' + this.tt.hours + ' ';
			}
		}
		if (minutes < 10) {
			value += '0' + minutes + ':';
			if (minutes > 0) {
				if (minutes == 1) {
					title += '1 ' + this.tt.minute + ' ';
				}
				else {
					title += minutes + ' ' + this.tt.minutes + ' ';
				}
			}
		}
		else {
			value += minutes + ':';
			title += minutes + ' ' + this.tt.minutes + ' ';
		}
		if (seconds < 10) {
			value += '0' + seconds;
			if (seconds > 0) {
				if (seconds == 1) {
					title += '1 ' + this.tt.second + ' ';
				}
				else {
					title += seconds + ' ' + this.tt.seconds + ' ';
				}
			}
		}
		else {
			value += seconds;
			title += seconds + ' ' + this.tt.seconds + ' ';
		}
		var time = [];
		time['value'] = value;
		time['title'] = title;
		return time;
	};
})(jQuery);
