Able Player
==========

*Able Player* is a fully accessible cross-browser media player. It uses
the HTML5 `<audio>` or `<video>` element for browsers that support them,
and (optionally) the JW Player as a fallback for those that don’t.

To see the player in action check our [Able Player Examples][examples] page.

Features
--------

-   Supports both audio and video.
-   Supports either a single audio track or an entire playlist.
-   A full set of player controls that are keyboard-accessible, properly labeled for screen reader users, and controllable by speech recognition users.
-   Customizable keyboard shortcuts that enable the player to be operated from anywhere on the web page (unless there are multiple instances of the player on a given page; then the player must have focus for keyboard shortcuts to work).
-   High contrast, scalable controls that remain visible in Windows High Contrast mode, plus an easy-to-see focus indicator so keyboard users can easily tell which control currently has focus.
-   Support for closed captions and subtitles in Web Video Timed Text (WebVTT) format, the standard format recommended by the HTML5 specification.
-   Support for chapters, also using WebVTT. Chapters are specific landing points in the video, allowing video content to have structure and be more easily navigated.
-   Support for text-based audio description, also using WebVTT. At designated times, the description text is read aloud by screen readers.  Users can optionally set their player to pause when audio description starts in order to avoid conflicts between the description and program audio.
-   Support for audio description as a separate video. When two videos are available (one with description and one without), both can be delivered together using the same player and users can toggle between the versions.
-   Support for adjustable playback rate. Users who need to slow down the video in order to better process and understand its content can do so; and users who need to speed up the video in order to maintain better focus can do so.
-   An interactive transcript feature, built from the WebVTT chapter, caption and description files as the page is loaded. Users can click anywhere in the transcript to start playing the video (or audio) at that point.  Keyboard users can also choose to keyboard-enable the transcript, so they can tab through its content one caption at a time and press enter to play the media at the desired point.
-   Automatic text highlighting within the transcript as the media plays. This feature is enabled by default but can be turned off if users find it distracting.
-   Support for playing YouTube videos within the Able Player chrome.
-   Customizable caption display. Users can control the font style, size, and color of caption text; plus background color and transparency; all from the Preferences dialog. They can also choose to position captions *below* the video instead of the default position (an semi-transparent overlay).
-   Optional seamless integrated support for JW Player as a fallback player for users whose browsers don't support HTML5 media. The fallback player uses the same custom interface and provides a nearly identical experience.
-   Extensive customization. Many of the features described above are controlled by user preferences. This is based on the belief that every user has different needs and there are no one-size-fits-all solutions. This is the heart of universal design.

Supported Languages
-------------------

Able Player has been translated into the following languages. To add another language, see instructions below under **Contributing**.

<ul>
  <li><strong lang="ca">Català</strong> (Catalan)</li>
  <li><strong lang="zh-tw">Chinese, Traditional (Taiwan)</strong></li>    
  <li><strong lang="de">Deutsch</strong> (German)</li>
  <li><strong>English</strong></li> 
  <li><strong lang="en">Español</strong> (Spanish)</li> 
  <li><strong lang="fr">Français</strong> (French)</li> 
  <li><strong lang="he">עִברִית</strong> (Hebrew)</li>
  <li><strong lang="it">Italiano</strong> (Italian)</li>
  <li><strong lang="ja">日本語</strong> (Japanese)</li>  
  <li><strong lang="nb">Norsk Bokmål</strong> (Norwegian)</li> 
  <li><strong lang="nl">Nederlands, Vlaams</strong> (Dutch)</li> 
</ul>

Contributing
-------------

There are many ways to contribute to Able Player, and we welcome and appreciate your help! Here are some options:

- If you spot bugs are have feature requests, please submit them to the [Issues][issues] queue.
- If you have code to contribute, please note that all development occurs on the [develop branch][develop]. This is often many commits ahead of the master branch, so please do all development from *develop*, and submit pull requests there. We particularly appreciate help with any issues in the Issues queue that have been flagged with "help wanted".
- If you are multilingual, please consider translating Able Player into another language! All labels, prompts, messages, and help text for each language are contained within a single file, contained within the */translations* directory.

