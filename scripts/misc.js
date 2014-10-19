(function () {
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

  // Takes seconds and converts to string of form mm:ss
  AblePlayer.prototype.formatSecondsAsColonTime = function (seconds) {
    var dMinutes = Math.floor(seconds / 60);
    var dSeconds = Math.floor(seconds % 60);
    if (dSeconds < 10) { 
      dSeconds = '0' + dSeconds;
    }

    return dMinutes + ':' + dSeconds;
  };

})();
