import zlib from "node:zlib";

export interface TarEntry {
    name: string;
    data: Uint8Array;
    /**
     * Unix permissions, for example 0o755 for an executable.
     */
    mode: number;
}

const BLOCK = 512;

function writeString(
    header: Uint8Array,
    offset: number,
    length: number,
    value: string
) {
    const bytes = new TextEncoder().encode(value);
    if (bytes.length > length) {
        throw new Error(`Tar field too long: ${value}`);
    }
    header.set(bytes, offset);
}

// Numeric fields are zero padded octal with a trailing NUL
function writeOctal(
    header: Uint8Array,
    offset: number,
    length: number,
    value: number
) {
    writeString(
        header,
        offset,
        length,
        value.toString(8).padStart(length - 1, "0")
    );
}

export function createTarGz(entries: TarEntry[], mtime: Date) {
    const parts = new Array<Uint8Array>();
    for (const entry of entries) {
        const header = new Uint8Array(BLOCK);
        writeString(header, 0, 100, entry.name);
        writeOctal(header, 100, 8, entry.mode);
        // Uid and gid
        writeOctal(header, 108, 8, 0);
        writeOctal(header, 116, 8, 0);
        writeOctal(header, 124, 12, entry.data.length);
        writeOctal(header, 136, 12, Math.floor(mtime.getTime() / 1000));
        // The checksum is computed with its own field set to spaces
        header.fill(0x20, 148, 156);
        // Regular file
        header[156] = 0x30;
        writeString(header, 257, 6, "ustar\0");
        writeString(header, 263, 2, "00");
        let checksum = 0;
        for (const byte of header) {
            checksum += byte;
        }
        writeString(
            header,
            148,
            8,
            checksum.toString(8).padStart(6, "0") + "\0 "
        );

        parts.push(header, entry.data);
        const padding = (BLOCK - (entry.data.length % BLOCK)) % BLOCK;
        parts.push(new Uint8Array(padding));
    }
    // Two empty blocks end the archive
    parts.push(new Uint8Array(BLOCK * 2));
    return zlib.gzipSync(Buffer.concat(parts), { level: 9 });
}
