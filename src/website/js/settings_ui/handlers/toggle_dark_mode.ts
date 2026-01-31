// Top color
import type { SpessaSynthSettings } from "../settings.ts";

const TC_DARK = {
    start: "#101010",
    end: "#212121"
};
const TC_LIGHT = {
    start: "#bbb",
    end: "#f0f0f0"
};

// Font color
const FC_DARK = "#eee";
const FC_LIGHT = "#333";

// Top buttons color
const TBC_DARK = {
    start: "#222",
    end: "#333"
};

const TBC_LIGHT = {
    start: "#ccc",
    end: "#fff"
};

const TRANSITION_TIME = 0.2;

export function _toggleDarkMode(this: SpessaSynthSettings) {
    if (this.mode === "dark") {
        this.mode = "light";
        this.renderer.drawActiveNotes = false;
    } else {
        this.renderer.drawActiveNotes = true;
        this.mode = "dark";
    }
    this.renderer.toggleDarkMode();
    this.synthui.toggleDarkMode();
    this.sequi.toggleDarkMode();
    this.musicMode.toggleDarkMode();

    document
        .querySelectorAll(".spessasynth_main")[0]
        .classList.toggle("light_mode");

    // Top part
    document
        .querySelectorAll(".top_part")[0]
        .classList.toggle("top_part_light");

    // Settings
    this.mainDiv.classList.toggle("settings_menu_light");

    // Rest
    // Things get hacky here: change the global (*) --font-color to black:
    // Find the star rule
    const rules = document.styleSheets[0].cssRules as unknown as CSSStyleRule[];
    for (const rule of rules) {
        if (rule.selectorText === "*") {
            if (this.mode === "dark") {
                // Dark mode
                transitionColor(
                    FC_LIGHT,
                    FC_DARK,
                    TRANSITION_TIME,
                    rule,
                    "--font-color"
                );

                transitionColor(
                    TBC_LIGHT.start,
                    TBC_DARK.start,
                    TRANSITION_TIME,
                    rule,
                    "--top-buttons-color-start"
                );
                transitionColor(
                    TBC_LIGHT.end,
                    TBC_DARK.end,
                    TRANSITION_TIME,
                    rule,
                    "--top-buttons-color-end"
                );

                transitionColor(
                    TC_LIGHT.start,
                    TC_DARK.start,
                    TRANSITION_TIME,
                    rule,
                    "--top-color-start"
                );
                transitionColor(
                    TC_LIGHT.end,
                    TC_DARK.end,
                    TRANSITION_TIME,
                    rule,
                    "--top-color-end"
                );
            } else {
                // Light mode
                transitionColor(
                    FC_DARK,
                    FC_LIGHT,
                    TRANSITION_TIME,
                    rule,
                    "--font-color"
                );

                transitionColor(
                    TBC_DARK.start,
                    TBC_LIGHT.start,
                    TRANSITION_TIME,
                    rule,
                    "--top-buttons-color-start"
                );
                transitionColor(
                    TBC_DARK.end,
                    TBC_LIGHT.end,
                    TRANSITION_TIME,
                    rule,
                    "--top-buttons-color-end"
                );

                transitionColor(
                    TC_DARK.start,
                    TC_LIGHT.start,
                    TRANSITION_TIME,
                    rule,
                    "--top-color-start"
                );
                transitionColor(
                    TC_DARK.end,
                    TC_LIGHT.end,
                    TRANSITION_TIME,
                    rule,
                    "--top-color-end"
                );
            }
            break;
        }
    }
    document.body.style.background = this.mode === "dark" ? "black" : "white";
}

const intervals: Record<string, number> = {};

function hexToRgb(hex: string): { r: number; b: number; g: number } {
    // For stuff like #222
    if (hex.length === 4) {
        hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    const num = Number.parseInt(hex.slice(1), 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

function interpolate(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
}

/**
 * @param initialColor hex
 * @param targetColor hex
 * @param duration
 * @param propertyName
 * @param cssRule
 */
function transitionColor(
    initialColor: string,
    targetColor: string,
    duration: number,
    cssRule: CSSStyleRule,
    propertyName: string
) {
    if (intervals[propertyName]) {
        clearInterval(intervals[propertyName]);
        delete intervals[propertyName];
    }

    // Parse initial and target colors
    const startColor = hexToRgb(initialColor);
    const endColor = hexToRgb(targetColor);

    const startTime = performance.now() / 1000;

    function step() {
        const currentTime = performance.now() / 1000;
        const elapsedTime = currentTime - startTime;
        const progress = Math.min(elapsedTime / duration, 1);

        const r = Math.round(interpolate(startColor.r, endColor.r, progress));
        const g = Math.round(interpolate(startColor.g, endColor.g, progress));
        const b = Math.round(interpolate(startColor.b, endColor.b, progress));

        cssRule.style.setProperty(propertyName, `rgb(${r}, ${g}, ${b})`);

        if (progress >= 1) {
            clearInterval(intervals[propertyName]);
            delete intervals[propertyName];
        }
    }

    intervals[propertyName] = window.setInterval(step, 1000 / 60); // 60 FPS should be enough
}
