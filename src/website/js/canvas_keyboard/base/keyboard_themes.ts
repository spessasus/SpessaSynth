/**
 * The available MIDI keyboard themes.
 * Keep this file import-free !!!
 * (server code imports the IDs).
 */
export interface KeyStyle {
    /**
     * Gradient colors, spread evenly from the start to the end of the gradient.
     */
    gradient: readonly string[];
    /**
     * Gradient angle in degrees.
     * 0 points upwards, 90 to the right and 180 downwards.
     */
    angle: number;
    /**
     * The RGB color the key blends from when it's pressed with a low velocity.
     */
    rest: readonly [number, number, number];
    /**
     * Bottom corner radius, as a multiplier of the base radius. 0 is square.
     */
    radius: number;
    /**
     * Top corner radius, as a multiplier of the base radius. 0 is square.
     */
    topRadius: number;
    /**
     * Opacity of the white highlight on the upper half of the key.
     */
    gloss: number;
    /**
     * Border drawn around the key. The width is relative to the key width.
     */
    outline?: { color: string; width: number };
}

export interface KeyboardTheme {
    /**
     * The theme name.
     */
    name: string;
    /**
     * Color of the keyboard backdrop, visible between the keys.
     */
    background: string;
    white: KeyStyle;
    black: KeyStyle;
    /**
     * Height of the black keys relative to the keyboard height.
     */
    sharpLength: number;
    /**
     * Extra space between the keys, relative to the key width.
     */
    gap: number;
    /**
     * How much the pressed keys tilt and taper. 1 is the classic look, 0 disables it.
     */
    pressDepth: number;
}

function key(style: Partial<KeyStyle> & Pick<KeyStyle, "gradient" | "rest">) {
    return {
        angle: 90,
        radius: 1,
        topRadius: 0,
        gloss: 0,
        ...style
    } satisfies KeyStyle;
}

