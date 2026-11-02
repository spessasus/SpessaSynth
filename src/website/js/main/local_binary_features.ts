import {
    closeNotification,
    showNotification
} from "../notification/notification.js";
import type { LocaleManager } from "../manager/locale_manager.ts";
import {
    API,
    type DefaultSoundBankStatus,
    PAGE_HEADER,
    type UpdateStatus
} from "../../../server/api.ts";

// Features of the standalone executable (binary: true in /api/version).
// The Node server does not have these endpoints.

const LOCALE = "locale.localEdition";
// Stays until the page reloads
const PERMANENT = 9_999_999;

// Set while an update restarts the server, the update notice is enough then
let restartingForUpdate = false;

/**
 * Sends a POST and throws with the server's message when it fails.
 */
async function post(url: string) {
    const response = await fetch(url, {
        method: "POST",
        headers: { [PAGE_HEADER]: "1" }
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text.trim() || response.statusText);
    }
}

function showFailure(locale: LocaleManager, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    showNotification(
        locale.getLocaleString("locale.warnings.warning"),
        [
            {
                type: "text",
                textContent: locale.getLocaleString(
                    `${LOCALE}.soundBankFolder.failed`,
                    [message]
                )
            }
        ],
        undefined,
        true,
        locale
    );
}

/**
 * Keeps the server running while a SpessaSynth tab is open. It shuts down
 * once the /api/alive connection is gone.
 * Browsers allow six connections per host across all tabs, so only one tab
 * holds the connection. The Web Lock picks it, and the next tab takes over
 * when it closes.
 */
export function keepServerAlive(locale: LocaleManager) {
    const channel = new BroadcastChannel("spessasynth-alive");
    let stopped = false;

    const showStopped = () => {
        if (stopped) {
            return;
        }
        stopped = true;
        if (!restartingForUpdate) {
            showNotification(
                locale.getLocaleString(`${LOCALE}.serverStopped.title`),
                [
                    {
                        type: "text",
                        textContent: locale.getLocaleString(
                            `${LOCALE}.serverStopped.message`
                        )
                    }
                ],
                PERMANENT,
                false,
                locale
            );
        }
        // Reload once SpessaSynth is back (started again or restarted after an update)
        const poll = async () => {
            try {
                const response = await fetch(API.version, {
                    cache: "no-store"
                });
                if (response.ok) {
                    location.reload();
                    return;
                }
            } catch {
                // Still down
            }
            setTimeout(() => void poll(), 2000);
        };
        setTimeout(() => void poll(), 2000);
    };

    channel.addEventListener("message", (e) => {
        switch (e.data) {
            case "stopped": {
                showStopped();
                break;
            }
            case "updating": {
                restartingForUpdate = true;
                break;
            }
            case "update-failed": {
                restartingForUpdate = false;
                break;
            }
        }
    });

    const connect = (release: () => void) => {
        const source = new EventSource(API.alive);
        source.addEventListener("error", () => {
            // EventSource would retry forever, but an error here means the server is gone
            source.close();
            channel.postMessage("stopped");
            showStopped();
            // Let another tab take over right away when SpessaSynth starts again
            release();
        });
    };

    // Web Locks only exist in secure contexts, so a LAN address like
    // http://192.168.1.5:8181 has none. Auto-shutdown is off in LAN mode anyway.
    if (!("locks" in navigator)) {
        connect(() => void 0);
        return;
    }
    // The lock is held until the connection is gone or the tab closes
    void navigator.locks.request(
        "spessasynth-alive",
        () =>
            new Promise<void>((resolve) => {
                connect(resolve);
            })
    );
}

/**
 * Shown instead of loading anything when the sound bank folder is empty.
 * Every way out reloads the page.
 */