Compatibility
-------------

*Able Player* has been tested with the following browsers and assistive
technologies.

-   Firefox 3.x and higher
-   Internet Explorer 10 and higher without fallback
-   Internet Explorer 8 and 9, dependent on JW Player as fallback.
-   Google Chrome 7.0 and higher
-   Opera 10.63 and higher
-   Safari 5.0 on Mac OS X
-   Safari on IOS 3.2.2 and higher (audio only, video plays in default IOS player)
-   Chrome on Android 4.2 and higher

Note that mobile browsers have limitations (e.g., volume control and autostart are not supported)

Dependencies
------------

*Able Player* has a few dependencies, but most are either provided with
*Able Player* or available through Google’s hosted libraries. The one
exception is the fallback player—see the *Fallback* section below for
details.

-   *Able Player* uses [jQuery][]. Version 3.2.1 or higher is recommended.
    The example code below uses Google’s hosted libraries; no download required.
-   *Able Player* uses [Modernizr][] to enable styling of HTML5 elements
    in Internet Explorer 6 through 8. A Modernizr 2.6.2 Custom Build is
    distributed with *Able Player*, and is all that *Able Player* needs.
-   *Able Player* uses [js-cookie][] to store and retrieve user
    preferences in cookies. This script is distributed with *Able
    Player*. Prior to version 2.3, Able Player used [jquery.cookie][]
    for this same purpose.

Fallback
--------

For older browsers that don’t support HTML5 media elements, you need a
fallback solution. *Able Player* was developed to work seamlessly with
[JW Player][], specifically **JW Player 6** (successfully tested with
versions 6.0 and 6.11). JW Player is free for non-commercial use but
is licensed separately and is not distributed with *Able Player*.
After licensing and downloading JW PLayer, copy *jwplayer.js*, *jwplayer.html5.js*,
and *jwplayer.flash.swf* into the
*Able Player* */thirdparty* directory.

If you choose to use JW Player as your fallback player,
users with some older browsers will have a similar experience with
*Able Player* as users with newer browsers.

If using a licensed copy of JWPlayer, the JWPlayer key can be passed with
the **data-fallback-jwkey** attribute.

Note that *most* browsers in use today support HTML5 media elements.
Here’s a breakdown:
-   Chrome since 3.0
-   Firefox since 3.5
-   Safari since 3.1
-   Opera since 10.5
-   Internet Explorer since 9.0 (video was buggy in 9; better in 10)

Note the following limitations in Internet Explorer (IE):
- IE10 and higher work fine without a fallback player
- IE9 was the first version of IE to support HTML5 media elements. However, its support for video was buggy so Able Player uses the fallback if it's available
- IE8 works fine with JW Player as fallback
- IE6 and 7 are not supported

At some point we may decide that it’s reasonable to stop supporting a fallback player.
However, according to [WebAIM’s 2017 Screen Reader User Survey][] 4.1% of screen reader users are still using IE 6, 7, or 8,
and 4.0% are still using IE 9 or 10. Until these users catch up, we think we have to provide a working fallback.

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
<script src="//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
<script src="thirdparty/js.cookie.js"></script>

<!-- CSS -->
<link rel="stylesheet" href="build/ableplayer.min.css" type="text/css"/>

<!-- JavaScript -->
<script src="build/ableplayer.min.js"></script>
```

Setup Step 3: Add HTML
----------------------

Add an HTML5 `<audio>` or `<video>` element to your web page, as
follows.

### Audio

Copy and paste the following code into your web page, replacing the
source files with the path to your own media files. Use both OGG and MP3
to ensure cross-browser compatibility, since some browsers don’t support
MP3.

```HTML
<audio id="audio1" data-able-player preload="auto">
  <source type="audio/ogg" src="path_to_audio_file.ogg"/>
  <source type="audio/mpeg" src="path_to_audio_file.mp3"/>