export const keyboardThemes = {
    spessasynth_light: {
        name: "SpessaSynth Light",
        background: "black",
        white: key({
            gradient: ["#bbb", "white"],
            angle: 90,
            rest: [221, 221, 221]
        }),
        black: key({
            gradient: ["#222", "black"],
            angle: 140,
            rest: [7, 7, 7]
        }),
        sharpLength: 0.7,
        gap: 0,
        pressDepth: 1
    },
    spessasynth_dark: {
        name: "SpessaSynth Dark",
        background: "black",
        white: key({
            gradient: ["#111", "#000"],
            angle: 100,
            rest: [8, 8, 8]
        }),
        black: key({
            gradient: ["#222", "black"],
            angle: 140,
            rest: [7, 7, 7]
        }),
        sharpLength: 0.7,
        gap: 0,
        pressDepth: 1
    },
    modern_light: {
        name: "Modern Light",
        background: "#34343b",
        white: key({
            gradient: ["#ffffff", "#acacac"],
            angle: 180,
            rest: [243, 243, 246],
            radius: 0.5
        }),
        black: key({
            gradient: ["#34343b", "#1b1b20"],
            angle: 180,
            rest: [27, 27, 32],
            radius: 0.4
        }),
        sharpLength: 0.62,
        gap: 0.01,
        pressDepth: 0
    },
    modern_dark: {
        name: "Modern Dark",
        background: "#050507",
        white: key({
            gradient: ["#0c0c0c", "#0c0c0c"],
            angle: 180,
            rest: [12, 12, 12],
            radius: 0.5
        }),
        black: key({
            gradient: ["#000000", "#000000"],
            angle: 180,
            rest: [0, 0, 0],
            radius: 0,
            outline: { color: "#202026", width: 0.04 }
        }),
        sharpLength: 0.62,
        gap: 0.01,
        pressDepth: 0
    },
    teal: {
        name: "Teal",
        background: "#011214",
        white: key({
            gradient: ["#e3fbf9", "#7fd1cc"],
            angle: 165,
            rest: [160, 225, 222],
            radius: 1.6,
            gloss: 0.4
        }),
        black: key({
            gradient: ["#0f4a4d", "#021819"],
            angle: 165,
            rest: [6, 40, 42],
            radius: 1.6,
            gloss: 0.3
        }),
        sharpLength: 0.68,
        gap: 0.03,
        pressDepth: 1
    },
    purple: {
        name: "Purple",
        background: "#12001c",
        white: key({
            gradient: ["#efe2ff", "#a77de0"],
            angle: 135,
            rest: [200, 170, 240],
            radius: 1
        }),
        black: key({
            gradient: ["#3d0b6b", "#12001f"],
            angle: 135,
            rest: [25, 5, 45],
            radius: 1,
            outline: { color: "#c28bff", width: 0.04 }
        }),
        sharpLength: 0.7,
        gap: 0.02,
        pressDepth: 1
    },
    orange: {
        name: "Orange",
        background: "#190b00",
        white: key({
            gradient: ["#fff3e0", "#ffab3d"],
            angle: 25,
            rest: [255, 190, 110],
            radius: 0.6
        }),
        black: key({
            gradient: ["#2b1600", "#2b1600"],
            angle: 0,
            rest: [43, 22, 0],
            radius: 0,
            outline: { color: "#ff8a00", width: 0.05 }
        }),
        sharpLength: 0.64,
        gap: 0.04,
        pressDepth: 0.5
    },
    dark_blue: {
        name: "Dark Blue",
        background: "#00030d",
        white: key({
            gradient: ["#31498f", "#0d1b45"],
            angle: 100,
            rest: [24, 40, 94],
            radius: 1
        }),
        black: key({
            gradient: ["#000a1c", "#01040f"],
            angle: 140,
            rest: [2, 7, 24],
            radius: 1,
            outline: { color: "#3a5bd0", width: 0.035 }
        }),
        sharpLength: 0.7,
        gap: 0.01,
        pressDepth: 1
    },
    dark_green: {
        name: "Dark Green",
        background: "#010802",
        white: key({
            gradient: ["#23572f", "#0a2410"],
            angle: 80,
            rest: [18, 60, 28],
            radius: 0.8
        }),
        black: key({
            gradient: ["#041509", "#000000"],
            angle: 140,
            rest: [2, 14, 6],
            radius: 0.8,
            outline: { color: "#2f8a45", width: 0.035 }
        }),
        sharpLength: 0.7,
        gap: 0.01,
        pressDepth: 1
    },
    grayscale: {
        name: "Grayscale",
        background: "#000",
        white: key({
            gradient: ["#d4d4d4", "#8c8c8c"],
            angle: 90,
            rest: [160, 160, 160],
            radius: 0.3
        }),
        black: key({
            gradient: ["#4a4a4a", "#000"],
            angle: 180,
            rest: [24, 24, 24],
            radius: 0.3
        }),
        sharpLength: 0.66,
        gap: 0.05,
        pressDepth: 0.8
    },
    pink: {
        name: "Pink",
        background: "#e8a0be",
        white: key({
            gradient: ["#fff7fb", "#ffd3e6"],
            angle: 180,
            rest: [255, 225, 238],
            radius: 2.4,
            gloss: 0.35
        }),
        black: key({
            gradient: ["#d81b6a", "#7a0e3a"],
            angle: 160,
            rest: [122, 14, 58],
            radius: 2.4,
            topRadius: 0.6,
            gloss: 0.3
        }),
        sharpLength: 0.66,
        gap: 0.05,
        pressDepth: 1.2
    },
    light_blue: {
        name: "Light Blue",
        background: "#9fc6ea",
        white: key({
            gradient: ["#ffffff", "#d3e8ff"],
            angle: 180,
            rest: [230, 242, 255],
            radius: 0.8
        }),
        black: key({
            gradient: ["#2a63ad", "#0d2a52"],
            angle: 135,
            rest: [13, 42, 82],
            radius: 0.8
        }),
        sharpLength: 0.66,
        gap: 0.04,
        pressDepth: 1
    },
    light_green: {
        name: "Light Green",
        background: "#9fcfa6",
        white: key({
            gradient: ["#fbfff9", "#cdeccf"],
            angle: 90,
            rest: [222, 245, 224],
            radius: 1
        }),
        black: key({
            gradient: ["#2c6b3a", "#0e2e18"],
            angle: 100,
            rest: [14, 46, 24],
            radius: 1
        }),
        sharpLength: 0.68,
        gap: 0.04,
        pressDepth: 1
    },
    sepia: {
        name: "Sepia",
        background: "#2a1c0f",
        white: key({
            gradient: ["#d8c7a0", "#fbf4e2", "#efe3c6"],
            angle: 90,
            rest: [233, 220, 192],
            radius: 0.7,
            gloss: 0.1,
            outline: { color: "#8a6d45", width: 0.02 }
        }),
        black: key({
            gradient: ["#6b4527", "#2b1a0e"],
            angle: 150,
            rest: [43, 26, 14],
            radius: 0.7,
            gloss: 0.12
        }),
        sharpLength: 0.68,
        gap: 0.02,
        pressDepth: 1
    },
    ugly: {
        name: "Ugly",
        background: "#00ff55",
        white: key({
            gradient: ["#ff00ff", "#ffff00"],
            angle: 37,
            rest: [255, 128, 128],
            radius: 4,
            topRadius: 3,
            gloss: 0.8,
            outline: { color: "#0000ff", width: 0.07 }
        }),
        black: key({
            gradient: ["#00ffff", "#ff0000"],
            angle: 253,
            rest: [128, 128, 255],
            radius: 0,
            topRadius: 2,
            outline: { color: "#ffff00", width: 0.06 }
        }),
        sharpLength: 0.85,
        gap: 0.1,
        pressDepth: 2.5
    }
} as const satisfies Record<string, KeyboardTheme>;

export type KeyboardThemeID = keyof typeof keyboardThemes;

export const DEFAULT_KEYBOARD_THEME: KeyboardThemeID = "spessasynth_light";
