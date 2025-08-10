import { formatTime } from "../utils/other.js";
import { ANIMATION_REFLOW_TIME } from "../utils/animation_utils.js";
import { musicModeInnerHTML } from "./music_mode_html.js";
import type { LocaleManager } from "../locale/locale_manager.ts";
import type { Sequencer } from "spessasynth_lib";
import { rmidInfoChunks } from "spessasynth_core";

/**
 * Music_mode_ui.js
 * purpose: manages the music mode gui, hiding keyboard and renderer from view
 */

const TRANSITION_TIME = 0.5;

export class MusicModeUI {
    public visible = false;
    protected mainDiv: HTMLElement;
    protected timeoutId = -1;
    protected locale: LocaleManager;
    protected seq: Sequencer;
    protected savedCKWrapperHeight = 0;

    /**
     * Creates a new class for displaying information about the current file.
     */
    public constructor(
        parentElement: HTMLElement,
        localeManager: LocaleManager,
        seq: Sequencer
    ) {
        this.mainDiv = parentElement;
        this.locale = localeManager;
        this.seq = seq;
        // Load html
        this.mainDiv.innerHTML = musicModeInnerHTML;

        // Apply locale bindings
        for (const el of this.mainDiv.querySelectorAll("*[translate-path]")) {
            localeManager.bindObjectProperty(
                el,
                "textContent",
                el.getAttribute("translate-path") ?? ""
            );
        }
        for (const el of this.mainDiv.querySelectorAll(
            "*[translate-path-title]"
        )) {
            localeManager.bindObjectProperty(
                el,
                "textContent",
                el.getAttribute("translate-path-title") + ".title"
            );
            localeManager.bindObjectProperty(
                el as HTMLElement,
                "title",
                el.getAttribute("translate-path-title") + ".description"
            );
        }

        // Attach sequencer events
        this.seq = seq;
        this.seq.eventHandler.addEvent(
            "songChange",
            "player-js-song-change",
            (mid) => {
                // Use file name if no copyright detected
                const setInfoText = (
                    id: string,
                    text: string,
                    enableMarquee = true
                ) => {
                    const el = document.getElementById(id);
                    if (!el) {
                        throw new Error(`Invalid music mode element ID: ${id}`);
                    }
                    // If new lines, split up into multiple spans and only then apply marquee
                    const lines = text.trim().split("\n");
                    if (lines.length > 1) {
                        el?.parentElement?.classList?.remove("hidden");
                        el.innerHTML = "";
                        for (const line of lines) {
                            const textWrap = document.createElement("span");
                            textWrap.textContent = line;
                            el.appendChild(textWrap);
                            el.appendChild(document.createElement("br"));
                        }
                        if (el.lastChild) {
                            el.removeChild(el.lastChild);
                        }
                        return;
                    }

                    if (text.length > 0) {
                        el?.parentElement?.classList?.remove("hidden");
                        el.innerHTML = "";
                        // Add scroll if needed
                        if (text.length > 30 && enableMarquee) {
                            el.classList.add("marquee");

                            const textWrap = document.createElement("span");
                            textWrap.textContent = text;
                            el.appendChild(textWrap);
                        } else {
                            el.textContent = text;
                        }
                    } else {
                        el?.parentElement?.classList?.add("hidden");
                    }
                };
                // Copyright
                const decoder = new TextDecoder(mid.encoding ?? "Shift_JIS");
                const copyright = mid.extraMetadata
                    .map((m) => decoder.decode(m.data.buffer).trim())
                    .join("\n");
                setInfoText("player_info_detail", copyright);
                // Time
                setInfoText(
                    "player_info_time",
                    formatTime(this.seq.duration).time
                );

                // File name
                setInfoText("player_info_file_name", mid.fileName ?? "", false);

                // Embedded things
                // Add album and artist meta
                // Artist, album, creation date, subject
                setInfoText(
                    "player_info_album",
                    mid.getRMIDInfo(rmidInfoChunks.album) ?? ""
                );
                setInfoText(
                    "player_info_artist",
                    mid.getRMIDInfo(rmidInfoChunks.artist) ?? ""
                );
                setInfoText(
                    "player_info_genre",
                    mid.getRMIDInfo(rmidInfoChunks.genre) ?? ""
                );
                setInfoText(
                    "player_info_subject",
                    mid.getRMIDInfo(rmidInfoChunks.subject) ?? ""
                );
                setInfoText(
                    "player_info_creation",
                    mid.getRMIDInfo(rmidInfoChunks.creationDate) ?? ""
                );
                setInfoText(
                    "player_info_comment",
                    mid.getRMIDInfo(rmidInfoChunks.comment) ?? ""
                );

                // Image
                const svg = this.mainDiv.getElementsByTagName("svg")[0];
                const img = this.mainDiv.getElementsByTagName("img")[0];
                const bg = document.getElementById(
                    "player_info_background_image"
                );
                if (!bg) {
                    throw new Error("Unexpected lack of background image.");
                }
                // Add album cover if available
                if (mid.rmidiInfo.IPIC === undefined) {
                    svg.style.display = "";
                    img.style.display = "none";
                    bg.style.setProperty("--bg-image", "undefined");
                    return;
                }
                svg.style.display = "none";
                img.style.display = "";
                const pic = new Blob([mid.rmidiInfo.IPIC.buffer]);
                const url = URL.createObjectURL(pic);
                img.src = url;
                bg.style.setProperty("--bg-image", `url('${url}')`);
            }
        );
    }

