(function ($) {

	AblePlayer.prototype.populateChaptersDiv = function() {

		var headingLevel, headingType, headingId, $chaptersHeading,
			$chaptersList;

		if ($('#' + this.chaptersDivLocation)) {
			this.$chaptersDiv = $('#' + this.chaptersDivLocation);
			this.$chaptersDiv.addClass('able-chapters-div');

			// add optional header
			if (this.chaptersTitle) {
				headingLevel = this.getNextHeadingLevel(this.$chaptersDiv);
				headingType = 'h' + headingLevel.toString();
				headingId = this.mediaId + '-chapters-heading';
				$chaptersHeading = $('<' + headingType + '>', {
					'class': 'able-chapters-heading',
					'id': headingId
				}).text(this.chaptersTitle);
				this.$chaptersDiv.append($chaptersHeading);
			}

			this.$chaptersNav = $('<nav>');
			if (this.chaptersTitle) {
				this.$chaptersNav.attr('aria-labelledby',headingId);
			}
			else {
				this.$chaptersNav.attr('aria-label',this.tt.chapters);
			}
			this.$chaptersDiv.append(this.$chaptersNav);

			// populate this.$chaptersNav with a list of chapters
			this.updateChaptersList();
		}
	};

	AblePlayer.prototype.updateChaptersList = function() {

		var thisObj, cues, $chaptersList, c, thisChapter,
			$chapterItem, $chapterButton, buttonId, hasDefault,
			getClickFunction, $clickedItem, $chaptersList, thisChapterIndex;

		thisObj = this;

		if (!this.$chaptersNav) {
			return false;
		}

		if (typeof this.useChapterTimes === 'undefined') {
			if (this.seekbarScope === 'chapter' && this.selectedChapters.cues.length) {
				this.useChapterTimes = true;
			}
			else {
				this.useChapterTimes = false;
			}
		}

		if (this.useChapterTimes) {
			cues = this.selectedChapters.cues;
		}
		else if (this.chapters.length >= 1) {
			cues = this.chapters[0].cues;
		}
		else {
			cues = [];
		}
		if (cues.length > 0) {
			$chaptersList = $('<ul>');
			for (c = 0; c < cues.length; c++) {
				thisChapter = c;
				$chapterItem = $('<li></li>');
				$chapterButton = $('<button>',{
					'type': 'button',
					'val': thisChapter
				}).text(this.flattenCueForCaption(cues[thisChapter]));

				// add event listeners
				getClickFunction = function (time) {
					return function () {
						thisObj.seekTrigger = 'chapter';
						$clickedItem = $(this).closest('li');
						$chaptersList = $(this).closest('ul').find('li');
						thisChapterIndex = $chaptersList.index($clickedItem);
						$chaptersList.removeClass('able-current-chapter').attr('aria-selected','');
						$clickedItem.addClass('able-current-chapter').attr('aria-selected','true');
						// Need to updateChapter before seeking to it
						// Otherwise seekBar is redrawn with wrong chapterDuration and/or chapterTime
						thisObj.updateChapter(time);
						thisObj.seekTo(time);
					}
				};
				$chapterButton.on('click',getClickFunction(cues[thisChapter].start)); // works with Enter too
				$chapterButton.on('focus',function() {
					$(this).closest('ul').find('li').removeClass('able-focus');
					$(this).closest('li').addClass('able-focus');
				});
				$chapterItem.on('hover',function() {
					$(this).closest('ul').find('li').removeClass('able-focus');
					$(this).addClass('able-focus');
				});
				$chapterItem.on('mouseleave',function() {
					$(this).removeClass('able-focus');
				});
				$chapterButton.on('blur',function() {
					$(this).closest('li').removeClass('able-focus');
				});

				// put it all together
				$chapterItem.append($chapterButton);
				$chaptersList.append($chapterItem);
				if (this.defaultChapter === cues[thisChapter].id) {
					$chapterButton.attr('aria-selected','true').parent('li').addClass('able-current-chapter');
					this.currentChapter = cues[thisChapter];
					hasDefault = true;
				}
			}
			if (!hasDefault) {
				// select the first chapter
				this.currentChapter = cues[0];
				$chaptersList.find('button').first().attr('aria-selected','true')
					.parent('li').addClass('able-current-chapter');
			}
			this.$chaptersNav.html($chaptersList);
		}
		return false;
	};

	AblePlayer.prototype.seekToChapter = function(chapterId) {

		// step through chapters looking for matching ID
		var i=0;
		while (i < this.selectedChapters.cues.length) {
			if (this.selectedChapters.cues[i].id == chapterId) {
				// found the target chapter! Seek to it
				this.seekTo(this.selectedChapters.cues[i].start);
				this.updateChapter(this.selectedChapters.cues[i].start);
				break;
			}
			i++;
		}
	};

	AblePlayer.prototype.updateChapter = function (now) {

		// as time-synced chapters change during playback, track changes in current chapter
		if (typeof this.selectedChapters === 'undefined') {
			return;
		}

		var chapters, i, thisChapterIndex, chapterLabel;

		chapters = this.selectedChapters.cues;
		for (i = 0; i < chapters.length; i++) {
			if ((chapters[i].start <= now) && (chapters[i].end > now)) {
				thisChapterIndex = i;
				break;
			}
		}
		if (typeof thisChapterIndex !== 'undefined') {
			if (this.currentChapter !== chapters[thisChapterIndex]) {
				// this is a new chapter
				this.currentChapter = chapters[thisChapterIndex];
				if (this.useChapterTimes) {
					this.chapterDuration = this.getChapterDuration();
					this.seekIntervalCalculated = false; // will be recalculated in setSeekInterval()
				}
				if (typeof this.$chaptersDiv !== 'undefined') {
					// chapters are listed in an external container
					this.$chaptersDiv.find('ul').find('li').removeClass('able-current-chapter').attr('aria-selected','');
					this.$chaptersDiv.find('ul').find('li').eq(thisChapterIndex)
						.addClass('able-current-chapter').attr('aria-selected','true');
				}
			}
		}
	};

	AblePlayer.prototype.getChapterDuration = function () {

		// called if this.seekbarScope === 'chapter'
		// get duration of the current chapter

		var lastChapterIndex, chapterEnd;

		if (typeof this.currentChapter === 'undefined') {
			return 0;
		}
		if (typeof this.duration === 'undefined') {
			return 0;
		}
		lastChapterIndex = this.selectedChapters.cues.length-1;
		if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
			// this is the last chapter
			if (this.currentChapter.end !== this.duration) {
				// chapter ends before or after video ends, adjust chapter end to match video end
				chapterEnd = this.duration;
				this.currentChapter.end = this.duration;
			}
			else {
				chapterEnd = this.currentChapter.end;
			}
		}
		else { // this is not the last chapter
			chapterEnd = this.currentChapter.end;
		}
		return chapterEnd - this.currentChapter.start;
	};

	AblePlayer.prototype.getChapterElapsed = function () {
		// called if this.seekbarScope === 'chapter'
		// get current elapsed time, relative to the current chapter duration

		if (typeof this.currentChapter === 'undefined') {
			return 0;
		}

		if (this.elapsed > this.currentChapter.start) {
			return this.elapsed - this.currentChapter.start;
		}
		else {
			return 0;
		}
	};

	AblePlayer.prototype.convertChapterTimeToVideoTime = function (chapterTime) {

		// chapterTime is the time within the current chapter
		// return the same time, relative to the entire video
		if (typeof this.currentChapter !== 'undefined') {
			var newTime = this.currentChapter.start + chapterTime;
			if (newTime > this.currentChapter.end) {
				return this.currentChapter.end;
			}
			else {
				return newTime;
			}
		}
		else {
			return chapterTime;
		}
	};

	AblePlayer.prototype.getChapterClickFunction = function (time) {

		// Returns the function used when a chapter is clicked in the chapters menu.
		var thisObj = this;
		return function () {
			thisObj.seekTrigger = 'chapter';
			thisObj.seekTo(time);
			// stopgap to prevent spacebar in Firefox from reopening popup
			// immediately after closing it (used in handleChapters())
			thisObj.hidingPopup = true;
			thisObj.chaptersPopup.hide();
			// Ensure stopgap gets cancelled if handleChapters() isn't called
			// e.g., if user triggered button with Enter or mouse click, not spacebar
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.$chaptersButton.focus();
		}
	};

})(jQuery);
