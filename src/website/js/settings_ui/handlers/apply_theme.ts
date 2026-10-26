import type { SpessaSynthSettings } from "../settings.ts";
import { type ThemeID, themeList } from "../../themes/theme_list.ts";

const TRANSITION_TIME = 0.2;

type RGBA = [number, number, number, number];

interface VariableTransition {
    name: string;
    from: RGBA;
    to: RGBA;
}

let transitionFrame = -1;
let transitionVariables = new Array<string>();

/**
 * Gets the names of all variables defined by the theme rules.
 */
function getThemeVariables(rules: CSSRuleList, names: Set<string>) {
    for (const rule of Array.from(rules)) {
        if (rule instanceof CSSImportRule) {
            if (rule.styleSheet) {
                getThemeVariables(rule.styleSheet.cssRules, names);
            }
            continue;
        }
        if (
            rule instanceof CSSStyleRule &&
            rule.selectorText.includes("[data-theme=")
        ) {
            for (const name of Array.from(rule.style)) {
                if (name.startsWith("--")) {
                    names.add(name);
                }
            }
        }
    }
}

/**
 * Parses a hex or rgb(a) color. Other values (shadows, filters) cannot be transitioned.
 */
function parseColor(value: string): RGBA | undefined {
    value = value.trim();
    if (value.startsWith("#")) {
        let hex = value.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            hex = [...hex].map((c) => c + c).join("");
        }
        if (hex.length !== 6 && hex.length !== 8) {
            return undefined;
        }
        const num = Number.parseInt(hex, 16);
        if (Number.isNaN(num)) {
            return undefined;
        }
        return hex.length === 6
            ? [(num >> 16) & 255, (num >> 8) & 255, num & 255, 1]
            : [
                  (num >>> 24) & 255,
                  (num >> 16) & 255,
                  (num >> 8) & 255,
                  (num & 255) / 255
              ];
    }
    const match = /^rgba?\(([^)]+)\)$/.exec(value);
    if (!match) {
        return undefined;
    }
    const parts = match[1].split(/[\s,/]+/).map(Number);
    if (parts.length < 3 || parts.some((p) => Number.isNaN(p))) {
        return undefined;
    }
    return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

export function _applyTheme(this: SpessaSynthSettings, theme: ThemeID) {
    const root = document.documentElement;
    const style = getComputedStyle(root);

    const names = new Set<string>();
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            getThemeVariables(sheet.cssRules, names);
        } catch {
            // Cross-origin stylesheets cannot be read
        }
    }

    // Snapshot the current colors (including a transition in progress)
    const from = new Map<string, string>();
    for (const name of names) {
        from.set(name, style.getPropertyValue(name));
    }
    cancelAnimationFrame(transitionFrame);
    for (const name of transitionVariables) {
        root.style.removeProperty(name);
    }

    // Active notes are drawn brighter, which does not work on light backgrounds
    if (themeList[this.theme].type !== themeList[theme].type) {
        this.renderer.drawActiveNotes = themeList[theme].type === "dark";
        this.htmlControls.renderer.drawActiveNotes.checked =
            this.renderer.drawActiveNotes;
    }
    this.theme = theme;
    root.dataset.theme = theme;

    document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", style.getPropertyValue("--top-color-end"));

    const transitions = new Array<VariableTransition>();
    for (const [name, value] of from) {
        const start = parseColor(value);
        const end = parseColor(style.getPropertyValue(name));
        if (start && end) {
            transitions.push({ name, from: start, to: end });
        }
    }
    transitionVariables = transitions.map((t) => t.name);

    const startTime = performance.now() / 1000;
    const step = () => {
        const progress = Math.min(
            (performance.now() / 1000 - startTime) / TRANSITION_TIME,
            1
        );
        if (progress >= 1) {
            // The stylesheet takes over from here
            for (const { name } of transitions) {
                root.style.removeProperty(name);
            }
            transitionVariables = [];
            return;
        }
        for (const t of transitions) {
            const [r, g, b, a] = t.from.map(
                (v, i) => v + (t.to[i] - v) * progress
            );
            root.style.setProperty(
                t.name,
                `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`
            );
        }
        transitionFrame = requestAnimationFrame(step);
    };
    step();
}
