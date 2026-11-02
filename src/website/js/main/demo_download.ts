import { showNotification } from "../notification/notification.js";
import type { LocaleManager } from "../manager/locale_manager.ts";
import {
    BINARY_PLATFORMS,
    type BinaryPlatform,
    DOWNLOADS_MANIFEST_NAME,
    type DownloadsManifest
} from "../../../build/downloads.ts";
import { LOCAL_EDITION_ZIP_NAME } from "../../../build/local_edition_zip_name.ts";

// Not in every DOM lib version yet, and Chromium only!
interface UserAgentData {
    platform: string;
    getHighEntropyValues?: (
        hints: string[]
    ) => Promise<{ architecture?: string; bitness?: string }>;
}

type DownloadOption = BinaryPlatform | "zip";

const NAMES: Record<DownloadOption, string> = {
    "win-x64": "locale.demoDownload.windows",
    "linux-x64": "locale.demoDownload.linuxX64",
    "linux-arm64": "locale.demoDownload.linuxArm64",
    zip: "locale.demoDownload.zip"
};

async function detectPlatform() {
    const uaData = (navigator as Navigator & { userAgentData?: UserAgentData })
        .userAgentData;
    let platform = uaData?.platform ?? "";
    let arch = "";
    if (uaData?.getHighEntropyValues) {
        try {
            const values = await uaData.getHighEntropyValues(["architecture"]);
            arch = values.architecture ?? "";
        } catch {
            // Not allowed, fall back to the user agent string
        }
    }
    const ua = navigator.userAgent;
    platform ||= ua;
    if (/windows/i.test(platform)) {
        return "win-x64";
    }
    if (/linux/i.test(platform) && !/android/i.test(ua)) {
        return arch === "arm" || /aarch64|arm/i.test(ua)
            ? "linux-arm64"
            : "linux-x64";
    }
    return "zip";
}

function startDownload(file: string) {
    const link = document.createElement("a");
    link.href = `./${file}`;
    link.download = file.split("/").pop() ?? file;
    document.body.append(link);
    link.click();
    link.remove();
}

async function openDownloadDialog(locale: LocaleManager) {
    let manifest: DownloadsManifest | undefined;
    try {
        const response = await fetch(DOWNLOADS_MANIFEST_NAME, {
            cache: "no-store"
        });
        if (response.ok) {
            manifest = (await response.json()) as DownloadsManifest;
        }
    } catch {
        // Only the ZIP is offered then
    }

    const files: Partial<
        Record<DownloadOption, { file: string; size?: number }>
    > = {
        zip: {
            file: LOCAL_EDITION_ZIP_NAME,
            size: manifest?.localEdition?.size
        }
    };
    // A platform that failed to build is missing from the manifest
    for (const key of Object.keys(BINARY_PLATFORMS) as BinaryPlatform[]) {
        const entry = manifest?.platforms?.[key];
        if (entry) {
            files[key] = entry;
        }
    }

    const detected = await detectPlatform();
    const order = (Object.keys(NAMES) as DownloadOption[]).filter(
        (key) => files[key] !== undefined
    );
    // The recommended one goes first
    order.sort((a, b) => Number(b === detected) - Number(a === detected));

    showNotification(
        locale.getLocaleString("locale.demoDownload.dialogTitle"),
        [
            {
                type: "text",
                textContent: locale.getLocaleString(
                    "locale.demoDownload.dialogMessage"
                )
            },
            ...order.map((key) => {
                const entry = files[key]!;
                let label = locale.getLocaleString(NAMES[key]);
                if (entry.size !== undefined && entry.size > 0) {
                    label = locale.getLocaleString(
                        "locale.demoDownload.withSize",
                        [label, (entry.size / 1e6).toFixed(1)]
                    );
                }
                if (key === detected) {
                    label = locale.getLocaleString(
                        "locale.demoDownload.recommended",
                        [label]
                    );
                }
                return {
                    type: "button" as const,
                    textContent: label,
                    onClick: () => startDownload(entry.file)
                };
            })
        ],
        undefined,
        true,
        locale
    );
}

export function prepareDownloadDialog(
    button: HTMLElement,
    locale: LocaleManager
) {
    button.addEventListener("click", (e) => {
        e.preventDefault();
        void openDownloadDialog(locale);
    });
}
