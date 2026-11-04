import type { Meter } from "./synthui_meter.ts";
import type {
    EffectChangeEvent,
    GlobalSystemParameter
} from "spessasynth_core";
import { InsertionValueConverter } from "./convert.ts";

export type GSReverbParams = Exclude<
    Extract<EffectChangeEvent, { effect: "gsReverb" }>["parameter"],
    "macro"
>;
export type GSReverbController = Record<GSReverbParams, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
    toggleLock: () => unknown;
};
export type GSChorusParams = Exclude<
    Extract<EffectChangeEvent, { effect: "gsChorus" }>["parameter"],
    "macro"
>;
export type GSChorusController = Record<GSChorusParams, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
    toggleLock: () => unknown;
};
export type GSDelayParams = Exclude<
    Extract<EffectChangeEvent, { effect: "gsDelay" }>["parameter"],
    "macro"
>;

export type GSDelayController = Record<GSDelayParams, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
    toggleLock: () => unknown;
};

export type GSEqualizerParams = Extract<
    EffectChangeEvent,
    { effect: "gsEqualizer" }
>["parameter"];

export type GSEqualizerController = Record<GSEqualizerParams, Meter> & {
    wrapper: HTMLElement;
    toggleLock: () => unknown;
    addNewChannel: () => unknown;
    eqEnabledButtons: HTMLDivElement[];
};

export interface GSInsertionController {
    wrapper: HTMLElement;
    effectSelector: HTMLSelectElement;
    sendEQSwitch: HTMLButtonElement;
    toggleLock: () => unknown;
    delay: Meter;
    chorus: Meter;
    reverb: Meter;
    addNewChannel: () => unknown;
    efxAssignButtons: HTMLDivElement[];
    /**
     * Map<insertion type, {controllerWrapper: the wrapper of all the meters, controllers: Map<parameter address, Meter for that parameter>}>
     */
    effects: Map<
        number,
        { controllerGroups: HTMLElement[]; controllers: Map<number, Meter> }
    >;
}
/**
 * Params:
 * "p" - param name
 * "r" - data range (optional, in sysEx data)
 * "td" - transform function from sysEx to displayed (optional)
 */
export interface GSParamType<K extends string> {
    params: {
        p: K;
        r?: { min: number; max: number };
        td?: (v: number) => string;
    }[];
    lockName: keyof GlobalSystemParameter;
    gainName: keyof GlobalSystemParameter;
    macros: string[];
}
export const gsReverbEffectData: GSParamType<GSReverbParams> = {
    params: [
        { p: "character", r: { min: 0, max: 7 } },
        { p: "time" },
        { p: "delayFeedback" },
        // 37 not 36
        { p: "preDelayTime" },
        { p: "level" },
        { p: "preLowpass", r: { min: 0, max: 7 } }
    ],
    lockName: "gsReverbLock",
    gainName: "reverbGain",
    macros: [
        "Room1",
        "Room2",
        "Room3",
        "Hall1",
        "Hall2",
        "Plate",
        "Delay",
        "PanningDelay"
    ]
};
export const gsChorusEffectData: GSParamType<GSChorusParams> = {
    params: [
        { p: "feedback" },
        { p: "delay" },
        { p: "rate" },
        { p: "depth" },
        { p: "sendLevelToReverb" },
        { p: "sendLevelToDelay" },
        { p: "level" },
        { p: "preLowpass", r: { min: 0, max: 7 } }
    ],
    lockName: "gsChorusLock",
    gainName: "chorusGain",
    macros: [
        "Chorus1",
        "Chorus2",
        "Chorus3",
        "Chorus4",
        "Feedback Chorus",
        "Flanger",
        "Short Delay",
        "Short DelayFB"
    ]
};

// SC-8850 manual p.236
// How nice of Roland to provide the conversion values to ms!
const delayTimeSegments = [
    { start: 0x01, end: 0x14, timeStart: 0.1, resolution: 0.1 },
    { start: 0x14, end: 0x23, timeStart: 2, resolution: 0.2 },
    { start: 0x23, end: 0x2d, timeStart: 5, resolution: 0.5 },
    { start: 0x2d, end: 0x37, timeStart: 10, resolution: 1 },
    { start: 0x37, end: 0x46, timeStart: 20, resolution: 2 },
    { start: 0x46, end: 0x50, timeStart: 50, resolution: 5 },
    { start: 0x50, end: 0x5a, timeStart: 100, resolution: 10 },
    { start: 0x5a, end: 0x69, timeStart: 200, resolution: 20 },
    { start: 0x69, end: 0x74, timeStart: 500, resolution: 50 }
] as const;

export const gsDelayEffectData: GSParamType<GSDelayParams> = {
    params: [
        {
            p: "timeCenter",
            r: { min: 1, max: 0x73 },
            td: (v) => {
                let delayMs = 0.1;
                for (const segment of delayTimeSegments) {
                    if (v >= segment.start && v < segment.end) {
                        delayMs =
                            segment.timeStart +
                            (v - segment.start) * segment.resolution;
                        break;
                    }
                }
                return `${Math.round(delayMs * 10) / 10}ms`;
            }
        },
        {
            p: "timeRatioLeft",
            r: { min: 1, max: 0x78 },
            td: (v) => `${Math.round(v * 4.166_666)}%`
        },
        {
            p: "timeRatioRight",
            r: { min: 1, max: 0x78 },
            td: (v) => `${Math.round(v * 4.166_666)}%`
        },
        { p: "levelCenter" },
        { p: "levelLeft" },
        { p: "levelRight" },
        {
            p: "feedback",
            r: { min: 0, max: 0x7f },
            td: (v) => (v - 64).toString()
        },
        { p: "sendLevelToReverb" },
        { p: "level" },
        { p: "preLowpass", r: { min: 0, max: 7 } }
    ],
    lockName: "gsDelayLock",
    gainName: "gsDelayGain",
    macros: [
        "Delay1",
        "Delay2",
        "Delay3",
        "Delay4",
        "PanDelay1",
        "PanDelay2",
        "PanDelay3",
        "PanDelay4",
        "Delay To Reverb",
        "Pan Repeat"
    ]
};

// 64 is 0 dB, each step is 1 dB
const eqGain = (v: number) => {
    const db = v - 64;
    return `${db > 0 ? "+" : ""}${db} dB`;
};

/**
 * SC-8850 manual p.236
 * "d" - default value
 */
export const gsEqualizerEffectData: (GSParamType<GSEqualizerParams>["params"][number] & {
    d: number;
})[] = [
    {
        p: "lowFrequency",
        r: { min: 0, max: 1 },
        d: 0,
        td: (v) => (v === 0 ? "200 Hz" : "400 Hz")
    },
    { p: "lowGain", r: { min: 0x34, max: 0x4c }, d: 0x40, td: eqGain },
    {
        p: "highFrequency",
        r: { min: 0, max: 1 },
        d: 0,
        td: (v) => (v === 0 ? "3 kHz" : "6 kHz")
    },
    { p: "highGain", r: { min: 0x34, max: 0x4c }, d: 0x40, td: eqGain }
];

interface GSInsertionEffect {
    // Type as 0xAA_BB (msb << 8 | lsb)
    type: number;
    // Name (e.g. "Thru")
    name: string;
    // Description of the effect
    desc: string;

    // Can be grouped (for combo effects
    params: {
        // Name
        p: string;
        // Parameter address
        a: number;
        // Default (in sysEx)
        d: number;
        // Range (in sysEx)
        r?: { min: number; max: number };
        // Transform function from sysEx to displayed
        td?: (v: number) => string;
    }[][];
}

// Value displays shared by the insertion effect parameters (SC-8850 manual p.216 and p.224)
const signed = (v: number) => (v > 0 ? `+${v}` : v.toString());
const hertz = (hz: number) =>
    hz >= 1000 ? `${Math.round(hz / 100) / 10} kHz` : `${hz} Hz`;
const gain = (v: number) => `${signed(v - 64)} dB`;
const pan = (v: number) =>
    v === 64 ? "0" : v < 64 ? `L${64 - v}` : `R${v - 64}`;
