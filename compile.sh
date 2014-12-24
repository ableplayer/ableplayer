#!/bin/sh

rm build/ableplayer.js
cat scripts/ableplayer-base.js >> build/ableplayer.js
cat scripts/initialize.js >> build/ableplayer.js
cat scripts/preference.js >> build/ableplayer.js
cat scripts/webvtt.js >> build/ableplayer.js
cat scripts/buildplayer.js >> build/ableplayer.js
cat scripts/track.js >> build/ableplayer.js
cat scripts/seekbar.js >> build/ableplayer.js
cat scripts/dialog.js >> build/ableplayer.js
cat scripts/misc.js >> build/ableplayer.js
cat scripts/description.js >> build/ableplayer.js
cat scripts/browser.js >> build/ableplayer.js
cat scripts/control.js >> build/ableplayer.js
cat scripts/caption.js >> build/ableplayer.js
cat scripts/metadata.js >> build/ableplayer.js
cat scripts/translation.js >> build/ableplayer.js
cat scripts/transcript.js >> build/ableplayer.js
cat scripts/search.js >> build/ableplayer.js
cat scripts/event.js >> build/ableplayer.js
