export const OCTAVE = 12;
// Glow radius at max velocity
export const KEYBOARD_GLOW_PX = 20;
// Glow intensity at max velocity
// Values above 1 stack the glow
export const KEYBOARD_GLOW_INTENSITY = 1.5;

const SHARP_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

export function isSharpMIDINote(noteNumber: number): boolean {
    const pitchClass = noteNumber % OCTAVE;
    return SHARP_KEY_PITCH_CLASSES.has(pitchClass);
}
