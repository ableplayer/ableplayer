Able Player
==========

*Able Player* is a fully accessible cross-browser HTML5 media player. 

To see the player in action check out the [Able Player Examples][examples] page.

Features
--------

-   Supports both audio and video.
-   Supports either a single audio track or an entire playlist.
-   Includes a full set of player controls that are keyboard-accessible, properly labeled for screen reader users, and controllable by speech recognition users.
-   Includes customizable keyboard shortcuts that enable the player to be operated from anywhere on the web page (unless there are multiple instances of the player on a given page; then the player must have focus for keyboard shortcuts to work).
-   Features high contrast, scalable controls that remain visible in Windows High Contrast mode, plus an easy-to-see focus indicator so keyboard users can easily tell which control currently has focus.
-   Supports closed captions and subtitles in Web Video Timed Text (WebVTT) format, the standard format recommended by the HTML5 specification.
-   Supports chapters, also using WebVTT. Chapters are specific landing points in the video, allowing video content to have structure and be more easily navigated.
-   Supports text-based audio description, also using WebVTT. At designated times, the description text is read aloud by browsers, or by screen readers for browsers that don't support the Web Speech API. Users can optionally set their player to pause when audio description starts in order to avoid conflicts between the description and program audio.
-   Supports audio description as a separate video. When two videos are available (one with description and one without), both can be delivered together using the same player and users can toggle between the versions.
-   Supports adjustable playback rate. Users who need to slow down the video in order to better process and understand its content can do so; and users who need to speed up the video in order to maintain better focus can do so.
-   Includes an interactive transcript feature, built from the WebVTT chapter, caption and description files as the page is loaded. Users can click anywhere in the transcript to start playing the video (or audio) at that point.  Keyboard users can also choose to keyboard-enable the transcript, so they can tab through its content one caption at a time and press enter to play the media at the desired point.
-   Features automatic text highlighting within the transcript as the media plays. This feature is enabled by default but can be turned off if users find it distracting.
-   Supports YouTube and Vimeo videos.
-   Provides users with the ability to customize the display of captions and subtitles. Users can control the font style, size, and color of caption text; plus background color and transparency; all from the Preferences dialog. They can also choose to position captions *below* the video instead of the default position (an semi-transparent overlay).
-   Supports fallback content if the media cannot be played (see section on **Fallback** for details).
-   Includes extensive customization options. Many of the features described above are controlled by user preferences. This is based on the belief that every user has different needs and there are no one-size-fits-all solutions. This is the heart of universal design.

Supported Languages
-------------------

Able Player has been translated into the following languages. To add another language, see instructions below under **Contributing**.

<ul>
  <li><strong lang="id">Bahasa Indonesia</strong> (Indonesian)</li>
  <li><strong lang="ca">Català</strong> (Catalan)</li>
  <li><strong lang="cs">čeština</strong> (Czech)</li>
  <li><strong>Chinese, Traditional (Taiwan)</strong></li>  
	<li><strong lang="da">Dansk</strong> (Danish)</li>  
  <li><strong lang="de">Deutsch</strong> (German)</li>
  <li><strong>English</strong></li> 
  <li><strong lang="en">Español</strong> (Spanish)</li> 
  <li><strong lang="fr">Français</strong> (French)</li> 
  <li><strong lang="he">עִברִית</strong> (Hebrew)</li>
  <li><strong>Indonesian</strong></li>
  <li><strong lang="it">Italiano</strong> (Italian)</li>
  <li><strong lang="ja">日本語</strong> (Japanese)</li>  
  <li><strong lang="pt">Português</strong> (Portuguese)</li>  
  <li><strong lang="pt-br">Português - Brasil</strong> (Portuguese - Brazil)</li>  
  <li><strong lang="nb">Norsk Bokmål</strong> (Norwegian)</li> 
  <li><strong lang="nl">Nederlands, Vlaams</strong> (Dutch)</li> 
  <li><strong lang="sv">Svenska</strong> (Swedish)</li> 
  <li><strong lang="tr">Türkçe</strong> (Turkish)</li>
</ul>

Contributing
-------------

