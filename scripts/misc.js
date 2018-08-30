(function ($) {

  AblePlayer.prototype.getNextHeadingLevel = function($element) {

    // Finds the nearest heading in the ancestor tree
    // Loops over each parent of the current element until a heading is found
    // If multiple headings are found beneath a given parent, get the closest
    // Returns an integer (1-6) representing the next available heading level

    var $parents, $foundHeadings, numHeadings, headingType, headingNumber;

    $parents = $element.parents();
    $parents.each(function(){
      $foundHeadings = $(this).children(':header');
      numHeadings = $foundHeadings.length;
      if (numHeadings) {
        headingType = $foundHeadings.eq(numHeadings-1).prop('tagName');
        return false;
      }
    });
    if (typeof headingType === 'undefined') {
      // page has no headings
      headingNumber = 1;
    }
    else {
      // Increment closest heading by one if less than 6.
      headingNumber = parseInt(headingType[1]);
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
    }
    return headingNumber;
  };

  AblePlayer.prototype.countProperties = function(obj) {

    // returns the number of properties in an object
    var count, prop;
    count = 0;
    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        ++count;
      }
    }
    return count;
  };

  AblePlayer.prototype.formatSecondsAsColonTime = function (seconds, showFullTime) {

    // Takes seconds and converts to string of form hh:mm:ss
    // If showFullTime is true, shows 00 for hours if time is less than an hour
    //   and show milliseconds  (e.g., 00:00:04.123 as in Video Track Sorter)
    // Otherwise, omits empty hours and milliseconds (e.g., 00:04 as in timer on controller)

    var dHours, dMinutes, dSeconds,
        parts, milliSeconds, numShort, i;

    if (showFullTime) {
      // preserve milliseconds, if included in seconds
      parts = seconds.toString().split('.');
      if (parts.length === 2) {
        milliSeconds = parts[1];
        if (milliSeconds.length < 3) {
          numShort = 3 - milliSeconds.length;
          for (i=1; i <= numShort; i++) {
            milliSeconds += '0';
          }
        }
      }
      else {
        milliSeconds = '000';
      }
    }
    dHours = Math.floor(seconds / 3600);
    dMinutes = Math.floor(seconds / 60) % 60;
    dSeconds = Math.floor(seconds % 60);
    if (dSeconds < 10) {
      dSeconds = '0' + dSeconds;
    }
    if (dHours > 0) {
      if (dMinutes < 10) {
        dMinutes = '0' + dMinutes;
      }
      if (showFullTime) {
        return dHours + ':' + dMinutes + ':' + dSeconds + '.' + milliSeconds;
      }
      else {
        return dHours + ':' + dMinutes + ':' + dSeconds;
      }
    }
    else {
      if (showFullTime) {
        if (dHours < 1) {
          dHours = '00';
        }
        else if (dHours < 10) {
          dHours = '0' + dHours;
        }
        if (dMinutes < 1) {
          dMinutes = '00';
        }
        else if (dMinutes < 10) {
          dMinutes = '0' + dMinutes;
        }
        return dHours + ':' + dMinutes + ':' + dSeconds + '.' + milliSeconds;
      }
      else {
        return dMinutes + ':' + dSeconds;
      }
    }
  };

  AblePlayer.prototype.getSecondsFromColonTime = function (timeStr) {

    // Converts string of form hh:mm:ss to seconds
    var timeParts, hours, minutes, seconds, newTime;

    timeParts = timeStr.split(':');
    if (timeParts.length === 3) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = parseFloat(timeParts[2]);
      return ((hours * 3600) + (minutes * 60) + (seconds));
    }
    else if (timeParts.length === 2) {
      minutes = parseInt(timeParts[0]);
      seconds = parseFloat(timeParts[1]);
      return ((minutes * 60) + (seconds));
    }
    else if (timeParts.length === 1) {
      seconds = parseFloat(timeParts[0]);
      return seconds;
    }
  };

  AblePlayer.prototype.capitalizeFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

})(jQuery);
