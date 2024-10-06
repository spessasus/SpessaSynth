declare type DecodedData =
    {
        data: Float32Array[],
        error: string | null,
        sampleRate: number,
        eof: boolean
    }

declare const stbvorbis: {
    decode(buffer: ArrayBuffer): DecodedData
    isInitialized: Promise<boolean>
}