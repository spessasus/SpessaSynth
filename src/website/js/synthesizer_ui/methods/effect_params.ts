import { Meter } from "./synthui_meter.ts";
import type {
    EffectChangeCallback,
    MasterParameterType
} from "spessasynth_core";
import { InsertionValueConverter } from "./convert.ts";

export type ReverbParams = Exclude<
    Extract<EffectChangeCallback, { effect: "reverb" }>["parameter"],
    "macro"
>;
export type ReverbController = Record<ReverbParams, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
};
export type ChorusParams = Exclude<
    Extract<EffectChangeCallback, { effect: "chorus" }>["parameter"],
    "macro"
>;
export type ChorusController = Record<ChorusParams, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
};
export type DelayParams = Exclude<
    Extract<EffectChangeCallback, { effect: "delay" }>["parameter"],
    "macro"
>;

export type DelayController = Record<DelayParams, Meter> & {
    wrapper: HTMLElement;
    macro: HTMLSelectElement;
};

export interface InsertionController {
    wrapper: HTMLElement;
    effectSelector: HTMLSelectElement;
    /**
     * Map<insertion type, {controllerWrapper: the wrapper of all the meters, controllers: Map<parameter address, Meter for that parameter>}>
     */
    effects: Map<
        number,
        { controllerWrapper: HTMLElement; controllers: Map<number, Meter> }
    >;
}
/**
 * Params:
 * "a" - address 3 (sysEx)
 * "p" - param name
 * "r" - data range (optional, in sysEx data)
 * "td" - transform function from sysEx to displayed (optional)
 */