export function showEmptyFolderPrompt(
    locale: LocaleManager,
    errorMessage?: string
) {
    const contents: Parameters<typeof showNotification>[1] = [
        {
            type: "text",
            textContent: locale.getLocaleString(`${LOCALE}.emptyFolder.message`)
        }
    ];
    if (errorMessage) {
        contents.push({
            type: "text",
            textContent: locale.getLocaleString(
                `${LOCALE}.emptyFolder.failed`,
                [errorMessage]
            )
        });
    }
    contents.push(
        {
            type: "button",
            translatePathTitle: errorMessage
                ? `${LOCALE}.emptyFolder.retry`
                : `${LOCALE}.emptyFolder.download`,
            onClick: (n) => {
                closeNotification(n.id);
                void downloadDefaultBank(locale);
            }
        },
        {
            type: "button",
            translatePathTitle: `${LOCALE}.emptyFolder.haveOwn`,
            onClick: () => {
                post(API.openSoundBankFolder).catch((error: unknown) =>
                    showFailure(locale, error)
                );
            }
        },
        {
            type: "button",
            translatePathTitle: `${LOCALE}.emptyFolder.refresh`,
            onClick: () => location.reload()
        }
    );
    showNotification(
        locale.getLocaleString(`${LOCALE}.emptyFolder.title`),
        contents,
        PERMANENT,
        false,
        locale
    );
}

async function downloadDefaultBank(locale: LocaleManager) {
    const progressText = (percent: number) =>
        locale.getLocaleString(`${LOCALE}.emptyFolder.downloading`, [percent]);
    const notification = showNotification(
        locale.getLocaleString(`${LOCALE}.emptyFolder.title`),
        [{ type: "text", textContent: progressText(0) }, { type: "progress" }],
        PERMANENT,
        false,
        locale
    );
    const text = notification.div.querySelector("p")!;
    const bar = notification.div.querySelector<HTMLDivElement>(
        ".notification_progress"
    )!;

    const fail = (message: string) => {
        closeNotification(notification.id);
        showEmptyFolderPrompt(locale, message);
    };

    try {
        await post(API.defaultSoundBank);
    } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
        return;
    }

    const poll = async () => {
        let status: DefaultSoundBankStatus;
        try {
            const response = await fetch(API.defaultSoundBank, {
                cache: "no-store"
            });
            status = (await response.json()) as DefaultSoundBankStatus;
        } catch (error) {
            fail(error instanceof Error ? error.message : String(error));
            return;
        }
        if (status.state === "done") {
            location.reload();
            return;
        }
        if (status.state === "error") {
            fail(status.error ?? "");
            return;
        }
        const percent =
            status.total > 0
                ? Math.floor((status.received / status.total) * 100)
                : 0;
        text.textContent = progressText(percent);
        bar.style.width = `${percent}%`;
        setTimeout(() => void poll(), 300);
    };
    await poll();
}

/**
 * The folder button next to the sound bank selector.
 * @param locale the locale manager.
 * @param platform the server's platform, the launcher entry is Linux only.
 * @param refresh reloads the sound bank list.
 */
export function prepareSoundBankFolderButton(
    locale: LocaleManager,
    platform: string,
    refresh: () => Promise<unknown>
) {
    const button = document.querySelector<HTMLLabelElement>(
        "#soundbank_folder_button"
    )!;
    button.style.display = "";
    locale.bindTooltip(button, `${LOCALE}.soundBankFolder.button`);
    button.addEventListener("click", () => {
        const contents: Parameters<typeof showNotification>[1] = [
            {
                type: "text",
                textContent: locale.getLocaleString(
                    `${LOCALE}.soundBankFolder.message`
                )
            },
            {
                type: "button",
                translatePathTitle: `${LOCALE}.soundBankFolder.open`,
                onClick: () => {
                    post(API.openSoundBankFolder).catch((error: unknown) =>
                        showFailure(locale, error)
                    );
                }
            },
            {
                type: "button",
                translatePathTitle: `${LOCALE}.soundBankFolder.refresh`,
                onClick: (n) => {
                    closeNotification(n.id);
                    refresh().catch((error: unknown) =>
                        showFailure(locale, error)
                    );
                }
            }
        ];
        if (platform === "linux") {
            contents.push({
                type: "button",
                translatePathTitle: `${LOCALE}.soundBankFolder.launcher`,
                onClick: (n) => {
                    closeNotification(n.id);
                    post(API.launcher)
                        .then(() =>
                            showNotification(
                                locale.getLocaleString(
                                    `${LOCALE}.soundBankFolder.title`
                                ),
                                [
                                    {
                                        type: "text",
                                        textContent: locale.getLocaleString(
                                            `${LOCALE}.soundBankFolder.launcherAdded`
                                        )
                                    }
                                ],
                                undefined,
                                true,
                                locale
                            )
                        )
                        .catch((error: unknown) => showFailure(locale, error));
                }
            });
        }
        showNotification(
            locale.getLocaleString(`${LOCALE}.soundBankFolder.title`),
            contents,
            undefined,
            true,
            locale
        );
    });
}

