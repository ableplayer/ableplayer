(function ($) {
  AblePlayer.prototype.updateMeta = function (time) {
    if (this.hasMeta) {
      if (this.metaType === 'text') {
        this.$metaDiv.show();
        this.showMeta(time || this.getElapsed());
      }
      else { 
        this.showMeta(time || this.getElapsed());
      }
    }
  };

  AblePlayer.prototype.showMeta = function(now) { 
    var m, thisMeta, cues, cueText, cueLines, i, line; 
    if (this.meta.length >= 1) {
      cues = this.meta;
    }
    else {
      cues = [];
    }
    for (m in cues) {
      if ((cues[m].start <= now) && (cues[m].end > now)) {      
        thisMeta = m;
        break;
      }
    }
    if (typeof thisMeta !== 'undefined') { 
      if (this.currentMeta !== thisMeta) {
        if (this.metaType === 'text') {
          // it's time to load the new metadata cue into the container div 
          this.$metaDiv.html(this.flattenCueForMeta(cues[thisMeta]).replace('\n', '<br>'));
        }
        else if (this.metaType === 'selector') { 
          // it's time to show content referenced by the designated selector(s)
          cueText = this.flattenCueForMeta(cues[thisMeta]);
          cueLines = cueText.split('\n');
          for (i=0; i<cueLines.length; i++) { 
            line = $.trim(cueLines[i]);
            if (line.toLowerCase() === 'pause') { 
              this.pauseMedia();             
            }
            else { 
              if ($(line).length) { 
                // selector exists 
                $(line).show();
                // add to array of visible selectors so it can be hidden at end time 
                this.visibleSelectors.push(line); 
              }
            }
          }
        }
        this.currentMeta = thisMeta;
      } 
    }
    else {
      if (typeof this.$metaDiv !== 'undefined') { 
        this.$metaDiv.html('');
      }
      if (this.visibleSelectors.length) { 
        for (i=0; i<this.visibleSelectors.length; i++) { 
          $(this.visibleSelectors[i]).hide(); 
        }
        // reset array
        this.visibleSelectors = [];     
      }
      this.currentMeta = -1;
    } 
  };

  // Takes a cue and returns the metadata text to display for it.
  AblePlayer.prototype.flattenCueForMeta = function (cue) {
    var result = [];

    var flattenComponent = function (component) {
      var result = [];
      if (component.type === 'string') {
        result.push(component.value);
      }
      else if (component.type === 'v') {
        result.push('[' + component.value + ']');
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      else {
        for (var ii in component.children) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join('');
    }
    
    for (var ii in cue.components.children) {
      result.push(flattenComponent(cue.components.children[ii]));
    }
    
    return result.join('');
  };

})(jQuery);