export interface ParamType<K extends string> {
    params: {
        a: number;
        p: K;
        r?: { min: number; max: number };
        td?: (v: number) => string;
    }[];
    lockName: keyof MasterParameterType;
    macroAddress: number;
    macros: (Record<K, number> & { name: string })[];
}
export const reverbData: ParamType<ReverbParams> = {
    params: [
        { a: 0x31, p: "character", r: { min: 0, max: 7 } },
        { a: 0x34, p: "time" },
        { a: 0x35, p: "delayFeedback" },
        // 37 not 36
        { a: 0x37, p: "preDelayTime" },
        { a: 0x33, p: "level" },
        { a: 0x32, p: "preLowpass", r: { min: 0, max: 7 } }
    ],
    lockName: "reverbLock",
    macroAddress: 0x30,
    macros: [
        {
            name: "Room1",
            level: 64,
            preDelayTime: 0,
            character: 0,
            preLowpass: 3,
            time: 80,
            delayFeedback: 0
        },
        {
            name: "Room2",
            level: 64,
            preDelayTime: 0,
            character: 1,
            preLowpass: 4,
            time: 56,
            delayFeedback: 0
        },
        {
            name: "Room3",
            level: 64,
            preDelayTime: 0,
            character: 2,
            preLowpass: 0,
            time: 72,
            delayFeedback: 0
        },
        {
            name: "Hall1",
            level: 64,
            preDelayTime: 0,
            character: 3,
            preLowpass: 4,
            time: 72,
            delayFeedback: 0
        },
        {
            name: "Hall2",
            level: 64,
            preDelayTime: 0,
            character: 4,
            preLowpass: 0,
            time: 64,
            delayFeedback: 0
        },
        {
            name: "Plate",
            level: 64,
            preDelayTime: 0,
            character: 5,
            preLowpass: 0,
            time: 88,
            delayFeedback: 0
        },
        {
            name: "Delay",
            level: 64,
            preDelayTime: 0,
            character: 6,
            preLowpass: 0,
            time: 32,
            delayFeedback: 40
        },
        {
            name: "PanningDelay",
            level: 64,
            preDelayTime: 0,
            character: 7,
            preLowpass: 0,
            time: 64,
            delayFeedback: 32
        }
    ]
};
export const chorusData: ParamType<ChorusParams> = {
    params: [
        { a: 0x3b, p: "feedback" },
        { a: 0x3c, p: "delay" },
        { a: 0x3d, p: "rate" },
        { a: 0x3e, p: "depth" },
        { a: 0x3f, p: "sendLevelToReverb" },
        { a: 0x40, p: "sendLevelToDelay" },
        { a: 0x3a, p: "level" },
        { a: 0x39, p: "preLowpass", r: { min: 0, max: 7 } }
    ],
    macroAddress: 0x38,
    lockName: "chorusLock",
    macros: [
        {
            name: "Chorus1",
            level: 64,
            preLowpass: 0,
            delay: 112,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 0,
            rate: 3,
            depth: 5
        },
        {
            name: "Chorus2",
            level: 64,
            preLowpass: 0,
            delay: 80,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 5,
            rate: 9,
            depth: 19
        },
        {
            name: "Chorus3",
            level: 64,
            preLowpass: 0,
            delay: 80,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 8,
            rate: 3,
            depth: 19
        },
        {
            name: "Chorus4",
            level: 64,
            preLowpass: 0,
            delay: 64,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 16,
            rate: 9,
            depth: 16
        },
        {
            name: "Feedback Chorus",
            level: 64,
            preLowpass: 0,
            delay: 127,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 64,
            rate: 2,
            depth: 24
        },
        {
            name: "Flanger",
            level: 64,
            preLowpass: 0,
            delay: 127,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 112,
            rate: 1,
            depth: 5
        },
        {
            name: "Short Delay",
            level: 64,
            preLowpass: 0,
            delay: 127,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 0,
            rate: 0,
            depth: 127
        },
        {
            name: "Short DelayFB",
            level: 64,
            preLowpass: 0,
            delay: 127,
            sendLevelToDelay: 0,
            sendLevelToReverb: 0,
            feedback: 80,
            rate: 0,
            depth: 127
        }
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

export const delayData: ParamType<DelayParams> = {
    params: [
        {
            a: 0x52,
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
            a: 0x53,
            p: "timeRatioLeft",
            r: { min: 1, max: 0x78 },
            td: (v) => `${Math.round(v * 4.166_666)}%`
        },
        {
            a: 0x54,
            p: "timeRatioRight",
            r: { min: 1, max: 0x78 },
            td: (v) => `${Math.round(v * 4.166_666)}%`
        },
        { a: 0x55, p: "levelCenter" },
        { a: 0x56, p: "levelLeft" },
        { a: 0x57, p: "levelRight" },
        {
            a: 0x59,
            p: "feedback",
            r: { min: 0, max: 0x7f },
            td: (v) => (v - 64).toString()
        },
        { a: 0x5a, p: "sendLevelToReverb" },
        { a: 0x58, p: "level" },
        { a: 0x51, p: "preLowpass", r: { min: 0, max: 7 } }
    ],
    macroAddress: 0x50,
    lockName: "delayLock",
    macros: [
        {
            name: "Delay1",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 0,
            levelRight: 0,
            levelCenter: 127,
            timeCenter: 97,
            timeRatioLeft: 1,
            timeRatioRight: 1,
            feedback: 80
        },
        {
            name: "Delay2",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 0,
            levelRight: 0,
            levelCenter: 127,
            timeCenter: 106,
            timeRatioLeft: 1,
            timeRatioRight: 1,
            feedback: 80
        },
        {
            name: "Delay3",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 0,
            levelRight: 0,
            levelCenter: 127,
            timeCenter: 115,
            timeRatioLeft: 1,
            timeRatioRight: 1,
            feedback: 72
        },
        {
            name: "Delay4",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 0,
            levelRight: 0,
            levelCenter: 127,
            timeCenter: 83,
            timeRatioLeft: 1,
            timeRatioRight: 1,
            feedback: 72
        },

        {
            name: "PanDelay1",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 125,
            levelRight: 60,
            levelCenter: 0,
            timeCenter: 105,
            timeRatioLeft: 12,
            timeRatioRight: 24,
            feedback: 74
        },
        {
            name: "PanDelay2",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 125,
            levelRight: 60,
            levelCenter: 0,
            timeCenter: 109,
            timeRatioLeft: 12,
            timeRatioRight: 24,
            feedback: 71
        },
        {
            name: "PanDelay3",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 120,
            levelRight: 64,
            levelCenter: 0,
            timeCenter: 115,
            timeRatioLeft: 12,
            timeRatioRight: 24,
            feedback: 73
        },
        {
            name: "PanDelay4",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 120,
            levelRight: 64,
            levelCenter: 0,
            timeCenter: 93,
            timeRatioLeft: 12,
            timeRatioRight: 24,
            feedback: 72
        },

        {
            name: "Delay To Reverb",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 36,
            levelLeft: 114,
            levelRight: 60,
            levelCenter: 0,
            timeCenter: 109,
            timeRatioLeft: 12,
            timeRatioRight: 24,
            feedback: 61
        },

        {
            name: "Pan Repeat",
            level: 64,
            preLowpass: 0,
            sendLevelToReverb: 0,
            levelLeft: 127,
            levelRight: 67,
            levelCenter: 97,
            timeCenter: 110,
            timeRatioLeft: 21,
            timeRatioRight: 32,
            feedback: 40
        }
    ]
};

interface InsertionEffect {
    // Type as 0xAA_BB (msb << 8 | lsb)
    type: number;
    // Name (e.g. "Thru")
    name: string;

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
    }[];
}

export const insertionData: InsertionEffect[] = [
    { name: "Thru", params: [], type: 0x00_00 },
    {
        name: "Stereo-EQ",
        params: [
            {
                p: "Low Freq",
                a: 3,
                r: { min: 0, max: 1 },
                td: (v) => (v === 1 ? 400 : 200) + "Hz",
                d: 1
            },
            {
                p: "Low Gain",
                a: 4,
                r: { min: 0x34, max: 0x4c },
                d: 69,
                td: (v) => (v - 64).toString()
            },
            {
                p: "Hi Freq",
                a: 5,
                r: { min: 0, max: 1 },
                td: (v) => (v === 1 ? 8000 : 4000) + "Hz",
                d: 1
            },
            {
                p: "Hi Gain",
                a: 6,
                r: { min: 0x34, max: 0x4c },
                d: 0x34,
                td: (v) => (v - 64).toString()
            },
            {
                p: "M1 Freq",
                a: 7,
                td: (v) => InsertionValueConverter.eqFreq(v) + "Hz",
                d: 72
            },
            {
                p: "M1 Q",
                a: 8,
                r: { min: 0, max: 4 },
                td: (v) => ["0.5", "1.0", "2.0", "4.0", "9.0"][Math.round(v)],
                d: 0
            },
            {
                p: "M1 Gain",
                a: 9,
                r: { min: 0x34, max: 0x4c },
                d: 72,
                td: (v) => (v - 64).toString()
            },
            {
                p: "M2 Freq",
                a: 0xa,
                td: (v) => InsertionValueConverter.eqFreq(v) + "Hz",
                d: 56
            },

            {
                p: "M2 Q",
                a: 0xb,
                r: { min: 0, max: 4 },
                td: (v) => ["0.5", "1.0", "2.0", "4.0", "9.0"][Math.round(v)],
                d: 0
            },
            {
                p: "M2 Gain",
                a: 0xc,
                r: { min: 0x34, max: 0x4c },
                d: 56,
                td: (v) => (v - 64).toString()
            },
            {
                p: "Level",
                a: 0x16,
                d: 127
            }
        ],
        type: 0x01_00
    },
    {
        name: "Phaser",
        type: 0x01_20,
        params: [
            {
                p: "Manual",
                d: 36,
                a: 3,
                td: (v) => `${InsertionValueConverter.manual(v)} Hz`
            },
            {
                p: "Rate",
                d: 16,
                a: 4,
                td: (v) => `${InsertionValueConverter.rate1(v)} Hz`
            },
            {
                p: "Depth",
                d: 64,
                a: 5
            },
            {
                p: "Reso",
                d: 16,
                a: 6
            },
            {
                p: "Mix",
                d: 127,
                a: 7
            },
            {
                p: "Low Gain",
                r: { min: 0x34, max: 0x4c },
                d: 0x40,
                a: 0x13,
                td: (v) => `${v - 64} dB`
            },
            {
                p: "Hi Gain",
                r: { min: 0x34, max: 0x4c },
                d: 0x40,
                a: 0x14,
                td: (v) => `${v - 64} dB`
            },
            {
                p: "Level",
                a: 0x16,
                d: 127
            }
        ]
    }
];
