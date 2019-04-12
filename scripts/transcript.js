(function ($) {

	AblePlayer.prototype.setupTranscript = function() {

		var deferred = new $.Deferred();
		var promise = deferred.promise();

		if (!this.transcriptType) {
			// previously set transcriptType to null since there are no <track> elements
			// check again to see if captions have been collected from other sources (e.g., YouTube)
			if (this.captions.length && (!(this.usingYouTubeCaptions || this.usingVimeoCaptions))) {
				// captions are possible! Use the default type (popup)
				// if other types ('external' and 'manual') were desired, transcriptType would not be null here
				this.transcriptType = 'popup';
			}
		}

		if (this.transcriptType) {
			if (this.transcriptType === 'popup' || this.transcriptType === 'external') {
				 this.injectTranscriptArea();
		 			deferred.resolve();
			}
			else if (this.transcriptType === 'manual') {
				this.setupManualTranscript();
				deferred.resolve();
			}
		}
		else {
			// there is no transcript
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.injectTranscriptArea = function() {

		var thisObj, $autoScrollLabel, $languageSelectWrapper, $languageSelectLabel, i, $option;

		thisObj = this;
		this.$transcriptArea = $('<div>', {
			'class': 'able-transcript-area',
			'tabindex': '-1'
		});

		this.$transcriptToolbar = $('<div>', {
			'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
		});

		this.$transcriptDiv = $('<div>', {
			'class' : 'able-transcript'
		});

		// Transcript toolbar content

		// Add auto Scroll checkbox
		this.$autoScrollTranscriptCheckbox = $('<input>', {
		 	'id': 'autoscroll-transcript-checkbox',
		 	'type': 'checkbox'
		 });
		$autoScrollLabel = $('<label>', {
			 'for': 'autoscroll-transcript-checkbox'
			}).text(this.tt.autoScroll);
		this.$transcriptToolbar.append($autoScrollLabel,this.$autoScrollTranscriptCheckbox);

		// Add field for selecting a transcript language
		// Only necessary if there is more than one language
		if (this.captions.length > 1) {
			$languageSelectWrapper = $('<div>',{
				'class': 'transcript-language-select-wrapper'
			});
			$languageSelectLabel = $('<label>',{
				'for': 'transcript-language-select'
			}).text(this.tt.language);
			this.$transcriptLanguageSelect = $('<select>',{
				'id': 'transcript-language-select'
			});
			for (i=0; i < this.captions.length; i++) {
				$option = $('<option></option>',{
					value: this.captions[i]['language'],
					lang: this.captions[i]['language']
				}).text(this.captions[i]['label']);
				if (this.captions[i]['def']) {
				 	$option.prop('selected',true);
				 }
				this.$transcriptLanguageSelect.append($option);
			 }
		}
		if ($languageSelectWrapper) {
			$languageSelectWrapper.append($languageSelectLabel,this.$transcriptLanguageSelect);
			this.$transcriptToolbar.append($languageSelectWrapper);
		}
		this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);

		// If client has provided separate transcript location, put it there.
		// Otherwise append it to the body
		if (this.transcriptDivLocation) {
			$('#' + this.transcriptDivLocation).append(this.$transcriptArea);
		}
		else {
			this.$ableWrapper.append(this.$transcriptArea);
		}

		// make it draggable (popup only; NOT external transcript)
		if (!this.transcriptDivLocation) {
			this.initDragDrop('transcript');
			if (this.prefTranscript === 1) {
				// transcript is on. Go ahead and position it
				this.positionDraggableWindow('transcript',this.getDefaultWidth('transcript'));
			}
		}

		// If client has provided separate transcript location, override user's preference for hiding transcript
		if (!this.prefTranscript && !this.transcriptDivLocation) {
			this.$transcriptArea.hide();
		}
	};

	AblePlayer.prototype.addTranscriptAreaEvents = function() {

		var thisObj = this;

		this.$autoScrollTranscriptCheckbox.click(function () {
			thisObj.handleTranscriptLockToggle(thisObj.$autoScrollTranscriptCheckbox.prop('checked'));
		});

		this.$transcriptDiv.on('mousewheel DOMMouseScroll click scroll', function (e) {
			// Propagation is stopped in transcript click handler, so clicks are on the scrollbar
			// or outside of a clickable span.
			if (!thisObj.scrollingTranscript) {
				thisObj.autoScrollTranscript = false;
				thisObj.refreshControls('transcript');
			}
			thisObj.scrollingTranscript = false;
		});

		if (typeof this.$transcriptLanguageSelect !== 'undefined') {

			this.$transcriptLanguageSelect.on('click mousedown',function (e) {
				// execute default behavior
				// prevent propagation of mouse event to toolbar or window
				e.stopPropagation();
			});

			this.$transcriptLanguageSelect.on('change',function () {

				var language = thisObj.$transcriptLanguageSelect.val();

				thisObj.syncTrackLanguages('transcript',language);
			});
		}
	};

	AblePlayer.prototype.transcriptSrcHasRequiredParts = function() {

		// check the external transcript to be sure it has all required components
		// return true or false
		// in the process, define all the needed variables and properties

		if ($('#' + this.transcriptSrc).length) {
			this.$transcriptArea = $('#' + this.transcriptSrc);
			if (this.$transcriptArea.find('.able-window-toolbar').length) {
				this.$transcriptToolbar = this.$transcriptArea.find('.able-window-toolbar').eq(0);
				if (this.$transcriptArea.find('.able-transcript').length) {
					this.$transcriptDiv = this.$transcriptArea.find('.able-transcript').eq(0);
					if (this.$transcriptArea.find('.able-transcript-seekpoint').length) {
						this.$transcriptSeekpoints = this.$transcriptArea.find('.able-transcript-seekpoint');
						return true;
					}
				}
			}
		}
		return false;
	}

	AblePlayer.prototype.setupManualTranscript = function() {

		// Add an auto-scroll checkbox to the toolbar

		this.$autoScrollTranscriptCheckbox = $('<input id="autoscroll-transcript-checkbox" type="checkbox">');
		this.$transcriptToolbar.append($('<label for="autoscroll-transcript-checkbox">' + this.tt.autoScroll + ': </label>'), this.$autoScrollTranscriptCheckbox);

	};

	AblePlayer.prototype.updateTranscript = function() {

		if (!this.transcriptType) {
			return;
		}

		if (this.transcriptType === 'external' || this.transcriptType === 'popup') {

			var chapters, captions, descriptions;

			// Language of transcript might be different than language of captions
			// But both are in sync by default
			if (this.transcriptLang) {
				captions = this.transcriptCaptions.cues;
			}
			else {
				if (this.transcriptCaptions) {
					this.transcriptLang = this.transcriptCaptions.language;
					captions = this.transcriptCaptions.cues;
				}
				else if (this.selectedCaptions) {
					this.transcriptLang = this.captionLang;
					captions = this.selectedCaptions.cues;
				}
			}

			// setup chapters
			if (this.transcriptChapters) {
				chapters = this.transcriptChapters.cues;
			}
			else if (this.chapters.length > 0) {
				// Try and match the caption language.
				if (this.transcriptLang) {
					for (var i = 0; i < this.chapters.length; i++) {
						if (this.chapters[i].language === this.transcriptLang) {
							chapters = this.chapters[i].cues;
						}
					}
				}
				if (typeof chapters === 'undefined') {
					chapters = this.chapters[0].cues || [];
				}
			}

			// setup descriptions
			if (this.transcriptDescriptions) {
				descriptions = this.transcriptDescriptions.cues;
			}
			else if (this.descriptions.length > 0) {
				// Try and match the caption language.
				if (this.transcriptLang) {
					for (var i = 0; i < this.descriptions.length; i++) {
						if (this.descriptions[i].language === this.transcriptLang) {
							descriptions = this.descriptions[i].cues;
						}
					}
				}
				if (!descriptions) {
					descriptions = this.descriptions[0].cues || [];
				}
			}

			var div = this.generateTranscript(chapters || [], captions || [], descriptions || []);

			this.$transcriptDiv.html(div);
			// reset transcript selected <option> to this.transcriptLang
			if (this.$transcriptLanguageSelect) {
				this.$transcriptLanguageSelect.find('option:selected').prop('selected',false);
				this.$transcriptLanguageSelect.find('option[lang=' + this.transcriptLang + ']').prop('selected',true);
			}
		}

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
			this.$transcriptArea.find('span.able-transcript-seekpoint').click(function(e) {
				thisObj.seekTrigger = 'transcript';
				var spanStart = parseFloat($(this).attr('data-start'));
				// Add a tiny amount so that we're inside the span.
				spanStart += .01;
				// Each click within the transcript triggers two click events (not sure why)
				// this.seekingFromTranscript is a stopgab to prevent two calls to SeekTo()
				if (!thisObj.seekingFromTranscript) {
					thisObj.seekingFromTranscript = true;
					thisObj.seekTo(spanStart);
				}
				else {
					// don't seek a second time, but do reset var
					thisObj.seekingFromTranscript = false;
				}
			});
		}
	};

	AblePlayer.prototype.highlightTranscript = function (currentTime) {

		//show highlight in transcript marking current caption

		if (!this.transcriptType) {
			return;
		}

		var start, end, isChapterHeading;
		var thisObj = this;

		currentTime = parseFloat(currentTime);

		// Highlight the current transcript item.
		this.$transcriptArea.find('span.able-transcript-seekpoint').each(function() {
			start = parseFloat($(this).attr('data-start'));
			end = parseFloat($(this).attr('data-end'));
			// be sure this isn't a chapter (don't highlight chapter headings)
			if ($(this).parent().hasClass('able-transcript-chapter-heading')) {
				isChapterHeading = true;
			}
			else {
				isChapterHeading = false;
			}

			if (currentTime >= start && currentTime <= end && !isChapterHeading) {
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
		var transcriptTitle;

		// set language for transcript container
		$main.attr('lang', this.transcriptLang);

		if (typeof this.transcriptTitle !== 'undefined') {
			transcriptTitle = this.transcriptTitle;
		}
		else if (this.lyricsMode) {
			transcriptTitle = this.tt.lyricsTitle;
		}
		else {
			transcriptTitle = this.tt.transcriptTitle;
		}

		if (typeof this.transcriptDivLocation === 'undefined') {
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

			// set language of transcript heading to language of player
			// this is independent of language of transcript
			$transcriptHeadingTag.attr('lang', this.lang);

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
					for (var i = 0; i < comp.children.length; i++) {
						result = result.concat(flattenComponentForChapter(comp.children[i]));
					}
				}
				return result;
			}

			var $chapSpan = $('<span>',{
				'class': 'able-transcript-seekpoint'
			});
			for (var i = 0; i < chap.components.children.length; i++) {
				var results = flattenComponentForChapter(chap.components.children[i]);
				for (var jj = 0; jj < results.length; jj++) {
					$chapSpan.append(results[jj]);
				}
			}
			$chapSpan.attr('data-start', chap.start.toString());
			$chapSpan.attr('data-end', chap.end.toString());
			$chapterHeadingTag.append($chapSpan);

			div.append($chapterHeadingTag);
		};

		var addDescription = function(div, desc) {
			var $descDiv = $('<div>', {
				'class': 'able-transcript-desc'
			});
			var $descHiddenSpan = $('<span>',{
				'class': 'able-hidden'
			});
			$descHiddenSpan.attr('lang', thisObj.lang);
			$descHiddenSpan.text(thisObj.tt.prefHeadingDescription + ': ');
			$descDiv.append($descHiddenSpan);

			var flattenComponentForDescription = function(comp) {

				var result = [];
				if (comp.type === 'string') {
					result.push(comp.value);
				}
				else {
					for (var i = 0; i < comp.children.length; i++) {
						result = result.concat(flattenComponentForDescription(comp.children[i]));
					}
				}
				return result;
			}

			var $descSpan = $('<span>',{
				'class': 'able-transcript-seekpoint'
			});
			for (var i = 0; i < desc.components.children.length; i++) {
				var results = flattenComponentForDescription(desc.components.children[i]);
				for (var jj = 0; jj < results.length; jj++) {
					$descSpan.append(results[jj]);
				}
			}
			$descSpan.attr('data-start', desc.start.toString());
			$descSpan.attr('data-end', desc.end.toString());
			$descDiv.append($descSpan);

			div.append($descDiv);
		};

		var addCaption = function(div, cap) {

			var $capSpan = $('<span>',{
				'class': 'able-transcript-seekpoint able-transcript-caption'
			});

			var flattenComponentForCaption = function(comp) {

				var result = [];

				var parts = 0;

				var flattenString = function (str) {

					parts++;

					var flatStr;
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

					if (hasParens || hasBrackets) {
						if (parts > 1) {
							// force a line break between sections that contain parens or brackets
							var silentSpanBreak = '<br/>';
						}
						else {
							var silentSpanBreak = '';
						}
						var silentSpanOpen = silentSpanBreak + '<span class="able-unspoken">';
						var silentSpanClose = '</span>';
						if (hasParens && hasBrackets) {
							// string has both!
							if (openBracket < openParen) {
								// brackets come first. Parse parens separately
								hasParens = false;
							}
							else {
								// parens come first. Parse brackets separately
								hasBrackets = false;
							}
						}
					}
					if (hasParens) {
						flatStr = str.substring(0, openParen);
						flatStr += silentSpanOpen;
						flatStr += str.substring(openParen, closeParen + 1);
						flatStr += silentSpanClose;
						flatStr += flattenString(str.substring(closeParen + 1));
						result.push(flatStr);
					}
					else if (hasBrackets) {
						flatStr = str.substring(0, openBracket);
						flatStr += silentSpanOpen;
						flatStr += str.substring(openBracket, closeBracket + 1);
						flatStr += silentSpanClose;
						flatStr += flattenString(str.substring(closeBracket + 1));
						result.push(flatStr);
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
					var $vSpan = $('<span>',{
						'class': 'able-unspoken'
					});
					$vSpan.text('(' + comp.value + ')');
					result.push($vSpan);
					for (var i = 0; i < comp.children.length; i++) {
						var subResults = flattenComponentForCaption(comp.children[i]);
						for (var jj = 0; jj < subResults.length; jj++) {
							result.push(subResults[jj]);
						}
					}
				}
				else if (comp.type === 'b' || comp.type === 'i') {
					if (comp.type === 'b') {
						var $tag = $('<strong>');
					}
					else if (comp.type === 'i') {
						var $tag = $('<em>');
					}
					for (var i = 0; i < comp.children.length; i++) {
						var subResults = flattenComponentForCaption(comp.children[i]);
						for (var jj = 0; jj < subResults.length; jj++) {
							$tag.append(subResults[jj]);
						}
					}
					if (comp.type === 'b' || comp.type == 'i') {
						result.push($tag,' ');
					}
				}
				else {
					for (var i = 0; i < comp.children.length; i++) {
						result = result.concat(flattenComponentForCaption(comp.children[i]));
					}
				}
				return result;
			};

			for (var i = 0; i < cap.components.children.length; i++) {
				var results = flattenComponentForCaption(cap.components.children[i]);
				for (var jj = 0; jj < results.length; jj++) {
					var result = results[jj];
					if (typeof result === 'string') {
						if (thisObj.lyricsMode) {
							// add <br> BETWEEN each caption and WITHIN each caption (if payload includes "\n")
							result = result.replace('\n','<br>') + '<br>';
						}
						else {
							// just add a space between captions
							result += ' ';
						}
					}
					$capSpan.append(result);
				}
			}
			$capSpan.attr('data-start', cap.start.toString());
			$capSpan.attr('data-end', cap.end.toString());
			div.append($capSpan);
			div.append(' \n');
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
					addChapter($main, chapters[nextChapter]);
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
		// organize transcript into blocks using [] and () as starting points
		var $components = $main.children();
		var spanCount = 0;
		var openBlock = true;
		$components.each(function() {
			if ($(this).hasClass('able-transcript-caption')) {
				if ($(this).text().indexOf('[') !== -1 || $(this).text().indexOf('(') !== -1) {
					// this caption includes a bracket or parenth. Start a new block
					// close the previous block first
					if (spanCount > 0) {
						$main.find('.able-block-temp').removeClass('able-block-temp').wrapAll('<div class="able-transcript-block"></div>');
						spanCount = 0;
					}
				}
				$(this).addClass('able-block-temp');
				spanCount++;
			}
			else {
				// this is not a caption. Close the caption block
				if (spanCount > 0) {
					$main.find('.able-block-temp').removeClass('able-block-temp').wrapAll('<div class="able-transcript-block"></div>');
					spanCount = 0;
				}
			}
		});
		return $main;
	};

})(jQuery);