</audio>
```

### Video

Copy and paste the following code into your web page, replacing the
source files with the path to your own media files. Use both WebM and MP4
to ensure cross-browser compatibility, since some browsers don’t support
MP4.

```HTML
<video id="video1" data-able-player preload="auto" width="480" height="360" poster="path_to_image.jpg">
  <source type="video/webm" src="path_to_video.webm" data-desc-src="path_to_described_video.webm"/>
  <source type="video/mp4" src="path_to_video.mp4" data-desc-src="path_to_described_video.mp4"/>
  <track kind="captions" src="path_to_captions.vtt"/>
  <track kind="descriptions" src="path_to_descriptions.vtt"/>
</video>
```


### Supported Attributes

The following attributes are supported on both the `<audio>` and `<video>` elements:

#### Required Attributes

-   **id** - required; any unique ID
-   **data-able-player** - required

#### Optional; General-Purpose

-   **data-debug** - optional; if present will write messages to the developer console
-   **autoplay** - optional; play media automatically when page loads. For accessibility reasons, this is *not* recommended unless user is sure to *expect* media to automatically start. For example, autoplay could reasonably be used in conjunction with data-start-time in a media search application.
-   **loop** - optional; loops and plays the media file repeatedly. If used in conjunction with a playlist, loops the entire playlist rather than individual tracks.
-   **playsinline** - optional but recommended; instructs supporting browsers to play the video "inline" within the web page. This is especially applicable on iPhones, which by default load the video in their own built-in video player, thereby removing it from its surrounding context, which includes Able Player buttons and controls, an interactive transcript, and any other companion features added via Able Player. If this attribute is present, it works for all supported videos, including YouTube videos.
-   **preload** - optional; tells the browser how much media to download
    when the page loads. If the media is the central focus of the web
    page, use **preload="auto"**, which instructs the browser to
    download as much of the media as possible. If the media is not a
    central focus, downloading the entire media resource can consume
    valuable bandwidth, so preload="metadata" would be a better option.
-   **width** - width of the media player in pixels. For video, this value should reflect the target width of the media itself. If not provided will default to 480.
-   **data-root-path** - define path to root directory of Able Player; generally not required but may be needed in rare instances where Able Player is unable to identify its current path on the web server
-   **data-heading-level** - optional; Able Player injects an off-screen HTML heading "Media Player" (or localized equivalent) at the top of the player so screen reader users can easily find the player. It automatically assigns a heading level that is one level deeper than the closest parent heading. This attribute can be used to manually set the heading level, rather than relying on Able Player to assign it automatically. Valid values are 1 through 6. A value of 0 is also supported, and instructs Able Player to not inject a heading at all. The latter should be used only if the web page already includes a heading immediately prior to the media player.
-   **data-hide-controls** - optional; set to "true" to hide controls during playback. Controls are visibly hidden but still accessible to assistive technologies. Controls reappear if user presses any key or moves the mouse over the video player region.
-   **data-icon-type** - optional; "svg", "font" or "image"; "svg" is the default with automatic fallback to "font" unless either (a) the browser doesn't support icon fonts or (b) the user has a custom style sheet that may impact the display of icon fonts; in either case falls back to images. Should generally leave as is unless testing the fallback.
-   **data-speed-icons** - optional; "animals" (default) or "arrows". The default setting uses a turtle icon for *slower* and a rabbit icon for *faster*. Setting this to "arrows" uses the original Able Player icons (prior to version 3.5), arrows pointing up for *faster* and down for *slower*.
-   **data-start-time** - optional; time at which you want the audio to start playing (in seconds)
-   **data-volume** - optional; set the default volume (0 to 10; default is 7 to avoid overpowering screen reader audio)
-   **data-seek-interval** - optional; interval (in seconds) of forward and rewind buttons. By default, seek interval is intelligently calculated based on  duration of the media.
-   **data-show-now-playing** - optional; "true" or "false" to include "Selected track" section within player; only applies when a playlist is present

#### Language

-   **data-lang** - optional; specify language of the player using 2-character language code (default is "en" for English)
-   **data-force-lang** - optional; include this option to force the player to use the value of *data-lang* as the player language. Otherwise, the player language will be set as follows, in order of precedence: 1) the language of the web page or user's web browser if either is known and if there is a matching translation file; 2) the value of *data-lang* if provided; 3) English.

#### Captions

-   **data-captions-position** - optional; specify default position of captions relative to the video (either "below" or "overlay"; "below" is the default if not specified). Users can override this setting in Captions Preferences.

#### Transcript

Able Player can automatically generate an accessible interactive transcript from the chapters, captions, and descriptions tracks. There are three types of interactive transcripts supported:
-  "external" - Automatically generated, written to an external div (requires **data-transcript-div**)
-  "popup" - Automatically generated, written to a draggable, resizable popup window that can be toggled on/off with a button on the controller
-  "manual" - A manually coded external transcript (requires **data-transcript-src**)

The following attributes control which of the above types, if any, are generated:
-   **data-transcript-div** - optional; id of an external div in which to display an interactive transcript.
-   **data-transcript-src** - optional; id of an external div that contains a pre-existing manually coded transcript. Able Player will parse this transcript and interact with it during playback.
-   **data-include-transcript** - optional; set to "false" to exclude transcript button from controller.

If none of the above attributes are present, the transcript will be displayed in a draggable, resizable popup that can be toggled on/off using a button on the controller. Note that a toggle button is added to the controller *only* if the transcript is a "popup" type; there is no toggle button for either the "external" or "manual" transcript types.

Additional transcript-related attributes include:
-   **data-transcript-title** - optional; override default transcript title (default is "Transcript", or "Lyrics" if the data-lyrics-mode attribute is present)
-   **data-lyrics-mode** - optional; forces a line break between and within captions in the transcript

To manually code the transcript, one simple strategy is to first allow Able Player to *automatically* generate a transcript. Then copy and paste its content as a starting point. To manually code a transcript from scratch, use the following markup (see [Video Demo #7] for an example):

- Wrap the entire transcript in a container with class="able-transcript", and wrap that in another container with class="able-transcript-area".
- Add an empty &lt;div&gt; just inside the outer container with class="able-window-toolbar".
- Wrap all audio description in a &lt;div&gt; element with class="able-transcript-desc".
- Add a &lt;span&gt; element to the start of each audio description block, with class="able-hidden" and text "Description:". This helps screen reader users to distinguish between caption and description text.
- Wrap each block of caption text in a &lt;div&gt; element with class="able-transcript-block".
- Wrap each clickable segment of content in a &lt;span&gt; element, with class="able-transcript-seekpoint", plus **data-start** and **data-end** attributes. The values of these two data attributes are the video start and end times expressed in seconds (decimals points are allowed).
- If the clickable span is caption text, also add the "able-transcript-caption" class.
- Wrap unspoken content such as names of speakers or descriptions of sound in a &lt;span&gt; element with class="able-unspoken".
- Use any other markup desired to add structure and style to your transcript. Able Player will ignore it.

#### Chapters

-   **data-chapters-div** - optional; id of an external div in which to display a list of chapters.
    The list of chapters is generated automatically if a chapters track is available in a WebVTT file.
    If this attribute is not provided and chapter are available, chapters will be displayed in a popup menu triggered by the Chapters button.
-   **data-use-chapters-button** - optional; set to "false" to exclude chapters button from controller. If using the data-chapters-div attribute to write the chapters to an external container, you might not want users to be able to toggle the chapters off.
-   **data-chapters-title** - optional; override default chapters title (default is "Chapters"). A null value (data-chapters-title="") eliminates the title altogether.
-   **data-chapters-default** - optional; identify ID of default chapter (must correspond with the text or value immediately above the timestamp in your chapter's WebVTT file). If this attribute is present, the media will be advanced to this start time. Otherwise it will start at the beginning. (See also **data-start-time**).
-   **data-seekbar-scope** - optional; default is "video" (seekbar represents full duration of video); if set to "chapter" seekbar represents the duration of the current chapter only

#### Metadata

Metadata is added using the `<track>` element with kind="metadata".
It must be in Web Video Text Tracks format ([WebVTT][]).
Able Player supports two types of metadata:

1. "text" - The WebVTT file contains text, intended to be written to an external container at the designated times. You must provide the external container; Able Player does not generate that automatically.

2. "selector" - The WebVTT file contains jQuery selectors which target hidden content that is already present on the web page. At the designated times, the hidden content referenced by the jQuery selectors is made visible. In addition to selectors, the WebVTT file can contain either of the following keywords, each on a line by itself:

- **PAUSE** instructs Able Player to pause the video at that point.
- **FOCUS:** followed by a jQuery selector, places keyboard focus on the designated element, which should have a *tabindex* attribute with a value of either "0" (element is part of the regular tab order) or "-1" (element is not part of the regular tab order, but can receive focus in this context via JavasScript).

This combination of exposing new content, pausing the video, and placing keyboard focus on a newly exposed element, can be used to provide supplemental content including clickable "hot spots" overlaid on the video.

The following attributes make all this possible:

-   **data-meta-type** - required for metadata; indicates the type of metadata contained within a metadata track. Supported values as described above are "text" and "selector".
-   **data-meta-div** - required for "text" metadata; id of an external div in which to display the text.
-   **data-duration** - optional attribute on the element displayed via a metadata track; value is the number of milliseconds to display the element before it fades out. Elements displayed via metadata tracks automatically fade out at the end time designated within the WebVTT file. However, if the **data-duration** attribute is present, this enables an element to fade out *before* the designated time. This is useful if multiple elements appear simultaneously, but some need to fade out earlier than others.

**NOTE:** If you're using metadata to expose content in sync with videos hosted on YouTube, please review [YouTube's Terms of Service] related to Overlays and Frames. As of August 11, 2016: "You must not display overlays, frames, or other visual elements in front of any part of a YouTube embedded player, including player controls. Similarly, you must not use overlays, frames or other visual elements to obscure any part of an embedded player, including player controls."

#### Search

-   **data-search** - optional; search terms to search for within the caption tracks, separated by a space
-   **data-search-lang** - optional; specify 2-character language code of caption or subtitle track to search. If unspecified, searches the default language, which is the language of the web page if specified using the *lang* attribute on either the `<html>` or `<body>` tag. 
-   **data-search-div** - optional; id of external container in which to display search results

#### Fallback Player

-   **data-fallback** - optional; specify a fallback player. Currently the only supported option is "jw" (JW Player)
-   **data-test-fallback** - optional; force browser to user fallback player (recommended for testing only)
-   **data-fallback-path** - optional; override default path to directory in which the fallback player files are stored
-   **data-fallback-jwkey** - optional; set JW Player key for hosted players


The following attributes are supported on the `<video>` element only:

-   **data-allow-fullscreen** - optional; if set to "false" the player will not include a fullscreen button
-   **data-youtube-id** - optional; 11-character YouTube ID, to play the YouTube video using *Able Player*.
-   **data-youtube-desc-id** - optional; 11-character YouTube ID of the described version of a video. See the section below on *YouTube Support* for additional information.
-   **data-youtube-nocookie** - optional; if set to "true" the YouTube video will be embedded using the "youtube-nocookie.com" host.
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

Captions are added using the `<track>` element with kind="captions".
Captions must be in Web Video Text Tracks format ([WebVTT][]).
WebVTT tags within captions are currently ignored.

**NOTE:** Able Player only supports valid WebVTT files. Be sure to
validate your WebVTT using a [WebVTT Validator][].

If captions are provided, a CC button will be added to the
*Able Player* controller.

#### Audio Description

Supplemental description of key visual content for blind users can be
added using one of two methods.

The first method is the same as closed captions, a `<track>` element, with
kind="descriptions". This points to a WebVTT file, which is essentially
the same as a closed caption file, but its contents are description text
rather than captions. With this method, description text is written to a
container that has ARIA role="alert". Supporting screen readers
automatically announce the new text as soon as it is written to the
page.

The second method is to produce a separate video with description mixed
in. If multiple video sources are already provided (e.g., an MP4 and
WebM file), then the described version must be available in both of
these formats. For each video source that has a described version
available, add a **data-desc-src** attribute to the `<source>` element for
that video. The value of this attribute is a path pointing to the
described version of the video. With this method, the described version
of the video can be played instead of the non-described version, and the
two versions can be swapped with clicking the "D" button on the
controller.

If descriptions are available using either of the above methods, a
Description toggle button appears on the controller (represented by the
universal Description symbol, the letter "D"). How descriptions are
ultimately delivered depends on which of the above methods is used, and
on user preference. If a user prefers text-based description announced
by their screen reader, that’s what they’ll get. If they prefer an
alternate video with description mixed in, that’s what they’ll get. See
the section below on *User Preferences* for additional information about
preferences.

In some applications, text-based descriptions might be a required
part of the interface (e.g., if video pauses so users can interact with
HTML overlays; text-based description could be used in this context to provide
additional instructions for screen reader users). In such cases the Descriptions
button can be eliminated from the controller with **data-use-descriptions-button="false"**.

#### Sign language

Sign language translation is supported in a separate video player,
synchronized with the main player. Tips for filming a sign language
interpreter are available from [Signing Books for the Deaf][]:

* [Filming the Signer][]
* [Editing the Signer][]

If multiple video sources are already provided (e.g., an MP4 and
WebM file), then the sign language video must be available in both of
these formats. For each video source that has a sign language version
available, add a **data-sign-src** attribute to the `<source>` element for
that video. The value of this attribute is a path pointing to the
sign language version of the video. If a sign language version is available,
a sign language button will be added to the media controller.
This button will toggle the display of a secondary window in which
the sign language video will appear.

This is an experimental feature and a work in progress. Ultimately
the intent is for the user to have full control of the size and position
of the sign language video.

Setup Step 4: Review User-Defined Variables in *ableplayer.js*
--------------------------------------------------------------

The JavaScript file *initialize.js* includes a block of user-defined
variables that can be modified from their default settings, such as
volume, color of controller buttons, seek interval for rewind and
forward buttons, and others. Explanations of each variable are provided
in the comments.

If you make changes to this or any other JavaScript script files,
the player will need to be recompiled before your changes will take effect.
To do so, run the shell script *compile.sh*.

Playlists
---------

An *Able Player* playlist is an HTML list of tracks. The list can be
either ordered (`<ol>`) or unordered (`<ul>`). The following attributes
are supported on the list element:

-   **class** - required; must be **able-playlist**
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
<ul class="able-playlist" data-player="audio1" data-embedded>
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

When a playlist is included on a page, the `<source>` elements within
the `<audio>` or `<video>` tags are optional. If they are provided, they
should match the first item in the playlist.

Interactive Transcript
----------------------

*Able Player* interactive transcripts are generated automatically from
WebVTT chapters, descriptions, and captions/subtitles files. 
If a transcript is available, a Transcript button will be added to the *Able Player* controller.

Features of the interactive transcript include the following:

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
-   If subtitles are available, the transcript can be displayed in any supported language.
    Available languages can be selected from a dropdown select field.
    
If the transcript is assembled from multiple sources, any timing imperfections between sources 
come sometimes lead to problems in the read order within the transcript. For example, 
a new chapter should start *before* any captions or descriptions within that chapter. 
If the chapter starts a millisecond later than its first caption, the chapter name will appear 
in the transcript as a heading *after* its first caption. To help authors/developers attain 
perfect synchronization between all timed text files, Able Player (in version 3.1.6) introduced 
a Video Transcript Sorter (VTS). The VTS displays all timed text content from all sources 
in a table, and provides several features that enable users to rearrange content and 
modify start and end times. Users can also insert new content into the table, which can be useful 
for authoring low frequency content such as chapters and description. Too use VTS, 
add the following HTML to the desired location within any web page that includes an 
Able Player instance: 

```HTML
<div id="able-vts"></div>
```


YouTube Support
---------------

To play a YouTube video in *Able Player*, simply include a **data-youtube-id** attribute
on the `<video>` element. The value of this attribute must be the video's 11-character YouTube ID.

If a described version of the video is available on YouTube, include a **data-youtube-desc-id** attribute
on the `<video>` element. The value of this attribute must be the 11-character YouTube ID
of the described version. If users turn on the Description button on their player controller,
the described version of the video will be loaded instead of the non-described version.

Starting with 2.3.1, a YouTube Data API key is required for playing YouTube videos in Able Player.
Get a YouTube Data API key by registering your application at the [Google Developer Console][].
For complete instructions, see [Google's Getting Started page]. Note: All that's needed for
playing YouTube videos in Able Player is a simple API key, **not** OAuth 2.0.

After obtaining your YouTube Data API Key, insert the following code into your HTML page:

```HTML
<script>
  var youTubeDataAPIKey = "paste your API key here";
  var googleApiReady = false;
  function initGoogleClientApi() {
    googleApiReady = true;
  }
