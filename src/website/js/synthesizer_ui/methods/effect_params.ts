import { Meter } from "./synthui_meter.ts";
import type {
    EffectChangeCallback,
    MasterParameterType
} from "spessasynth_core";

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
/**
 * Params:
 * "a" - address 3 (sysEx)
 * "p" - param name
 * "r" - data range (optional)
 * "ts" - transform function from displayed to sysEx (optional)
 * "td" - transform function from sysEx to displayed (optional)
 */
export interface ParamType<K extends string> {
    params: {
        a: number;
        p: K;
        r?: { min: number; max: number };
        ts?: (v: number) => number;
        td?: (v: number) => number;
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
export const delayData: ParamType<DelayParams> = {
    params: [
        { a: 0x52, p: "timeCenter", r: { min: 1, max: 115 } },
        {
            a: 0x53,
            p: "timeRatioLeft",
            r: { min: 4, max: 500 },
            td: (v) => Math.round(v * 4.166_666),
            ts: (v) => Math.round(v / 4.166_666)
        },
        {
            a: 0x54,
            p: "timeRatioRight",
            r: { min: 4, max: 500 },
            td: (v) => Math.round(v * 4.166_666),
            ts: (v) => Math.round(v / 4.166_666)
        },
        { a: 0x55, p: "levelCenter" },
        { a: 0x56, p: "levelLeft" },
        { a: 0x57, p: "levelRight" },
        {
            a: 0x59,
            p: "feedback",
            r: { min: -64, max: 63 },
            ts: (v) => v + 64,
            td: (v) => v - 64
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
