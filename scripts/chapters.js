(function ($) {
  AblePlayer.prototype.seekToDefaultChapter = function() {
    // this function is only called if this.defaultChapter is not null
    // step through chapters looking for default
    var i=0;
    while (i < this.chapters.length) {
      if (this.chapters[i].id === this.defaultChapter) {
        // found the default chapter! Seek to it
        this.seekTo(this.chapters[i].start);
      }
      i++;
    }
  };

  AblePlayer.prototype.updateChapter = function (now) {

    // as time-synced chapters change during playback, track changes in current chapter

    if (typeof this.chapters === 'undefined') {
      return;
    }

    var chapters, i, thisChapterIndex, chapterLabel;

    chapters = this.chapters;
    for (i in chapters) {
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
        // announce new chapter via ARIA alert
        chapterLabel = this.tt.newChapter + ': ' + this.flattenCueForCaption(this.currentChapter);
        this.showAlert(chapterLabel,'screenreader');
      }
    }
  };

  AblePlayer.prototype.getChapterDuration = function () {

    // called if this.seekbarScope === 'chapter'
    // get duration of the current chapter

    var videoDuration, lastChapterIndex, chapterEnd;

    if (typeof this.currentChapter === 'undefined') {
      return duration;
    }
    videoDuration = this.getDuration();
    lastChapterIndex = this.chapters.length-1;
    if (this.chapters[lastChapterIndex] == this.currentChapter) {
      // this is the last chapter
      if (this.currentChapter.end !== videoDuration) {
        // chapter ends before or after video ends, adjust chapter end to match video end
        chapterEnd = videoDuration;
        this.currentChapter.end = videoDuration;
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
      return elapsed;
    }
    var videoDuration = this.getDuration();
    var videoElapsed = this.getElapsed();
    if (videoElapsed > this.currentChapter.start) {
      return videoElapsed - this.currentChapter.start;
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

})(jQuery);