    public toggleDarkMode() {
        this.mainDiv
            .getElementsByClassName("player_info_wrapper")[0]
            .classList.toggle("light_mode");
    }

    public setTitle(title: string) {
        // Get the title
        const t = document.getElementById("player_info_title");
        if (!t) {
            return;
        }
        t.textContent = title;
    }

    public setVisibility(
        visible: boolean,
        keyboardCanvasWrapper: HTMLDivElement
    ) {
        if (visible === this.visible) {
            return;
        }
        this.visible = visible;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        const playerDiv = this.mainDiv;
        if (visible) {
            // PREPARATION
            // Renderer and keyboard
            keyboardCanvasWrapper.classList.add("out_animation");
            this.savedCKWrapperHeight = keyboardCanvasWrapper.clientHeight;

            // Music mode
            // Hacky: get position of the wrapper and temporarily set to absolute (set to normal after finish)
            const playerHeight = keyboardCanvasWrapper.clientHeight;
            const playerTop = keyboardCanvasWrapper.getBoundingClientRect().top;
            playerDiv.style.position = "absolute";
            playerDiv.style.top = `${playerTop}px`;
            playerDiv.style.height = `${playerHeight}px`;
            playerDiv.style.display = "flex";

            // START
            setTimeout(() => {
                playerDiv.classList.add("player_info_show");
                document.body.style.overflow = "hidden";
            }, ANIMATION_REFLOW_TIME);

            // FINISH
            this.timeoutId = window.setTimeout(() => {
                keyboardCanvasWrapper.style.display = "none";

                playerDiv.style.position = "";
                playerDiv.style.top = "";
                playerDiv.style.height = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000);
        } else {
            // PREPARATION
            // Wrapper
            // Hacky: get position of the music mode and temporarily set to absolute (set to normal after finish)
            const rootTop = playerDiv.getBoundingClientRect().top;
            keyboardCanvasWrapper.style.display = "";
            keyboardCanvasWrapper.style.position = "absolute";
            keyboardCanvasWrapper.style.top = `${rootTop}px`;
            keyboardCanvasWrapper.style.height = `${this.savedCKWrapperHeight}px`;

            // Music mode
            playerDiv.classList.remove("player_info_show");

            // START
            window.setTimeout(() => {
                keyboardCanvasWrapper.classList.remove("out_animation");
                document.body.style.overflow = "hidden";
            }, ANIMATION_REFLOW_TIME);

            // FINISH
            this.timeoutId = window.setTimeout(() => {
                playerDiv.style.display = "none";

                keyboardCanvasWrapper.style.position = "";
                keyboardCanvasWrapper.style.top = "";
                keyboardCanvasWrapper.style.height = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000);
        }
    }
}
