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

  AblePlayer.prototype.updateChapter = function(now) {

    // as time-synced chapters change during playback, update external container

    if (typeof this.$chaptersDiv === 'undefined') {
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
        this.$chaptersDiv.find('ul').find('li').removeClass('able-current-chapter').attr('aria-selected','');
        this.$chaptersDiv.find('ul').find('li').eq(thisChapterIndex)
          .addClass('able-current-chapter').attr('aria-selected','true');
        this.currentChapter = chapters[thisChapterIndex];
        chapterLabel = this.tt.newChapter + ': ' + this.flattenCueForCaption(this.currentChapter);
        this.showAlert(chapterLabel,'screenreader');
      }
    }
  };

})(jQuery);
