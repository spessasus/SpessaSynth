import { getDoubleNoteSvg } from '../utils/icons.js'
import { formatTime } from '../../../spessasynth_lib/utils/other.js'
import { ANIMATION_REFLOW_TIME } from '../utils/animation_utils.js'

/**
 * music_mode_ui.js
 * purpose: manages the music mode gui, hiding keyboard and renderer from view
 */


const TRANSITION_TIME = 0.5;

export class MusicModeUI {
    /**
     * Creates a new class for displaying information about the current file.
     * @param element {HTMLElement}
     * @param localeManager {LocaleManager}
     */
    constructor(element, localeManager) {
        this.mainDiv = element;
        // load html
        this.mainDiv.innerHTML = `
        <div id='player_info_background_image'></div>
        <div class='player_info_wrapper'>
            <div class="player_info_note_icon">
                ${getDoubleNoteSvg("100%")}
                <img src='' alt='' style='display: none'>
            </div>
            <div class='player_info_details_wrapper'>
                <p style='font-size: small'><i translate-path='locale.musicPlayerMode.currentlyPlaying'></i></p>
                <h2  id='player_info_title' translate-path='locale.musicPlayerMode.nothingPlaying'></h2>
                
                <div class='player_info_detail_element'>
                    <i id='player_info_detail' translate-path='locale.musicPlayerMode.nothingPlayingCopyright'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <b translate-path-title='locale.exportAudio.formats.metadata.artist'></b><i id='player_info_artist'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <b translate-path-title='locale.exportAudio.formats.metadata.album'></b><i id='player_info_album'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <b translate-path-title='locale.exportAudio.formats.metadata.genre'></b><i id='player_info_genre'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <b translate-path-title='locale.exportAudio.formats.metadata.creationDate'></b><i id='player_info_creation'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <b translate-path-title='locale.exportAudio.formats.metadata.comment'></b><i id='player_info_comment'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <b translate-path-title='locale.exportAudio.formats.metadata.duration'></b><i id='player_info_time'></i>
                </div>
                
                <div class='player_info_detail_element hidden'>
                    <pre id='player_info_file_name'></pre>
                </div>
            </div>
        </div>`;

        // apply locale bindings
        for (const el of this.mainDiv.querySelectorAll("*[translate-path]"))
        {
            localeManager.bindObjectProperty(el, "textContent", el.getAttribute("translate-path"));
        }
        for (const el of this.mainDiv.querySelectorAll("*[translate-path-title]"))
        {
            localeManager.bindObjectProperty(el, "textContent", el.getAttribute("translate-path-title") + ".title");
            localeManager.bindObjectProperty(el, "title", el.getAttribute("translate-path-title") + ".description");
        }
        this.timeoutId = -1;
        this.visible = false;
        this.locale = localeManager;
    }

    toggleDarkMode()
    {
        this.mainDiv.getElementsByClassName("player_info_wrapper")[0].classList.toggle("light_mode");
    }

    /**
     * @param title {string}
     */
    setTitle(title)
    {
        // get the title
        document.getElementById("player_info_title").textContent = title;
    }

