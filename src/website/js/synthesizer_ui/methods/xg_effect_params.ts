/* eslint-disable unicorn/numeric-separators-style */
import type {
    GlobalSystemParameter,
    XGVariationConnection
} from "spessasynth_core";

/**
 * A single type-specific parameter of an XG effect type.
 */
export interface XGEffectParam {
    /**
     * The 0-based parameter number (0-15).
     */
    index: number;
    /**
     * The displayed name.
     */
    name: string;
    min: number;
    max: number;
    /**
     * The default value, as set by the synthesizer when the type is selected.
     */
    def: number;
    /**
     * Transform function from the raw value to the displayed value.
     */
    td?: (v: number) => string;
}

export interface XGEffectType {
    /**
     * The effect type, MSB << 8 | LSB.
     */
    type: number;
    name: string;
    params: XGEffectParam[];
}

/**
 * The common parameters of the XG system effects.
 */
export type XGSharedParameter =
    | "return"
    | "pan"
    | "sendToReverb"
    | "sendToChorus";

/**
 * All the parameters that the XG effect blocks can receive.
 */
export type XGParameter = "type" | "partNumber" | XGSharedParameter | number;

export interface XGController {
    wrapper: HTMLElement;
    toggleLock: () => unknown;
    addNewChannel: () => unknown;
    /**
     * Updates the UI after the synthesizer changed a parameter.
     */
    update: (
        parameter: XGParameter | "connection",
        value: number | XGVariationConnection,
        insertionNumber: number
    ) => unknown;
}

/**
 * The configuration of an XG effect block.
 */
export interface XGBlockData {
    /**
     * Locale path, will add title, description and the shared parameters to it.
     */
    localePath: string;
    lockName: keyof GlobalSystemParameter;
    types: XGEffectType[];
    /**
     * The type selected after a reset.
     */
    defaultType: number;
    /**
     * The type the synthesizer uses when the type is not implemented.
     */
    fallbackType: number;
    shared: XGSharedParameter[];
    /**
     * Number of effect blocks of this kind (4 for the insertion).
     */
    blockCount: number;
    hasPartNumber: boolean;
    hasConnection: boolean;
}

// Display tables, mirroring the XG DSP tables of spessasynth_core

// Hz
const FILTER_FREQUENCIES = [
    20, 22, 25, 28, 32, 36, 40, 45, 50, 56, 63, 70, 80, 90, 100, 110, 125, 140,
    160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500, 560, 630, 700, 800,
    900, 1000, 1100, 1200, 1400, 1600, 1800, 2000, 2200, 2500, 2800, 3200, 3600,
    4000, 4500, 5000, 5600, 6300, 7000, 8000, 9000, 10000, 11000, 12000, 14000,
    16000, 18000, 20000
];

// Initial/reverb delay (0.1 ms units)
const DELAY_TABLE = [
    1, 17, 32, 48, 64, 80, 95, 111, 127, 143, 158, 174, 190, 206, 221, 237, 253,
    269, 284, 300, 316, 332, 347, 363, 379, 395, 410, 426, 442, 457, 473, 489,
    505, 520, 536, 552, 568, 583, 599, 615, 631, 646, 662, 678, 694, 709, 725,
    741, 757, 772, 788, 804, 819, 835, 851, 867, 882, 898, 914, 930, 945, 961,
    977, 993
];

// Modulation delay offset (0.1 ms units)
const DELAY_OFFSET = [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
    21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
    40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58,
    59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77,
    78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96,
    97, 98, 99, 100, 111, 122, 133, 144, 155, 171, 186, 202, 218, 233, 249, 265,
    280, 296, 312, 328, 343, 359, 375, 390, 406, 422, 437, 453, 469, 484, 500
];

// Karaoke delay (0.1 ms units)
const KARAOKE_DELAY = [
    1, 32, 64, 95, 127, 158, 190, 221, 253, 284, 316, 347, 379, 410, 442, 473,
    505, 536, 568, 599, 631, 662, 694, 725, 757, 788, 820, 851, 883, 914, 946,
    977, 1009, 1040, 1072, 1103, 1135, 1166, 1198, 1229, 1261, 1292, 1324, 1355,
    1386, 1418, 1449, 1481, 1512, 1544, 1575, 1607, 1638, 1670, 1701, 1733,
    1764, 1796, 1827, 1859, 1890, 1922, 1953, 1985, 2016, 2048, 2079, 2111,
    2142, 2174, 2205, 2237, 2268, 2300, 2331, 2363, 2394, 2426, 2457, 2489,
    2520, 2552, 2583, 2615, 2646, 2677, 2709, 2740, 2772, 2803, 2835, 2866,
    2898, 2929, 2961, 2992, 3024, 3055, 3087, 3118, 3150, 3181, 3213, 3244,
    3276, 3307, 3339, 3370, 3402, 3433, 3465, 3496, 3528, 3559, 3591, 3622,
    3654, 3685, 3717, 3748, 3780, 3811, 3843, 3874, 3906, 3937, 3969, 4000
];

