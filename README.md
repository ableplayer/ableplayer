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
Survey][] 19.8% of screen reader users are still using Internet Explorer 8, 7, or 6. Until these users catch up, I think we have to provide a
working fallback.

As an alternative fallback, you could link to the media file so users
can download it and play it on their player of choice, and/or provide a
transcript.

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

Setup Step 3: Add HTML
----------------------

Add an HTML5 \<audio\> or \<video\> element to your web page, as
follows.

### Audio

Copy and paste the following code into your web page, replacing the
source files with the path to your own media files. Use both OGG and MP3
to ensure cross-browser compatibility, since some browsers don’t support
MP3.

```HTML
<audio id="audio1" class="ump-media" preload="auto">
  <source type="audio/ogg" src="path_to_audio_file.ogg"/>
  <source type="audio/mpeg" src="path_to_audio_file.mp3"/>
</audio>
```

The following attributes are supported on the \<audio\> element:

-   **id** - required; any unique ID
-   **class** - required; must be **ump-media**
-   **preload** - optional; tells the browser how much media to download
    when the page loads. If the media is the central focus of the web
    page, use **preload=“auto”**, which instructs the browser to
    download as much of the media as possible. If the media is not a
    central focus, downloading the entire media resource can consume
    valuable bandwidth, so preload=“metadata” would be a better option.

### Video

Copy and paste the following code into your web page, replacing the
source files with the path to your own media files.

```HTML
<video id="video1" class="ump-media" preload="auto" width="480" height="360" poster="path_to_image.jpg">
  <source type="video/webm" src="path_to_video.webm" data-desc-src="path_to_described_video.webm"/>
  <source type="video/mp4" src="path_to_video.mp4" data-desc-src="path_to_described_video.mp4"/>
  <track kind="captions" src="path_to_captions.vtt"/>
  <track kind="descriptions" src="path_to_descriptions.vtt"/>
</video>
```

The following attributes are supported on the \<video\> element:

-   **id** - required; any unique ID
-   **class** - required; must be **ump-media**
-   **preload** - optional; use “auto” or “metadata”. See explanation
    above under *Audio*.
-   **width** - width of the video in pixels. If not provided will
    default to 480.
-   **height** - height of the video in pixels. If not provided will
    default to 360.
-   **poster** - path to an image file. Will be displayed in the player
    until the video is played.

The following additional features are supported by *Able Player*:

#### Multiple source files

As with audio, we recommend including two versions of each video, one in
H.264 (MP4) and another in WebM or OGG for browsers that don’t support
MP4. Browsers will play the first media source that they support.

#### Closed Captions

Captions are added using the <track> element with kind=“captions”.
Captions must be in [Web Video Text Tracks (WebVTT)][] format. WebVTT
tags within captions are not currently supported.

If captions are provided for a video, a CC button will be added to the
*Able Player* controller.

#### Audio Description

Supplemental description of key visual content for blind users can be
added using one of two methods.

The first method is the same as closed captions, a <track> element, with
kind=“descriptions”. This points to a WebVTT file, which is essentially
the same as a closed caption file, but its contents are description text
rather than captions. With this method, description text is written to a
container that has ARIA role=“alert”. Supporting screen readers
automatically announce the new text as soon as it is written to the
page.

The second method is to produce a separate video with description mixed
in. If multiple video sources are already provided (e.g., an MP4 and
WebM file), then the described version must be available in both of
these formats. For each video source that has a described version
available, add a **data-desc-src** attribute to the <source> element for
that video. The value of this attribute is a path pointing to the
described version of the video. With this method, the described version
of the video can be played instead of the non-described version, and the
two versions can be swapped with clicking the “D” button on the
controller.

If descriptions are available using either of the above methods, a
Description toggle button appears on the controller (represented by the
universal Description symbol, the letter “D”). How descriptions are
ultimately delivered depends on which of the above methods is used, and
on user preference. If a user prefers text-based description announced
by their screen reader, that’s what they’ll get. If they prefer an
alternate video with description mixed it, that’s what they’ll get. See
the section below on *User Preferences* for additional information about
preferences.

Setup Step 4: Initialize the Media Player
-----------------------------------------

Initialize the player with the following JavaScript command, replacing
*audio1* if needed with the id of your media player.

```JavaScript
new AblePlayer(id,index,startTime); 
```

The AblePlayer object accepts the following parameters:

-   **id** of the media element
-   **index** of this *Able Player* instance (optional; if page includes
    only one player, index = 0)
-   **startTime** in seconds (optional; default of 0 begins playing at
    the beginning)

In the following examples, the player is initialized inside a jQuery
document ready function to be sure the DOM has fully loaded.