const ratio = (first: string, second: string) => (v: number) => {
    const s = Math.round((v * 100) / 127);
    return `${first}${100 - s}:${second}${s}`;
};
const balance = ratio("D", "E");
const pitchBalance = ratio("A", "B");
const feedback = (v: number) => `${signed((v - 64) * 2)}%`;
const phase = (v: number) => `${v * 2}°`;
const cents = (v: number) => `${signed((v - 64) * 2)} cent`;
const signedOffset = (v: number) => signed(v - 64);
const step = (v: number) => (v + 1).toString();
const speed = (v: number) => (v < 64 ? "Slow" : "Fast");
const gateTime = (v: number) => `${5 * (Math.min(v, 99) + 1)} ms`;
const options =
    (...names: string[]) =>
    (v: number) =>
        names[Math.round(v)] ?? v.toString();
const onOff = options("Off", "On");
const preDelay = (v: number) => `${InsertionValueConverter.preDelayTime(v)} ms`;
const delay1 = (v: number) => `${InsertionValueConverter.delayTime1(v)} ms`;
const delay2 = (v: number) => `${InsertionValueConverter.delayTime2(v)} ms`;
const delay3 = (v: number) => `${InsertionValueConverter.delayTime3(v)} ms`;
const delay4 = (v: number) => `${InsertionValueConverter.delayTime4(v)} ms`;
const rate1 = (v: number) =>
    `${InsertionValueConverter.rate1(v).toFixed(2)} Hz`;
const rate2 = (v: number) =>
    `${InsertionValueConverter.rate2(v).toFixed(2)} Hz`;
// The HF and LPF columns bypass the filter at the top (13.5 kHz in the table)
const hfDamp = (v: number) =>
    v >= 120 ? "Bypass" : hertz(InsertionValueConverter.hfDamp(v));
const lpf = (v: number) =>
    v >= 120 ? "Bypass" : hertz(InsertionValueConverter.lpf(v));
const cutoff = (v: number) => hertz(InsertionValueConverter.cutoffFreq(v));
const eqFreq = (v: number) => hertz(InsertionValueConverter.eqFreq(v));
const manual = (v: number) => hertz(InsertionValueConverter.manual(v));
const azimuth = (v: number) => {
    const a = InsertionValueConverter.azimuth(v);
    return a === 0 ? "0" : a < 0 ? `L${-a}` : `R${a}`;
};
const accl = (v: number) => InsertionValueConverter.accl(v).toString();

