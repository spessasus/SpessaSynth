// The Local Edition API, shared by the page and the Node server.
// Keep it import-free, and keep src/executable/server.go in sync.

export const API = {
    version: "/api/version",
    settings: "/api/settings",
    soundBanks: "/api/soundbanks",
    lastUsedSoundBank: "/api/soundbanks/last-used",
    // Only on the standalone executable (binary: true) from here on
    alive: "/api/alive",
    openSoundBankFolder: "/api/soundbanks/open-folder",
    defaultSoundBank: "/api/soundbanks/default",
    launcher: "/api/launcher",
    update: "/api/update"
} as const;

/**
 * The URL of a sound bank file in the sound bank folder.
 */
export function soundBankURL(name: string) {
    return `${API.soundBanks}/${encodeURIComponent(name)}`;
}

/**
 * Sent with every state-changing request. Browsers must preflight
 * cross-origin requests with a custom header and the server never approves
 * them, so a request carrying it can only come from the page itself.
 */
export const PAGE_HEADER = "X-SpessaSynth";

export const APP_ID = "spessasynth-local-edition";

export interface VersionInfo {
    app: typeof APP_ID;
    version: string;
    /**
     * True for the standalone executable, false for the Node server.
     */
    binary: boolean;
    /**
     * Node's process.platform, for example "linux" or "win32".
     */
    platform: string;
}

export interface SoundBankEntry {
    name: string;
}

export interface LastUsedSoundBankBody {
    name: string;
}

export interface UpdateStatus {
    current: string;
    latest: string;
    available: boolean;
    /**
     * False when the executable cannot replace itself (read-only folder).
     */
    canInstall: boolean;
    downloadPage: string;
    state: "idle" | "downloading" | "restarting" | "error";
    received: number;
    total: number;
    error?: string;
}

export interface DefaultSoundBankStatus {
    state: "idle" | "downloading" | "done" | "error";
    received: number;
    total: number;
    error?: string;
}