There are many ways to contribute to Able Player, and we welcome and appreciate your help! Here are some options:

- If you spot bugs are have feature requests, please submit them to the [Issues][issues] queue.
- If you have code to contribute, please note that all development occurs on the [develop branch][develop]. This is often many commits ahead of the main branch, so please do all development from *develop*, and submit pull requests there. We particularly appreciate help with any issues in the Issues queue that have been flagged with "help wanted".
- If you are multilingual, please consider translating Able Player into another language! All labels, prompts, messages, and help text for each language are contained within a single file, contained within the */translations* directory.

Compatibility
-------------

During development, *Able Player* is routinely tested with the latest versions of the following browsers.

### Windows 
-   Chrome
-   Firefox 
-   Edge

### Mac OS 
-   Chrome 
-   Firefox 
-   Safari 
-   Opera 

### iOS (iPhone and iPad)
-   Safari 

### Android (Google Pixel)
-   Chrome 
-   Firefox 

With the release of version 4.4, we are no longer actively supporting Internet Explorer. 

Dependencies
------------

*Able Player* has the following third party dependencies: 

- *Able Player* uses [jQuery][]. Version 3.2.1 or higher is recommended.
    The example code below uses Google’s hosted libraries; no download required.
- *Able Player* uses [js-cookie][] to store and retrieve user
    preferences in cookies. The example code below uses CDN’s hosted libraries; 
    no download required. Prior to version 2.3, Able Player used [jquery.cookie][]
    for this same purpose.
    
