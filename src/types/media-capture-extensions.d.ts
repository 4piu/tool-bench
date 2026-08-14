// Ambient types for Media Capture and Streams (Extensions) properties not yet in
// TypeScript's DOM lib (photo/PTZ controls: zoom, focus, exposure, white balance, torch).
// https://w3c.github.io/mediacapture-image/ https://w3c.github.io/mediacapture-extensions/

interface MediaTrackCapabilities {
    brightness?: DoubleRange;
    colorTemperature?: DoubleRange;
    contrast?: DoubleRange;
    exposureCompensation?: DoubleRange;
    exposureMode?: string[];
    exposureTime?: DoubleRange;
    focusDistance?: DoubleRange;
    focusMode?: string[];
    iso?: DoubleRange;
    pan?: DoubleRange;
    saturation?: DoubleRange;
    sharpness?: DoubleRange;
    tilt?: DoubleRange;
    torch?: boolean;
    whiteBalanceMode?: string[];
    zoom?: DoubleRange;
}

interface MediaTrackConstraintSet {
    brightness?: ConstrainDouble;
    colorTemperature?: ConstrainDouble;
    contrast?: ConstrainDouble;
    exposureCompensation?: ConstrainDouble;
    exposureMode?: ConstrainDOMString;
    exposureTime?: ConstrainDouble;
    focusDistance?: ConstrainDouble;
    focusMode?: ConstrainDOMString;
    iso?: ConstrainDouble;
    pan?: ConstrainDouble;
    saturation?: ConstrainDouble;
    sharpness?: ConstrainDouble;
    tilt?: ConstrainDouble;
    torch?: ConstrainBoolean;
    whiteBalanceMode?: ConstrainDOMString;
    zoom?: ConstrainDouble;
}
