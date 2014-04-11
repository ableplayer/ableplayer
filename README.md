Able Player
==========

*Able Player* is a fully accessible cross-browser media player. It uses
the HTML5 \<audio\> or \<video\> element for browsers that support them,
and the JW Player as a fallback for those that don’t.

Features
--------

-   Supports both audio and video.
-   Supports either a single audio track or an entire playlist.
-   Includes a custom media controller, with HTML buttons that are fully
    accessible to keyboard users and people using non-visual
    technologies such as screen readers and Braille output devices.
-   Supports closed captions for video
-   Supports audio description either by swapping out the video with a
    separate audio described version or by text.
-   Both the HTML5 player and fallback player use the same custom
    interface, so users whose browsers don’t support HTML5 media get a
    virtually identical experience.

Compatibility
-------------

*Able Player* has been tested with the following browsers and assistive
technologies.

-   Firefox 3.x and higher
-   Internet Explorer 7 and higher
-   Google Chrome 7.0 and higher
-   Opera 10.63 and higher
-   Safari 5.0 on Mac OS X
-   Safari on IOS 3.2.2 and higher
-   Chrome on Android 4.2 and higher

Dependencies
------------

*Able Player* has a few dependencies, but most are either provided with
*Able Player* or available through Google’s hosted libraries. The one
exception is the fallback player—see the *Fallback* section below for
details.

-   *Able Player* uses [jQuery][] and [jQuery UI][]. The example code
    below uses Google’s hosted libraries; no download required.
-   *Able Player* uses [Modernizr][] to enable styling of HTML5 elements
    in Internet Explorer 6 through 8. A Modernizr 2.6.2 Custom Build is
    distributed with *Able Player*, and is all that *Able Player* needs.
-   *Able Player* uses [jquery.cookie][] to store and retrieve user
    preferences in cookies. This script is distributed with *Able
    Player*.

Fallback
--------

For older browsers that don’t support HTML5 media elements, you need a
fallback solution. *Able Player* was developed to work seamlessly with
[JW Player][], specifically **JW Player 6**. JW Player is free for
non-commercial use but is licensed separately and is not distributed
with *Able Player*. If you choose to use JW Player as your fallback
player, users with older browsers including Internet Explorer 6-8 will
have the same experience with *Able Player* as users with newer
browsers. Identical functionality has been attained using both the HTML5
and JW Player APIs. After licensing and downloading JW PLayer, copy
*jwplayer.js*, *jwplayer.html5.js*, and *jwplayer.flash.swf* into the
*Able Player* */thirdparty* directory.

Note that *most* browsers in use today support HTML5 media elements.
Here’s a breakdown:

-   Chrome since 3.0
-   Firefox since 3.5
-   Safari since 3.1
-   Opera since 10.5
-   Internet Explorer since 9.0

At some point we may decide that it’s reasonable to stop supporting a
fallback player. However, according to [WebAIM’s 2014 Screen Reader User
Survey](http://webaim.org/projects/screenreadersurvey5/#browsers) 19.8% of screen reader users are still using Internet Explorer 8, 7, or 6. Until these users catch up, I think we have to provide a
working fallback.

As an alternative fallback, you could link to the media file so users
can download it and play it on their player of choice, and/or provide a
transcript.

  [jQuery]: http://jquery.com/
  [jQuery UI]: http://jqueryui.com/
  [Modernizr]: http://modernizr.com/
  [jquery.cookie]: https://github.com/carhartl/jquery-cookie
  [JW Player]: http://www.jwplayer.com/
  [WebAIM’s 2014 Screen Reader User Survey]: http://webaim.org/projects/screenreadersurvey5/#browsers
  
Setup Step 1: Use HTML5 Doctype
-------------------------------

*Able Player* is built on the HTML5 media elements, so at the top of
your web page be sure you have the HTML5 doctype:

```HTML
<!DOCTYPE html>
```

Setup Step 2: Add JavaScript and CSS
------------------------------------

Copy and paste the following code into your web page. This code applies
to all use cases, both audio and video.

```HTML
<!-- Dependencies -->
<script src="thirdparty/modernizr.custom.js"></script>
<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
<script src="//ajax.googleapis.com/ajax/libs/jqueryui/1.9.1/jquery-ui.min.js"></script>
<script src="thirdparty/jquery.cookie.js"></script>
<link rel="stylesheet" href="http://code.jquery.com/ui/1.9.1/themes/base/jquery-ui.css">
 
<!-- CSS --> 
<link rel="stylesheet" href="styles/ableplayer.css" type="text/css"/>
 
<!-- JavaScript -->
<script src="scripts/ableplayer.js"></script>
```

More documentation coming soon!
------------------------------------

