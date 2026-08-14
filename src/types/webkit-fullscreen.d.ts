// Legacy WebKit-prefixed Fullscreen API, still needed on some Safari versions.
// https://developer.apple.com/documentation/webkitjs/element/1633430-webkitrequestfullscreen

interface Document {
    readonly webkitFullscreenElement?: Element | null;
    readonly webkitFullscreenEnabled?: boolean;

    webkitExitFullscreen?(): void;
}

interface Element {
    webkitRequestFullscreen?(): void;
}
