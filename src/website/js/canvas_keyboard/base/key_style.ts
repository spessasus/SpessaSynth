export const OCTAVE = 12;
// Glow radius at max velocity
export const KEYBOARD_GLOW_PX = 20;
// Glow intensity at max velocity
// Values above 1 stack the glow
export const KEYBOARD_GLOW_INTENSITY = 1.5;

export const KEYBOARD_BACKGROUND_COLOR = "black";
export const SHARP_KEY_GRADIENT = ["#222", "black"] as const;
export const DARK_FLAT_KEY_GRADIENT = ["#111", "#000"] as const;
export const LIGHT_FLAT_KEY_GRADIENT = ["#bbb", "white"] as const;

export const LIGHT_KEY_COLOR_VALUE = 221;
export const DARK_KEY_COLOR_VALUE = 8;
export const SHARP_KEY_COLOR_VALUE = 7;
const SHARP_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

// Height ratio of black keys relative to the keyboard layout height
export const SHARP_KEY_LENGTH_RATIO = 0.7;
// Linear gradient angle for black keys
export const SHARP_KEY_GRADIENT_ANGLE_DEGREES = 140;
// Linear gradient angle for white keys in dark mode
export const DARK_KEY_GRADIENT_ANGLE_DEGREES = 100;
// Linear gradient angle for white keys in light mode
export const LIGHT_KEY_GRADIENT_ANGLE_DEGREES = 90;

export function isSharpMIDINote(noteNumber: number): boolean {
    const pitchClass = noteNumber % OCTAVE;
    return SHARP_KEY_PITCH_CLASSES.has(pitchClass);
}
