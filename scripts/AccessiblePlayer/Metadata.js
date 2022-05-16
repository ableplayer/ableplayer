export default class Metadata{

    setAblePlayer( ablePlayer ){
        this.ablePlayer = ablePlayer;
        return this;
    }


    updateMeta (time) {
        if (this.ablePlayer.hasMeta) {
            if (this.ablePlayer.metaType === 'text') {
                this.ablePlayer.$metaDiv.show();
                this.showMeta(time || this.ablePlayer.control.getElapsed());
            }
            else {
                this.showMeta(time || this.ablePlayer.control.getElapsed() );
            }
        }
    };

    showMeta (now) {
        var tempSelectors, m, thisMeta,
            cues, cueText, cueLines, i, line,
            showDuration, focusTarget;

        tempSelectors = [];
        if (this.ablePlayer.meta.length >= 1) {
            cues = this.ablePlayer.meta;
        }
        else {
            cues = [];
        }
        for (m = 0; m < cues.length; m++) {
            if ((cues[m].start <= now) && (cues[m].end > now)) {
                thisMeta = m;
                break;
            }
        }
        if (typeof thisMeta !== 'undefined') {
            if (this.ablePlayer.currentMeta !== thisMeta) {
                if (this.ablePlayer.metaType === 'text') {
                    // it's time to load the new metadata cue into the container div
                    this.ablePlayer.$metaDiv.html(this.flattenCueForMeta(cues[thisMeta]).replace('\n', '<br>'));
                }
                else if (this.ablePlayer.metaType === 'selector') {
                    // it's time to show content referenced by the designated selector(s)
                    cueText = this.flattenCueForMeta(cues[thisMeta]);
                    cueLines = cueText.split('\n');
                    for (i=0; i<cueLines.length; i++) {
                        line = $.trim(cueLines[i]);
                        if (line.toLowerCase().trim() === 'pause') {
                            // don't show big play button when pausing via metadata
                            this.ablePlayer.hideBigPlayButton = true;
                            this.ablePlayer.control.pauseMedia();
                        }
                        else if (line.toLowerCase().substring(0,6) == 'focus:') {
                            focusTarget = line.substring(6).trim();
                            if ($(focusTarget).length) {
                                $(focusTarget).focus();
                            }
                        }
                        else {
                            if ($(line).length) {
                                // selector exists
                                showDuration = parseInt($(line).attr('data-duration'));
                                if (typeof showDuration !== 'undefined' && !isNaN(showDuration)) {
                                    $(line).show().delay(showDuration).fadeOut();
                                }
                                else {
                                    // no duration specified. Just show the element until end time specified in VTT file
                                    $(line).show();
                                }
                                // add to array of visible selectors so it can be hidden at end time
                                this.ablePlayer.visibleSelectors.push(line);
                                tempSelectors.push(line);

                            }
                        }
                    }
                    // now step through this.visibleSelectors and remove anything that's stale
                    if (this.ablePlayer.visibleSelectors && this.ablePlayer.visibleSelectors.length) {
                        if (this.ablePlayer.visibleSelectors.length !== tempSelectors.length) {
                            for (i=this.ablePlayer.visibleSelectors.length-1; i>=0; i--) {
                                if ($.inArray(this.ablePlayer.visibleSelectors[i],tempSelectors) == -1) {
                                    $(this.ablePlayer.visibleSelectors[i]).hide();
                                    this.ablePlayer.visibleSelectors.splice(i,1);
                                }
                            }
                        }
                    }

                }
                this.currentMeta = thisMeta;
            }
        }
        else {
            // there is currently no metadata. Empty stale content
            if (typeof this.ablePlayer.$metaDiv !== 'undefined') {
                this.ablePlayer.$metaDiv.html('');
            }
            if (this.ablePlayer.visibleSelectors && this.ablePlayer.visibleSelectors.length) {
                for (i=0; i<this.ablePlayer.visibleSelectors.length; i++) {
                    $(this.ablePlayer.visibleSelectors[i]).hide();
                }
                // reset array
                this.ablePlayer.visibleSelectors = [];
            }
            this.ablePlayer.currentMeta = -1;
        }
    };

    // Takes a cue and returns the metadata text to display for it.
    flattenCueForMeta(cue) {
        var result = [];
        var flattenComponent = function (component) {
            var result = [], ii;
            if (component.type === 'string') {
                result.push(component.value);
            }
            else if (component.type === 'v') {
                result.push('[' + component.value + ']');
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
            }
            else {
                for (ii = 0; ii < component.children.length; ii++) {
                    result.push(flattenComponent(component.children[ii]));
                }
            }
            return result.join('');
        }

        for (var ii = 0; ii < cue.components.children.length; ii++) {
            result.push(flattenComponent(cue.components.children[ii]));
        }

        return result.join('');
    };

}