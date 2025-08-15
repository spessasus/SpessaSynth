/**
 *                    __  __
 *      /\           |  \/  |
 *     /  \   ___ ___| \  / | __ _ _ __   __ _  __ _  ___ _ __
 *    / /\ \ / __/ __| |\/| |/ _` | '_ \ / _` |/ _` |/ _ \ '__|
 *   / ____ \\__ \__ \ |  | | (_| | | | | (_| | (_| |  __/ |
 *  /_/    \_\___/___/_|  |_|\__,_|_| |_|\__,_|\__, |\___|_|
 *                                              __/ |
 *                                             |___/
 * Advanced SubStation manager.
 * That's that ASS stands for.
 * Nothing suspicious here.
 * (.ass subtitle renderer)
 */
import { DialogueEvent } from "./dialogue_event.js";
import { keybinds } from "../keybinds.js";
import type { Sequencer } from "spessasynth_lib";
import type { Renderer } from "../../renderer/renderer.ts";

const DEFAULT_RES_X = 384;
const DEFAULT_RES_Y = 288;

interface EventData {
    Text: string;
    Start: string;
    End: string;
    Style: string;
    MarginL: string;
    MarginR: string;
    MarginV: string;
}

function ASStimeToFloat(timeString: string) {
    const [hours, minutes, seconds] = timeString.split(":");
    const [sec, hundredths] = seconds.split(".");
    return (
        parseInt(hours) * 3600 +
        parseInt(minutes) * 60 +
        parseInt(sec) +
        parseInt(hundredths) / 100
    );
}

export class SubContent {
    /**
     * For example, "Dialogue"
     */
    public type = "";
    /**
     * For example, "0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Normal text."
     */
    public data = "";
}

export class SubSection {
    /**
     * The section type, like [Events]
     */
    public type: string;

    /**
     * The section contents
     */
    public contents: SubContent[] = [];

    public constructor(type: string, contents: SubContent[]) {
        this.type = type;
        this.contents = contents;
    }

    public getContent(type: string, fallback = ""): string {
        return this.contents.find((c) => c.type === type)?.data ?? fallback;
    }
}

export class AssManager {
    public visible = false;
    /**
     * Multiplier: 1 is normal speed
     */
    public timer = 1;
    private subData: SubSection[] = [];
    private resolutionX = DEFAULT_RES_X;
    private resolutionY = DEFAULT_RES_Y;
    private kerning = true;
    private styles: Record<string, string>[] = [];
    private events: DialogueEvent[] = [];
    private fonts: {
        name: string;
        data: string;
        dataDecoded?: Uint8Array<ArrayBuffer>;
    }[] = [];
    private seq: Sequencer;
    private readonly screen: HTMLDivElement;
    private firstEmbeddedFontName = "";

    /**
     * Creates a new subtitle manager
     */
    public constructor(
        seq: Sequencer,
        screen: HTMLDivElement,
        renderer: Renderer
    ) {
        this.seq = seq;
        this.screen = screen;
        this.init();
        renderer.onRender = this.tick.bind(this);

        document.addEventListener("keydown", (e) => {
            if (e.key.toLowerCase() === keybinds.toggleSubtitles) {
                this.setVisibility(!this.visible);
            }
        });
    }

    public init() {
        this.visible = false;
        this.subData = [];
        this.resolutionX = DEFAULT_RES_X;
        this.resolutionY = DEFAULT_RES_Y;
        this.kerning = true;
        this.styles = [];
        this.events = [];
        this.fonts = [];
        this.screen.innerHTML = "";
    }

    public tick() {
        if (!this.visible) {
            for (const event of this.events) {
                event.hide();
            }
            return;
        }
        const time = this.seq.currentTime * this.timer;

        // Go through all texts and render
        // First hide
        for (const event of this.events) {
            if (event.startSeconds > time || event.endSeconds <= time) {
                event.hide();
            }
        }
        // Force reflow
        void this.screen.offsetHeight;
        // Then show
        for (const event of this.events) {
            if (event.startSeconds <= time && event.endSeconds > time) {
                event.show(
                    this.resolutionX,
                    this.resolutionY,
                    this.screen,
                    time,
                    this.firstEmbeddedFontName
                );
            }
        }
    }

    public setVisibility(visible: boolean) {
        this.visible = visible;
        this.tick();
        // For good measure, re-render in 10 ms
        setTimeout(() => this.tick(), 10);
    }

