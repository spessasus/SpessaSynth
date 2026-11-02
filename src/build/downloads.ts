export const DOWNLOADS_MANIFEST_NAME = "downloads.json";

export const BINARY_PLATFORMS = {
    "win-x64": {
        goos: "windows",
        goarch: "amd64",
        executable: "SpessaSynth.exe",
        archive: "SpessaSynth-win-x64.zip"
    },
    "linux-x64": {
        goos: "linux",
        goarch: "amd64",
        executable: "SpessaSynth",
        archive: "SpessaSynth-linux-x64.tar.gz"
    },
    "linux-arm64": {
        goos: "linux",
        goarch: "arm64",
        executable: "SpessaSynth",
        archive: "SpessaSynth-linux-arm64.tar.gz"
    }
} as const;

export type BinaryPlatform = keyof typeof BINARY_PLATFORMS;

export interface DownloadFile {
    /**
     * Relative to the site root.
     */
    file: string;
    size: number;
    sha256: string;
}

export interface DownloadsManifest {
    version: string;
    soundBank: DownloadFile;
    /**
     * The Node based Local Edition ZIP.
     */
    localEdition: DownloadFile;
    /**
     * Platforms that failed to build are missing.
     */
    platforms: Partial<Record<BinaryPlatform, DownloadFile>>;
}
