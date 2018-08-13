(function ($) {
  // Set default variable values.
  AblePlayer.prototype.setDefaults = function () {

    this.playing = false; // will change to true after 'playing' event is triggered
    this.clickedPlay = false; // will change to true temporarily if user clicks 'play' (or pause)

    this.getUserAgent();
    this.setIconColor();
    this.setButtonImages();
  };

  AblePlayer.prototype.getRootPath = function() {

    // returns Able Player root path (assumes ableplayer.js is in /build, one directory removed from root)
    var scripts, i, scriptSrc, scriptFile, fullPath, ablePath, parentFolderIndex, rootPath;
    scripts= document.getElementsByTagName('script');
    for (i=0; i < scripts.length; i++) {
      scriptSrc = scripts[i].src;
      scriptFile = scriptSrc.substr(scriptSrc.lastIndexOf('/'));
      if (scriptFile.indexOf('ableplayer') !== -1) {
        // this is the ableplayerscript
        fullPath = scriptSrc.split('?')[0]; // remove any ? params
        break;
      }
    }
    ablePath= fullPath.split('/').slice(0, -1).join('/'); // remove last filename part of path
    parentFolderIndex = ablePath.lastIndexOf('/');
    rootPath = ablePath.substring(0, parentFolderIndex) + '/';
    return rootPath;
  }

  AblePlayer.prototype.setIconColor = function() {

    // determine the best color choice (white or black) for icons,
    // given the background-color of their container elements
    // Source for relative luminance formula:
    // https://en.wikipedia.org/wiki/Relative_luminance

    // We need to know the color *before* creating the element
    // so the element doesn't exist yet when this function is called
    // therefore, need to create a temporary element then remove it after color is determined
    // Temp element must be added to the DOM or WebKit can't retrieve its CSS properties

    var $elements, i, $el, bgColor, rgb, red, green, blue, luminance, iconColor;

    $elements = ['controller', 'toolbar'];
    for (i=0; i<$elements.length; i++) {
      if ($elements[i] == 'controller') {
        $el =  $('<div>', {
          'class': 'able-controller'
        }).hide();
      }
      else if ($elements[i] === 'toolbar') {
        $el =  $('<div>', {
          'class': 'able-window-toolbar'
        }).hide();
      }
      $('body').append($el);
      bgColor = $el.css('background-color');
      // bgColor is a string in the form 'rgb(R, G, B)', perhaps with a 4th item for alpha;
      // split the 3 or 4 channels into an array
      rgb = bgColor.replace(/[^\d,]/g, '').split(',');
      red = rgb[0];
      green = rgb[1];
      blue = rgb[2];
      luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
      // range is 1 - 255; therefore 125 is the tipping point
      if (luminance < 125) { // background is dark
        iconColor = 'white';
      }
      else { // background is light
        iconColor = 'black';
      }
      if ($elements[i] === 'controller') {
        this.iconColor = iconColor;
      }
      else if ($elements[i] === 'toolbar') {
        this.toolbarIconColor = iconColor;
      }
      $el.remove();
    }
  };

  AblePlayer.prototype.setButtonImages = function() {

    // NOTE: volume button images are now set dynamically within volume.js
    this.imgPath = this.rootPath + 'button-icons/' + this.iconColor + '/';
    this.playButtonImg = this.imgPath + 'play.png';
    this.pauseButtonImg = this.imgPath + 'pause.png';

    this.restartButtonImg = this.imgPath + 'restart.png';

    this.rewindButtonImg = this.imgPath + 'rewind.png';
    this.forwardButtonImg = this.imgPath + 'forward.png';

    this.previousButtonImg = this.imgPath + 'previous.png';
    this.nextButtonImg = this.imgPath + 'next.png';

    if (this.speedIcons === 'arrows') {
      this.fasterButtonImg = this.imgPath + 'slower.png';
      this.slowerButtonImg = this.imgPath + 'faster.png';
    }
    else if (this.speedIcons === 'animals') {
      this.fasterButtonImg = this.imgPath + 'rabbit.png';
      this.slowerButtonImg = this.imgPath + 'turtle.png';
    }

    this.captionsButtonImg = this.imgPath + 'captions.png';
    this.chaptersButtonImg = this.imgPath + 'chapters.png';
    this.signButtonImg = this.imgPath + 'sign.png';
    this.transcriptButtonImg = this.imgPath + 'transcript.png';
    this.descriptionsButtonImg = this.imgPath + 'descriptions.png';

    this.fullscreenExpandButtonImg = this.imgPath + 'fullscreen-expand.png';
    this.fullscreenCollapseButtonImg = this.imgPath + 'fullscreen-collapse.png';

    this.prefsButtonImg = this.imgPath + 'preferences.png';
    this.helpButtonImg = this.imgPath + 'help.png';
  };

  AblePlayer.prototype.getSvgData = function(button) {

    // returns array of values for creating <svg> tag for specified button
    // 0 = <svg> viewBox attribute
    // 1 = <path> d (description) attribute
    var svg = Array();

    switch (button) {

      case 'play':
        svg[0] = '0 0 16 20';
        svg[1] = 'M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z';
        break;

      case 'pause':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z';
        break;

      case 'stop':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h15.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-15.714q-0.29 0-0.502-0.212t-0.212-0.502z';
        break;

      case 'restart':
        svg[0] = '0 0 20 20';
        svg[1] = 'M18 8h-6l2.243-2.243c-1.133-1.133-2.64-1.757-4.243-1.757s-3.109 0.624-4.243 1.757c-1.133 1.133-1.757 2.64-1.757 4.243s0.624 3.109 1.757 4.243c1.133 1.133 2.64 1.757 4.243 1.757s3.109-0.624 4.243-1.757c0.095-0.095 0.185-0.192 0.273-0.292l1.505 1.317c-1.466 1.674-3.62 2.732-6.020 2.732-4.418 0-8-3.582-8-8s3.582-8 8-8c2.209 0 4.209 0.896 5.656 2.344l2.344-2.344v6z';
        break;

      case 'rewind':
        svg[0] = '0 0 20 20';
        svg[1] = 'M11.25 3.125v6.25l6.25-6.25v13.75l-6.25-6.25v6.25l-6.875-6.875z';
        break;

      case 'forward':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10 16.875v-6.25l-6.25 6.25v-13.75l6.25 6.25v-6.25l6.875 6.875z';
        break;

      case 'previous':
        svg[0] = '0 0 20 20';
        svg[1] = 'M5 17.5v-15h2.5v6.875l6.25-6.25v13.75l-6.25-6.25v6.875z';
        break;

      case 'next':
        svg[0] = '0 0 20 20';
        svg[1] = 'M15 2.5v15h-2.5v-6.875l-6.25 6.25v-13.75l6.25 6.25v-6.875z';
        break;

      case 'slower':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0 7.321q0-0.29 0.212-0.502t0.502-0.212h10q0.29 0 0.502 0.212t0.212 0.502-0.212 0.502l-5 5q-0.212 0.212-0.502 0.212t-0.502-0.212l-5-5q-0.212-0.212-0.212-0.502z';
        break;

      case 'faster':
        svg[0] = '0 0 11 20';
        svg[1] = 'M0 12.411q0-0.29 0.212-0.502l5-5q0.212-0.212 0.502-0.212t0.502 0.212l5 5q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-10q-0.29 0-0.502-0.212t-0.212-0.502z';
        break;

      case 'turtle':
        svg[0] = '0 0 20 20';
        svg[1] = 'M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z';
        break;

      case 'rabbit':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z';
        break;

      case 'ellipsis':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2zM3.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.986 2.199-2.2s-0.984-2.2-2.199-2.2zM17.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2z';
        break;

      case 'pipe':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10.15 0.179h0.623c0.069 0 0.127 0.114 0.127 0.253v19.494c0 0.139-0.057 0.253-0.127 0.253h-1.247c-0.069 0-0.126-0.114-0.126-0.253v-19.494c0-0.139 0.057-0.253 0.126-0.253h0.623z';
        break;

      case 'captions':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z';
        break;

      case 'descriptions':
        svg[0] = '0 0 20 20';
        svg[1] = 'M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z';
        break;

      case 'sign':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z';
        break;

      case 'mute':
        svg[0] = '0 0 20 20';
        svg[1] = 'M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z';
        break;

      case 'volume-mute':
        svg[0] = '0 0 20 20';
        svg[1] = 'M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
        break;

      case 'volume-medium':
        svg[0] = '0 0 20 20';
        svg[1] = 'M14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
        break;

      case 'volume-loud':
        svg[0] = '0 0 21 20';
        svg[1] = 'M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
        break;

      case 'chapters':
        svg[0] = '0 0 20 20';
        svg[1] = 'M5 2.5v17.5l6.25-6.25 6.25 6.25v-17.5zM15 0h-12.5v17.5l1.25-1.25v-15h11.25z';
        break;

      case 'transcript':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0 19.107v-17.857q0-0.446 0.313-0.759t0.759-0.313h8.929v6.071q0 0.446 0.313 0.759t0.759 0.313h6.071v11.786q0 0.446-0.313 0.759t-0.759 0.312h-15q-0.446 0-0.759-0.313t-0.313-0.759zM4.286 15.536q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 12.679q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 9.821q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM11.429 5.893v-5.268q0.246 0.156 0.402 0.313l4.554 4.554q0.156 0.156 0.313 0.402h-5.268z';
        break;

      case 'preferences':
        svg[0] = '0 0 20 20';
        svg[1] = 'M18.238 11.919c-1.049-1.817-0.418-4.147 1.409-5.205l-1.965-3.404c-0.562 0.329-1.214 0.518-1.911 0.518-2.1 0-3.803-1.714-3.803-3.828h-3.931c0.005 0.653-0.158 1.314-0.507 1.919-1.049 1.818-3.382 2.436-5.212 1.382l-1.965 3.404c0.566 0.322 1.056 0.793 1.404 1.396 1.048 1.815 0.42 4.139-1.401 5.2l1.965 3.404c0.56-0.326 1.209-0.513 1.902-0.513 2.094 0 3.792 1.703 3.803 3.808h3.931c-0.002-0.646 0.162-1.3 0.507-1.899 1.048-1.815 3.375-2.433 5.203-1.387l1.965-3.404c-0.562-0.322-1.049-0.791-1.395-1.391zM10 14.049c-2.236 0-4.050-1.813-4.050-4.049s1.813-4.049 4.050-4.049 4.049 1.813 4.049 4.049c-0 2.237-1.813 4.049-4.049 4.049z';
        break;

      case 'close':
        svg[0] = '0 0 16 20';
        svg[1] = 'M1.228 14.933q0-0.446 0.312-0.759l3.281-3.281-3.281-3.281q-0.313-0.313-0.313-0.759t0.313-0.759l1.518-1.518q0.313-0.313 0.759-0.313t0.759 0.313l3.281 3.281 3.281-3.281q0.313-0.313 0.759-0.313t0.759 0.313l1.518 1.518q0.313 0.313 0.313 0.759t-0.313 0.759l-3.281 3.281 3.281 3.281q0.313 0.313 0.313 0.759t-0.313 0.759l-1.518 1.518q-0.313 0.313-0.759 0.313t-0.759-0.313l-3.281-3.281-3.281 3.281q-0.313 0.313-0.759 0.313t-0.759-0.313l-1.518-1.518q-0.313-0.313-0.313-0.759z';
        break;

      case 'fullscreen-expand':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0 18.036v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502zM8.717 8.393q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257z';
        break;

      case 'fullscreen-collapse':
        svg[0] = '0 0 20 20';
        svg[1] = 'M0.145 16.964q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257zM8.571 9.464v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502z';
        break;

      case 'help':
        svg[0] = '0 0 11 20';
        svg[1] = 'M0.577 6.317q-0.028-0.167 0.061-0.313 1.786-2.969 5.179-2.969 0.893 0 1.797 0.346t1.629 0.926 1.183 1.423 0.458 1.769q0 0.603-0.173 1.127t-0.391 0.854-0.614 0.664-0.642 0.485-0.681 0.396q-0.458 0.257-0.765 0.725t-0.307 0.748q0 0.19-0.134 0.363t-0.313 0.173h-2.679q-0.167 0-0.285-0.206t-0.117-0.419v-0.502q0-0.926 0.725-1.747t1.596-1.211q0.658-0.301 0.938-0.625t0.279-0.848q0-0.469-0.519-0.826t-1.2-0.357q-0.725 0-1.205 0.324-0.391 0.279-1.194 1.283-0.145 0.179-0.346 0.179-0.134 0-0.279-0.089l-1.83-1.395q-0.145-0.112-0.173-0.279zM3.786 16.875v-2.679q0-0.179 0.134-0.313t0.313-0.134h2.679q0.179 0 0.313 0.134t0.134 0.313v2.679q0 0.179-0.134 0.313t-0.313 0.134h-2.679q-0.179 0-0.313-0.134t-0.134-0.313z';
        break;
    }

    return svg;
  };

  // Initialize player based on data on page.
  // This sets some variables, but does not modify anything.  Safe to call multiple times.
  // Can call again after updating this.media so long as new media element has the same ID.
  AblePlayer.prototype.reinitialize = function () {

    var deferred, promise, thisObj, errorMsg, srcFile;

    deferred = new $.Deferred();
    promise = deferred.promise();
    thisObj = this;

    // if F12 Developer Tools aren't open in IE (through 9, no longer a problen in IE10)
    // console.log causes an error - can't use debug without a console to log messages to
    if (! window.console) {
      this.debug = false;
    }

    this.startedPlaying = false;
    // TODO: Move this setting to cookie.
    this.autoScrollTranscript = true;
    //this.autoScrollTranscript = this.getCookie(autoScrollTranscript); // (doesn't work)

    // Bootstrap from this.media possibly being an ID or other selector.
    this.$media = $(this.media).first();
    this.media = this.$media[0];

    // Set media type to 'audio' or 'video'; this determines some of the behavior of player creation.
    if (this.$media.is('audio')) {
      this.mediaType = 'audio';
    }
    else if (this.$media.is('video')) {
      this.mediaType = 'video';
    }
    else {
      // Able Player was initialized with some element other than <video> or <audio>
      this.provideFallback();
      deferred.fail();
      return promise;
    }

    this.$sources = this.$media.find('source');

    this.player = this.getPlayer();
    if (!this.player) {
      // an error was generated in getPlayer()
      this.provideFallback();
    }
    this.setIconType();
    this.setDimensions();

    deferred.resolve();
    return promise;
  };

  AblePlayer.prototype.setDimensions = function() {
    // if media element includes width and height attributes,
    // use these to set the max-width and max-height of the player
    if (this.$media.attr('width') && this.$media.attr('height')) {
      this.playerMaxWidth = parseInt(this.$media.attr('width'), 10);
      this.playerMaxHeight = parseInt(this.$media.attr('height'), 10);
    }
    else if (this.$media.attr('width')) {
      // media element includes a width attribute, but not height
      this.playerMaxWidth = parseInt(this.$media.attr('width'), 10);
    }
    else {
      // set width to width of #player
      // don't set height though; YouTube will automatically set that to match width
      this.playerMaxWidth = this.$media.parent().width();
      this.playerMaxHeight = this.getMatchingHeight(this.playerMaxWidth);
    }
    // override width and height attributes with in-line CSS to make video responsive
    this.$media.css({
      'width': '100%',
      'height': 'auto'
    });
  };

  AblePlayer.prototype.getMatchingHeight = function(width) {

    // returns likely height for a video, given width
    // These calculations assume 16:9 aspect ratio (the YouTube standard)
    // Videos recorded in other resolutions will be sized to fit, with black bars on each side
    // This function is only called if the <video> element does not have width and height attributes

    var widths, heights, closestWidth, closestIndex, closestHeight, height;

    widths = [ 3840, 2560, 1920, 1280, 854, 640, 426 ];
    heights = [ 2160, 1440, 1080, 720, 480, 360, 240 ];
    closestWidth = null;
    closestIndex = null;

    $.each(widths, function(index){
      if (closestWidth == null || Math.abs(this - width) < Math.abs(closestWidth - width)) {
        closestWidth = this;
        closestIndex = index;
      }
    });
    closestHeight = heights[closestIndex];
    this.aspectRatio = closestWidth / closestHeight;
    height = Math.round(width / this.aspectRatio);
    return height;
  };

  AblePlayer.prototype.setIconType = function() {

    // returns either "svg", "font" or "image" (in descending order of preference)
    // Test for support of each type. If not supported, test the next type.
    // last resort is image icons

    var $tempButton, $testButton, controllerFont;

    if (this.forceIconType) {
      // use value specified in data-icon-type
      return false;
    }

    // test for SVG support
    // Test this method widely; failed as expected on IE8 and below
    // https://stackoverflow.com/a/27568129/744281
    if (!!(document.createElementNS && document.createElementNS('http://www.w3.org/2000/svg','svg').createSVGRect)) {
      // browser supports SVG
      this.iconType = 'svg';
    }
    else {
      // browser does NOT support SVG
      // test whether browser can support icon fonts, and whether user has overriding the default style sheet
      // which could cause problems with proper display of the icon fonts
      if (window.getComputedStyle) {

        // webkit doesn't return calculated styles unless element has been added to the DOM
        // and is visible (note: visibly clipped is considered "visible")
        // use playpauseButton for font-family test if it exists; otherwise must create a new temp button
        if ($('span.icon-play').length) {
          $testButton = $('span.icon-play');
        }
        else {
          $tempButton = $('<span>',{
            'class': 'icon-play able-clipped'
          });
          $('body').append($tempButton);
          $testButton = $tempButton;
        }

        // the following retrieves the computed value of font-family
        // tested in Firefox 45.x with "Allow pages to choose their own fonts" unchecked - works!
        // tested in Chrome 49.x with Font Changer plugin - works!
        // tested in IE with user-defined style sheet enables - works!
        // It does NOT account for users who have "ignore font styles on web pages" checked in IE
        // There is no known way to check for that ???
        controllerFont = window.getComputedStyle($testButton.get(0), null).getPropertyValue('font-family');
        if (typeof controllerFont !== 'undefined') {
          if (controllerFont.indexOf('able') !== -1) {
            this.iconType = 'font';
          }
          else {
            this.iconType = 'image';
          }
        }
        else {
          // couldn't get computed font-family; use images to be safe
          this.iconType = 'image';
        }
      }
      else { // window.getComputedStyle is not supported (IE 8 and earlier)
        // No known way to detect computed font
        // The following retrieves the value from the style sheet, not the computed font
        // controllerFont = $tempButton.get(0).currentStyle.fontFamily;
        // It will therefore return "able", even if the user is overriding that with a custom style sheet
        // To be safe, use images
        this.iconType = 'image';
      }
      if (this.debug) {
        console.log('Using ' + this.iconType + 's for player controls');
      }
      if (typeof $tempButton !== 'undefined') {
        $tempButton.remove();
      }
    }
  };

  // Perform one-time setup for this instance of player; called after player is first initialized.
  AblePlayer.prototype.setupInstance = function () {
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    if (this.$media.attr('id')) {
      this.mediaId = this.$media.attr('id');
    }
    else {
      // Ensure the base media element always has an ID.
      this.mediaId = "ableMediaId_" + this.ableIndex;
      this.$media.attr('id', this.mediaId);
    }
    // get playlist for this media element
    this.setupInstancePlaylist();

    deferred.resolve();
    return promise;
  };

  AblePlayer.prototype.setupInstancePlaylist = function() {
    // find a matching playlist and set this.hasPlaylist
    // if there is one, also set this.$playlist, this.playlistIndex, & this.playlistEmbed
    var thisObj = this;

    this.hasPlaylist = false; // will change to true if a matching playlist is found

    $('.able-playlist').each(function() {
      if ($(this).data('player') === thisObj.mediaId) {
        // this is the playlist for the current player
        thisObj.hasPlaylist = true;
        // If using an embedded player, we'll replace $playlist with the clone later.
        thisObj.$playlist = $(this).find('li');
        // add tabindex to each list item
        $(this).find('li').attr('tabindex', '0');
        thisObj.playlistIndex = 0;
        var dataEmbedded = $(this).data('embedded');
        if (typeof dataEmbedded !== 'undefined' && dataEmbedded !== false) {
          // embed playlist within player
          thisObj.playlistEmbed = true;
        }
        else {
          thisObj.playlistEmbed = false;
        }
      }
    });

    if (this.hasPlaylist && this.loop) {
      // browser will loop the current track in the playlist, rather than the playlist
      // therefore, need to remove loop attribute from media element
      // but keep this.loop as true and handle the playlist looping ourselves
      this.media.removeAttribute('loop');
    }

    if (this.hasPlaylist && this.playlistEmbed) {
      // Copy the playlist out of the dom, so we can reinject when we build the player.
      var parent = this.$playlist.parent();
      this.$playlistDom = parent.clone();
      parent.remove();
    }
  };

  // Creates the appropriate player for the current source.
  AblePlayer.prototype.recreatePlayer = function () {
    var thisObj, prefsGroups, i;
    thisObj = this;

    // TODO: Ensure when recreating player that we carry over the mediaId
    if (!this.player) {
      console.log("Can't create player; no appropriate player type detected.");
      return;
    }

    this.loadCurrentPreferences();

    this.injectPlayerCode();
    this.initSignLanguage();
    this.setupTracks().then(function() {

      thisObj.setupAltCaptions().then(function() {

        if (thisObj.transcriptType === 'external' || thisObj.transcriptType === 'popup') {
          if (thisObj.captions.length <= 1) {
            // without captions/subtitles in multiple languages,
            // there is no need for a transcript language selector
            thisObj.$transcriptLanguageSelect.parent().remove();
          }
        }

        thisObj.initDescription();
        thisObj.initDefaultCaption();

        thisObj.initPlayer().then(function() { // initPlayer success
          thisObj.initializing = false;

          // setMediaAttributes() sets textTrack.mode to 'disabled' for all tracks
          // This tells browsers to ignore the text tracks so Able Player can handle them
          // However, timing is critical as browsers - especially Safari - tend to ignore this request
          // unless it's sent late in the intialization process.
          // If browsers ignore the request, the result is redundant captions
          thisObj.setMediaAttributes();

          // inject each of the hidden forms that will be accessed from the Preferences popup menu
          prefsGroups = thisObj.getPreferencesGroups();
          for (i = 0; i < prefsGroups.length; i++) {
            thisObj.injectPrefsForm(prefsGroups[i]);
          }
          thisObj.setupPopups();
          thisObj.updateCaption();
          thisObj.updateTranscript();
          thisObj.injectVTS();
          if (thisObj.chaptersDivLocation) {
            thisObj.populateChaptersDiv();
          }
          thisObj.showSearchResults();
        },
        function() {  // initPlayer fail
          thisObj.provideFallback();
        }
        );
      });
    });
  };

  AblePlayer.prototype.initPlayer = function () {

    var thisObj = this;
    var playerPromise;

    // First run player specific initialization.
    if (this.player === 'html5') {
      playerPromise = this.initHtml5Player();
    }
    else if (this.player === 'jw') {
      playerPromise = this.initJwPlayer();
    }
    else if (this.player === 'youtube') {
      playerPromise = this.initYouTubePlayer();
    }

    // After player specific initialization is done, run remaining general initialization.
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    playerPromise.done(
      function () { // done/resolved
        if (thisObj.useFixedSeekInterval === false) {
          thisObj.setSeekInterval();
        }
        thisObj.addControls();
        thisObj.addEventListeners();
        // Calling these set functions also initializes some icons.
        if (thisObj.Volume) {
          thisObj.setMute(false);
        }
        thisObj.setFullscreen(false);
        thisObj.setVolume(thisObj.defaultVolume);
        thisObj.refreshControls();

        // Go ahead and load media, without user requesting it
        // Normally, we wait until user clicks play, rather than unnecessarily consume their bandwidth
        // Exceptions are if the video is intended to autostart or if running on iOS (a workaround for iOS issues)
        // TODO: Confirm that this is still necessary with iOS (this would added early, & I don't remember what the issues were)
        if (thisObj.player === 'html5' && (thisObj.isIOS() || thisObj.startTime > 0 || thisObj.autoplay)) {
          thisObj.$media[0].load();
        }
        deferred.resolve();
      }
    ).fail(function () { // failed
      deferred.reject();
      }
    );

    return promise;
  };

  AblePlayer.prototype.setSeekInterval = function () {
    // this function is only called if this.useFixedSeekInterval is false
    // if this.useChapterTimes, this is called as each new chapter is loaded
    // otherwise, it's called once, as the player is initialized
    var duration;
    this.seekInterval = this.defaultSeekInterval;
    if (this.useChapterTimes) {
      duration = this.chapterDuration;
    }
    else {
      duration = this.getDuration();
    }
    if (typeof duration === 'undefined' || duration < 1) {
      // no duration; just use default for now but keep trying until duration is available
      this.seekIntervalCalculated = false;
      return;
    }
    else {
      if (duration <= 20) {
         this.seekInterval = 5;  // 4 steps max
      }
      else if (duration <= 30) {
         this.seekInterval = 6; // 5 steps max
      }
      else if (duration <= 40) {
         this.seekInterval = 8; // 5 steps max
      }
      else if (duration <= 100) {
         this.seekInterval = 10; // 10 steps max
      }
      else {
        // never more than 10 steps from start to end
         this.seekInterval = (duration / 10);
      }
      this.seekIntervalCalculated = true;
    }
  };

  AblePlayer.prototype.initDefaultCaption = function () {

    var captions, i;

    if (this.usingYouTubeCaptions) {
      captions = this.ytCaptions;
    }
    else {
      captions = this.captions;
    }

    if (captions.length > 0) {
      for (i=0; i<captions.length; i++) {
        if (captions[i].def === true) {
          this.captionLang = captions[i].language;
          this.selectedCaptions = captions[i];
        }
      }
      if (typeof this.captionLang === 'undefined') {
        // No caption track was flagged as default
        // find and use a caption language that matches the player language
        for (i=0; i<captions.length; i++) {
          if (captions[i].language === this.lang) {
            this.captionLang = captions[i].language;
            this.selectedCaptions = captions[i];
          }
        }
      }
      if (typeof this.captionLang === 'undefined') {
        // Still no matching caption track
        // just use the first track
        this.captionLang = captions[0].language;
        this.selectedCaptions = captions[0];
      }
      if (typeof this.captionLang !== 'undefined') {
        // reset transcript selected <option> to this.captionLang
        if (this.$transcriptLanguageSelect) {
          this.$transcriptLanguageSelect.find('option[lang=' + this.captionLang + ']').prop('selected',true);
        }
        // sync all other tracks to this same languge
        this.syncTrackLanguages('init',this.captionLang);
      }
    }
  };

  AblePlayer.prototype.initHtml5Player = function () {
    // Nothing special to do!
    var deferred = new $.Deferred();
    var promise = deferred.promise();
    deferred.resolve();
    return promise;
  };

  AblePlayer.prototype.initJwPlayer = function () {

    var jwHeight;
    var thisObj = this;
    var deferred = new $.Deferred();
    var promise = deferred.promise();

    $.ajax({
      async: false,
      url: this.fallbackPath + 'jwplayer.js',
      dataType: 'script',
      success: function( data, textStatus, jqXHR) {
        // add jwplayer key for selfhosted when fallback is activated
        if (thisObj.fallbackJwKey) {
          $('head').append(
            '<script type="text/javascript">jwplayer.key="' +
              thisObj.fallbackJwKey +
              '";</script>'
          );
        }

        // Successfully loaded the JW Player
        // add an id to div.able-media-container (JW Player needs this)
        thisObj.jwId = thisObj.mediaId + '_fallback';
        thisObj.$mediaContainer.attr('id', thisObj.jwId);
        if (thisObj.mediaType === 'audio') {
          // JW Player always shows its own controls if height <= 40
          // Must set height to 0 to hide them
          jwHeight = 0;
        }
        else {
          jwHeight = thisObj.playerHeight;
        }
        var sources = [];
        $.each(thisObj.$sources, function (ii, source) {
          sources.push({file: $(source).attr('src')});
        });

        var flashplayer = thisObj.fallbackPath + 'jwplayer.flash.swf';
        var html5player = thisObj.fallbackPath + 'jwplayer.html5.js';

        // Initializing JW Player with width:100% results in player that is either the size of the video
        // or scaled down to fit the container if container is smaller
        // After onReady event fires, actual dimensions will be collected for future use
        // in preserving the video ratio
        if (thisObj.mediaType === 'video') {
          thisObj.jwPlayer = jwplayer(thisObj.jwId).setup({
            playlist: [{
              image: thisObj.$media.attr('poster'),
              sources: sources
            }],
            flashplayer: flashplayer,
            html5player: html5player,
            controls: false,
            volume: thisObj.defaultVolume * 100,
            width: '100%',
            fallback: false,
            primary: 'flash',
            wmode: 'transparent' // necessary to get HTML captions to appear as overlay
          });
        }
        else { // if this is an audio player
          thisObj.jwPlayer = jwplayer(thisObj.jwId).setup({
            playlist: [{
              sources: sources
            }],
            flashplayer: flashplayer,
            html5player: html5player,
            controls: false,
            volume: this.defaultVolume * 100,
            height: 0,
            width: '100%',
            fallback: false,
            primary: 'flash'
          });
        }
        // remove the media element - we're done with it
        // keeping it would cause too many potential problems with HTML5 & JW event listeners both firing
        thisObj.$media.remove();

        deferred.resolve();
      },
      error: function(jqXHR, textStatus, errorThrown) {
        // Loading the JW Player failed
        deferred.reject();
      }
    });
    // Done with JW Player initialization.
    return promise;
  };

  // Sets media/track/source attributes; is called whenever player is recreated since $media may have changed.
  AblePlayer.prototype.setMediaAttributes = function () {
    // Firefox puts videos in tab order; remove.
    this.$media.attr('tabindex', -1);

    // Keep native player from displaying captions/subtitles by setting textTrack.mode='disabled'
    // https://dev.w3.org/html5/spec-author-view/video.html#text-track-mode
    // This *should* work but historically hasn't been supported in all browsers
    // Workaround for non-supporting browsers is to remove default attribute
    // We're doing that too in track.js > setupCaptions()
    var textTracks = this.$media.get(0).textTracks;
    if (textTracks) {
      var i = 0;
      while (i < textTracks.length) {
        textTracks[i].mode = 'disabled';
        i += 1;
      }
    }
  };

  AblePlayer.prototype.getPlayer = function() {

    // Determine which player to use, if any
    // return 'html5', 'jw' or null
    var i, sourceType, $newItem;
    if (this.youTubeId) {
      if (this.mediaType !== 'video') {
        // attempting to play a YouTube video using an element other than <video>
        return null;
      }
      else {
        return 'youtube';
      }
    }
    else if (this.testFallback ||
             ((this.isUserAgent('msie 7') || this.isUserAgent('msie 8') || this.isUserAgent('msie 9')) && this.mediaType === 'video') ||
             (this.isIOS() && (this.isIOS(4) || this.isIOS(5) || this.isIOS(6)))
            ) {
      // the user wants to test the fallback player, or
      // the user is using an older version of IE or IOS,
      // both of which had buggy implementation of HTML5 video
      if (this.fallback === 'jw') {
        if (this.jwCanPlay()) {
          return 'jw';
        }
        else {
          // JW Player is available as fallback, but can't play this source file
          return null;
        }
      }
      else {
        // browser doesn't support HTML5 video and there is no fallback player
        return null;
      }
    }
    else if (this.media.canPlayType) {
      return 'html5';
    }
    else {
      // Browser does not support the available media file
      return null;
    }
  };

  AblePlayer.prototype.jwCanPlay = function() {
    // Determine whether there are media files that JW supports
    var i, sourceType, $firstItem;

    if (this.$sources.length > 0) { // this media has one or more <source> elements
      for (i = 0; i < this.$sources.length; i++) {
        sourceType = this.$sources[i].getAttribute('type');
        if ((this.mediaType === 'video' && sourceType === 'video/mp4') ||
            (this.mediaType === 'audio' && sourceType === 'audio/mpeg')) {
            // JW Player can play this
            return true;
        }
      }
    }
    // still here? That means there's no source that JW can play
    // check for an mp3 or mp4 in a able-playlist
    // TODO: Implement this more efficiently
    // Playlist is initialized later in setupInstancePlaylist()
    // but we can't wait for that...
    if ($('.able-playlist')) {
      // there's at least one playlist on this page
      // get the first item from the first playlist
      // if JW Player can play that one, assume it can play all items in all playlists
      $firstItem = $('.able-playlist').eq(0).find('li').eq(0);
      if (this.mediaType === 'audio') {
        if ($firstItem.attr('data-mp3')) {
          return true;
        }
        else if (this.mediaType === 'video') {
          if ($firstItem.attr('data-mp4')) {
            return true;
          }
        }
      }
    }
    return false;
  };

})(jQuery);
