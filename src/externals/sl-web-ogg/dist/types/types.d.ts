export type P32 = number | null;
export type P = number | null;
export interface EncodeTag {
    name: string;
    value: string;
}
export interface EncodeOptions {
    quality: number;
    tags: EncodeTag[];
}