    /**
     * @param seq {Sequencer}
     */
    connectSequencer(seq)
    {
        this.seq = seq;
        this.seq.addOnSongChangeEvent(mid => {
            // use file name if no copyright detected
            const midcopy = mid.copyright.replaceAll("\n", "");
            const setInfoText = (id, text) => {
                const el = document.getElementById(id);
                if(text.length > 0)
                {
                    el.parentElement.classList.remove("hidden");
                    el.innerHTML = "";
                    // add scroll if needed
                    if(text.length > 30)
                    {
                        el.classList.add("marquee");

                        const textWrap = document.createElement("span");
                        textWrap.textContent = text;
                        el.appendChild(textWrap);
                    }
                    else
                    {
                        el.textContent = text;
                    }
                }
                else
                {
                    el.parentElement.classList.add("hidden");
                }
            }
            // copyright
            setInfoText("player_info_detail", midcopy);
            // time
            setInfoText("player_info_time", formatTime(this.seq.duration).time);

            // file name
            setInfoText("player_info_file_name", mid.fileName);

            // embedded things
            // add album and artist meta
            /**
             * @param type {string}
             * @param def {string}
             * @param decoder {TextDecoder}
             * @param prepend {string}
             * @return {string}
             */
            const verifyDecode = (type, def, decoder, prepend = "") => {
                return this.seq.midiData.RMIDInfo?.[type] === undefined ? def : prepend + decoder.decode(this.seq.midiData.RMIDInfo?.[type])
            }
            // initialize decoder
            let encoding = this.seq.midiData.RMIDInfo?.["IENC"] === undefined ? "ascii" : (new TextDecoder()).decode(this.seq.midiData.RMIDInfo?.["IENC"]).replace(/\0$/, '');
            const decoder = new TextDecoder(encoding);

            // artist, album, creation date
            setInfoText("player_info_album", verifyDecode('IPRD', "", decoder));
            setInfoText("player_info_artist", verifyDecode('IART', "", decoder));
            setInfoText("player_info_genre", verifyDecode('IGNR', "", decoder));
            setInfoText("player_info_creation", verifyDecode('ICRD', "", decoder) + verifyDecode('ICRT', "", decoder, "\n"));
            setInfoText("player_info_comment", verifyDecode('ICMT', "", decoder));

            // image
            const svg = this.mainDiv.getElementsByTagName("svg")[0];
            const img = this.mainDiv.getElementsByTagName("img")[0];
            const bg = document.getElementById("player_info_background_image");
            if(!mid.isEmbedded)
            {
                svg.style.display = "";
                img.style.display = "none";
                bg.style.setProperty("--bg-image", "undefined");
                return;
            }
            // add album cover if available
            if(mid.RMIDInfo["IPIC"] === undefined)
            {
                svg.style.display = "";
                img.style.display = "none";
                bg.style.setProperty("--bg-image", "undefined");
                return;
            }
            svg.style.display = "none";
            img.style.display = "";
            const pic = new Blob([mid.RMIDInfo["IPIC"].buffer]);
            const url = URL.createObjectURL(pic);
            img.src = url;
            bg.style.setProperty("--bg-image", `url('${url}')`);
        }, "player-js-song-change");
    }

    /**
     * @param visible {boolean}
     * @param keyboardCanvasWrapper {HTMLDivElement}
     */
    setVisibility(visible, keyboardCanvasWrapper)
    {
        if(visible === this.visible)
        {
            return;
        }
        this.visible = visible;
        if(this.timeoutId)
        {
            clearTimeout(this.timeoutId);
        }
        const playerDiv = this.mainDiv;
        if(visible)
        {
            // PREPARATION
            // renderer and keyboard
            keyboardCanvasWrapper.classList.add("out_animation");
            this.savedCKWrapperHeight = keyboardCanvasWrapper.clientHeight;

            // music mode
            // hacky: get position of the wrapper and temporarily set to absolute (set to normal after finish)
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
            this.timeoutId = setTimeout(async () => {
                keyboardCanvasWrapper.style.display = "none";

                playerDiv.style.position = "";
                playerDiv.style.top = "";
                playerDiv.style.height = "";

                document.body.style.overflow = "";

                // fullscreen
                await document.body.requestFullscreen();
            }, TRANSITION_TIME * 1000)
        }
        else
        {
            // PREPARATION
            // wrapper
            // hacky: get position of the music mode and temporarily set to absolute (set to normal after finish)
            const rootTop = playerDiv.getBoundingClientRect().top;
            keyboardCanvasWrapper.style.display = "";
            keyboardCanvasWrapper.style.position = "absolute";
            keyboardCanvasWrapper.style.top = `${rootTop}px`;
            keyboardCanvasWrapper.style.height = `${this.savedCKWrapperHeight}px`;

            // music mode
            playerDiv.classList.remove("player_info_show");

            // START
            setTimeout(() => {
                keyboardCanvasWrapper.classList.remove("out_animation");
                document.body.style.overflow = "hidden";
            }, ANIMATION_REFLOW_TIME);

            // FINISH
            this.timeoutId = setTimeout(() => {
                playerDiv.style.display = "none";

                keyboardCanvasWrapper.style.position = "";
                keyboardCanvasWrapper.style.top = "";
                keyboardCanvasWrapper.style.height = "";

                document.body.style.overflow = "";
            }, TRANSITION_TIME * 1000);
        }
    }
}