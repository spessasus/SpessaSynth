import { getDoubleNoteSvg } from './icons.js'
import { formatTime } from '../../spessasynth_lib/utils/other.js'

/**
 * music_mode_ui.js
 * purpose: manages the music mode gui, hiding keyboard and renderer from view
 */

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
        <div class='player_info_wrapper'>
            <div class="player_info_note_icon">
                ${getDoubleNoteSvg("100%")}
            </div>
            <div class='player_info_details'>
                <p style='font-size: small'><i translate-path='locale.musicPlayerMode.currentlyPlaying'></i></p>
                <h1 id='player_info_title' translate-path='locale.musicPlayerMode.nothingPlaying'></h1>
                <h3><i id='player_info_detail' translate-path='locale.musicPlayerMode.nothingPlayingCopyright'></i></h3>
                <h3 id='player_info_time'></h3>
            </div>
        </div>`;

        // apply locale bindings
        for (const el of this.mainDiv.querySelectorAll("*[translate-path]"))
        {
            localeManager.bindObjectProperty(el, "textContent", el.getAttribute("translate-path"));
        }
    }

    /**
     * @param seq {Sequencer}
     */
    connectSequencer(seq)
    {
        this.seq = seq;
        this.seq.addOnSongChangeEvent(mid => {
            // get the title
            let title;
            if(mid.midiName.length > 0)
            {
                title = mid.midiName;
            }
            else
            {
                title =  mid.fileName;
            }
            document.getElementById("player_info_title").textContent = title;
            // use file name if no copyright detected
            if(mid.copyright.replaceAll("\n", "").length > 0)
            {
                document.getElementById("player_info_detail").textContent = mid.copyright + mid.fileName;
            }
            else
            {
                document.getElementById("player_info_detail").textContent = mid.fileName;
            }
            document.getElementById("player_info_time").textContent = formatTime(this.seq.duration).time;
        }, "player-ui-song-change");
    }

    togglevisibility()
    {
        this.mainDiv.classList.toggle("player_info_show");
    }
}