To install Able Player, copy the following files from the Able Player repo into a folder on your web server:
- 		build/* 
-		button-icons/*
- 		images/*
-		styles/* (optional, see note below)
-		translations/* 
-		LICENSE 

The *build* folder includes minified production code (*ableplayer.min.js* and *ableplayer.min.css*). 
For debugging and/or style customization purposes, human-readable source files are also available: 
-		build/ableplayer.js 
-		styles/ableplayer.css 
 

Fallback
--------

All modern browsers have supported HTML5 media elements for many years.
However, there are still older browsers in use that don’t have this support 
(e.g., Internet Explorer 9 and earlier). For these, fallback content should be provided. 
 
Prior to version 4.0, *Able Player* used [JW Player][] as a fallback Flash player 
for older browsers. However, this solution was built specifically on **JW Player 6** 
which is now many versions old and difficult to find. 

Also, prior to version 4.0, *Able Player* used [Modernizr][] to enable 
styling of HTML5 elements in Internet Explorer 6 through 8. This too is no longer 
supported, and Modernizr is no longer needed. 

Instead, we recommend providing alternative content as a child of the `<video>` or `<audio>` element. 
For example, this could be a link to the media file so users can download it 
and play it on their player of choice. Or it could be a link to a transcript. 

If Able Player fails to load, it will fall back to the HTML media element and if the browser supports 
HTML5 media, the browser will provide its own interface for playing the media. If the browser is unable to play the media file, it will display the alternative content. If no alternative content is provided, 
Able Player will inject a short error message for the browser to display. 

Fallback content can be tested by adding the **data-test-fallback** attribute to the  `<audio>` or `<video>` element, with a value of either "1" (emulate failure to build Able Player) or "2" (emulate a browser that doesn't support HTML5 media).

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
<script src="//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js"></script>
<script src="//cdn.jsdelivr.net/npm/js-cookie@3.0.1/dist/js.cookie.min.js"></script>

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
-   **playsinline** - optional but recommended; instructs supporting browsers to play the video "inline" within the web page. This is especially applicable on iPhones, which by default load the video in their own built-in video player, thereby removing it from its surrounding context, which includes Able Player buttons and controls, an interactive transcript, and any other companion features added via Able Player. If this attribute is present, it works for all supported videos, including YouTube and Vimeo videos.
-   **preload** - optional; tells the browser how much media to download
    when the page loads. If the media is the central focus of the web
    page, use **preload="auto"**, which instructs the browser to
    download as much of the media as possible. If the media is not a
    central focus, downloading the entire media resource can consume
    valuable bandwidth, so preload="metadata" would be a better option.
-   **width** - width of the video player in pixels. This value should reflect the target width of the media itself. If not provided the player will be sized to fit its container. This value is supported for audio as well, but this is not valid HTML so **data-width** should be used instead. 
-   **data-width** - width of the media player in pixels (can be used for either audio or video). If neither **width** nor **data-width** are provided, the player will be sized to fit its container.
-   **data-root-path** - define path to root directory of Able Player; generally not required but may be needed in rare instances where Able Player is unable to identify its current path on the web server
-   **data-heading-level** - optional; Able Player injects an off-screen HTML heading "Media Player" (or localized equivalent) at the top of the player so screen reader users can easily find the player. It automatically assigns a heading level that is one level deeper than the closest parent heading. This attribute can be used to manually set the heading level, rather than relying on Able Player to assign it automatically. Valid values are 1 through 6. A value of 0 is also supported, and instructs Able Player to not inject a heading at all. The latter should be used only if the web page already includes a heading immediately prior to the media player.
-   **data-hide-controls** - optional; set to "true" to hide controls during playback. Controls are visibly hidden but still accessible to assistive technologies. Controls reappear if user presses any key or moves the mouse over the video player region.
-   **data-icon-type** - optional; "svg", "font" or "image"; "svg" is the default with automatic fallback to "font" unless either (a) the browser doesn't support icon fonts or (b) the user has a custom style sheet that may impact the display of icon fonts; in either case falls back to images. Should generally leave as is unless testing the fallback.
-   **data-skin** - optional; "legacy (default) or "2020". The default skin has two rows of controls, with the seekbar positioned in available space within the top row. The "2020" skin, introduced in version 4.2, has all buttons in one row beneath a full-width seekbar. 
-   **data-speed-icons** - optional; "animals" (default) or "arrows". The default setting uses a turtle icon for *slower* and a rabbit icon for *faster*. Setting this to "arrows" uses the original Able Player icons (prior to version 3.5), arrows pointing up for *faster* and down for *slower*.
-   **data-start-time** - optional; time at which you want the audio to start playing (in seconds)
-   **data-steno-iframe-id** - optional; id of an iframe in which users will be typing with steno-mode enabled (see next item).
-   **data-steno-mode** - optional; "true" to allow keyboard shortcuts for controlling the player remotely within textarea form fields, e.g., for transcribing media content. 
-   **data-volume** - optional; set the default volume (0 to 10; default is 7 to avoid overpowering screen reader audio)
-   **data-seek-interval** - optional; interval (in seconds) of forward and rewind buttons. By default, seek interval is intelligently calculated based on  duration of the media.
-   **data-show-now-playing** - optional; "true" to include "Selected track" section within player; only applies when a playlist is present

#### Language

-   **data-lang** - optional; specify language of the player using 2-character language code. In order to work, the language specified must be one of Able Player's supported languages (see **Supported Languages** above). If **data-lang** is not included or specifies a language that is not supported, Able Player will default to the language of the web page if known and supported; otherwise it will default to English.   

#### Captions

-   **data-captions-position** - optional; specify default position of captions relative to the video (either "below" or "overlay"; "below" is the default if not specified). Users can override this setting in Captions Preferences.
-   **data-state-captions** - optional; "on" or "off". Captions are on by default if they're available, but this allows website owners to override that setting. If users enable captions, their preference will be saved in a cookie, and that will override the default setting on future visits.

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

-   **data-search-div** - required for search; id of external container in which to display search results
-   **data-search** - optional; search terms to search for within the caption tracks, separated by a space
-   **data-search-lang** - optional; specify 2-character language code of caption or subtitle track to search. If unspecified, searches the default language, which is the language of the web page if specified using the *lang* attribute on either the `<html>` or `<body>` tag. 
-   **data-search-ignore-caps** - optional; ignore capitalization in search terms. If omitted, search is case-sensitive.

#### Fallback Player

-   **data-test-fallback** - optional (for testing); force browsers to display fallback content. Set to either of the following values:
    -  "1" - emulate failure to build Able Player 
		-  "2" - emulate browser that doesn't support HTML5 media  

The following attributes are supported on the `<video>` element only:

-   **data-allow-fullscreen** - optional; if set to "false" the player will not include a fullscreen button
-   **data-youtube-id** - optional; 11-character YouTube ID, to play the YouTube video using *Able Player*.
-   **data-youtube-desc-id** - optional; 11-character YouTube ID of the described version of a video. See the section below on *YouTube Support* for additional information.
-   **data-youtube-nocookie** - optional; if set to "true" the YouTube video will be embedded using the "youtube-nocookie.com" host.
-   **data-vimeo-id** - optional; ID of a video on Vimeo, to play the Vimeo video using *Able Player*.
-   **data-vimeo-desc-id** - optional; ID of the described version of a video on Vimeo. See the section below on *Vimeo Support* for additional information.
-   **height** - height of the video in pixels. 
-   **poster** - path to an image file. Will be displayed in the player
    until the video is played.
    
If width and height are omitted, the player will be sized to fit its container. 

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
rather than captions. With this method, description text is read aloud by 
browsers that support the [Web Speech API][]; otherwise it's written to an  
ARIA live region, so supporting screen readers will automatically announce 
the new text as soon as it is written to the page. There are many advantages 
to having browsers perform this function: It frees screen readers to perform 
other tasks without disrupting audio description; it makes it possible to 
pause during audio description then automatically resume playback when description 
is complete; and it allows users to customize the voice, pitch, rate and volume 
that are used for reading description (via the Description Prefences dialog). 
However, in rare instances it might be preferable to have screen readers
perform this function rather than browsers (e.g., if a language is not well supported
by the Web Speech API). In such instances, use **data-desc-reader="screenreader"** 
(otherwise this property will default to "browser"). 

The second method is to produce a separate video with description mixed
in. If multiple video sources are already provided (e.g., an MP4 and
WebM file), then the described version must be available in both of
these formats. For each video source that has a described version
available, add a **data-desc-src** attribute to the `<source>` element for
that video. The value of this attribute is a path pointing to the
described version of the video. With this method, the described version
of the video can be played instead of the non-described version, and the
two versions can be swapped with clicking the "Descriptions" button on the
controller.

If descriptions are available using either of the above methods, a
Description toggle button appears on the controller (represented by the
universal Description symbol, the letter "D"). How descriptions are
ultimately delivered depends on which of the above methods is used. 

If *both* methods are used, description will be delivered using the separate  
described version of the video. However, the WebVTT file will be used to 
(a) display the description text visibly (if users have selected this option in their 
preferences), and (b) incorporate the description text into the 
auto-generated interactive transcript. Therefore, it is important for the 
WebVTT description file to be accurately synchronized with the separate 
described version of the video.  

In some applications, a WebVTT descriptions file might be used solely for the purposes 
of displaying visible description text or incorporating description text into the 
auto-generated transcript, and the WebVTT description text is not intended to be read aloud 
by screen readers or browsers  (for example, if the sole video source is a described video).
In such cases, use **data-descriptions-audible="false"** to prevent browsers and screen readers 
from announcing the description text. 

If description is available through either of the above methods, it is off by default and users must enable it using the "Descriptions" button on the player control. Website owners can override   
this setting and change the default state to "on" using **data-state-descriptions="on"**. Also, website owners can define the default state of extended descriptions (i.e., pausing the video during audio description) using **data-desc-pause-default**. Supported values are either "off" or "on". Setting this to "off" is useful if all videos have plenty of audio space for description to be read, and pausing is therefore unnecessary. The default setting is "on". If users have changed this setting in the Description Preferences dialog, their preference will be saved in a cookie, and that will override the default setting on future visits. 

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
This button will toggle the display of a pop-up window in which
the sign language video will appear. Users can move or resize the pop-up window 
with either mouse or keyboard.   

Unfortunately this feature is not currently supported on iOS. 

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

An *Able Player* playlist is an HTML list of tracks. A playlist can accompany 
either a video or audio player, but both audio and video cannot be combined 
within a single playlist. The list can be either ordered (`<ol>`) or unordered (`<ul>`). 
The size of the media player is controlled via the media player itself 
(e.g., with **width** and **height** attributes on the `<video>` element). 
Each item in the playlist is scaled to fit the player. 

The following attributes are supported on the list element:

-   **class** - required; must be **able-playlist**
-   **data-player** - required; must reference the ID of the media
    player in which the playlist should be played.
-   **data-embedded** - optional; add this attribute if you want your
    playlist to be embedded into the media player. If this attribute is
    omitted, the playlist will be external to the player and will appear
    wherever you place it on the web page.

Within the playlist, each list item can include the following HTML attributes: 

-   **data-poster** - path to an image file. 

The following HTML elements must be nested inside each list item: 

A `<span>` element with **class="able-source"** for each `<source>` element 
    that is to accompany the media. When the user selects an item from the playlist, 
    its able-source `<span>` elements will be copied to `<source>` elements and loaded for playback. 
    For each attribute that will ultimately be on the media's `<source>` elements, 
    add the same attributes to each `<span>`, prefaced with **data-**. 


Within the playlist, each list item must include the following HTML elements: 

-   A `<span>` element with **class="able-source"** for each `<source>` element 
    that is to accompany the media. When the user selects an item from the playlist, 
    its able-source `<span>` elements will be copied to `<source>` elements and loaded for playback. 
    For each attribute that will ultimately be on the media's `<source>` elements, 
    add the same attributes to each `<span>`, prefaced with **data-**. 
-   A `<span>` element with **class="able-track"** for each `<track>` element 
    that is to accompany the media. When the user selects an item from the playlist, 
    its able-track `<span>` elements will be copied to `<track>` elements and loaded for playback. 
    For each attribute that will ultimately be on the media's `<track>` elements, 
    add the same attributes to each `<span>`, prefaced with **data-**. 
-   A `<button>` element with **type="button"**. Inside the button, include either text, 
    an image, or both. This content would typically be the title of the item. If using an image 
    alone, be sure to add a meaningful **alt** attribute. If the image is purely decorative and 
    is accompanied by text, using **alt=""**. 
    
The following example shows a playlist with two videos. The first video has one source (an MP4 file), 
and two tracks (captions and descriptions). The second video is hosted on YouTube, and has both a 
non-described and described version. It also has a locally-hosted chapters track.  
Able Player supports mixed playlists, with videos hosted locally or on YouTube. 
Vimeo videos are not yet supported within playlists.  
  
```HTML
<ul class="able-playlist" data-player="my_video_player">
  <li data-poster="video1.jpg">
    <span class="able-source" 
      data-type="video/mp4" 
      data-src="video1.mp4">
    </span>
    <span class="able-track" 
      data-kind="captions" 
      data-src="video1_captions_en.vtt" 
      data-srclang="en"
      data-label="English">
    </span>
    <span class="able-track"
      data-kind="descriptions"
      data-src="video1_description_en.vtt"
      data-srclang="en"
      data-label="English">
    </span>
    <button type="button">
      <img src="video1_thumbnail.jpg" alt="">
      Title of Video 1
    </button>
  </li>
  <li data-youtube-id="xxxxxxxxxxx" data-youtube-desc-id="yyyyyyyyyyy">
    <span class="able-track"
      data-kind="chapters"
      data-src="video2_chapters.vtt"
      data-srclang="en"
      data-label="Chapters">
    </span>
    <button type="button">
      <!-- thumbnail will be retrieved from YouTube -->
      Title of Video 2
    </button>
  </li>
</ul>
```

For additional examples of both audio and video playlists, see the [Able Player Examples][examples] page.

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
on the `<video>` element. The value of this attribute can be the video's 11-character YouTube ID, 
or a YouTube URL in any of the following formats (where xxx is the 11-character ID): 
-  	https://youtu.be/xxx
-  	https://www.youtube.com/watch?v=xxx
-  	https://www.youtube.com/embed/xxx

If a described version of the video is available on YouTube, include a **data-youtube-desc-id** attribute on the `<video>` element. The value of this attribute can be the 11-character YouTube ID
of the described version (or a YouTube URL, in any of the above formats). 

If users turn on the Description button on their player controller, the described version of the video will be loaded instead of the non-described version.

### Important Changes to YouTube Support

On November 10, 2021, Google eliminated the *timedtext* API, which for years had been a dependable, albeit undocumented, means of getting access to YouTube caption files. 
Able Player version 4.3.27 restores Able Player's ability to toggle captions on and off using the CC button, and to select available languages from a popup menu. 
However, it is no longer possible to have full Able Player functionality 
unless captions and subtitles are hosted locally. 
See the section below on *Limitations of hosting captions and subtitles on YouTube or Vimeo*. 

Vimeo Support
---------------

To play a Vimeo video in *Able Player*, simply include a **data-vimeo-id** attribute
on the `<video>` element. The value of this attribute can be the video's Vimeo ID (a string of numbers or characters), or it can be a full Vimeo URL, such as https://vimeo.com/xxx where xxx is the Vimeo ID.

If a described version of the video is available on Vimeo, include a **data-vimeo-desc-id** attribute
on the `<video>` element. The value of this attribute can be the Vimeo ID or URL of the 
described version. If users turn on the Description button on their player controller,
the described version of the video will be loaded instead of the non-described version.

Note that Vimeo currently has some limitations:  

-   A Plus, Pro or Business account is required in order to hide Vimeo's default controller. If videos are hosted on a free account, the Vimeo controller and Able Player controller are both shown. The Vimeo controller disappears temporarily after playback begins, but until then having both players present is cluttered and confusing. 
-   A Pro or Business account is required in order to change playback rate (with faster and slower buttons). This functionality is *not* supported with a Plus account. Even with a Pro or Business account, this feature is off by default and "Speed controls" need to be enabled within the settings for each video.

In addition, if captions and subtitles are hosted on Vimeo, Able Player can control toggling them on/off and choosing languages via the CC button. However, Able Player's full functionality is not available. See the section below on *Limitations of hosting captions and subtitles on YouTube or Vimeo*. 

Limitations of hosting captions and subtitles on YouTube or Vimeo
----------

If captions and subtitles are hosted on YouTube or Vimeo, Able Player can control toggling them on/off and choosing languages via the CC button. However, Able Player's full functionality is not available. Specifically: 

*  Able Player is unable to auto-generate an interactive transcript from the caption text. 
*  Able Player's caption search features don't work. 
*  Users have limited control over how captions are displayed. If captions are hosted locally, users have control over their position, font, font size, text and background colors, and opacity through the Caption Preferences dialog. If captions are hosted solely on YouTube, users can change font size via Able Player but not the other settings. If captions are hosted solely on Vimeo, users have no control over their appearance via Able Player.

Given these limitations, we recommend storing captions and subtitles locally and referencing them with a `<track>` element. In fact, all local `<track>` elements (captions, subtitles, chapters, descriptions, and metadata tracks) work for YouTube and Vimeo videos, just as they do for videos hosted locally. 

If captions and subtitles are hosted locally, in addition to being hosted on YouTube or Vimeo 
(i.e., to ensure accessibility of videos when viewed directly on these platforms), the local captions will take precedence in Able PLayer in order to provide full functionality. 


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
-   **b** = Back (previous track in playlist)
-   **n** = Next (next track in playlist) 
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
# Install Grunt globally 
npm install -g grunt-cli

# Install project dependencies
npm install

# Build CSS and JS
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
- Sample audio tracks feature songs by Terrill Thompson, Able Player's creator and lead developer. Check out [Terrill's music site] for more listening, and to support his work.


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
  [Terrill's music site]: https://terrillthompson.com/music
  [The DO-IT Center]: http://washington.edu/doit
  [Video Demo #7]: demos/video7.html
  [WebVTT validator]: https://quuz.org/webvtt/
  [WebAIM’s 2017 Screen Reader User Survey]: https://webaim.org/projects/screenreadersurvey7/#browsers
  [WebVTT]: https://w3c.github.io/webvtt/
  [Web Speech API]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
  [YouTube's Terms of Service]: https://developers.google.com/youtube/terms/required-minimum-functionality#overlays-and-frames
