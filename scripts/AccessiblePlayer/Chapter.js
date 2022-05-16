import Misc from "./Misc.js";

export default class Chapter {


    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }

    populateChaptersDiv() {
        var headingLevel, headingType, headingId, $chaptersHeading,
            $chaptersList;
        if ($('#' + this.ablePlayer.chaptersDivLocation)) {
            this.ablePlayer.$chaptersDiv = $('#' + this.ablePlayer.chaptersDivLocation);
            this.ablePlayer.$chaptersDiv.addClass('able-chapters-div');

            // add optional header
            if (this.ablePlayer.chaptersTitle) {
                headingLevel = Misc.getNextHeadingLevel(this.ablePlayer.$chaptersDiv);
                headingType = 'h' + headingLevel.toString();
                headingId = this.ablePlayer.mediaId + '-chapters-heading';
                $chaptersHeading = $('<' + headingType + '>', {
                    'class': 'able-chapters-heading',
                    'id': headingId
                }).text(this.ablePlayer.chaptersTitle);
                this.ablePlayer.$chaptersDiv.append($chaptersHeading);
            }

            this.$chaptersNav = $('<nav>');
            if (this.ablePlayer.chaptersTitle) {
                this.ablePlayer.$chaptersNav.attr('aria-labelledby',headingId);
            }
            else {
                this.$chaptersNav.attr('aria-label',this.ablePlayer.tt.chapters);
            }
            this.ablePlayer.$chaptersDiv.append(this.ablePlayer.$chaptersNav);

            // populate this.$chaptersNav with a list of chapters
            this.updateChaptersList();
        }
    };

    updateChaptersList() {

        var thisObj, cues, $chaptersList, c, thisChapter,
            $chapterItem, $chapterButton, hasDefault,
            getClickFunction, $clickedItem, $chaptersList, thisChapterIndex;

        thisObj = this;

        if (!this.ablePlayer.$chaptersNav) {
            return false;
        }

        if (typeof this.ablePlayer.useChapterTimes === 'undefined') {
            if (this.ablePlayer.seekbarScope === 'chapter' && this.ablePlayer.selectedChapters.cues.length) {
                this.ablePlayer.useChapterTimes = true;
            }
            else {
                this.ablePlayer.useChapterTimes = false;
            }
        }

        if (this.ablePlayer.useChapterTimes) {
            cues = this.ablePlayer.selectedChapters.cues;
        }
        else if (this.ablePlayer.chapters.length >= 1) {
            cues = this.ablePlayer.chapters[0].cues;
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
                }).text(this.ablePlayer.caption.flattenCueForCaption(cues[thisChapter]));

                // add event listeners
                getClickFunction = function (time) {
                    return function () {
                        thisObj.ablePlayer.seekTrigger = 'chapter';
                        $clickedItem = $(this).closest('li');
                        $chaptersList = $(this).closest('ul').find('li');
                        thisChapterIndex = $chaptersList.index($clickedItem);
                        $chaptersList.removeClass('able-current-chapter').attr('aria-selected','');
                        $clickedItem.addClass('able-current-chapter').attr('aria-selected','true');
                        // Need to updateChapter before seeking to it
                        // Otherwise seekBar is redrawn with wrong chapterDuration and/or chapterTime
                        thisObj.ablePlayer.chapter.updateChapter(time);
                        thisObj.ablePlayer.control.seekTo(time);
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
                if (this.ablePlayer.defaultChapter === cues[thisChapter].id) {
                    $chapterButton.attr('aria-selected','true').parent('li').addClass('able-current-chapter');
                    this.ablePlayer.currentChapter = cues[thisChapter];
                    hasDefault = true;
                }
            }
            if (!hasDefault) {
                // select the first chapter
                this.ablePlayer.currentChapter = cues[0];
                $chaptersList.find('button').first().attr('aria-selected','true')
                    .parent('li').addClass('able-current-chapter');
            }
            this.ablePlayer.$chaptersNav.html($chaptersList);
        }
        return false;
    };

    // step through chapters looking for matching ID
    seekToChapter (chapterId) {
        var i=0;
        while (i < this.ablePlayer.selectedChapters.cues.length) {
            if (this.ablePlayer.selectedChapters.cues[i].id == chapterId) {
                this.ablePlayer.control.seekTo(this.ablePlayer.selectedChapters.cues[i].start);
                this.ablePlayer.chapter.updateChapter(this.ablePlayer.selectedChapters.cues[i].start);
                break;
            }
            i++;
        }
    };

    // as time-synced chapters change during playback, track changes in current chapter
    updateChapter(now) {
        if (typeof this.ablePlayer.selectedChapters === 'undefined') {
            return;
        }
        var chapters, i, thisChapterIndex;
        chapters = this.ablePlayer.selectedChapters.cues;
        for (i = 0; i < chapters.length; i++) {
            if ((chapters[i].start <= now) && (chapters[i].end > now)) {
                thisChapterIndex = i;
                break;
            }
        }
        if (typeof thisChapterIndex !== 'undefined') {
            if (this.ablePlayer.currentChapter !== chapters[thisChapterIndex]) {
                // this is a new chapter
                this.ablePlayer.currentChapter = chapters[thisChapterIndex];
                if (this.ablePlayer.useChapterTimes) {
                    this.ablePlayer.chapterDuration = this.getChapterDuration();
                    this.ablePlayer.seekIntervalCalculated = false; // will be recalculated in setSeekInterval()
                }
                if (typeof this.ablePlayer.$chaptersDiv !== 'undefined') {
                    // chapters are listed in an external container
                    this.ablePlayer.$chaptersDiv.find('ul').find('li').removeClass('able-current-chapter').attr('aria-selected','');
                    this.ablePlayer.$chaptersDiv.find('ul').find('li').eq(thisChapterIndex)
                        .addClass('able-current-chapter').attr('aria-selected','true');
                }
            }
        }
    };

    getChapterDuration () {
        var videoDuration, lastChapterIndex, chapterEnd;

        if (typeof this.ablePlayer.currentChapter === 'undefined') {
            return 0;
        }
        videoDuration = this.ablePlayer.control.getDuration();
        lastChapterIndex = this.ablePlayer.selectedChapters.cues.length - 1;

        if (this.ablePlayer.selectedChapters.cues[lastChapterIndex] == this.ablePlayer.currentChapter) {
            // this is the last chapter
            if (this.ablePlayer.currentChapter.end !== videoDuration) {
                // chapter ends before or after video ends, adjust chapter end to match video end
                chapterEnd = videoDuration;
                this.ablePlayer.currentChapter.end = videoDuration;
            } else {
                chapterEnd = this.ablePlayer.currentChapter.end;
            }
        } else { // this is not the last chapter
            chapterEnd = this.ablePlayer.currentChapter.end;
        }
        return chapterEnd - this.ablePlayer.currentChapter.start;
    };

    getChapterElapsed () {
        if (typeof this.ablePlayer.currentChapter === 'undefined') {
            return 0;
        }
        var videoDuration = this.ablePlayer.control.getDuration();
        var videoElapsed = this.ablePlayer.control.getElapsed();
        if (videoElapsed > this.ablePlayer.currentChapter.start) {
            return videoElapsed - this.ablePlayer.currentChapter.start;
        } else {
            return 0;
        }
    };

    convertChapterTimeToVideoTime(chapterTime) {

        // chapterTime is the time within the current chapter
        // return the same time, relative to the entire video
        if (typeof this.ablePlayer.currentChapter !== 'undefined') {
            var newTime = this.ablePlayer.currentChapter.start + chapterTime;
            if (newTime > this.ablePlayer.currentChapter.end) {
                return this.ablePlayer.currentChapter.end;
            }
            else {
                return newTime;
            }
        }
        else {
            return chapterTime;
        }
    };

    //to delete
    // Returns the function used when a chapter is clicked in the chapters menu.
    getChapterClickFunction (time) {
        var thisObj = this;
        return () => {
            this.ablePlayer.seekTrigger = 'chapter';
            this.ablePlayer.control.seekTo(time);
            this.ablePlayer.hidingPopup = true;
            this.ablePlayer.chaptersPopup.hide();
            setTimeout(() => {
                this.ablePlayer.hidingPopup = false;
            }, 100);
            this.ablePlayer.$chaptersButton.focus();
        }
    };


}