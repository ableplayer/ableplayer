export { AblePlayer as default };
/**
 * Construct the AblePlayer object.
 *
 * Able Player needs `window` to instantiate, so, skip the constructor if
 * you are running outside the browser (for example, SSR).
 *
 * @param object media jQuery selector or element identifying the media.
 */
declare function AblePlayer(media: any): void;
declare class AblePlayer {
    /**
     * Construct the AblePlayer object.
     *
     * Able Player needs `window` to instantiate, so, skip the constructor if
     * you are running outside the browser (for example, SSR).
     *
     * @param object media jQuery selector or element identifying the media.
     */
    constructor(media: any);
    media: any;
    autoplay: boolean;
    okToPlay: boolean;
    loop: boolean;
    playsInline: string;
    hasPoster: boolean;
    audioPoster: any;
    audioPosterAlt: any;
    width: any;
    height: any;
    startTime: any;
    debug: boolean;
    defaultVolume: any;
    volume: any;
    useChaptersButton: boolean;
    readDescriptionsAloud: boolean;
    descVoices: any[];
    descReader: string;
    defaultStateCaptions: number;
    defaultStateDescriptions: number;
    defaultDescPause: number;
    playerHeadingLevel: any;
    transcriptDivLocation: any;
    hideTranscriptButton: boolean;
    transcriptType: string;
    transcriptSrc: any;
    lyricsMode: boolean;
    transcriptTitle: any;
    $signDivLocation: any;
    defaultCaptionsPosition: string;
    chaptersDivLocation: any;
    chaptersTitle: any;
    defaultChapter: any;
    speedIcons: string;
    seekbarScope: string;
    youTubeId: any;
    youTubeDescId: any;
    youTubeSignId: any;
    youTubeNoCookie: boolean;
    vimeoId: any;
    vimeoDescId: any;
    skin: string;
    playerWidth: number;
    allowFullscreen: boolean;
    clickedFullscreenButton: boolean;
    restoringAfterFullscreen: boolean;
    defaultSeekInterval: number;
    useFixedSeekInterval: boolean;
    seekInterval: any;
    showNowPlaying: boolean;
    testFallback: number | boolean;
    lang: any;
    metaType: any;
    metaDiv: any;
    searchDiv: any;
    searchString: any;
    searchLang: any;
    searchIgnoreCaps: boolean;
    hideControls: boolean;
    hideControlsOriginal: boolean;
    stenoMode: boolean;
    stenoFrameId: any;
    $stenoFrame: any;
    ableIndex: number;
    title: any;
    tt: {};
    setup(): void;
    initializing: boolean;
    /**
     * Removes this player from the global instance list.
     *
     * You probably want to call this during/after removing a player from the
     * DOM. This avoids memory leaks, and allows the event handling to have the
     * correct count of how many players are actually on the page.
     */
    dispose(): void;
}
declare namespace AblePlayer {
    export let nextIndex: number;
    export function getActiveDOMElement(): Element;
    export function localGetElementById(element: any, id: any): any;
    export { ablePlayerSetupWindow };
    export let youTubeIframeAPIReady: boolean;
    export let loadingYouTubeIframeAPI: boolean;
    export { ablePlayerInstances };
    export function hasSingleInstance(): boolean;
    export function getSingleInstance(): any;
}
/**
 * Performs one-time setup on `window`.
 *
 * Does nothing if `window` is not available, for example in SSR.
 */
declare function ablePlayerSetupWindow(): void;
declare const ablePlayerInstances: Set<any>;
//# sourceMappingURL=ableplayer.esm.d.ts.map