// Room dimension (10 us units, the time sound travels through it)
const ROOM_SIZE = [
    145, 232, 290, 377, 436, 523, 581, 668, 755, 813, 901, 959, 1046, 1133,
    1191, 1279, 1337, 1424, 1511, 1569, 1656, 1715, 1802, 1889, 1947, 2034,
    2093, 2180, 2267, 2325, 2412, 2500, 2558, 2645, 2732, 2790, 2877, 2965,
    3023, 3110, 3197, 3255, 3343, 3430, 3517, 3575, 3662, 3750, 3808, 3895,
    3982, 4069, 4127, 4215, 4302, 4389, 4476, 4534, 4622, 4709, 4796, 4883,
    4970, 5029, 5116, 5203, 5290, 5377, 5465, 5552, 5639, 5726, 5813, 5872,
    5959, 6046, 6133, 6220, 6308, 6395, 6511, 6598, 6686, 6773, 6860, 6947,
    7034, 7122, 7238, 7325, 7412, 7500, 7587, 7703, 7790, 7877, 7994, 8081,
    8168, 8284, 8372, 8488, 8575, 8691, 8779
];

// Early reflection room size scale
const ROOM_SCALE = [
    1, 3, 4, 6, 7, 9, 10, 12, 14, 15, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31,
    32, 34, 35, 37, 39, 40, 42, 43, 45, 46, 48, 50, 51, 53, 54, 56, 57, 59, 61,
    62, 64, 65, 67, 68, 70
];

// LFO frequency coefficient words (3-bit exponent, 7-bit mantissa)
const LFO_RATE = [
    0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 96, 104, 112, 120, 192, 196,
    200, 204, 208, 212, 216, 220, 224, 228, 232, 236, 240, 244, 248, 252, 320,
    322, 324, 326, 328, 330, 332, 334, 336, 338, 340, 342, 344, 346, 348, 350,
    352, 354, 356, 358, 360, 362, 364, 366, 368, 370, 372, 374, 376, 378, 380,
    382, 448, 450, 452, 454, 456, 458, 460, 462, 464, 466, 468, 470, 472, 476,
    480, 484, 488, 492, 496, 500, 504, 508, 576, 578, 580, 584, 588, 592, 596,
    600, 604, 608, 612, 616, 620, 624, 628, 632, 704, 708, 712, 716, 720, 724,
    728, 732, 736, 740, 744, 748, 756, 764, 834, 838, 842, 846, 850, 854, 858,
    862, 866, 870, 878, 886
];

const lookup = (table: number[], v: number) =>
    table[Math.max(0, Math.min(table.length - 1, Math.round(v)))];

const freq = (v: number) => {
    const hz = lookup(FILTER_FREQUENCIES, v);
    return hz >= 1000 ? `${hz / 1000}kHz` : `${hz}Hz`;
};

