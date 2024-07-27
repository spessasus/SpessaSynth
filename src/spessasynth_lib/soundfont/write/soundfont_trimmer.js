import { consoleColors } from '../../utils/other.js'
import {
    SpessaSynthGroup,
    SpessaSynthGroupCollapsed,
    SpessaSynthGroupEnd,
    SpessaSynthInfo,
} from '../../utils/loggin.js'
import { getUsedProgramsAndKeys } from '../../midi_parser/used_keys_loaded.js'

/**
 * @param soundfont {SoundFont2}
 * @param mid {MIDI}
 * @returns {Uint8Array}
 */
export function trimSoundfont(soundfont, mid)
{
    /**
     * @param instrument {Instrument}
     * @param combos {{key: number, velocity: number}[]}
     * @returns {number}
     */
    function trimInstrumentZones(instrument, combos)
    {
        let trimmedIZones = 0;
        for (let iZoneIndex = 0; iZoneIndex < instrument.instrumentZones.length; iZoneIndex++)
        {
            const iZone = instrument.instrumentZones[iZoneIndex];
            if(iZone.isGlobal)
            {
                continue;
            }
            const iKeyRange = iZone.keyRange;
            const iVelRange = iZone.velRange;
            let isIZoneUsed = false;
            for(const iCombo of combos)
            {
                if(
                    (iCombo.key >= iKeyRange.min && iCombo.key <= iKeyRange.max) &&
                    (iCombo.velocity >= iVelRange.min && iCombo.velocity <= iVelRange.max)
                )
                {
                    isIZoneUsed = true;
                    break;
                }
            }
            if(!isIZoneUsed)
            {
                SpessaSynthInfo(`%c${iZone.sample.sampleName} %cremoved from %c${instrument.instrumentName}%c. Use count: %c${iZone.useCount - 1}`,
                    consoleColors.recognized,
                    consoleColors.info,
                    consoleColors.recognized,
                    consoleColors.info,
                    consoleColors.recognized);
                if(instrument.safeDeleteZone(iZoneIndex))
                {
                    trimmedIZones++;
                    iZoneIndex--;
                    SpessaSynthInfo(`%c${iZone.sample.sampleName} %cdeleted`,
                        consoleColors.recognized,
                        consoleColors.info)
                }
                if(iZone.sample.useCount < 1)
                {
                    soundfont.deleteSample(iZone.sample);
                }
            }

        }
        return trimmedIZones;
    }

    SpessaSynthGroup("%cTrimming soundfont...",
        consoleColors.info);
    const usedProgramsAndKeys = getUsedProgramsAndKeys(mid, soundfont);

    SpessaSynthGroupCollapsed("%cModifying soundfont...",
        consoleColors.info);
    SpessaSynthInfo("Detected keys for midi:", usedProgramsAndKeys);
    // modify the soundfont to only include programs and samples that are used
    for (let presetIndex = 0; presetIndex < soundfont.presets.length; presetIndex++)
    {
        const p = soundfont.presets[presetIndex];
        const string = p.bank + ":" + p.program;
        const used = usedProgramsAndKeys[string];
        if(used === undefined)
        {
            SpessaSynthInfo(`%cDeleting preset %c${p.presetName}%c and its zones`,
                consoleColors.info,
                consoleColors.recognized,
                consoleColors.info
            );
            soundfont.deletePreset(p);
            presetIndex--;
        }
        else
        {
            const combos = [...used].map(s => {
                const split = s.split("-");
                return {
                    key: parseInt(split[0]),
                    velocity: parseInt(split[1])
                }
            });
            SpessaSynthGroupCollapsed(`%cTrimming %c${p.presetName}`,
                consoleColors.info,
                consoleColors.recognized);
            SpessaSynthInfo(`Keys for ${p.presetName}:`, combos)
            let trimmedZones = 0;
            // clean the preset to only use zones that are used
            for (let zoneIndex = 0; zoneIndex < p.presetZones.length; zoneIndex++)
            {
                const zone = p.presetZones[zoneIndex];
                if(zone.isGlobal)
                {
                    continue;
                }
                const keyRange = zone.keyRange;
                const velRange = zone.velRange;
                // check if any of the combos matches the zone
                let isZoneUsed = false;
                for(const combo of combos)
                {
                    if(
                        (combo.key >= keyRange.min && combo.key <= keyRange.max) &&
                        (combo.velocity >= velRange.min && combo.velocity <= velRange.max)
                    )
                    {
                        // zone is used, trim the instrument zones
                        isZoneUsed = true;
                        const trimmedIZones = trimInstrumentZones(zone.instrument, combos);
                        SpessaSynthInfo(`%cTrimmed off %c${trimmedIZones}%c zones from %c${zone.instrument.instrumentName}`,
                            consoleColors.info,
                            consoleColors.recognized,
                            consoleColors.info,
                            consoleColors.recognized
                        );
                        break;
                    }
                }
                if(!isZoneUsed)
                {
                    trimmedZones++;
                    p.deleteZone(zoneIndex);
                    if(zone.instrument.useCount < 1)
                    {
                        soundfont.deleteInstrument(zone.instrument);
                    }
                    zoneIndex--;
                }
            }
            SpessaSynthInfo(`%cTrimmed off %c${trimmedZones}%c zones from %c${p.presetName}`,
                consoleColors.info,
                consoleColors.recognized,
                consoleColors.info,
                consoleColors.recognized
            );
            SpessaSynthGroupEnd();
        }
    }
    soundfont.removeUnusedElements();

    soundfont.soundFontInfo['ICMT'] = `NOTE: This soundfont was trimmed by SpessaSynth to only contain presets used in "${mid.midiName}"\n\n`
        + soundfont.soundFontInfo['ICMT'];

    SpessaSynthInfo("%cSoundfont modified!",
        consoleColors.recognized)
    SpessaSynthGroupEnd();
    SpessaSynthGroupEnd();
}