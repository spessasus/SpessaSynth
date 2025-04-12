/**
 * @enum {number}
 */
export const WorkletSoundfontManagerMessageType = {
    reloadSoundFont: 0,      // buffer<ArrayBuffer>
    addNewSoundFont: 2,      // [buffer<ArrayBuffer>, id<string>, bankOffset<number>]
    deleteSoundFont: 3,      // id<string>
    rearrangeSoundFonts: 4   // newOrder<string[]> // where string is the id
};