const XGDisplay = {
    freq,
    hpf: (v: number) => (Math.round(v) === 0 ? "Thru" : freq(v)),
    lpf: (v: number) => (Math.round(v) >= 60 ? "Thru" : freq(v)),
    gain: (v: number) => {
        const db = Math.round(v) - 64;
        return `${db > 0 ? "+" : ""}${db}dB`;
    },
    signed: (v: number) => {
        const s = Math.round(v) - 64;
        return s > 0 ? `+${s}` : s.toString();
    },
    /**
     * Q or width, 10-120 is 1.0-12.0.
     */
    q: (v: number) => (Math.round(v) / 10).toFixed(1),
    /**
     * Delay time in 0.1 ms units.
     */
    ms: (v: number) => `${(Math.round(v) / 10).toFixed(1)}ms`,
    /**
     * Reverb time, table #4 of the XG specification.
     */
    reverbTime: (v: number) => {
        const r = Math.round(v);
        let s: number;
        if (r <= 47) {
            s = 0.3 + r * 0.1;
        } else if (r <= 57) {
            s = 5 + (r - 47) * 0.5;
        } else if (r <= 67) {
            s = 10 + (r - 57);
        } else {
            s = r === 68 ? 25 : 30;
        }
        return `${s.toFixed(1)}s`;
    },
    delay: (v: number) => XGDisplay.ms(lookup(DELAY_TABLE, v)),
    delayOffset: (v: number) => XGDisplay.ms(lookup(DELAY_OFFSET, v)),
    karaokeDelay: (v: number) => XGDisplay.ms(lookup(KARAOKE_DELAY, v)),
    /**
     * Room dimension in meters (speed of sound is 344 m/s).
     */
    dimension: (v: number) =>
        `${(lookup(ROOM_SIZE, v) * 0.003_44).toFixed(1)}m`,
    roomSize: (v: number) => (lookup(ROOM_SCALE, v) / 10).toFixed(1),
    lfo: (v: number) => {
        const word = lookup(LFO_RATE, v);
        const hz =
            (1 << (word >> 7)) *
            2.384_185_791_015_625e-7 *
            (word & 0x7f) *
            22_050;
        return `${hz.toFixed(2)}Hz`;
    },
    /**
     * High damp, 1-10 is 0.1-1.0.
     */
    damp: (v: number) => (Math.round(v) / 10).toFixed(1),
    phase: (v: number) => `${(Math.round(v) - 64) * 3}°`,
    dryWet: (v: number) => {
        const r = Math.round(v);
        if (r < 64) {
            return `D${64 - r}>W`;
        }
        if (r > 64) {
            return `D<W${r - 64}`;
        }
        return "D=W";
    },
    erRevBalance: (v: number) => {
        const r = Math.round(v);
        if (r < 64) {
            return `E${64 - r}>R`;
        }
        if (r > 64) {
            return `E<R${r - 64}`;
        }
        return "E=R";
    },
    pan: (v: number) => {
        const r = Math.round(v);
        if (r < 64) {
            return `L${64 - r}`;
        }
        if (r > 64) {
            return `R${r - 64}`;
        }
        return "C";
    },
    list: (names: string[]) => (v: number) => names[Math.round(v)] ?? "?"
} as const;

export const xgPanDisplay = XGDisplay.pan;

// Parameter builders, shared by the effect families

type ParamMaker = (index: number, def: number) => XGEffectParam;

const param =
    (
        name: string,
        min = 0,
        max = 127,
        td?: (v: number) => string
    ): ParamMaker =>
    (index, def) => ({ index, name, min, max, def, td });

const P = {
    dryWet: param("Dry/Wet", 1, 127, XGDisplay.dryWet),
    feedback: param("Feedback Level", 1, 127, XGDisplay.signed),
    highDamp: param("High Damp", 1, 10, XGDisplay.damp),
    lfoFreq: param("LFO Frequency", 0, 127, XGDisplay.lfo),
    lfoDepth: param("LFO Depth"),
    hpf: param("HPF Cutoff", 0, 52, XGDisplay.hpf),
    lpf: param("LPF Cutoff", 34, 60, XGDisplay.lpf),
    eqLowFreq: param("EQ Low Frequency", 8, 40, XGDisplay.freq),
    eqLowGain: param("EQ Low Gain", 52, 76, XGDisplay.gain),
    eqHighFreq: param("EQ High Frequency", 28, 58, XGDisplay.freq),
    eqHighGain: param("EQ High Gain", 52, 76, XGDisplay.gain),
    eqMidFreq: param("EQ Mid Frequency", 28, 54, XGDisplay.freq),
    eqMidGain: param("EQ Mid Gain", 52, 76, XGDisplay.gain),
    eqMidWidth: param("EQ Mid Width", 10, 120, XGDisplay.q),
    lfoPhase: param("LFO Phase Difference", 4, 124, XGDisplay.phase),
    inputMode: param("Input Mode", 0, 1, XGDisplay.list(["Mono", "Stereo"])),
    delayTime: (name: string, max: number) => param(name, 1, max, XGDisplay.ms)
} as const;

/**
 * Creates the parameter list of a type.
 * @param layout The parameter makers, indexed by the parameter number. Undefined entries are not used by the effect.
 * @param defaults The 16 default values of the type.
 */
const build = (
    layout: (ParamMaker | undefined)[],
    defaults: number[]
): XGEffectParam[] =>
    layout.flatMap((make, index) =>
        make ? [make(index, defaults[index])] : []
    );

/**
 * The shared delay EQ (params 13-16 in the spec).
 */
const DELAY_EQ: (ParamMaker | undefined)[] = [
    P.eqLowFreq,
    P.eqLowGain,
    P.eqHighFreq,
    P.eqHighGain
];

/**
 * The modulation EQ (params 6-9 in the spec).
 */