In the first example, a single player is initialized:

```JavaScript
<script>
  $(document).ready(function() {
    new AblePlayer('audio1');  
  });
</script>
```

In the next example, all players on the page are initialized. This same code could optionally be used universally, even on pages that just have one player.

```JavaScript
<script>
    $(document).ready(function() { 
      $('.ump-media').each(function(index) { 
        new AblePlayer($(this).attr('id'),index);       
      });
    });
</script>
```

In the next example, a single player is initialized and starts playing at 2 minutes (120 seconds).

```JavaScript
<script>
  $(document).ready(function() {
    new AblePlayer('audio1',0,120);  
  });
</script>
```

Setup Step 5: Review User-Defined Variables in *ableplayer.js*
--------------------------------------------------------------

The JavaScript file *ableplayer.js* includes a block of user-defined
variables that can be modified from their default settings, such as
volume, color of controller buttons, seek interval for rewind and
forward buttons, and others. Explanations of each variable are provided
in the comments.

Playlists
---------

An *Able Player* playlist is an HTML list of tracks. The list can be
either ordered (\<ol\>) or unordered (\<ul\>). The following attributes
are supported on the list element:

-   **class** - required; must be **ump-playlist**
-   **data-player** - required; must reference the ID of the media
    player in which the playlist should be played.
-   **data-embedded** - optional; add this attribute if you want your
    playlist to be embedded into the media player. If this attribute is
    omitted, the playlist will be external to the player and will appear
    wherever you place it on the web page.

Within the playlist, each list item must include data-\* attributes
where \* is the media type and the value of the attribute is the URL
pointing to the media file of that type. For example, the following
audio playlist includes three songs, each of which is available in MP3
and OGG:

```HTML
<ul class="ump-playlist" data-player="audio1" data-embedded>
  <li data-mp3="song1.mp3" data-ogg="song1.ogg">My First Song</li>
  <li data-mp3="song2.mp3" data-ogg="song2.ogg">My Second Song</li>
  <li data-mp3="song3.mp3" data-ogg="song3.ogg">My Third Song</li>
</ul>
```

**Supported data-\* audio types:**

-   mp3
-   ogg or oga
-   wav

**Supported data-\* video types:**

-   mp4
-   webm or webmv
-   ogg or ogv

When a playlist is included on a page, the \<source\> elements within
the \<audio\> or \<video\> tags are optional. If they are provided, they
should match the first item in the playlist.

If your web page includes a playlist, you should also link to the
*ableplayer-playlist.css* file, as follows:

```HTML
<link rel="stylesheet" href="styles/ump-playlist.css" type="text/css"/>
```

Interactive Transcript
----------------------

*Able Player* interactive transcripts include the following features:

-   Clicking anywhere in the transcript starts playing the media at that
    point.
-   This same functionality is accessible to keyboard users, who can tab
    through the transcript and press Enter at any point to start playing
    the media at that point. Since this creates a lot of extra tab stops
    on the page, this might be undesirable functionality for some
    keyboard users so it’s disabled by default. It can be toggled on/off
    in the Preferences dialog.
-   Text in the transcript is highlighted as the media plays. This can
    be toggled on/off in the Preferences dialog.

### Setting up a Transcript

The transcript can appear anywhere on the page, but must be wrapped in a
container with **class=“ump-transcript”**

The transcript is comprised of small blocks of text, each with its own
start and end time. These text blocks most likely correspond with
captions and descriptions. Each block of text must be wrapped in a
\<span\> with **data-start** and **data-end** attributes. The values of
these attributes are expressed in seconds. These attributes are
optional, but if a \<span\> does not include these attributes it will
not be clickable.

For full accessibility, the transcript should include both captions and
descriptions. To differentiate the two, blocks of uninterrupted
description text should be wrapped in a \<div\> with the following
markup:

```HTML
<div class="ump-desc">
  <span class="hidden">Description: </span>
  <span>Description text goes here.</span>
</div>
```

The following is an example transcript that includes both captions and description.