export const gsInsertionEffectData: GSInsertionEffect[] = [
    {
        type: 0x00_00,
        name: "Thru",
        desc: "No effect will be applied.",
        params: []
    },
    {
        type: 0x01_00,
        name: "Stereo-EQ",
        desc: "This is a four-band stereo equalizer (low, mid x 2, high).",
        params: [
            [
                {
                    p: "Low Freq",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("200 Hz", "400 Hz")
                },
                {
                    p: "Low Gain",
                    a: 0x04,
                    d: 69,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Freq",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("4 kHz", "8 kHz")
                },
                {
                    p: "Hi Gain",
                    a: 0x06,
                    d: 52,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "M1 Freq", a: 0x07, d: 72, td: eqFreq },
                {
                    p: "M1 Q",
                    a: 0x08,
                    d: 0,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "M1 Gain",
                    a: 0x09,
                    d: 72,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "M2 Freq", a: 0x0a, d: 56, td: eqFreq },
                {
                    p: "M2 Q",
                    a: 0x0b,
                    d: 0,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "M2 Gain",
                    a: 0x0c,
                    d: 56,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_01,
        name: "Spectrum",
        desc: "Spectrum is a type of filter which modifies the timbre by boosting or cutting the level at specific frequencies. It is similar to an equalizer, but has 8 frequency points fixed at locations most suitable for adding character to the sound.",
        params: [
            [
                {
                    p: "Band 1",
                    a: 0x03,
                    d: 60,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 2",
                    a: 0x04,
                    d: 65,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 3",
                    a: 0x05,
                    d: 67,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 4",
                    a: 0x06,
                    d: 70,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 5",
                    a: 0x07,
                    d: 66,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 6",
                    a: 0x08,
                    d: 63,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 7",
                    a: 0x09,
                    d: 60,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Band 8",
                    a: 0x0a,
                    d: 59,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Width",
                    a: 0x0b,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_02,
        name: "Enhancer",
        desc: "The Enhancer controls the overtone structure of the high frequencies, adding sparkle and tightness to the sound.",
        params: [
            [
                { p: "Sens", a: 0x03, d: 64 },
                { p: "Mix", a: 0x04, d: 127 },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 67,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_03,
        name: "Humanizer",
        desc: "This adds a vowel character to the sound, making it similar to a human voice.",
        params: [
            [
                { p: "Drive", a: 0x03, d: 48 },
                {
                    p: "Drive Sw",
                    a: 0x04,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "Vowel",
                    a: 0x05,
                    d: 0,
                    r: { min: 0x00, max: 0x04 },
                    td: options("a", "i", "u", "e", "o")
                },
                { p: "Accel", a: 0x06, d: 127, td: accl },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_10,
        name: "Overdrive",
        desc: "This effect creates a soft distortion similar to that produced by tube amplifiers.",
        params: [
            [
                { p: "Drive", a: 0x03, d: 48 },
                {
                    p: "Amp Type",
                    a: 0x04,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "Amp Sw",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 96 }
            ]
        ]
    },
    {
        type: 0x01_11,
        name: "Distortion",
        desc: "This effect produces a more intense distortion than Overdrive.",
        params: [
            [
                { p: "Drive", a: 0x03, d: 76 },
                {
                    p: "Amp Type",
                    a: 0x04,
                    d: 3,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "Amp Sw",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 56,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 84 }
            ]
        ]
    },
    {
        type: 0x01_20,
        name: "Phaser",
        desc: "A phaser adds a phase-shifted sound to the original sound, producing a twisting modulation that creates spaciousness and depth.",
        params: [
            [
                { p: "Manual", a: 0x03, d: 36, td: manual },
                { p: "Rate", a: 0x04, d: 16, td: rate1 },
                { p: "Depth", a: 0x05, d: 64 },
                { p: "Reso", a: 0x06, d: 16 },
                { p: "Mix", a: 0x07, d: 127 },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 104 }
            ]
        ]
    },
    {
        type: 0x01_21,
        name: "Auto Wah",
        desc: "The Auto Wah cyclically controls a filter to create cyclic change in timbre.",
        params: [
            [
                {
                    p: "Fil Type",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("LPF", "BPF")
                },
                { p: "Sens", a: 0x04, d: 0 },
                { p: "Manual", a: 0x05, d: 68 },
                { p: "Peak", a: 0x06, d: 62 },
                { p: "Rate", a: 0x07, d: 40, td: rate1 },
                { p: "Depth", a: 0x08, d: 72 },
                {
                    p: "Polarity",
                    a: 0x09,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Down", "Up")
                },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 96 }
            ]
        ]
    },
    {
        type: 0x01_22,
        name: "Rotary",
        desc: "The Rotary effect simulates the sound of a classic rotary speaker. Since the movement of the high range and low range rotors can be set independently, the unique modulation characteristics of these speakers can be simulated quite reliably. This effect is most suitable for electric organ.",
        params: [
            [
                { p: "Low Slow", a: 0x03, d: 6, td: rate1 },
                { p: "Low Fast", a: 0x04, d: 113, td: rate1 },
                { p: "Low Accl", a: 0x05, d: 24, td: accl },
                { p: "Low Level", a: 0x06, d: 127 },
                { p: "Hi Slow", a: 0x07, d: 17, td: rate1 },
                { p: "Hi Fast", a: 0x08, d: 120, td: rate1 },
                { p: "Hi Accl", a: 0x09, d: 88, td: accl },
                { p: "Hi Level", a: 0x0a, d: 64 },
                { p: "Separate", a: 0x0b, d: 96 },
                { p: "Speed", a: 0x0d, d: 0, td: speed },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_23,
        name: "Stereo Flanger",
        desc: "This is a stereo flanger. It produces a metallic resonance that rises and falls like a jet airplane taking off or landing. A filter is provided so that you can adjust the timbre of the flanged sound.",
        params: [
            [
                {
                    p: "Pre Filter",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x02 },
                    td: options("Off", "LPF", "HPF")
                },
                { p: "Cutoff", a: 0x04, d: 0, td: cutoff },
                { p: "Pre Dly", a: 0x05, d: 16, td: preDelay },
                { p: "Rate", a: 0x06, d: 11, td: rate1 },
                { p: "Depth", a: 0x07, d: 24 },
                {
                    p: "Feedback",
                    a: 0x08,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                {
                    p: "Phase",
                    a: 0x09,
                    d: 90,
                    r: { min: 0x00, max: 0x5a },
                    td: phase
                },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 104 }
            ]
        ]
    },
    {
        type: 0x01_24,
        name: "Step Flanger",
        desc: "The Step Flanger is an effect in which the flanger pitch changes in steps.",
        params: [
            [
                { p: "Pre Dly", a: 0x03, d: 10, td: preDelay },
                { p: "Rate", a: 0x04, d: 5, td: rate1 },
                { p: "Depth", a: 0x05, d: 95 },
                {
                    p: "Feedback",
                    a: 0x06,
                    d: 79,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                {
                    p: "Phase",
                    a: 0x07,
                    d: 90,
                    r: { min: 0x00, max: 0x5a },
                    td: phase
                },
                { p: "Step Rate", a: 0x08, d: 54, td: rate1 },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 96 }
            ]
        ]
    },
    {
        type: 0x01_25,
        name: "Tremolo",
        desc: "Tremolo cyclically modulates the volume to add tremolo effect to the sound.",
        params: [
            [
                {
                    p: "Mod Wave",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x04 },
                    td: options("Tri", "Sqr", "Sin", "Saw1", "Saw2")
                },
                { p: "Mod Rate", a: 0x04, d: 60, td: rate1 },
                { p: "Mod Depth", a: 0x05, d: 96 },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_26,
        name: "Auto Pan",
        desc: "The Auto Pan effect cyclically modulates the stereo location of the sound.",
        params: [
            [
                {
                    p: "Mod Wave",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x04 },
                    td: options("Tri", "Sqr", "Sin", "Saw1", "Saw2")
                },
                { p: "Mod Rate", a: 0x04, d: 60, td: rate1 },
                { p: "Mod Depth", a: 0x05, d: 96 },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_30,
        name: "Compressor",
        desc: "The Compressor flattens out high levels and boosts low levels, smoothing out unevenness in volume.",
        params: [
            [
                { p: "Attack", a: 0x03, d: 72 },
                { p: "Sustain", a: 0x04, d: 100 },
                {
                    p: "Post Gain",
                    a: 0x05,
                    d: 0,
                    r: { min: 0x00, max: 0x03 },
                    td: options("0 dB", "+6 dB", "+12 dB", "+18 dB")
                },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 104 }
            ]
        ]
    },
    {
        type: 0x01_31,
        name: "Limiter",
        desc: "The Limiter compresses signals that exceed a specified volume level, preventing distortion from occurring.",
        params: [
            [
                { p: "Threshold", a: 0x03, d: 85 },
                {
                    p: "Ratio",
                    a: 0x04,
                    d: 3,
                    r: { min: 0x00, max: 0x03 },
                    td: options("1/1.5", "1/2", "1/4", "1/100")
                },
                { p: "Release", a: 0x05, d: 16 },
                {
                    p: "Post Gain",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x03 },
                    td: options("0 dB", "+6 dB", "+12 dB", "+18 dB")
                },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_40,
        name: "Hexa Chorus",
        desc: "Hexa-chorus uses a six-phase chorus (six layers of chorused sound) to give richness and spatial spread to the sound.",
        params: [
            [
                { p: "Pre Dly", a: 0x03, d: 24, td: preDelay },
                { p: "Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Depth", a: 0x05, d: 127 },
                {
                    p: "Pre Dly Dev",
                    a: 0x06,
                    d: 5,
                    r: { min: 0x00, max: 0x14 }
                },
                {
                    p: "Depth Dev",
                    a: 0x07,
                    d: 66,
                    r: { min: 0x2c, max: 0x54 },
                    td: signedOffset
                },
                { p: "Pan Dev", a: 0x08, d: 16, r: { min: 0x00, max: 0x14 } },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 112 }
            ]
        ]
    },
    {
        type: 0x01_41,
        name: "Tremolo Chorus",
        desc: "Tremolo Chorus is a chorus effect with added Tremolo (cyclic modulation of volume).",
        params: [
            [
                { p: "Pre Dly", a: 0x03, d: 16, td: preDelay },
                { p: "Cho Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x05, d: 40 },
                {
                    p: "Trem Phase",
                    a: 0x06,
                    d: 40,
                    r: { min: 0x00, max: 0x5a },
                    td: phase
                },
                { p: "Trem Rate", a: 0x07, d: 60, td: rate1 },
                { p: "Trem Sep", a: 0x08, d: 96 },
                { p: "Balance", a: 0x12, d: 127, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_42,
        name: "Stereo Chorus",
        desc: "This is a stereo chorus. A filter is provided so that you can adjust the timbre of the chorus sound.",
        params: [
            [
                {
                    p: "Pre Filter",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x02 },
                    td: options("Off", "LPF", "HPF")
                },
                { p: "Cutoff", a: 0x04, d: 0, td: cutoff },
                { p: "Pre Dly", a: 0x05, d: 10, td: preDelay },
                { p: "Rate", a: 0x06, d: 8, td: rate1 },
                { p: "Depth", a: 0x07, d: 111 },
                {
                    p: "Phase",
                    a: 0x09,
                    d: 90,
                    r: { min: 0x00, max: 0x5a },
                    td: phase
                },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 104 }
            ]
        ]
    },
    {
        type: 0x01_43,
        name: "Space D",
        desc: "Space-D is a multiple chorus that applies two-phase modulation in stereo. It gives no impression of modulation, but produces a transparent chorus effect.",
        params: [
            [
                { p: "Pre Dly", a: 0x03, d: 32, td: preDelay },
                { p: "Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Depth", a: 0x05, d: 127 },
                {
                    p: "Phase",
                    a: 0x06,
                    d: 90,
                    r: { min: 0x00, max: 0x5a },
                    td: phase
                },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 96 }
            ]
        ]
    },
    {
        type: 0x01_44,
        name: "3D Chorus",
        desc: "This applies a 3D effect to the chorus sound. The chorus sound will be positioned 90 degrees left and 90 degrees right.",
        params: [
            [
                { p: "Pre Dly", a: 0x03, d: 10, td: preDelay },
                { p: "Cho Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x05, d: 72 },
                {
                    p: "Out",
                    a: 0x11,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Speaker", "Phones")
                },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 80 }
            ]
        ]
    },
    {
        type: 0x01_50,
        name: "Stereo Delay",
        desc: "This is a stereo delay.",
        params: [
            [
                { p: "Dly Tm L", a: 0x03, d: 101, td: delay3 },
                { p: "Dly Tm R", a: 0x04, d: 116, td: delay3 },
                {
                    p: "Feedback",
                    a: 0x05,
                    d: 88,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                {
                    p: "Fb Mode",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Normal", "Cross")
                },
                {
                    p: "Phase L",
                    a: 0x07,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Normal", "Invert")
                },
                {
                    p: "Phase R",
                    a: 0x08,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Normal", "Invert")
                },
                { p: "HF Damp", a: 0x0a, d: 127, td: hfDamp },
                { p: "Balance", a: 0x12, d: 48, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_51,
        name: "Mod Delay",
        desc: "This effect adds modulation to the delayed sound, producing an effect similar to a flanger.",
        params: [
            [
                { p: "Dly Tm L", a: 0x03, d: 90, td: delay3 },
                { p: "Dly Tm R", a: 0x04, d: 108, td: delay3 },
                {
                    p: "Feedback",
                    a: 0x05,
                    d: 88,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                {
                    p: "Fb Mode",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Normal", "Cross")
                },
                { p: "Mod Rate", a: 0x07, d: 12, td: rate1 },
                { p: "Mod Depth", a: 0x08, d: 21 },
                {
                    p: "Mod Phase",
                    a: 0x09,
                    d: 90,
                    r: { min: 0x00, max: 0x5a },
                    td: phase
                },
                { p: "HF Damp", a: 0x0a, d: 127, td: hfDamp },
                { p: "Balance", a: 0x12, d: 40, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_52,
        name: "3 Tap Delay",
        desc: "The Triple Tap Delay produces three delay sounds: center, left and right.",
        params: [
            [
                { p: "Dly Tm C", a: 0x03, d: 20, td: delay1 },
                { p: "Dly Tm L", a: 0x04, d: 0, td: delay1 },
                { p: "Dly Tm R", a: 0x05, d: 7, td: delay1 },
                {
                    p: "Feedback",
                    a: 0x06,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly Lev C", a: 0x07, d: 127 },
                { p: "Dly Lev L", a: 0x08, d: 127 },
                { p: "Dly Lev R", a: 0x09, d: 127 },
                { p: "HF Damp", a: 0x0a, d: 127, td: hfDamp },
                { p: "Balance", a: 0x12, d: 48, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_53,
        name: "4 Tap Delay",
        desc: "The Quadruple Tap Delay has four delays.",
        params: [
            [
                { p: "Dly Tm 1", a: 0x03, d: 60, td: delay1 },
                { p: "Dly Tm 2", a: 0x04, d: 20, td: delay1 },
                { p: "Dly Tm 3", a: 0x05, d: 40, td: delay1 },
                { p: "Dly Tm 4", a: 0x06, d: 0, td: delay1 },
                { p: "Dly Lev 1", a: 0x07, d: 127 },
                { p: "Dly Lev 2", a: 0x08, d: 127 },
                { p: "Dly Lev 3", a: 0x09, d: 127 },
                { p: "Dly Lev 4", a: 0x0a, d: 127 },
                {
                    p: "Feedback",
                    a: 0x0b,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "HF Damp", a: 0x0c, d: 127, td: hfDamp },
                { p: "Balance", a: 0x12, d: 48, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_54,
        name: "Tm Ctrl Delay",
        desc: "This effect allows you to use a specified controller (the controller selected in EFX C.Src) to control the delay time and pitch in real time. Lengthening the delay time will lower the pitch, and shortening it will raise the pitch.",
        params: [
            [
                { p: "Dly Time", a: 0x03, d: 60, td: delay2 },
                { p: "Accel", a: 0x04, d: 80, td: accl },
                {
                    p: "Feedback",
                    a: 0x05,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "HF Damp", a: 0x06, d: 127, td: hfDamp },
                { p: "EFX Pan", a: 0x07, d: 64, td: pan },
                { p: "Balance", a: 0x12, d: 48, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_55,
        name: "Reverb",
        desc: "The Reverb effect adds reverberation to the sound, simulating an acoustic space.",
        params: [
            [
                {
                    p: "Type",
                    a: 0x03,
                    d: 3,
                    r: { min: 0x00, max: 0x05 },
                    td: options(
                        "Room 1",
                        "Room 2",
                        "Stage 1",
                        "Stage 2",
                        "Hall 1",
                        "Hall 2"
                    )
                },
                { p: "Pre Dly", a: 0x04, d: 112, td: preDelay },
                { p: "Time", a: 0x05, d: 120 },
                { p: "HF Damp", a: 0x06, d: 104, td: hfDamp },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_56,
        name: "Gate Reverb",
        desc: "Gate Reverb is a special type of reverb in which the reverberant sound is cut off before its natural length.",
        params: [
            [
                {
                    p: "Type",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Normal", "Reverse", "Sweep 1", "Sweep 2")
                },
                { p: "Pre Dly", a: 0x04, d: 5, td: preDelay },
                {
                    p: "Gate Time",
                    a: 0x05,
                    d: 12,
                    r: { min: 0x00, max: 0x63 },
                    td: gateTime
                },
                { p: "Balance", a: 0x12, d: 42, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 61,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 112 }
            ]
        ]
    },
    {
        type: 0x01_57,
        name: "3D Delay",
        desc: "This applies a 3D effect to the delay sound. The delay sound will be positioned 90 degrees left and 90 degrees right.",
        params: [
            [
                { p: "Dly Tm C", a: 0x03, d: 116, td: delay3 },
                { p: "Dly Tm L", a: 0x04, d: 106, td: delay3 },
                { p: "Dly Tm R", a: 0x05, d: 110, td: delay3 },
                {
                    p: "Feedback",
                    a: 0x06,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly Lev C", a: 0x07, d: 40 },
                { p: "Dly Lev L", a: 0x08, d: 64 },
                { p: "Dly Lev R", a: 0x09, d: 64 },
                { p: "HF Damp", a: 0x0a, d: 127, td: hfDamp },
                {
                    p: "Out",
                    a: 0x11,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Speaker", "Phones")
                },
                { p: "Balance", a: 0x12, d: 48, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_60,
        name: "2 Pitch Shifter",
        desc: "A Pitch Shifter shifts the pitch of the original sound. This 2-voice pitch shifter has two pitch shifters, and can add two pitch shifted sounds to the original sound.",
        params: [
            [
                {
                    p: "Coarse 1",
                    a: 0x03,
                    d: 71,
                    r: { min: 0x28, max: 0x4c },
                    td: signedOffset
                },
                {
                    p: "Fine 1",
                    a: 0x04,
                    d: 62,
                    r: { min: 0x0e, max: 0x72 },
                    td: cents
                },
                { p: "Pre Dly 1", a: 0x05, d: 0, td: preDelay },
                { p: "EFX Pan 1", a: 0x06, d: 127, td: pan },
                {
                    p: "Coarse 2",
                    a: 0x07,
                    d: 59,
                    r: { min: 0x28, max: 0x4c },
                    td: signedOffset
                },
                {
                    p: "Fine 2",
                    a: 0x08,
                    d: 66,
                    r: { min: 0x0e, max: 0x72 },
                    td: cents
                },
                { p: "Pre Dly 2", a: 0x09, d: 0, td: preDelay },
                { p: "EFX Pan 2", a: 0x0a, d: 0, td: pan },
                {
                    p: "Shift Mode",
                    a: 0x0b,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: step
                },
                { p: "L.Bal", a: 0x0c, d: 64, td: pitchBalance },
                { p: "Balance", a: 0x12, d: 48, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 95 }
            ]
        ]
    },
    {
        type: 0x01_61,
        name: "Fb P.Shifter",
        desc: "This pitch shifter allows the pitch shifted sound to be returned into the effect.",
        params: [
            [
                {
                    p: "P.Coarse",
                    a: 0x03,
                    d: 71,
                    r: { min: 0x28, max: 0x4c },
                    td: signedOffset
                },
                {
                    p: "P.Fine",
                    a: 0x04,
                    d: 64,
                    r: { min: 0x0e, max: 0x72 },
                    td: cents
                },
                {
                    p: "Feedback",
                    a: 0x05,
                    d: 84,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Pre Dly", a: 0x06, d: 95, td: preDelay },
                {
                    p: "Mode",
                    a: 0x07,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: step
                },
                { p: "EFX Pan", a: 0x08, d: 64, td: pan },
                { p: "Balance", a: 0x12, d: 64, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 58,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_70,
        name: "3D Auto",
        desc: "The 3D Auto effect rotates the location of the sound.",
        params: [
            [
                { p: "Azimuth", a: 0x03, d: 64, td: azimuth },
                { p: "Speed", a: 0x04, d: 25, td: rate1 },
                {
                    p: "Clockwise",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("-", "+")
                },
                {
                    p: "Turn",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "Out",
                    a: 0x11,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Speaker", "Phones")
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_71,
        name: "3D Manual",
        desc: "This places the 3D effect at a desired location.",
        params: [
            [
                { p: "Azimuth", a: 0x03, d: 64, td: azimuth },
                {
                    p: "Out",
                    a: 0x11,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Speaker", "Phones")
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_72,
        name: "Lo-Fi 1",
        desc: "Lo-Fi 1 is an effect that intentionally degrades the sound quality.",
        params: [
            [
                {
                    p: "Pre Filter",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x05 },
                    td: step
                },
                {
                    p: "Lo-Fi Type",
                    a: 0x04,
                    d: 5,
                    r: { min: 0x00, max: 0x08 },
                    td: step
                },
                {
                    p: "Post Filter",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x05 },
                    td: step
                },
                { p: "Balance", a: 0x12, d: 127, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x01_73,
        name: "Lo-Fi 2",
        desc: "Lo-Fi 2 is an effect that intentionally degrades the sound quality and allows a variety of noise to be added.",
        params: [
            [
                {
                    p: "Lo-Fi Type",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x05 },
                    td: step
                },
                {
                    p: "Fil Type",
                    a: 0x04,
                    d: 1,
                    r: { min: 0x00, max: 0x02 },
                    td: options("Off", "LPF", "HPF")
                },
                { p: "Cutoff", a: 0x05, d: 36, td: cutoff },
                { p: "R.Detune", a: 0x06, d: 0 },
                { p: "R.Nz Lev", a: 0x07, d: 64 },
                {
                    p: "W/P Sel",
                    a: 0x08,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("White", "Pink")
                },
                { p: "W/P LPF", a: 0x09, d: 127, td: lpf },
                { p: "W/P Level", a: 0x0a, d: 0 },
                {
                    p: "Disc Type",
                    a: 0x0b,
                    d: 0,
                    r: { min: 0x00, max: 0x03 },
                    td: options("LP", "EP", "SP", "RND")
                },
                { p: "Disc LPF", a: 0x0c, d: 127, td: lpf },
                { p: "Disc Nz Lev", a: 0x0d, d: 0 },
                {
                    p: "Hum Type",
                    a: 0x0e,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("50Hz", "60Hz")
                },
                { p: "Hum LPF", a: 0x0f, d: 127, td: lpf },
                { p: "Hum Level", a: 0x10, d: 0 },
                {
                    p: "M/S",
                    a: 0x11,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Mono", "Stereo")
                },
                { p: "Balance", a: 0x12, d: 127, td: balance },
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Pan(Mono)", a: 0x15, d: 64, td: pan },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x02_00,
        name: "OD -> Chorus",
        desc: "This effect connects an overdrive and a chorus in series.",
        params: [
            [
                { p: "OD Drive", a: 0x03, d: 48 },
                { p: "OD Pan", a: 0x04, d: 64, td: pan },
                {
                    p: "OD Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                { p: "Cho Dly", a: 0x08, d: 10, td: preDelay },
                { p: "Cho Rate", a: 0x09, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x0a, d: 72 },
                { p: "Cho Bal", a: 0x0c, d: 64, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 80 }
            ]
        ]
    },
    {
        type: 0x02_01,
        name: "OD -> Flanger",
        desc: "This effect connects an overdrive and a flanger in series.",
        params: [
            [
                { p: "OD Drive", a: 0x03, d: 48 },
                { p: "OD Pan", a: 0x04, d: 64, td: pan },
                {
                    p: "OD Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                { p: "FL Dly", a: 0x08, d: 16, td: preDelay },
                { p: "FL Rate", a: 0x09, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x0a, d: 40 },
                {
                    p: "FL Fb",
                    a: 0x0b,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x0c, d: 32, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 80 }
            ]
        ]
    },
    {
        type: 0x02_02,
        name: "OD -> Delay",
        desc: "This effect connects an overdrive and a delay in series.",
        params: [
            [
                { p: "OD Drive", a: 0x03, d: 48 },
                { p: "OD Pan", a: 0x04, d: 64, td: pan },
                {
                    p: "OD Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 48, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 80 }
            ]
        ]
    },
    {
        type: 0x02_03,
        name: "DS -> Chorus",
        desc: "This effect connects a distortion and a chorus in series.",
        params: [
            [
                { p: "DS Drive", a: 0x03, d: 48 },
                { p: "DS Pan", a: 0x04, d: 64, td: pan },
                {
                    p: "DS Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "DS Amp Sw",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                { p: "Cho Dly", a: 0x08, d: 10, td: preDelay },
                { p: "Cho Rate", a: 0x09, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x0a, d: 72 },
                { p: "Cho Bal", a: 0x0c, d: 64, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 72 }
            ]
        ]
    },
    {
        type: 0x02_04,
        name: "DS -> Flanger",
        desc: "This effect connects a distortion and a flanger in series.",
        params: [
            [
                { p: "DS Drive", a: 0x03, d: 48 },
                { p: "DS Pan", a: 0x04, d: 64, td: pan },
                {
                    p: "DS Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "DS Amp Sw",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                { p: "FL Dly", a: 0x08, d: 11, td: preDelay },
                { p: "FL Rate", a: 0x09, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x0a, d: 24 },
                {
                    p: "FL Fb",
                    a: 0x0b,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x0c, d: 32, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 72 }
            ]
        ]
    },
    {
        type: 0x02_05,
        name: "DS -> Delay",
        desc: "This effect connects a distortion and a delay in series.",
        params: [
            [
                { p: "DS Drive", a: 0x03, d: 48 },
                { p: "DS Pan", a: 0x04, d: 64, td: pan },
                {
                    p: "DS Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "DS Amp Sw",
                    a: 0x06,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 48, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 72 }
            ]
        ]
    },
    {
        type: 0x02_06,
        name: "EH -> Chorus",
        desc: "This effect connects an enhancer and a chorus in series.",
        params: [
            [
                { p: "EH Sens", a: 0x03, d: 64 },
                { p: "EH Mix", a: 0x04, d: 127 }
            ],
            [
                { p: "Cho Dly", a: 0x08, d: 64, td: preDelay },
                { p: "Cho Rate", a: 0x09, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x0a, d: 101 },
                { p: "Cho Bal", a: 0x0c, d: 64, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 80 }
            ]
        ]
    },
    {
        type: 0x02_07,
        name: "EH -> Flanger",
        desc: "This effect connects an enhancer and a flanger in series.",
        params: [
            [
                { p: "EH Sens", a: 0x03, d: 64 },
                { p: "EH Mix", a: 0x04, d: 127 }
            ],
            [
                { p: "FL Dly", a: 0x08, d: 16, td: preDelay },
                { p: "FL Rate", a: 0x09, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x0a, d: 24 },
                {
                    p: "FL Fb",
                    a: 0x0b,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x0c, d: 48, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 96 }
            ]
        ]
    },
    {
        type: 0x02_08,
        name: "EH -> Delay",
        desc: "This effect connects an enhancer and a delay in series.",
        params: [
            [
                { p: "EH Sens", a: 0x03, d: 64 },
                { p: "EH Mix", a: 0x04, d: 127 }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 48, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 88 }
            ]
        ]
    },
    {
        type: 0x02_09,
        name: "Cho -> Delay",
        desc: "This effect connects a chorus and a delay unit in series.",
        params: [
            [
                { p: "Cho Dly", a: 0x03, d: 10, td: preDelay },
                { p: "Cho Rate", a: 0x04, d: 9, td: rate1 },
                { p: "Cho Depth", a: 0x05, d: 120 },
                { p: "Cho Bal", a: 0x07, d: 64, td: balance }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 48, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x02_0a,
        name: "FL -> Delay",
        desc: "This effect connects a flanger and a delay in series.",
        params: [
            [
                { p: "FL Dly", a: 0x03, d: 16, td: preDelay },
                { p: "FL Rate", a: 0x04, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x05, d: 24 },
                {
                    p: "FL Fb",
                    a: 0x06,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x07, d: 64, td: balance }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 48, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 127 }
            ]
        ]
    },
    {
        type: 0x02_0b,
        name: "Cho -> Flanger",
        desc: "This effect connects a chorus and a flanger in series.",
        params: [
            [
                { p: "Cho Dly", a: 0x03, d: 10, td: preDelay },
                { p: "Cho Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x05, d: 120 },
                { p: "Cho Bal", a: 0x07, d: 64, td: balance }
            ],
            [
                { p: "FL Dly", a: 0x08, d: 16, td: preDelay },
                { p: "FL Rate", a: 0x09, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x0a, d: 24 },
                {
                    p: "FL Fb",
                    a: 0x0b,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x0c, d: 64, td: balance }
            ],
            [
                {
                    p: "Low Gain",
                    a: 0x13,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "Hi Gain",
                    a: 0x14,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "Level", a: 0x16, d: 112 }
            ]
        ]
    },
    {
        type: 0x03_00,
        name: "Rotary Multi",
        desc: "This connects Overdrive (OD), 3-band equalizer (EQ), and Rotary (RT) effects in series.",
        params: [
            [
                { p: "OD Drive", a: 0x03, d: 13 },
                {
                    p: "OD Sw",
                    a: 0x04,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "EQ L Gain",
                    a: 0x05,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "EQ M Fq", a: 0x06, d: 72, td: eqFreq },
                {
                    p: "EQ M Q",
                    a: 0x07,
                    d: 0,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "EQ M Gain",
                    a: 0x08,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "EQ H Gain",
                    a: 0x09,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                }
            ],
            [
                { p: "RT L Slow", a: 0x0a, d: 6, td: rate1 },
                { p: "RT L Fast", a: 0x0b, d: 113, td: rate1 },
                { p: "RT Lo Accl", a: 0x0c, d: 24, td: accl },
                { p: "RT Lo Lev", a: 0x0d, d: 127 },
                { p: "RT H Slow", a: 0x0e, d: 17, td: rate1 },
                { p: "RT H Fast", a: 0x0f, d: 120, td: rate1 },
                { p: "RT Hi Accl", a: 0x10, d: 88, td: accl },
                { p: "RT Hi Lev", a: 0x11, d: 64 },
                { p: "RT Sept", a: 0x12, d: 96 },
                { p: "RT Speed", a: 0x13, d: 0, td: speed }
            ],
            [{ p: "Level", a: 0x16, d: 96 }]
        ]
    },
    {
        type: 0x04_00,
        name: "GTR Multi 1",
        desc: "Guitar Multi 1 connects Compressor (Cmp), Overdrive or Distortion (OD), Chorus or Flanger (CF), and Delay (Dly) effects in series.",
        params: [
            [
                { p: "Cmp Atck", a: 0x03, d: 100 },
                { p: "Cmp Sus", a: 0x04, d: 80 },
                { p: "Cmp Level", a: 0x05, d: 100 },
                {
                    p: "Cmp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "OD Sel",
                    a: 0x07,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x08, d: 80 },
                {
                    p: "OD Amp",
                    a: 0x09,
                    d: 0,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x0a,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "OD L Gain",
                    a: 0x0b,
                    d: 69,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "OD H Gain",
                    a: 0x0c,
                    d: 74,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "OD Sw",
                    a: 0x0d,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x0e,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF Rate", a: 0x0f, d: 8, td: rate2 },
                { p: "CF Depth", a: 0x10, d: 30 },
                {
                    p: "CF Fb",
                    a: 0x11,
                    d: 102,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x12, d: 40 }
            ],
            [
                { p: "Dly Time", a: 0x13, d: 60, td: delay4 },
                { p: "Dly Fb", a: 0x14, d: 34 },
                { p: "Dly Mix", a: 0x15, d: 15 }
            ],
            [{ p: "Level", a: 0x16, d: 110 }]
        ]
    },
    {
        type: 0x04_01,
        name: "GTR Multi 2",
        desc: "Guitar Multi 2 provides Compressor (Cmp), Overdrive or Distortion (OD), Equalizer (EQ), and Chorus or Flanger (CF) effects connected in series.",
        params: [
            [
                { p: "Cmp Atck", a: 0x03, d: 70 },
                { p: "Cmp Sus", a: 0x04, d: 127 },
                { p: "Cmp Level", a: 0x05, d: 90 },
                {
                    p: "Cmp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "OD Sel",
                    a: 0x07,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x08, d: 80 },
                {
                    p: "OD Amp",
                    a: 0x09,
                    d: 2,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x0a,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "OD Sw",
                    a: 0x0b,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "EQ L Gain",
                    a: 0x0c,
                    d: 76,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "EQ M Fq", a: 0x0d, d: 56, td: eqFreq },
                {
                    p: "EQ M Q",
                    a: 0x0e,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "EQ M Gain",
                    a: 0x0f,
                    d: 69,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "EQ H Gain",
                    a: 0x10,
                    d: 54,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x11,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF Rate", a: 0x12, d: 8, td: rate2 },
                { p: "CF Depth", a: 0x13, d: 96 },
                {
                    p: "CF Fb",
                    a: 0x14,
                    d: 102,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x15, d: 0 }
            ],
            [{ p: "Level", a: 0x16, d: 80 }]
        ]
    },
    {
        type: 0x04_02,
        name: "GTR Multi 3",
        desc: "Guitar Multi 3 connects Wah (Wah), Overdrive or Distortion (OD), Chorus or Flanger (CF), and Delay (Dly) effects in series.",
        params: [
            [
                {
                    p: "Wah Fil",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("LPF", "BPF")
                },
                { p: "Wah Man", a: 0x04, d: 60 },
                { p: "Wah Peak", a: 0x05, d: 10 },
                {
                    p: "Wah Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "OD Sel",
                    a: 0x07,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x08, d: 80 },
                {
                    p: "OD Amp",
                    a: 0x09,
                    d: 2,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x0a,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "OD L Gain",
                    a: 0x0b,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "OD H Gain",
                    a: 0x0c,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "OD Sw",
                    a: 0x0d,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x0e,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF Rate", a: 0x0f, d: 8, td: rate2 },
                { p: "CF Depth", a: 0x10, d: 0 },
                {
                    p: "CF Fb",
                    a: 0x11,
                    d: 89,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x12, d: 50 }
            ],
            [
                { p: "Dly Time", a: 0x13, d: 32, td: delay4 },
                { p: "Dly Fb", a: 0x14, d: 64 },
                { p: "Dly Mix", a: 0x15, d: 30 }
            ],
            [{ p: "Level", a: 0x16, d: 88 }]
        ]
    },
    {
        type: 0x04_03,
        name: "Clean Gt Multi 1",
        desc: "Clean Guitar Multi 1 connects Compressor (Cmp), Equalizer (EQ), Chorus or Flanger (CF), and Delay (Dly) effects in series.",
        params: [
            [
                { p: "Cmp Atck", a: 0x03, d: 50 },
                { p: "Cmp Sus", a: 0x04, d: 127 },
                { p: "Cmp Level", a: 0x05, d: 75 },
                {
                    p: "Cmp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "EQ L Gain",
                    a: 0x07,
                    d: 76,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "EQ M Fq", a: 0x08, d: 0, td: eqFreq },
                {
                    p: "EQ M Q",
                    a: 0x09,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "EQ M Gain",
                    a: 0x0a,
                    d: 69,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "EQ H Gain",
                    a: 0x0b,
                    d: 52,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x0c,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF Rate", a: 0x0d, d: 8, td: rate2 },
                { p: "CF Depth", a: 0x0e, d: 40 },
                {
                    p: "CF Fb",
                    a: 0x0f,
                    d: 79,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x10, d: 100 }
            ],
            [
                { p: "Dly Time", a: 0x11, d: 24, td: delay4 },
                { p: "Dly Fb", a: 0x12, d: 40 },
                { p: "Dly HF", a: 0x13, d: 127, td: hfDamp },
                { p: "Dly Mix", a: 0x14, d: 30 }
            ],
            [{ p: "Level", a: 0x16, d: 95 }]
        ]
    },
    {
        type: 0x04_04,
        name: "Clean Gt Multi 2",
        desc: "Clean Guitar Multi 2 provides Auto-wah (AW), Equalizer (EQ), Chorus or Flanger (CF), and Delay (Dly) effects connected in series.",
        params: [
            [
                {
                    p: "AW Filter",
                    a: 0x03,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("LPF", "BPF")
                },
                { p: "AW Man", a: 0x04, d: 55 },
                { p: "AW Peak", a: 0x05, d: 40 },
                { p: "AW Rate", a: 0x06, d: 29, td: rate2 },
                { p: "AW Depth", a: 0x07, d: 80 },
                {
                    p: "AW Sw",
                    a: 0x08,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "EQ L Gain",
                    a: 0x09,
                    d: 76,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "EQ M Fq", a: 0x0a, d: 72, td: eqFreq },
                {
                    p: "EQ M Q",
                    a: 0x0b,
                    d: 0,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "EQ M Gain",
                    a: 0x0c,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "EQ H Gain",
                    a: 0x0d,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x0e,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF Rate", a: 0x0f, d: 8, td: rate2 },
                { p: "CF Depth", a: 0x10, d: 20 },
                {
                    p: "CF Fb",
                    a: 0x11,
                    d: 102,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x12, d: 100 }
            ],
            [
                { p: "Dly Time", a: 0x13, d: 6, td: delay4 },
                { p: "Dly Fb", a: 0x14, d: 15 },
                { p: "Dly Mix", a: 0x15, d: 80 }
            ],
            [{ p: "Level", a: 0x16, d: 76 }]
        ]
    },
    {
        type: 0x04_05,
        name: "Bass Multi",
        desc: "Bass Multi provides Compressor (Cmp), Overdrive or Distortion (OD), Equalizer (EQ), and Chorus or Flanger (CF) effects connected in series.",
        params: [
            [
                { p: "Cmp Atck", a: 0x03, d: 72 },
                { p: "Cmp Sus", a: 0x04, d: 100 },
                { p: "Cmp Level", a: 0x05, d: 75 },
                {
                    p: "Cmp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "OD Sel",
                    a: 0x07,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x08, d: 48 },
                {
                    p: "OD Amp",
                    a: 0x09,
                    d: 0,
                    r: { min: 0x00, max: 0x02 },
                    td: options("Small", "BltIn", "2-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x0a,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                {
                    p: "OD Sw",
                    a: 0x0b,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [
                {
                    p: "EQ L Gain",
                    a: 0x0c,
                    d: 66,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "EQ M Fq", a: 0x0d, d: 72, td: eqFreq },
                {
                    p: "EQ M Q",
                    a: 0x0e,
                    d: 1,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "EQ M Gain",
                    a: 0x0f,
                    d: 68,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "EQ H Gain",
                    a: 0x10,
                    d: 64,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x11,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF Rate", a: 0x12, d: 5, td: rate2 },
                { p: "CF Depth", a: 0x13, d: 20 },
                {
                    p: "CF Fb",
                    a: 0x14,
                    d: 102,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x15, d: 64 }
            ],
            [{ p: "Level", a: 0x16, d: 76 }]
        ]
    },
    {
        type: 0x04_06,
        name: "Rhodes Multi",
        desc: "Rhodes Multi provides Enhancer (EH), Phaser (PH), Chorus or Flanger (CF), and Tremolo or Pan (TP) effects connected in series.",
        params: [
            [
                { p: "EH Sens", a: 0x03, d: 64 },
                { p: "EH Mix", a: 0x04, d: 64 }
            ],
            [
                { p: "PH Man", a: 0x05, d: 36, td: manual },
                { p: "PH Rate", a: 0x06, d: 16, td: rate2 },
                { p: "PH Depth", a: 0x07, d: 32 },
                { p: "PH Reso", a: 0x08, d: 16 },
                { p: "PH Mix", a: 0x09, d: 64 }
            ],
            [
                {
                    p: "CF Sel",
                    a: 0x0a,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Chorus", "Flanger")
                },
                { p: "CF LPF", a: 0x0b, d: 127, td: lpf },
                { p: "CF Dly", a: 0x0c, d: 10, td: preDelay },
                { p: "CF Rate", a: 0x0d, d: 8, td: rate2 },
                { p: "CF Depth", a: 0x0e, d: 64 },
                {
                    p: "CF Fb",
                    a: 0x0f,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "CF Mix", a: 0x10, d: 127 }
            ],
            [
                {
                    p: "TP Sel",
                    a: 0x11,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Trem", "Pan")
                },
                {
                    p: "TP Mod WV",
                    a: 0x12,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: options("Tri", "Sqr", "Sin", "Saw1", "Saw2")
                },
                { p: "TP Mod RT", a: 0x13, d: 60, td: rate2 },
                { p: "TP Mod Dep", a: 0x14, d: 64 },
                {
                    p: "TP Sw",
                    a: 0x15,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    },
    {
        type: 0x05_00,
        name: "Keyboard Multi",
        desc: "Keyboard Multi provides Ring Modulator (RM), Equalizer (EQ), Pitch Shifter (PS), Phaser (PH) and Delay (Dly) effects connected in series. Ring Modulator is an effect which applies amplitude modulation (AM) to the input signal, producing bell-like sounds.",
        params: [
            [
                { p: "RM Mod Freq", a: 0x03, d: 50 },
                { p: "RM Bal", a: 0x04, d: 20, td: balance }
            ],
            [
                {
                    p: "EQ L Gain",
                    a: 0x05,
                    d: 67,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                { p: "EQ M Fq", a: 0x06, d: 0, td: eqFreq },
                {
                    p: "EQ M Q",
                    a: 0x07,
                    d: 2,
                    r: { min: 0x00, max: 0x04 },
                    td: options("0.5", "1.0", "2.0", "4.0", "9.0")
                },
                {
                    p: "EQ M Gain",
                    a: 0x08,
                    d: 69,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                },
                {
                    p: "EQ H Gain",
                    a: 0x09,
                    d: 61,
                    r: { min: 0x34, max: 0x4c },
                    td: gain
                }
            ],
            [
                {
                    p: "PS Coarse",
                    a: 0x0a,
                    d: 71,
                    r: { min: 0x28, max: 0x4c },
                    td: signedOffset
                },
                {
                    p: "PS Fine",
                    a: 0x0b,
                    d: 64,
                    r: { min: 0x0e, max: 0x72 },
                    td: cents
                },
                {
                    p: "PS Mode",
                    a: 0x0c,
                    d: 0,
                    r: { min: 0x00, max: 0x04 },
                    td: step
                },
                { p: "PS Bal", a: 0x0d, d: 39, td: balance }
            ],
            [
                { p: "PH Man", a: 0x0e, d: 36, td: manual },
                { p: "PH Rate", a: 0x0f, d: 8, td: rate2 },
                { p: "PH Depth", a: 0x10, d: 90 },
                { p: "PH Reso", a: 0x11, d: 80 },
                { p: "PH Mix", a: 0x12, d: 75 }
            ],
            [
                { p: "Dly Time", a: 0x13, d: 20, td: delay4 },
                { p: "Dly Fb", a: 0x14, d: 64 },
                { p: "Dly Mix", a: 0x15, d: 40 }
            ],
            [{ p: "Level", a: 0x16, d: 96 }]
        ]
    },
    {
        type: 0x11_00,
        name: "Cho / Delay",
        desc: "This effect connects a chorus and a delay in parallel.",
        params: [
            [
                { p: "Cho Dly", a: 0x03, d: 10, td: preDelay },
                { p: "Cho Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x05, d: 120 },
                { p: "Cho Bal", a: 0x07, d: 64, td: balance },
                { p: "Cho Pan", a: 0x12, d: 0, td: pan },
                { p: "Cho Level", a: 0x13, d: 127 }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 40, td: balance },
                { p: "Dly Pan", a: 0x14, d: 127, td: pan },
                { p: "Dly Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 96 }]
        ]
    },
    {
        type: 0x11_01,
        name: "FL / Delay",
        desc: "This effect connects a flanger and a delay in parallel.",
        params: [
            [
                { p: "FL Dly", a: 0x03, d: 16, td: preDelay },
                { p: "FL Rate", a: 0x04, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x05, d: 24 },
                {
                    p: "FL Fb",
                    a: 0x06,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x07, d: 64, td: balance },
                { p: "FL Pan", a: 0x12, d: 0, td: pan },
                { p: "FL Level", a: 0x13, d: 127 }
            ],
            [
                { p: "Dly Time", a: 0x08, d: 111, td: delay3 },
                {
                    p: "Dly Fb",
                    a: 0x09,
                    d: 80,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "Dly HF", a: 0x0a, d: 127, td: hfDamp },
                { p: "Dly Bal", a: 0x0c, d: 48, td: balance },
                { p: "Dly Pan", a: 0x14, d: 127, td: pan },
                { p: "Dly Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 96 }]
        ]
    },
    {
        type: 0x11_02,
        name: "Cho / Flanger",
        desc: "This effect connects a chorus and a flanger in parallel.",
        params: [
            [
                { p: "Cho Dly", a: 0x03, d: 16, td: preDelay },
                { p: "Cho Rate", a: 0x04, d: 8, td: rate1 },
                { p: "Cho Depth", a: 0x05, d: 120 },
                { p: "Cho Bal", a: 0x07, d: 64, td: balance },
                { p: "Cho Pan", a: 0x12, d: 0, td: pan },
                { p: "Cho Level", a: 0x13, d: 127 }
            ],
            [
                { p: "FL Dly", a: 0x08, d: 16, td: preDelay },
                { p: "FL Rate", a: 0x09, d: 11, td: rate1 },
                { p: "FL Depth", a: 0x0a, d: 24 },
                {
                    p: "FL Fb",
                    a: 0x0b,
                    d: 104,
                    r: { min: 0x0f, max: 0x71 },
                    td: feedback
                },
                { p: "FL Bal", a: 0x0c, d: 64, td: balance },
                { p: "FL Pan", a: 0x14, d: 127, td: pan },
                { p: "FL Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 88 }]
        ]
    },
    {
        type: 0x11_03,
        name: "OD1 / OD2",
        desc: "This connects two effect units in parallel, each of which allows you to select Overdrive or Distortion.",
        params: [
            [
                {
                    p: "OD1 Sel",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD1 Drive", a: 0x04, d: 48 },
                {
                    p: "OD1 Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD1 Amp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                { p: "OD1 Pan", a: 0x12, d: 0, td: pan },
                { p: "OD1 Level", a: 0x13, d: 96 }
            ],
            [
                {
                    p: "OD2 Sel",
                    a: 0x08,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD2 Drive", a: 0x09, d: 76 },
                {
                    p: "OD2 Amp",
                    a: 0x0a,
                    d: 3,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD2 Amp Sw",
                    a: 0x0b,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                { p: "OD2 Pan", a: 0x14, d: 127, td: pan },
                { p: "OD2 Level", a: 0x15, d: 84 }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    },
    {
        type: 0x11_04,
        name: "OD / Rotary",
        desc: "This connects Overdrive or Distortion in parallel with Rotary.",
        params: [
            [
                {
                    p: "OD Sel",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x04, d: 48 },
                {
                    p: "OD Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                { p: "OD Pan", a: 0x12, d: 0, td: pan },
                { p: "OD Level", a: 0x13, d: 96 }
            ],
            [
                { p: "RT L Slow", a: 0x08, d: 6, td: rate1 },
                { p: "RT L Fast", a: 0x09, d: 113, td: rate1 },
                { p: "RT Lo Accl", a: 0x0a, d: 24, td: accl },
                { p: "RT Lo Lev", a: 0x0b, d: 127 },
                { p: "RT H Slow", a: 0x0c, d: 17, td: rate1 },
                { p: "RT H Fast", a: 0x0d, d: 120, td: rate1 },
                { p: "RT Hi Accl", a: 0x0e, d: 88, td: accl },
                { p: "RT Hi Lev", a: 0x0f, d: 64 },
                { p: "RT Sept", a: 0x10, d: 96 },
                { p: "RT Speed", a: 0x11, d: 0, td: speed },
                { p: "RT Pan", a: 0x14, d: 127, td: pan },
                { p: "RT Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    },
    {
        type: 0x11_05,
        name: "OD / Phaser",
        desc: "This connects an overdrive or distortion in parallel with a phaser.",
        params: [
            [
                {
                    p: "OD Sel",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x04, d: 48 },
                {
                    p: "OD Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                { p: "OD Pan", a: 0x12, d: 0, td: pan },
                { p: "OD Level", a: 0x13, d: 96 }
            ],
            [
                { p: "PH Man", a: 0x08, d: 36, td: manual },
                { p: "PH Rate", a: 0x09, d: 16, td: rate1 },
                { p: "PH Depth", a: 0x0a, d: 64 },
                { p: "PH Reso", a: 0x0b, d: 16 },
                { p: "PH Mix", a: 0x0c, d: 127 },
                { p: "PH Pan", a: 0x14, d: 127, td: pan },
                { p: "PH Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    },
    {
        type: 0x11_06,
        name: "OD / AutoWah",
        desc: "This connects an Overdrive or Distortion in parallel with an Auto-wah.",
        params: [
            [
                {
                    p: "OD Sel",
                    a: 0x03,
                    d: 0,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Overdrive", "Distortion")
                },
                { p: "OD Drive", a: 0x04, d: 48 },
                {
                    p: "OD Amp",
                    a: 0x05,
                    d: 1,
                    r: { min: 0x00, max: 0x03 },
                    td: options("Small", "BltIn", "2-Stk", "3-Stk")
                },
                {
                    p: "OD Amp Sw",
                    a: 0x06,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: onOff
                },
                { p: "OD Pan", a: 0x12, d: 0, td: pan },
                { p: "OD Level", a: 0x13, d: 96 }
            ],
            [
                {
                    p: "AW Filter",
                    a: 0x08,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("LPF", "BPF")
                },
                { p: "AW Sens", a: 0x09, d: 0 },
                { p: "AW Man", a: 0x0a, d: 68 },
                { p: "AW Peak", a: 0x0b, d: 62 },
                { p: "AW Rate", a: 0x0c, d: 40, td: rate1 },
                { p: "AW Depth", a: 0x0d, d: 72 },
                {
                    p: "AW Pol",
                    a: 0x0e,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Down", "Up")
                },
                { p: "AW Pan", a: 0x14, d: 127, td: pan },
                { p: "AW Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    },
    {
        type: 0x11_07,
        name: "PH / Rotary",
        desc: "This connects a Phaser effect in parallel with a Rotary effect.",
        params: [
            [
                { p: "PH Man", a: 0x03, d: 36, td: manual },
                { p: "PH Rate", a: 0x04, d: 16, td: rate1 },
                { p: "PH Depth", a: 0x05, d: 64 },
                { p: "PH Reso", a: 0x06, d: 16 },
                { p: "PH Mix", a: 0x07, d: 127 },
                { p: "PH Pan", a: 0x12, d: 0, td: pan },
                { p: "PH Level", a: 0x13, d: 127 }
            ],
            [
                { p: "RT L Slow", a: 0x08, d: 6, td: rate1 },
                { p: "RT L Fast", a: 0x09, d: 113, td: rate1 },
                { p: "RT Lo Accl", a: 0x0a, d: 24, td: accl },
                { p: "RT Lo Lev", a: 0x0b, d: 127 },
                { p: "RT H Slow", a: 0x0c, d: 17, td: rate1 },
                { p: "RT H Fast", a: 0x0d, d: 120, td: rate1 },
                { p: "RT Hi Accl", a: 0x0e, d: 88, td: accl },
                { p: "RT Hi Lev", a: 0x0f, d: 64 },
                { p: "RT Sept", a: 0x10, d: 96 },
                { p: "RT Speed", a: 0x11, d: 0, td: speed },
                { p: "RT Pan", a: 0x14, d: 127, td: pan },
                { p: "RT Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    },
    {
        type: 0x11_08,
        name: "PH / AutoWah",
        desc: "This connects a Phaser effect and an Auto-wah effect in parallel.",
        params: [
            [
                { p: "PH Man", a: 0x03, d: 36, td: manual },
                { p: "PH Rate", a: 0x04, d: 16, td: rate1 },
                { p: "PH Depth", a: 0x05, d: 64 },
                { p: "PH Reso", a: 0x06, d: 16 },
                { p: "PH Mix", a: 0x07, d: 127 },
                { p: "PH Pan", a: 0x12, d: 0, td: pan },
                { p: "PH Level", a: 0x13, d: 127 }
            ],
            [
                {
                    p: "AW Filter",
                    a: 0x08,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("LPF", "BPF")
                },
                { p: "AW Sens", a: 0x09, d: 0 },
                { p: "AW Man", a: 0x0a, d: 68 },
                { p: "AW Peak", a: 0x0b, d: 62 },
                { p: "AW Rate", a: 0x0c, d: 40, td: rate1 },
                { p: "AW Depth", a: 0x0d, d: 72 },
                {
                    p: "AW Pol",
                    a: 0x0e,
                    d: 1,
                    r: { min: 0x00, max: 0x01 },
                    td: options("Down", "Up")
                },
                { p: "AW Pan", a: 0x14, d: 127, td: pan },
                { p: "AW Level", a: 0x15, d: 127 }
            ],
            [{ p: "Level", a: 0x16, d: 127 }]
        ]
    }
];
