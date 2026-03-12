import type { Synthesizer } from "../../utils/synthesizer.ts";

export function sendAddress(
    s: Synthesizer,
    a1: number,
    a2: number,
    a3: number,
    data: number[],
    offset = 0
) {
    // Calculate checksum
    // https://cdn.roland.com/assets/media/pdf/F-20_MIDI_Imple_e01_W.pdf section 4
    const sum = a1 + a2 + a3 + data.reduce((sum, cur) => sum + cur, 0);
    const checksum = (128 - (sum % 128)) & 0x7f;
    s.systemExclusive(
        [
            0x41, // Roland
            0x10, // Device ID (defaults to 16 on roland)
            0x42, // GS
            0x12, // Command ID (DT1) (whatever that means...)
            a1,
            a2,
            a3,
            ...data,
            checksum,
            0xf7 // End of exclusive
        ],
        offset
    );
}