/**
 * Asks the server whether a newer version exists and offers to install it.
 */
export async function checkForUpdate(locale: LocaleManager) {
    let status: UpdateStatus;
    try {
        const response = await fetch(API.update, { cache: "no-store" });
        status = (await response.json()) as UpdateStatus;
    } catch {
        return;
    }
    if (!status.available) {
        return;
    }

    const contents: Parameters<typeof showNotification>[1] = [
        {
            type: "text",
            textContent: locale.getLocaleString(`${LOCALE}.update.message`, [
                status.latest,
                status.current
            ])
        }
    ];
    if (status.canInstall) {
        contents.push({
            type: "button",
            translatePathTitle: `${LOCALE}.update.install`,
            onClick: (n) => {
                closeNotification(n.id);
                void installUpdate(locale, status.latest);
            }
        });
    } else {
        contents.push(
            {
                type: "text",
                textContent: locale.getLocaleString(
                    `${LOCALE}.update.notWritable`
                )
            },
            {
                type: "button",
                translatePathTitle: `${LOCALE}.update.downloadPage`,
                onClick: () => window.open(status.downloadPage, "_blank")
            }
        );
    }
    contents.push({
        type: "button",
        translatePathTitle: `${LOCALE}.update.later`,
        onClick: (n) => closeNotification(n.id)
    });
    showNotification(
        locale.getLocaleString(`${LOCALE}.update.title`),
        contents,
        PERMANENT,
        true,
        locale
    );
}

async function installUpdate(locale: LocaleManager, latest: string) {
    const progressText = (percent: number) =>
        locale.getLocaleString(`${LOCALE}.update.downloading`, [
            latest,
            percent
        ]);
    const notification = showNotification(
        locale.getLocaleString(`${LOCALE}.update.title`),
        [{ type: "text", textContent: progressText(0) }, { type: "progress" }],
        PERMANENT,
        false,
        locale
    );
    const text = notification.div.querySelector("p")!;
    const bar = notification.div.querySelector<HTMLDivElement>(
        ".notification_progress"
    )!;
    const fail = (message: string) => {
        closeNotification(notification.id);
        showFailure(locale, message);
    };

    try {
        await post(API.update);
    } catch (error) {
        fail(error instanceof Error ? error.message : String(error));
        return;
    }
    // The server may restart before a poll ever sees "restarting".
    // So from here on the restart counts as expected, in every tab
    const channel = new BroadcastChannel("spessasynth-alive");
    restartingForUpdate = true;
    channel.postMessage("updating");

    const poll = async () => {
        let status: UpdateStatus;
        try {
            const response = await fetch(API.update, { cache: "no-store" });
            status = (await response.json()) as UpdateStatus;
        } catch {
            // The server went away for the restart.
            // Once the new version is up, the alive connection reloads the page
            return;
        }
        if (status.state === "error") {
            restartingForUpdate = false;
            channel.postMessage("update-failed");
            fail(status.error ?? "");
            return;
        }
        if (status.state === "restarting") {
            text.textContent = locale.getLocaleString(
                `${LOCALE}.update.restarting`,
                [latest]
            );
            bar.style.width = "100%";
            return;
        }
        const percent =
            status.total > 0
                ? Math.floor((status.received / status.total) * 100)
                : 0;
        text.textContent = progressText(percent);
        bar.style.width = `${percent}%`;
        setTimeout(() => void poll(), 300);
    };
    await poll();
}