```HTML
<div class="ump-transcript">
  <h2>Transcript</h2>
  <div>
    <span class="ump-unspoken">[Music]</span>
  </div>
  <div class="ump-desc">
    <span class="hidden">Description: </span>
    <span>A blue circle has pairs of arching pairs inside. Underneath, DO-IT.</span>
    <span>Words appear in a white box: World Wide Access.</span>
  </div>
  <div>
    <span class="ump-unspoken">[Narrator]</span>
    <span  data-start="9.165" data-end="10.792"> You want these people.</span>
    <span  data-start="10.792" data-end="13.759">They order your products, sign up for your services,</span>
    <span  data-start="13.759" data-end="16.627">enroll in your classes, read your opinions,</span>
    <span  data-start="16.627" data-end="18.561">and watch your videos.</span>
    <span  data-start="18.561" data-end="24.165">You'll never see them, but they know you- through your website.</span>
    <span  data-start="24.165" data-end="25.891">Or maybe not.</span>
    <span  data-start="25.891" data-end="30.396">Your website's visitors aren't a  faceless mass of identical mouse-clickers</span>
    <span  data-start="30.396" data-end="32.363">but a vibrant community of individuals</span>
    <span  data-start="32.363" data-end="35.297">with varying tastes, styles, and abilities.</span>
    <span  data-start="35.297" data-end="39.132">This includes people with disabilities.</span>
  </div>
  <div class="ump-desc">
    <span class="hidden">Description:</span>
    <span>Terrill Thompson, Technology Accessibility Specialist:</span>
  </div>
  <div>
    <span class="ump-unspoken">[Terrill]</span>
    <span  data-start="39.132" data-end="41"> It's important for web designers and developers</span>
    <span  data-start="41" data-end="45.5">to realize that what they see currently on their computer,</span>
    <span  data-start="45.5" data-end="49.264">at their resolution, with their browser and their operating system</span>
    <span  data-start="49.264" data-end="52">is not going to be necessarily  the same thing that everybody else sees.</span>
  </div>
</div><!-- end transcript -->
```

*Able Player* includes a PHP utility *ableplayer-transcript-maker.php*,
located in the *php* directory, that converts one or more WebVTT files
into an UMP transcript. Consult the source code of this file for
instructions.

MIME Types
----------

If your media doesn’t play, one possibility is that your web server is
attempting to serve up the media with the incorrect MIME type. On
Apache, this can be correct by adding the following commands to the
.htaccess file:

```
# Audio MIME Types
AddType audio/mpeg mp3
AddType audio/mp4 mp4 
AddType audio/mp4 mpa
AddType audio/ogg ogg
AddType audio/ogg oga
AddType audio/wav wav 

# Video MIME Types
AddType video/mp4 mp4
AddType video/ogg ogv
AddType video/webm webm
```

If you don’t have access to your server’s .htaccess file, you should be
able to view and add MIME types somewhere within your server’s control
panel.

If your site is running on a Windows server, consult the documentation
from Microsoft. For example:

-   [Configuring MIME Types in IIS 7][]
-   [How to add MIME Types with IIS7 Web.config][]

Keyboard Shortcuts
------------------

UMP includes several keyboard shortcuts that enable users to control the
player from anywhere on the web page. By default, each of these is a
single keystroke, as follows:

-   **p or spacebar** = Play/Pause
-   **s** = Stop
-   **r** = Rewind 10 seconds
-   **f** = Forward10 seconds
-   **c** = Toggle captions
-   **m** = Mute
-   **u or 1-5** = Volume Up
-   **d or 1-5** = Volume Down
-   **t** = Settings
-   **h** = Help

Note that modifier keys (Alt and Control) can be assigned by clicking
the Preferences button on the player. If users find that shortcut keys
aren’t working as advertised, they might have better success by
selecting different combinations of modifier keys to accompany the
default shortcut keys.

User Preferences
----------------

One of *Able Player’s* accessibility features is that the player is
highly customizable by users. The controller includes a Preferences
button that allows users to change default preferences and settings.
Their changes are stored in a browser cookie and in most cases should
therefore be preserved the next time they visit the site. Specifically,
users can control the following:

-   Modifier keys: Add *Alt*, *Ctrl*, or both to the UMP keyboard
    shortcuts to avoid conflicts with other applications.
-   Closed captions on by default
-   Description on by default
-   Use text-based description if available.
-   If using text-based description, make it visible.
-   Highlight transcript as video plays
-   Keyboard-enable transcript



  [jQuery]: http://jquery.com/
  [jQuery UI]: http://jqueryui.com/
  [Modernizr]: http://modernizr.com/
  [jquery.cookie]: https://github.com/carhartl/jquery-cookie
  [JW Player]: http://www.jwplayer.com/
  [WebAIM’s 2014 Screen Reader User Survey]: http://webaim.org/projects/screenreadersurvey5/#browsers
  [Configuring MIME Types in IIS 7]: http://technet.microsoft.com/en-us/library/17bda1f4-8a0d-440f-986a-5aaa9d40b74c.aspx
  [How to add MIME Types with IIS7 Web.config]: http://blogs.iis.net/bills/archive/2008/03/25/how-to-add-mime-types-with-iis7-web-config.aspx
  