</script>
<script src="http://apis.google.com/js/client.js?onload=initGoogleClientApi"></script>
```

If captions or subtitles are available on the YouTube video, these will be displayed for all users,
and can be controlled using Able Player's CC button. Alternatively, if you include your own
`<track kind="captions">` elements, these will be used *instead of* the captions on YouTube.

The advantage of managing captions entirely on YouTube is that you only have to manage them in
one place, and they're available everywhere your YouTube video is played.

The advantages of including captions locally in `<track>` elements include:

- Able Player can repurpose the captions into an interactive transcript
- The captions are searchable using the **data-search** attribute
- Users can control how the captions are displayed (e.g., color, background color, opacity)

Adjustable playback rate is available for some videos.

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

*Able Player* includes several keyboard shortcuts that enable users to control the
player from anywhere on the web page, as follows:

-   **p or spacebar** = Play/Pause
-   **s** = Stop
-   **r** = Rewind
-   **f** = Forward
-   **c** = Captions
-   **d** = Description
-   **m** = Mute on/off
-   **v or 1-9** = Volume
-   **e** = Preferences

Note that modifier keys (Alt, Control, and Shift) can be assigned by clicking
the Preferences button on the player. If users find that shortcut keys
aren’t working as advertised, they might have better success by
selecting different combinations of modifier keys to accompany the
default shortcut keys.

By default, keyboard shortcuts must be accompanied by Alt + Control.

User Preferences
----------------

One of *Able Player’s* accessibility features is that the player is
highly customizable by users. The controller includes a Preferences
button that allows users to change default preferences and settings.
Their changes are stored in a browser cookie and in most cases should
therefore be preserved the next time they visit the site. Specifically,
users can control the following:

-   Modifier keys: Add *Alt*, *Ctrl*, or *Shift* to the Able Player keyboard
    shortcuts to avoid conflicts with other applications.
-   Closed captions on by default
-   Description on by default
-   Use text-based description if available.
-   Automatically pause video when text-based description starts
-   If using text-based description, make it visible
-   Transcript on by default
-   Highlight transcript as video plays
-   Keyboard-enable transcript

Building the Able Player source
-------------------------------

The source JavaScript files for Able Player are in the */scripts* directory,
and the source CSS files are in the */styles* directory. These source files
are ultimately combined into several different files (in the */build* directory) using
[npm][] and [Grunt][]:

```sh
npm install
grunt
```

The npm and Grunt build process is defined by the *Gruntfile.js* and *package.json*
files. (Note that the **version number** is specified in *package.json*, and must be
updated when a new version is released).

Files created by the build process are put into the */build* directory:

- **build/ableplayer.js** -
  the default build of *ableplayer.js*
- **build/ableplayer.dist.js** -
  a build of *ableplayer.js* without console logging
- **build/ableplayer.min.js** -
  a minified version of the *dist* file
- **build/ableplayer.min.css** -
  a minified combined version of all Able Player CSS files

Acknowledgments
---------------

- Able Player development is supported in part by the [AccessComputing][] project
at the University of Washington, with financial support from the National Science Foundation
(grants #CNS-0540615, CNS-0837508, and CNS-1042260).
- Additional support has been provided by the
[Committee on Institutional Cooperation][] (CIC).
- Turtle and rabbit icons (available as optional alternatives for the speed buttons) are provided courtesy of [Icons8][].
- Sample video tracks are provided courtesy of [The DO-IT Center][] at the University of Washington. Additional videos are available on the [DO-IT Video][] website, which uses Able Player.
- Sample audio tracks are provided courtesy of Terrill Thompson from his album [Flavors, by Flow Theory][].


  [AccessComputing]: http://washington.edu/accesscomputing
  [Committee on Institutional Cooperation]: https://www.cic.net/home
  [Configuring MIME Types in IIS 7]: http://technet.microsoft.com/en-us/library/17bda1f4-8a0d-440f-986a-5aaa9d40b74c.aspx
  [Editing the Signer]: http://www.sign-lang.uni-hamburg.de/signingbooks/sbrc/grid/d71/guide13.htm
  [develop]: https://github.com/ableplayer/ableplayer/tree/develop
  [examples]: http://ableplayer.github.io/ableplayer/demos/
  [Filming the Signer]: http://www.sign-lang.uni-hamburg.de/signingbooks/sbrc/grid/d71/guide12.htm
  [Flavors, by Flow Theory]: http://www.terrillthompson.com/music/2012/01/flow-theory-flavors/
  [DO-IT Video]: http://washington.edu/doit/video
  [Google Developer Console]: https://console.developers.google.com/
  [Google's Getting Started page]: https://developers.google.com/api-client-library/javascript/start/start-js#Getkeysforyourapplication
  [Grunt]: http://gruntjs.com/
  [How to add MIME Types with IIS7 Web.config]: http://blogs.iis.net/bills/archive/2008/03/25/how-to-add-mime-types-with-iis7-web-config.aspx
  [Icons8]: https://icons8.com
  [issues]: https://github.com/ableplayer/ableplayer/issues
  [jQuery]: http://jquery.com/
  [jquery.cookie]: https://github.com/carhartl/jquery-cookie
  [js-cookie]: https://github.com/js-cookie/js-cookie
  [JW Player]: http://www.jwplayer.com/
  [Modernizr]: http://modernizr.com/
  [npm]: https://www.npmjs.com/
  [Signing Books for the Deaf]: http://www.sign-lang.uni-hamburg.de/signingbooks/
  [The DO-IT Center]: http://washington.edu/doit
  [Video Demo #7]: demos/video7.html
  [WebVTT validator]: https://quuz.org/webvtt/
  [WebAIM’s 2017 Screen Reader User Survey]: https://webaim.org/projects/screenreadersurvey7/#browsers
  [WebVTT]: https://w3c.github.io/webvtt/
  [YouTube's Terms of Service]: https://developers.google.com/youtube/terms/required-minimum-functionality#overlays-and-frames
