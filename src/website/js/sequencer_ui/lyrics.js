import { supportedEncodings } from "../utils/encodings.js";
import { messageTypes } from "../../../spessasynth_lib/midi_parser/midi_message.js";
import { AssManager } from "../utils/ass_manager.js";

const ACTUAL_FONT_SIZE = parseFloat(getComputedStyle(document.body).fontSize);

/**
 * @this {SequencerUI}
 */
export function createLyrics()
{
    /**
     * @type {{
     *     mainButton: HTMLDivElement,
     *     mainDiv: HTMLDivElement,
     *     titleWrapper: HTMLDivElement,
     *     title: HTMLHeadingElement,
     *     text: {
     *         main: HTMLParagraphElement
     *         highlight: HTMLSpanElement,
     *         gray: HTMLSpanElement,
     *         other: HTMLDivElement
     *     },
     *     selector: HTMLSelectElement
     * }}
     */
    this.lyricsElement = {};
    // main div
    const mainLyricsDiv = document.createElement("div");
    mainLyricsDiv.classList.add("lyrics");
    
    // title wrapper
    const titleWrapper = document.createElement("div");
    titleWrapper.classList.add("lyrics_title_wrapper");
    mainLyricsDiv.append(titleWrapper);
    this.lyricsElement.titleWrapper = titleWrapper;
    
    // title
    const lyricsTitle = document.createElement("h2");
    this.locale.bindObjectProperty(lyricsTitle, "textContent", "locale.sequencerController.lyrics.title");
    lyricsTitle.classList.add("lyrics_title");
    titleWrapper.appendChild(lyricsTitle);
    this.lyricsElement.title = lyricsTitle;
    
    // encoding selector
    const encodingSelector = document.createElement("select");
    supportedEncodings.forEach(encoding =>
    {
        const option = document.createElement("option");
        option.innerText = encoding;
        option.value = encoding;
        encodingSelector.appendChild(option);
    });
    encodingSelector.value = this.encoding;
    encodingSelector.onchange = () => this.changeEncoding(encodingSelector.value);
    encodingSelector.classList.add("lyrics_selector");
    this.encodingSelector = encodingSelector;
    titleWrapper.appendChild(encodingSelector);
    
    // the actual text
    const text = document.createElement("p");
    text.classList.add("lyrics_text");
    mainLyricsDiv.appendChild(text);
    
    const currentLyrics = document.createElement("span");
    currentLyrics.classList.add("lyrics_text_highlight");
    text.appendChild(currentLyrics);
    
    const allLyrics = document.createElement("span");
    allLyrics.classList.add("lyrics_text_gray");
    text.appendChild(allLyrics);
    
    // display for other texts
    const otherTextWrapper = document.createElement("details");
    const sum = document.createElement("summary");
    this.locale.bindObjectProperty(sum, "textContent", "locale.sequencerController.lyrics.otherText.title");
    otherTextWrapper.appendChild(sum);
    const otherText = document.createElement("div");
    otherText.innerText = "";
    otherTextWrapper.appendChild(otherText);
    mainLyricsDiv.appendChild(otherTextWrapper);
    
    // subtitle upload
    this.subtitleManager = new AssManager(this.seq);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ass";
    input.id = "subtitle_upload";
    input.classList.add("hidden");
    mainLyricsDiv.appendChild(input);
    input.onchange = async () =>
    {
        if (input.files[0] === undefined)
        {
            return;
        }
        const file = input.files[0];
        this.subtitleManager.loadASSSubtitles(await file.text());
    };
    
    const subtitleUpload = document.createElement("label");
    subtitleUpload.htmlFor = "subtitle_upload";
    subtitleUpload.classList.add("general_button");
    this.locale.bindObjectProperty(subtitleUpload, "textContent", "locale.sequencerController.lyrics.subtitles.title");
    this.locale.bindObjectProperty(subtitleUpload, "title", "locale.sequencerController.lyrics.subtitles.description");
    mainLyricsDiv.appendChild(subtitleUpload);
    
    
    this.lyricsElement.text = {
        highlight: currentLyrics,
        gray: allLyrics,
        main: text,
        other: otherText,
        subtitleButton: subtitleUpload
    };
    this.lyricsElement.mainDiv = mainLyricsDiv;
    this.lyricsElement.selector = encodingSelector;
    this.controls.appendChild(mainLyricsDiv);
    this.requiresTextUpdate = true;
}

/**
 * @this {SequencerUI}
 */
export function setLyricsText(text)
{
    
    const highlight = this.lyricsElement.text.highlight;
    const gray = this.lyricsElement.text.gray;
    gray.innerText = this.currentLyricsString.replace(text, "");
    highlight.innerText = text;
    this.lyricsElement.text.main.scrollTo(0, highlight.offsetHeight - (ACTUAL_FONT_SIZE * 5));
}

/**
 * @this {SequencerUI}
 */
export function updateOtherTextEvents()
{
    let text = "";
    for (const raw of this.rawOtherTextEvents)
    {
        text += `<span><pre>${Object.keys(messageTypes)
            .find(k => messageTypes[k] === raw.type)
            .replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
            )}:</pre> <i>${this.decodeTextFix(raw.data.buffer)}</i></span><br>`;
    }
    this.lyricsElement.text.other.innerHTML = text;
}