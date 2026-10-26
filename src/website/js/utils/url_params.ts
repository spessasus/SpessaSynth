export class URLParamUtils {
    public static readonly SAMPLE_RATE = "samplerate";
    public static readonly DEFAULT_SAMPLE_RATE = 44_100;
    public static readonly BACKEND = "backend";
    public static readonly CONVOLVER = "convolver";
    private static readonly params = new URLSearchParams(
        window.location.search
    );

    public static getParam(name: string) {
        return this.params.get(name);
    }

    public static setParam(name: string, value: string) {
        const url = new URL(window.location.href);
        url.searchParams.set(name, value);
        window.location.replace(url);
    }

    public static getSampleRate() {
        return (
            Number.parseInt(this.getParam(this.SAMPLE_RATE) ?? "0") ||
            this.DEFAULT_SAMPLE_RATE
        );
    }
}