    /**
     * Loads Advanced SubStation (.ass) subtitles
     */
    public loadASSSubtitles(assString: string) {
        // Reset all data
        this.init();
        // Time to parse!
        const lines = assString.replaceAll("\r\n", "\n").split("\n");
        let isSection = false;
        let sectionName = "";
        let currentFontName = "";
        let sectionContents: SubContent[] = [];
        for (const line of lines) {
            if (line.startsWith("[") && !isSection) {
                sectionName = line;
                isSection = true;
            } else if (line.length === 0 && isSection) {
                isSection = false;
                this.subData.push(new SubSection(sectionName, sectionContents));
                sectionContents = [];
            }
            // For fonts, load up the section as one big name
            else if (sectionName === "[Fonts]") {
                if (!line.startsWith("fontname: ")) {
                    const font = this.fonts.find(
                        (f) => f.name === currentFontName
                    );
                    if (!font) {
                        throw new Error(
                            `ASS Subitle error: Invalid font: ${currentFontName}`
                        );
                    }
                    font.data += line;
                } else {
                    const name = line.split(/: (.*)/s)[1];
                    this.fonts.push({
                        name: name,
                        data: "",
                        dataDecoded: undefined
                    });
                    currentFontName = name;
                }
            } else if (!line.startsWith("!") && !line.startsWith(";")) {
                // Split only the first colon
                const data = line.split(/: (.*)/s);
                const content = new SubContent();
                content.type = data[0];
                content.data = data[1];
                sectionContents.push(content);
            }
        }
        if (isSection) {
            this.subData.push(new SubSection(sectionName, sectionContents));
        }

        // Find the resolution
        const scriptInfo = this._getSection("[Script Info]");

        this.resolutionX = parseInt(
            scriptInfo.getContent("PlayResX", DEFAULT_RES_X.toString())
        );
        this.resolutionY = parseInt(
            scriptInfo.getContent("PlayResY", DEFAULT_RES_Y.toString())
        );
        this.kerning = scriptInfo.getContent("Kerning", "yes") === "yes";
        this.timer = parseFloat(scriptInfo.getContent("Timer", "100")) / 100;

        // Load styles
        const styles = this._getSection("[V4+ Styles]");
        const styleFormats = styles.getContent("Format", "").split(", ");
        for (const style of styles.contents) {
            if (style.type !== "Style") {
                continue;
            }
            const data = style.data.split(",");
            if (data.length !== styleFormats.length) {
                throw new Error(
                    `Format and style data counts do not match. Expected ${styleFormats.length} got ${data.length}`
                );
            }
            const newStyle: Record<string, string> = {};
            for (let i = 0; i < data.length; i++) {
                newStyle[styleFormats[i]] = data[i];
            }
            this.styles.push(newStyle);
        }

        // Load events
        const events = this._getSection("[Events]");
        const eventFormats: (keyof EventData)[] = events
            .getContent("Format", "")
            .split(", ") as (keyof EventData)[];
        for (const event of events.contents) {
            if (event.type !== "Dialogue") {
                continue;
            }
            const data: string[] = [];
            // Split event.data with comma eventFormats.length times and keep the rest as an entire string (note, comma without space)
            let rest = event.data;
            for (let i = 0; i < eventFormats.length - 1; i++) {
                const index = rest.indexOf(",");
                data.push(rest.substring(0, index));
                rest = rest.substring(index + 1);
            }
            data.push(rest);
            if (data.length !== eventFormats.length) {
                throw new Error(
                    `Format and dialogue data counts do not match. Expected ${eventFormats.length} got ${data.length}`
                );
            }
            const eventData: Partial<EventData> = {};
            for (let i = 0; i < data.length; i++) {
                eventData[eventFormats[i]] = data[i];
            }
            const newEvent = new DialogueEvent(
                eventData.Text ?? "",
                eventData.Start ? ASStimeToFloat(eventData.Start) : 0,
                eventData.End ? ASStimeToFloat(eventData.End) : 0,
                eventData.Style ?? "",
                parseInt(eventData.MarginL ?? "0"),
                parseInt(eventData.MarginR ?? "0"),
                parseInt(eventData.MarginV ?? "0"),
                this.styles
            );

            this.events.push(newEvent);
        }

        /*
        Decode fonts:
        ASS/SSA uses a custom encoding to turn arbitrary binary data into uppercase letters and non-alphabetic,
        non-space symbols.
        Binary input data is processed in chunks of 3 bytes.
        Those bytes are split into four 6-bit chunks such that most-significant bits are processed first.
        To each chunk value 33 is added, and then they are written out as UTF-8/ASCII text.
        After writing exactly 80 bytes, a single linebreak must be inserted.
        Only the last line may be shorter than 80 characters if the end of the source file is reached.
        If at the end of the file only fewer than 3 bytes remain,
        pad the data beyond the file end with zeros before splitting into 6-bit chunks,
        but only write out chunks containing actual file data.
         */
        for (const font of this.fonts) {
            const dataString = font.data;
            const decodedData = [];
            for (let i = 0; i < dataString.length; i += 4) {
                // Get chunk
                const chunk = dataString.slice(i, i + 4);
                // Decode chunk
                const bytes = chunk.split("").map((c) => c.charCodeAt(0) - 33);
                // Decode bytes
                const byte1 = (bytes[0] << 2) | (bytes[1] >> 4);
                const byte2 = ((bytes[1] & 15) << 4) | (bytes[2] >> 2);
                const byte3 = ((bytes[2] & 3) << 6) | bytes[3];
                if (i + 1 < dataString.length) {
                    decodedData.push(byte1);
                }
                if (i + 2 < dataString.length) {
                    decodedData.push(byte2);
                }
                if (i + 3 < dataString.length) {
                    decodedData.push(byte3);
                }
            }
            font.dataDecoded = new Uint8Array(decodedData);
            // Add the font with CSS
            const fontBlob = new Blob([font.dataDecoded.buffer]);
            const fontUrl = URL.createObjectURL(fontBlob);
            const styleElement = document.createElement("style");
            styleElement.innerHTML = `@font-face {
                font-family: "${font.name}";
                src: url("${fontUrl}");
            }`;
            document.head.appendChild(styleElement);
        }

        this.firstEmbeddedFontName = this.fonts[0]?.name || "sans-serif";

        console.info("Subtitles:", this.styles, this.events, this.fonts);
        // Kerning
        this.screen.style.fontKerning = this.kerning ? "normal" : "none";
    }

    private _getSection(type: string): SubSection {
        const t = type.toLowerCase();
        const result = this.subData.find((s) => s.type.toLowerCase() === t);
        if (!result) {
            throw new Error(`Section ${type} not found!`);
        }
        return result;
    }
}
