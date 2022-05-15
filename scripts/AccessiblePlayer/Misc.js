export default class Misc {

    /**
     * Finds the nearest heading in the ancestor tree
     * @param $element
     * @returns {number}
     */
    static getNextHeadingLevel = function($element) {
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

    /**
     * returns the number of properties in an object
     * @param obj
     * @returns {number}
     */
    static countProperties (obj) {
        var count, prop;
        count = 0;
        for (prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                ++count;
            }
        }
        return count;
    };

    static formatSecondsAsColonTime (seconds) {

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
        } else {
            return dMinutes + ':' + dSeconds;
        }
    };

    static capitalizeFirstLetter (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    //to delete
    //return true if object has attribute; otherwise false
    static hasAttr (object, attribute) {
        var attr = object.attr(attribute);
        if (typeof attr !== typeof undefined && attr !== false) {
            return true;
        }
        else {
            return false;
        }
    };

    //to delete
    // round value down to the nearest X decimal points
    static roundDown (value, decimals) {
        return Number(Math.floor(value+'e'+decimals)+'e-'+decimals);
    };

    //to delete
    // Converts string of form hh:mm:ss to seconds
   static getSecondsFromColonTime (timeStr) {
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





}