const MOD_EQ: (ParamMaker | undefined)[] = [
    P.eqLowFreq,
    P.eqLowGain,
    P.eqHighFreq,
    P.eqHighGain
];

const LAYOUTS = {
    reverb: [
        param("Reverb Time", 0, 69, XGDisplay.reverbTime),
        param("Diffusion", 0, 10),
        param("Initial Delay", 0, 63, XGDisplay.delay),
        P.hpf,
        P.lpf,
        undefined,
        undefined,
        undefined,
        undefined,
        P.dryWet,
        param("Rev Delay", 0, 63, XGDisplay.delay),
        param("Density", 0, 3),
        param("Er/Rev Balance", 1, 127, XGDisplay.erRevBalance),
        undefined,
        P.feedback
    ],
    roomReverb: [
        param("Reverb Time", 0, 69, XGDisplay.reverbTime),
        param("Diffusion", 0, 10),
        param("Initial Delay", 0, 63, XGDisplay.delay),
        P.hpf,
        P.lpf,
        param("Width", 0, 37, XGDisplay.dimension),
        param("Height", 0, 73, XGDisplay.dimension),
        param("Depth", 0, 104, XGDisplay.dimension),
        param("Wall Vary", 0, 30),
        P.dryWet,
        param("Rev Delay", 0, 63, XGDisplay.delay),
        param("Density", 0, 3),
        param("Er/Rev Balance", 1, 127, XGDisplay.erRevBalance),
        undefined,
        P.feedback
    ],
    chorus: [
        P.lfoFreq,
        param("LFO PM Depth"),
        P.feedback,
        param("Delay Offset", 0, 127, XGDisplay.delayOffset),
        undefined,
        ...MOD_EQ,
        P.dryWet,
        undefined,
        undefined,
        undefined,
        undefined,
        P.inputMode
    ],
    flanger: [
        P.lfoFreq,
        P.lfoDepth,
        P.feedback,
        param("Delay Offset", 0, 63, XGDisplay.delayOffset),
        undefined,
        ...MOD_EQ,
        P.dryWet,
        undefined,
        undefined,
        undefined,
        P.lfoPhase
    ],
    delayLCR: [
        P.delayTime("Lch Delay", 7150),
        P.delayTime("Rch Delay", 7150),
        P.delayTime("Cch Delay", 7150),
        P.delayTime("Feedback Delay", 7150),
        P.feedback,
        param("Cch Level"),
        P.highDamp,
        undefined,
        undefined,
        P.dryWet,
        undefined,
        undefined,
        ...DELAY_EQ
    ],
    delayLR: [
        P.delayTime("Lch Delay", 7150),
        P.delayTime("Rch Delay", 7150),
        P.delayTime("Feedback Delay 1", 7150),
        P.delayTime("Feedback Delay 2", 7150),
        P.feedback,
        P.highDamp,
        undefined,
        undefined,
        undefined,
        P.dryWet,
        undefined,
        undefined,
        ...DELAY_EQ
    ],
    echo: [
        P.delayTime("Lch Delay 1", 3550),
        param("Lch Feedback Level", 1, 127, XGDisplay.signed),
        P.delayTime("Rch Delay 1", 3550),
        param("Rch Feedback Level", 1, 127, XGDisplay.signed),
        P.highDamp,
        P.delayTime("Lch Delay 2", 3550),
        P.delayTime("Rch Delay 2", 3550),
        param("Delay 2 Level"),
        undefined,
        P.dryWet,
        undefined,
        undefined,
        ...DELAY_EQ
    ],
    crossDelay: [
        P.delayTime("L→R Delay", 3550),
        P.delayTime("R→L Delay", 3550),
        P.feedback,
        param("Input Select", 0, 2, XGDisplay.list(["L", "R", "L&R"])),
        P.highDamp,
        undefined,
        undefined,
        undefined,
        undefined,
        P.dryWet,
        undefined,
        undefined,
        ...DELAY_EQ
    ],
    earlyReflection: [
        param(
            "Type",
            0,
            5,
            XGDisplay.list([
                "S-H",
                "L-H",
                "Random",
                "Reverse",
                "Plate",
                "Spring"
            ])
        ),
        param("Room Size", 0, 44, XGDisplay.roomSize),
        param("Diffusion", 0, 10),
        param("Initial Delay", 0, 63, XGDisplay.delay),
        P.feedback,
        P.hpf,
        P.lpf,
        undefined,
        undefined,
        P.dryWet,
        param("Liveness", 0, 10),
        param("Density", 0, 3),
        P.highDamp
    ],
    gateReverb: [
        param("Type", 0, 1, XGDisplay.list(["Type A", "Type B"])),
        param("Room Size", 0, 44, XGDisplay.roomSize),
        param("Diffusion", 0, 10),
        param("Initial Delay", 0, 63, XGDisplay.delay),
        P.feedback,
        P.hpf,
        P.lpf,
        undefined,
        undefined,
        P.dryWet,
        param("Liveness", 0, 10),
        param("Density", 0, 3),
        P.highDamp
    ],
    karaoke: [
        param("Delay Time", 0, 127, XGDisplay.karaokeDelay),
        P.feedback,
        P.hpf,
        P.lpf,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        P.dryWet,
        param("Density", 0, 3)
    ],
    symphonic: [
        P.lfoFreq,
        P.lfoDepth,
        param("Delay Offset", 0, 127, XGDisplay.delayOffset),
        undefined,
        undefined,
        ...MOD_EQ,
        P.dryWet
    ],
    rotary: [
        P.lfoFreq,
        P.lfoDepth,
        undefined,
        undefined,
        undefined,
        ...MOD_EQ,
        P.dryWet
    ],
    tremolo: [
        P.lfoFreq,
        param("AM Depth"),
        param("PM Depth"),
        undefined,
        undefined,
        ...MOD_EQ,
        undefined,
        undefined,
        undefined,
        undefined,
        P.lfoPhase,
        P.inputMode
    ],
    autoPan: [
        P.lfoFreq,
        param("L/R Depth"),
        param("F/R Depth"),
        param(
            "Pan Direction",
            0,
            5,
            XGDisplay.list(["L↔R", "L→R", "L←R", "L Turn", "R Turn", "L/R"])
        ),
        undefined,
        ...MOD_EQ
    ],
    phaser1: [
        P.lfoFreq,
        P.lfoDepth,
        param("Phase Shift Offset"),
        P.feedback,
        undefined,
        ...MOD_EQ,
        P.dryWet,
        param("Stage", 6, 10)
    ],
    phaser2: [
        P.lfoFreq,
        P.lfoDepth,
        param("Phase Shift Offset"),
        P.feedback,
        undefined,
        ...MOD_EQ,
        P.dryWet,
        param("Stage", 3, 5),
        undefined,
        P.lfoPhase
    ],
    distortion: [
        param("Drive"),
        P.eqLowFreq,
        P.eqLowGain,
        P.lpf,
        param("Output Level"),
        undefined,
        P.eqMidFreq,
        P.eqMidGain,
        P.eqMidWidth,
        P.dryWet,
        param("Edge (Clip Curve)")
    ],
    ampSimulator: [
        param("Drive"),
        param(
            "AMP Type",
            0,
            3,
            XGDisplay.list(["Off", "Stack", "Combo", "Tube"])
        ),
        P.lpf,
        param("Output Level"),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        P.dryWet,
        param("Edge (Clip Curve)")
    ],
    threeBandEQ: [
        param("EQ Low Gain", 52, 76, XGDisplay.gain),
        P.eqMidFreq,
        P.eqMidGain,
        P.eqMidWidth,
        param("EQ High Gain", 52, 76, XGDisplay.gain),
        P.eqLowFreq,
        P.eqHighFreq
    ],
    twoBandEQ: [P.eqLowFreq, P.eqLowGain, P.eqHighFreq, P.eqHighGain],
    autoWah: [
        P.lfoFreq,
        P.lfoDepth,
        param("Cutoff Frequency Offset"),
        param("Resonance", 10, 120, XGDisplay.q),
        undefined,
        ...MOD_EQ,
        P.dryWet
    ]
} satisfies Record<string, (ParamMaker | undefined)[]>;

