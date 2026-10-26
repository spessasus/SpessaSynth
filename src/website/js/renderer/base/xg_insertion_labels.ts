import {
    type XGBlockData,
    xgInsertionData,
    xgVariationData
} from "../../synthesizer_ui/methods/xg_effect_params.ts";

/**
 * The state of an XG effect block that can be routed to a channel.
 * Used by the renderer.
 */
export interface XGRoutedBlock {
    /**
     * The channel routed through the block (127 for none).
     */
    part: number;
    /**
     * The effect type.
     */
    type: number;
}

/**
 * Creates the default state of the XG insertion blocks and the variation block.
 */
export function createXGRouting() {
    return {
        insertions: Array.from(
            { length: xgInsertionData.blockCount },
            (): XGRoutedBlock => ({
                part: 127,
                type: xgInsertionData.defaultType
            })
        ),
        variation: {
            part: 127,
            type: xgVariationData.defaultType,
            insertionMode: true
        }
    };
}

function getTypeName(data: XGBlockData, type: number) {
    // Exact, then without the LSB, then the fallback
    return (
        data.types.find((t) => t.type === type) ??
        data.types.find((t) => t.type === (type & 0xff_00)) ??
        data.types.find((t) => t.type === data.fallbackType)
    )?.name;
}

/**
 * Builds the per-channel XG insertion labels (the effect names joined by "+").
 * @returns An array of 16 labels, empty for channels without insertion.
 */
export function getXGInsertionLabels(
    routing: ReturnType<typeof createXGRouting>
) {
    const labels = Array.from({ length: 16 }, () => new Array<string>());
    for (const block of routing.insertions) {
        labels[block.part]?.push(
            getTypeName(xgInsertionData, block.type) ?? "Insertion"
        );
    }
    const variation = routing.variation;
    if (variation.insertionMode) {
        labels[variation.part]?.push(
            getTypeName(xgVariationData, variation.type) ?? "Variation"
        );
    }
    return labels.map((names) => names.join("+"));
}
