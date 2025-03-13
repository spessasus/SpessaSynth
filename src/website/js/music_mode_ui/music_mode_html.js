import { getDoubleNoteSvg } from "../utils/icons.js";

export const musicModeInnerHTML = `
        <div id='player_info_background_image'></div>
        <div class='player_info_wrapper'>
            <div class='player_info_note_icon'>
                ${getDoubleNoteSvg("100%")}
                <img src='' alt='' style='display: none;'>
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
                    <b translate-path-title='locale.exportAudio.formats.metadata.subject'></b><i id='player_info_subject'></i>
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