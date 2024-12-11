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
 */

const DEFAULT_RES_X = 384;
const DEFAULT_RES_Y = 288;

export class SubContent
{
    /**
     * For example "Dialogue"
     * @type {string}
     */
    type;
    /**
     * for example: "0,0:00:01.00,0:00:03.00,Default,,0,0,0,,Normal text."
     * @type {string}
     */
    data;
}

export class SubSection
{
    /**
     * The section type, like [Events]
     * @type {string}
     */
    type;
    
    /**
     * The section contents
     * @type {SubContent[]}
     */
    contents = [];
    
    /**
     * @param type {string}
     * @param contents {SubContent[]}
     */
    constructor(type, contents)
    {
        this.type = type;
        this.contents = contents;
    }
    
    /**
     * @param type {string}
     * @param fallback {string}
     * @return {string}
     */
    getContent(type, fallback = "")
    {
        return this.contents.find(c => c.type === type)?.data || fallback;
    }
}

export class AssManager
{
    /**
     * Creates a new subtitle manager
     * @param seq {Sequencer}
     */
    constructor(seq)
    {
        this.seq = seq;
        /**
         * @type {boolean}
         */
        this.visible = false;
        
        /**
         * @type {SubSection[]}
         */
        this.subData = [];
        
        this.resolutionX = DEFAULT_RES_X;
        this.resolutionY = DEFAULT_RES_Y;
        this.kerning = true;
    }
    
    /**
     * @param visible {boolean}
     */
    setVisibility(visible)
    {
        this.visible = visible;
    }
    
    /**
     * @param type {string}
     * @param errorOut {boolean}
     * @private
     * @returns {SubSection|undefined}
     */
    _getSection(type, errorOut = false)
    {
        const t = type.toLowerCase();
        const result = this.subData.find(s => s.type.toLowerCase() === t);
        if (!result && errorOut)
        {
            throw new Error(`Section ${type} not found!`);
        }
        return result;
    }
    
    /**
     * Loads Advanced SubStation (.ass) subtitles
     * @param assString {string}
     */
    loadASSSubtitles(assString)
    {
        // time to parse!!
        const lines = assString.replaceAll("\r\n", "\n").split("\n");
        let isSection = false;
        let sectionName = "";
        /**
         * @type {SubContent[]}
         */
        let sectionContents = [];
        for (const line of lines)
        {
            if (line.startsWith("["))
            {
                sectionName = line;
                isSection = true;
            }
            else if (line.length === 0 && isSection)
            {
                isSection = false;
                this.subData.push(new SubSection(sectionName, sectionContents));
                sectionContents = [];
            }
            else if (!line.startsWith("!") && !line.startsWith(";"))
            {
                // split only the first colon
                const data = line.split(/: (.*)/s);
                const content = new SubContent();
                content.type = data[0];
                content.data = data[1];
                sectionContents.push(content);
            }
        }
        
        // find the resolution
        const scriptInfo = this._getSection("[Script Info]", true);
        
        this.resolutionX = parseInt(scriptInfo.getContent("PlayResX", DEFAULT_RES_X.toString()));
        this.resolutionY = parseInt(scriptInfo.getContent("PlayResY", DEFAULT_RES_Y.toString()));
        this.kerning = scriptInfo.getContent("Kerning", "yes") === "yes";
    }
    
}