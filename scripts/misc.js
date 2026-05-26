import $ from 'jquery';

function addMiscFunctions(AblePlayer) {
  AblePlayer.prototype.getNextHeadingLevel = function ($element) {
    // Finds the nearest heading in the ancestor tree
    // Loops over each parent of the current element until a heading is found
    // If multiple headings are found beneath a given parent, get the closest
    // Returns an integer (1-6) representing the next available heading level

    var $parents, $foundHeadings, numHeadings, headingType, headingNumber;

    $parents = $element.parents();
    $parents.each(function () {
      $foundHeadings = $(this).children(":header");
      numHeadings = $foundHeadings.length;
      if (numHeadings) {
        headingType = $foundHeadings.eq(numHeadings - 1).prop("tagName");
        return false;
      }
    });
    if (typeof headingType === "undefined") {
      // page has no headings
      headingNumber = 1;
    } else {
      // Increment closest heading by one if less than 6.
      headingNumber = parseInt(headingType[1]);
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
    }
    return headingNumber;
  };

  AblePlayer.prototype.countProperties = function (obj) {
    // returns the number of properties in an object
    var count, prop;
    count = 0;
    for (prop in obj) {
      if (Object.hasOwn(obj, prop)) {
        ++count;
      }
    }
    return count;
  };

  AblePlayer.prototype.formatSecondsAsColonTime = function (
    seconds,
    showFullTime
  ) {
    // Takes seconds and converts to string of form hh:mm:ss
    // If showFullTime is true, shows 00 for hours if time is less than an hour
    //	 and show milliseconds	(e.g., 00:00:04.123 as in Video Track Sorter)
    // Otherwise, omits empty hours and milliseconds (e.g., 00:04 as in timer on controller)

    var times,format,parts,milliSeconds,numShort,i;

    if (showFullTime) {
      // preserve milliseconds, if included in seconds
      parts = seconds.toString().split(".");
      if (parts.length === 2) {
        milliSeconds = parts[1];
        if (milliSeconds.length < 3) {
          numShort = 3 - milliSeconds.length;
          for (i = 1; i <= numShort; i++) {
            milliSeconds += "0";
          }
        }
      } else {
        milliSeconds = "000";
      }
    }
	times = this.secondsToTime( seconds );
	format = times['value'];

      if (showFullTime) {
        return format + "." + milliSeconds;
      } else {
        return format;
      }
    }
  };

  AblePlayer.prototype.getSecondsFromColonTime = function (timeStr) {
    // Converts string of form hh:mm:ss to seconds
    var timeParts, hours, minutes, seconds;

    timeParts = timeStr.split(":");
    if (timeParts.length === 3) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = parseFloat(timeParts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (timeParts.length === 2) {
      minutes = parseInt(timeParts[0]);
      seconds = parseFloat(timeParts[1]);
      return minutes * 60 + seconds;
    } else if (timeParts.length === 1) {
      seconds = parseFloat(timeParts[0]);
      return seconds;
    }
  };

  AblePlayer.prototype.capitalizeFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  AblePlayer.prototype.roundDown = function (value, decimals) {
    // round value down to the nearest X decimal points
    // where X is the value of the decimals parameter
    return Number(Math.floor(value + "e" + decimals) + "e-" + decimals);
  };

  AblePlayer.prototype.defer = function() {
	const self = this;
	const promise = new Promise((resolve, reject) => {
		self.resolve = resolve;
		self.reject = reject;
		self.promise = () => promise;
	});
  }

  AblePlayer.prototype.getScript = function( source, callback ) {
	var script   = document.createElement('script');
	var prior    = document.getElementsByTagName('script')[0];
	script.async = 1;

	script.onload = script.onreadystatechange = function( _, isAbort ) {
		if ( isAbort || !script.readyState || /loaded|complete/.test(script.readyState) ) {
			script.onload = script.onreadystatechange = null;
			script        = undefined;

			if ( !isAbort && callback ) {
				setTimeout(callback, 0);
			}
		}
	};

	script.src = source;
	prior.parentNode.insertBefore(script, prior);
  }

  AblePlayer.prototype.hasAttr = function (object, attribute) {
    // surprisingly, there is no hasAttr() function in Jquery as of 3.2.1
    // return true if object has attribute; otherwise false
    // selector is a Jquery object
    // attribute is a string

    var attr = object.attr(attribute);

    // For some browsers, `attr` is undefined; for others,
    // `attr` is false.	 Check for both.
    if (typeof attr !== typeof undefined && attr !== false) {
      return true;
    } else {
      return false;
    }
  };

}

export default addMiscFunctions;