type Layout = keyof typeof LAYOUTS;

/**
 * Every effect type implemented by spessasynth_core: type, name, parameter layout and the 16 defaults.
 */
// prettier-ignore
const ALL_TYPES: [number, string, Layout | undefined, number[]][] = [
    [0x00_00, "No Effect", undefined, []],
    [0x01_00, "Hall 1", "reverb", [18, 10, 8, 13, 49, 0, 0, 0, 0, 40, 0, 3, 50, 8, 64, 0]],
    [0x01_01, "Hall 2", "reverb", [25, 10, 28, 6, 46, 0, 0, 0, 0, 40, 13, 3, 74, 7, 64, 0]],
    [0x01_06, "Hall M", "reverb", [18, 10, 8, 13, 49, 0, 0, 0, 0, 40, 0, 3, 50, 8, 64, 0]],
    [0x01_07, "Hall L", "reverb", [25, 10, 28, 6, 46, 0, 0, 0, 0, 40, 13, 3, 74, 7, 64, 0]],
    [0x02_00, "Room 1", "reverb", [5, 10, 16, 4, 49, 0, 0, 0, 0, 40, 5, 3, 64, 8, 64, 0]],
    [0x02_01, "Room 2", "reverb", [12, 10, 5, 4, 38, 0, 0, 0, 0, 40, 0, 3, 50, 8, 64, 0]],
    [0x02_02, "Room 3", "reverb", [9, 10, 47, 5, 36, 0, 0, 0, 0, 40, 0, 3, 60, 8, 64, 0]],
    [0x02_05, "Room S", "reverb", [12, 10, 5, 4, 38, 0, 0, 0, 0, 40, 0, 3, 50, 8, 64, 0]],
    [0x02_06, "Room M", "reverb", [5, 10, 16, 4, 49, 0, 0, 0, 0, 40, 5, 3, 64, 8, 64, 0]],
    [0x02_07, "Room L", "reverb", [9, 10, 47, 5, 36, 0, 0, 0, 0, 40, 0, 3, 60, 8, 64, 0]],
    [0x03_00, "Stage 1", "reverb", [19, 10, 16, 7, 54, 0, 0, 0, 0, 40, 0, 3, 64, 6, 64, 0]],
    [0x03_01, "Stage 2", "reverb", [11, 10, 16, 7, 51, 0, 0, 0, 0, 40, 2, 2, 64, 6, 64, 0]],
    [0x04_00, "Plate", "reverb", [25, 10, 6, 8, 49, 0, 0, 0, 0, 40, 2, 3, 64, 5, 64, 0]],
    [0x04_07, "GM Plate", "reverb", [25, 10, 6, 8, 49, 0, 0, 0, 0, 40, 2, 3, 64, 5, 64, 0]],
    [0x05_00, "Delay L,C,R", "delayLCR", [3333, 1667, 5000, 5000, 74, 100, 10, 0, 0, 32, 0, 60, 28, 64, 46, 64]],
    [0x06_00, "Delay L,R", "delayLR", [2500, 3750, 3752, 3750, 87, 10, 0, 0, 0, 32, 0, 60, 28, 64, 46, 64]],
    [0x07_00, "Echo", "echo", [1700, 80, 1780, 80, 10, 1700, 1780, 0, 0, 40, 0, 60, 28, 64, 46, 64]],
    [0x08_00, "Cross Delay", "crossDelay", [1700, 1750, 111, 1, 10, 0, 0, 0, 0, 32, 0, 60, 28, 64, 46, 64]],
    [0x09_00, "Early Ref 1", "earlyReflection", [0, 19, 5, 16, 64, 0, 46, 0, 0, 32, 5, 0, 10, 0, 0, 0]],
    [0x09_01, "Early Ref 2", "earlyReflection", [2, 7, 10, 16, 64, 3, 46, 0, 0, 32, 5, 2, 10, 0, 0, 0]],
    [0x0a_00, "Gate Reverb", "gateReverb", [0, 15, 6, 2, 64, 0, 44, 0, 0, 32, 4, 3, 10, 0, 0, 0]],
    [0x0b_00, "Reverse Gate", "gateReverb", [1, 19, 8, 3, 64, 0, 47, 0, 0, 32, 6, 3, 10, 0, 0, 0]],
    [0x10_00, "White Room", "roomReverb", [9, 5, 11, 0, 46, 30, 50, 70, 7, 40, 34, 3, 64, 7, 64, 0]],
    [0x11_00, "Tunnel", "roomReverb", [48, 6, 19, 0, 44, 33, 52, 70, 16, 40, 20, 3, 64, 7, 64, 0]],
    [0x13_00, "Basement", "roomReverb", [3, 6, 3, 0, 34, 26, 29, 59, 15, 40, 32, 3, 64, 8, 64, 0]],
    [0x14_00, "Karaoke 1", "karaoke", [63, 97, 0, 48, 0, 0, 0, 0, 0, 64, 2, 0, 0, 0, 0, 0]],
    [0x14_01, "Karaoke 2", "karaoke", [55, 105, 0, 50, 0, 0, 0, 0, 0, 64, 1, 0, 0, 0, 0, 0]],
    [0x14_02, "Karaoke 3", "karaoke", [43, 110, 14, 53, 0, 0, 0, 0, 0, 64, 0, 0, 0, 0, 0, 0]],
    [0x40_00, "Thru", undefined, []],
    [0x41_00, "Chorus 1", "chorus", [6, 54, 77, 106, 0, 28, 64, 46, 64, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_01, "Chorus 2", "chorus", [8, 63, 64, 30, 0, 28, 62, 42, 58, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_02, "Chorus 3", "chorus", [4, 44, 64, 110, 0, 28, 64, 46, 66, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_03, "GM Chorus 1", "chorus", [9, 10, 64, 109, 0, 28, 64, 46, 64, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_04, "GM Chorus 2", "chorus", [26, 34, 67, 105, 0, 28, 64, 46, 64, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_05, "GM Chorus 3", "chorus", [9, 34, 69, 105, 0, 28, 64, 46, 66, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_06, "GM Chorus 4", "chorus", [26, 29, 75, 102, 0, 28, 64, 46, 64, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_07, "FB Chorus", "chorus", [6, 43, 107, 111, 0, 28, 64, 46, 64, 64, 46, 64, 10, 0, 0, 0]],
    [0x41_08, "Chorus 4", "chorus", [9, 32, 69, 104, 0, 28, 64, 46, 64, 64, 46, 64, 10, 0, 1, 0]],
    [0x42_00, "Celeste 1", "chorus", [12, 32, 64, 0, 0, 28, 64, 46, 64, 127, 40, 68, 10, 0, 0, 0]],
    [0x42_01, "Celeste 2", "chorus", [28, 18, 90, 2, 0, 28, 62, 42, 60, 84, 40, 68, 10, 0, 0, 0]],
    [0x42_02, "Celeste 3", "chorus", [4, 63, 44, 2, 0, 28, 64, 46, 68, 127, 40, 68, 10, 0, 0, 0]],
    [0x42_08, "Celeste 4", "chorus", [8, 29, 64, 0, 0, 28, 64, 51, 66, 127, 40, 68, 10, 0, 1, 0]],
    [0x43_00, "Flanger 1", "flanger", [14, 14, 104, 2, 0, 28, 64, 46, 64, 96, 40, 64, 10, 4, 1, 0]],
    [0x43_01, "Flanger 2", "flanger", [32, 17, 26, 2, 0, 28, 64, 46, 60, 96, 40, 64, 10, 4, 1, 0]],
    [0x43_07, "GM Flanger", "flanger", [3, 21, 120, 1, 0, 28, 64, 46, 64, 96, 40, 64, 10, 4, 0, 0]],
    [0x43_08, "Flanger 3", "flanger", [4, 109, 109, 2, 0, 28, 64, 46, 64, 127, 40, 64, 10, 4, 1, 0]],
    [0x44_00, "Symphonic", "symphonic", [12, 25, 16, 0, 0, 28, 64, 46, 64, 127, 46, 64, 10, 0, 0, 0]],
    [0x45_00, "Rotary Speaker", "rotary", [81, 35, 0, 0, 0, 24, 60, 45, 54, 127, 33, 52, 30, 0, 0, 0]],
    [0x46_00, "Tremolo", "tremolo", [83, 56, 0, 0, 0, 28, 64, 46, 64, 127, 40, 64, 10, 64, 0, 0]],
    [0x47_00, "Auto Pan", "autoPan", [76, 80, 32, 5, 0, 28, 64, 46, 64, 127, 40, 64, 10, 0, 0, 0]],
    [0x48_00, "Phaser 1", "phaser1", [8, 111, 74, 104, 0, 28, 64, 46, 64, 64, 6, 1, 64, 0, 0, 0]],
    [0x48_08, "Phaser 2", "phaser2", [8, 111, 74, 108, 0, 28, 64, 46, 64, 64, 5, 1, 4, 0, 0, 0]],
    [0x49_00, "Distortion", "distortion", [40, 20, 72, 53, 48, 0, 43, 74, 10, 127, 120, 0, 0, 0, 0, 0]],
    [0x4a_00, "Overdrive", "distortion", [29, 24, 68, 45, 55, 0, 41, 72, 10, 127, 104, 0, 0, 0, 0, 0]],
    [0x4b_00, "Amp Simulator", "ampSimulator", [39, 1, 48, 55, 0, 0, 0, 0, 0, 127, 112, 0, 0, 0, 0, 0]],
    [0x4c_00, "3-Band EQ", "threeBandEQ", [70, 34, 60, 10, 70, 28, 46, 0, 0, 127, 0, 0, 0, 0, 0, 0]],
    [0x4d_00, "2-Band EQ", "twoBandEQ", [28, 70, 46, 70, 0, 0, 0, 0, 0, 127, 34, 64, 10, 0, 0, 0]],
    [0x4e_00, "Auto Wah", "autoWah", [70, 56, 39, 25, 0, 28, 66, 46, 64, 127, 0, 0, 0, 0, 0, 0]]
];

/**
 * Picks the given types from the full list.
 * @param types The effect types available in the block.
 * @param system True for the reverb and chorus blocks, which are always fully wet (no Dry/Wet).
 */
const pick = (types: number[], system: boolean): XGEffectType[] =>
    types.map((type) => {
        const entry = ALL_TYPES.find((t) => t[0] === type);
        if (!entry) {
            throw new Error(`Unknown XG effect type: ${type}`);
        }
        const [, name, layout, defaults] = entry;
        const params = layout ? build(LAYOUTS[layout], defaults) : [];
        return {
            type,
            name,
            params: system ? params.filter((p) => p.index !== 9) : params
        };
    });

// The type lists match the effect maps of spessasynth_core
const REVERB_TYPES = [
    0x00_00, 0x01_00, 0x01_01, 0x01_06, 0x01_07, 0x02_00, 0x02_01, 0x02_02,
    0x02_05, 0x02_06, 0x02_07, 0x03_00, 0x03_01, 0x04_00, 0x04_07, 0x10_00,
    0x11_00, 0x13_00
];
const CHORUS_TYPES = [
    0x00_00, 0x41_00, 0x41_01, 0x41_02, 0x41_03, 0x41_04, 0x41_05, 0x41_06,
    0x41_07, 0x41_08, 0x42_00, 0x42_01, 0x42_02, 0x42_08, 0x43_00, 0x43_01,
    0x43_07, 0x43_08
];
// Shared by the variation and insertion blocks
const VARIATION_COMMON = [
    0x01_00, 0x01_01, 0x02_00, 0x02_01, 0x02_02, 0x03_00, 0x03_01, 0x04_00,
    0x05_00, 0x06_00, 0x07_00, 0x08_00
];
const MODULATION_COMMON = [
    0x41_00, 0x41_01, 0x41_02, 0x41_08, 0x42_00, 0x42_01, 0x42_02, 0x42_08,
    0x43_00, 0x43_01, 0x43_08, 0x44_00, 0x45_00, 0x46_00, 0x47_00, 0x48_00
];
const DRIVE_COMMON = [0x49_00, 0x4a_00, 0x4b_00, 0x4c_00, 0x4d_00, 0x4e_00];
const VARIATION_TYPES = [
    0x00_00,
    ...VARIATION_COMMON,
    0x09_00,
    0x09_01,
    0x0a_00,
    0x0b_00,
    0x14_00,
    0x14_01,
    0x14_02,
    0x40_00,
    ...MODULATION_COMMON,
    0x48_08,
    ...DRIVE_COMMON
];
const INSERTION_TYPES = [
    0x00_00,
    ...VARIATION_COMMON,
    0x14_00,
    0x14_01,
    0x14_02,
    ...MODULATION_COMMON,
    ...DRIVE_COMMON
];

const LOCALE_PATH = "locale.synthesizerController.effectsConfig.xg.";

export const xgReverbData: XGBlockData = {
    localePath: LOCALE_PATH + "reverb.",
    lockName: "xgReverbLock",
    types: pick(REVERB_TYPES, true),
    defaultType: 0x01_00,
    fallbackType: 0x00_00,
    shared: ["return", "pan"],
    blockCount: 1,
    hasPartNumber: false,
    hasConnection: false
};

export const xgChorusData: XGBlockData = {
    localePath: LOCALE_PATH + "chorus.",
    lockName: "xgChorusLock",
    types: pick(CHORUS_TYPES, true),
    defaultType: 0x41_00,
    fallbackType: 0x00_00,
    shared: ["return", "pan", "sendToReverb"],
    blockCount: 1,
    hasPartNumber: false,
    hasConnection: false
};

export const xgVariationData: XGBlockData = {
    localePath: LOCALE_PATH + "variation.",
    lockName: "xgVariationLock",
    types: pick(VARIATION_TYPES, false),
    defaultType: 0x05_00,
    fallbackType: 0x40_00,
    shared: ["return", "pan", "sendToReverb", "sendToChorus"],
    blockCount: 1,
    hasPartNumber: true,
    hasConnection: true
};

export const xgInsertionData: XGBlockData = {
    localePath: LOCALE_PATH + "insertion.",
    lockName: "xgInsertionLock",
    types: pick(INSERTION_TYPES, false),
    defaultType: 0x49_00,
    fallbackType: 0x00_00,
    shared: [],
    blockCount: 4,
    hasPartNumber: true,
    hasConnection: false
};
