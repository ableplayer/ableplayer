(function ($) {
  AblePlayer.prototype.updateMeta = function (time) {
    if (this.hasMeta) {
      this.$metaDiv.show();
      this.showMeta(time || this.getElapsed());
    }
  };

  AblePlayer.prototype.showMeta = function(now) { 
    var m, thisMeta, cues; 
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
        // it's time to load the new metadata cue into the container div 
        this.$metaDiv.html(this.flattenCueForMeta(cues[thisMeta]).replace('\n', '<br>'));
        this.currentMeta = thisMeta;
      } 
    }
    else {     
      this.$metaDiv.html('');
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
