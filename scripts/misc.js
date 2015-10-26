(function ($) {
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

  // Takes seconds and converts to string of form hh:mm:ss
  AblePlayer.prototype.formatSecondsAsColonTime = function (seconds) {

    var dHours = Math.floor(seconds / 3600);
    var dMinutes = Math.floor(seconds / 60) % 60;
    var dSeconds = Math.floor(seconds % 60);
    if (dSeconds < 10) { 
      dSeconds = '0' + dSeconds;
    }
    if (dHours > 0) { 
      if (dMinutes < 10) { 
        dMinutes = '0' + dMinutes;
      }
      return dHours + ':' + dMinutes + ':' + dSeconds;
    }
    else { 
      return dMinutes + ':' + dSeconds;
    }
  };

})(jQuery);
