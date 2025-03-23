import { SpessaSynthInfo } from "./loggin.js";
import { consoleColors } from "./other.js";
import { DEFAULT_PERCUSSION } from "../synthetizer/synth_constants.js";

/**
 * @param bankNr {number}
 * @returns {boolean}
 */
export function isXGDrums(bankNr)
{
    return bankNr === 120 || bankNr === 126 || bankNr === 127;
}

/**
 * Bank select hacks abstracted here
 * @param bankBefore {number} the current bank number
 * @param bank {number} the cc change bank number
 * @param system {SynthSystem} MIDI system
 * @param isLSB {boolean} is bank LSB?
 * @param isDrums {boolean} is drum channel?
 * @param channelNumber {number} channel number
 * @returns {{
 *     newBank: number,
 *     drumsStatus: 0|1|2
 * }} 0 - unchanged, 1 - OFF, 2 - ON
 */
export function parseBankSelect(bankBefore, bank, system, isLSB, isDrums, channelNumber)
{
    // 64 means SFX in MSB, so it is allowed
    let out = bankBefore;
    let drumsStatus = 0;
    const isValidMSB = b => isXGDrums(b) || b === 64;
    if (isLSB)
    {
        if (system === "xg")
        {
            if (!isValidMSB(bank))
            {
                out = bank;
            }
        }
        else if (system === "gm2")
        {
            out = bank;
        }
    }
    else
    {
        let canSetBankSelect = true;
        switch (system)
        {
            case "gm":
                // gm ignores bank select
                SpessaSynthInfo(
                    `%cIgnoring the Bank Select (${bank}), as the synth is in GM mode.`,
                    consoleColors.info
                );
                canSetBankSelect = false;
                break;
            
            case "xg":
                canSetBankSelect = isValidMSB(bank);
                // for xg, if msb is 120, 126 or 127, then it's drums
                if (isXGDrums(bank))
                {
                    drumsStatus = 2;
                }
                else
                {
                    // drums shall not be disabled on channel 9
                    if (channelNumber % 16 !== DEFAULT_PERCUSSION)
                    {
                        drumsStatus = 1;
                    }
                }
                break;
            
            case "gm2":
                if (bank === 120)
                {
                    drumsStatus = 2;
                }
                else
                {
                    if (channelNumber % 16 !== DEFAULT_PERCUSSION)
                    {
                        drumsStatus = 1;
                    }
                }
        }
        
        if (isDrums)
        {
            // 128 for percussion channel
            bank = 128;
        }
        if (bank === 128 && !isDrums)
        {
            // if a channel is not for percussion, default to bank current
            bank = bankBefore;
        }
        if (canSetBankSelect)
        {
            out = bank;
        }
    }
    return {
        newBank: out,
        drumsStatus: drumsStatus
    };
}


/**
 * @param msb {number}
 * @param lsb {number}
 */
export function chooseBank(msb, lsb)
{
    if (lsb > 0)
    {
        if (!isXGDrums(msb) && msb !== 64)
        {
            return lsb;
        }
    }
    return msb;
}