import {
    MAX_NOTES,
    MIN_NOTE_HEIGHT_PX,
    NOTE_MARGIN,
    type NoteToRender,
    PRESSED_EFFECT_TIME,
    Renderer,
    STROKE_THICKNESS
} from "./renderer.js";

export function computeNotePositions(
    this: Renderer,
    renderImmediately = false
): NoteToRender[] {
    if (!this.noteTimes) {
        throw new Error("No note times!");
    }
    // Math
    this.notesOnScreen = 0;

    const canvasWidth = this.sideways ? this.canvas.height : this.canvas.width;
    const canvasHeight = this.sideways ? this.canvas.width : this.canvas.height;
    const keysAmount = this.keyRange.max - this.keyRange.min;
    const keyStep = canvasWidth / (keysAmount + 1); // Add one because it works
    const noteWidth = keyStep - NOTE_MARGIN * 2;

    const fallingTime = this.noteFallingTimeMs / 1000;
    const afterTime = this.noteAfterTriggerTimeMs / 1000;

    const currentSeqTime = this.seq.currentHighResolutionTime - this.timeOffset;
    const currentStartTime = currentSeqTime - afterTime;
    const fallingTimeSeconds = fallingTime + afterTime;
    const currentEndTime = currentStartTime + fallingTimeSeconds;
    const minNoteHeight = MIN_NOTE_HEIGHT_PX / fallingTimeSeconds;
    /**
     * Compute note pitch bend visual shift (for each channel)
     */
    const pitchBendXShift: number[] = [];
    this.synth.channelProperties.forEach((channel) => {
        // Pitch range * (bend - 8192) / 8192)) * key width
        if (this.showVisualPitch) {
            const bend = channel.pitchWheel - 8192; // -8192 to 8192
            const pixelShift =
                channel.pitchWheelRange * (bend / 8192) * keyStep;
            pitchBendXShift.push(pixelShift);
        } else {
            pitchBendXShift.push(0);
        }
    });
    const transposeNoteShifts = this.synth.channelProperties.map((c) =>
        this.showVisualPitch ? c.transposition : 0
    );
    const notesToDraw = new Array<NoteToRender>();
    this.noteTimes.forEach((channel, channelNumder) => {
        if (
            channel.renderStartIndex >= channel.notes.length ||
            !this.renderChannels[channelNumder]
        ) {
            return;
        }

        let noteIndex = channel.renderStartIndex;
        const notes = channel.notes;
        let note = notes[noteIndex];

        let firstNoteIndex = -1;
        // While the note start is in range
        while (note.start <= currentEndTime) {
            noteIndex++;
            // Cap notes
            if (this.notesOnScreen > MAX_NOTES) {
                break;
            }

            const noteSum = note.start + note.length;

            // If the note is out of range, append the render start index
            if (noteSum > currentStartTime && note.length > 0) {
                const noteHeight =
                    (note.length / fallingTimeSeconds) * canvasHeight -
                    NOTE_MARGIN * 2;

                // Height less than that can be omitted (come on)
                if (this.notesOnScreen < 1000 || noteHeight > minNoteHeight) {
                    if (firstNoteIndex === -1) {
                        firstNoteIndex = noteIndex - 1;
                    }
                    const position =
                        ((note.start - currentStartTime) / fallingTimeSeconds) *
                        canvasHeight;
                    let noteY;
                    if (this._notesFall) {
                        noteY =
                            canvasHeight - noteHeight - position + NOTE_MARGIN;
                    } else {
                        noteY = position + NOTE_MARGIN;
                    }

                    // If the note out of range, skip
                    if (
                        note.midiNote < this.keyRange.min ||
                        note.midiNote > this.keyRange.max
                    ) {
                        if (noteIndex >= notes.length) {
                            break;
                        }
                        note = notes[noteIndex];
                        continue;
                    }
                    const correctedNote =
                        note.midiNote -
                        this.keyRange.min +
                        transposeNoteShifts[channelNumder];
                    const noteX = keyStep * correctedNote + NOTE_MARGIN;

                    let finalX, finalY, finalWidth, finalHeight;
                    if (this.sideways) {
                        // Add noinspection since we want to inverse positions
                        // noinspection JSSuspiciousNameCombination
                        finalX = noteY;
                        // noinspection JSSuspiciousNameCombination
                        finalY = noteX;
                        // noinspection JSSuspiciousNameCombination
                        finalHeight = noteWidth;
                        // noinspection JSSuspiciousNameCombination
                        finalWidth = noteHeight;
                    } else {
                        // Sideways: swap x and y coords
                        finalY = noteY;
                        finalX = noteX;
                        finalWidth = noteWidth;
                        finalHeight = noteHeight;
                    }

                    this.notesOnScreen++;
                    // Draw the notes
                    if (renderImmediately) {
                        // Draw the notes right away, we don't care about the order
                        this.drawingContext.fillStyle =
                            this.plainColors[channelNumder];
                        this.drawingContext.fillRect(
                            finalX + STROKE_THICKNESS + NOTE_MARGIN,
                            finalY + STROKE_THICKNESS,
                            finalWidth - STROKE_THICKNESS * 2,
                            finalHeight - STROKE_THICKNESS * 2
                        );
                    } else {
                        let color;
                        // Save the notes to draw
                        // Determine if notes are active or not (i.e., currently playing)
                        // Not active notes
                        if (
                            note.start > currentSeqTime ||
                            noteSum < currentSeqTime
                        ) {
                            // This note is not pressed
                            if (this.sideways) {
                                if (this.drawActiveNotes) {
                                    color =
                                        this.sidewaysDarkerColors[
                                            channelNumder
                                        ];
                                } else {
                                    color =
                                        this.sidewaysChannelColors[
                                            channelNumder
                                        ];
                                }
                            } else if (this.drawActiveNotes) {
                                color = this.darkerColors[channelNumder];
                            } else {
                                color = this.channelColors[channelNumder];
                            }
                            notesToDraw.push({
                                xPos: finalX,
                                yPos: finalY,
                                height: finalHeight,
                                width: finalWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: 0, // Not pressed
                                velocity: note.velocity, // VELOCITY IS MAPPED FROM 0 TO 1!
                                // If we ignore drawing active notes, draw those with regular colors
                                color: color
                            });
                        } else {
                            // This note is pressed
                            if (this.sideways) {
                                if (this.showVisualPitch) {
                                    finalY += pitchBendXShift[channelNumder];
                                }
                                color =
                                    this.sidewaysChannelColors[channelNumder];
                            } else {
                                if (this.showVisualPitch) {
                                    finalX += pitchBendXShift[channelNumder];
                                }
                                color = this.channelColors[channelNumder];
                            }
                            // Determine for how long the note has been pressed
                            let noteProgress;
                            if (this.drawActiveNotes) {
                                noteProgress =
                                    1 +
                                    (note.start - currentSeqTime) /
                                        (note.length * PRESSED_EFFECT_TIME);
                            } else {
                                noteProgress = 0;
                            }
                            // Active notes
                            notesToDraw.push({
                                xPos: finalX,
                                yPos: finalY,
                                height: finalHeight,
                                width: finalWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: noteProgress,
                                velocity: note.velocity,
                                color: color
                            });
                        }
                    }
                }
            }

            if (noteIndex >= notes.length) {
                break;
            }

            note = notes[noteIndex];
        }
        if (firstNoteIndex > -1) {
            channel.renderStartIndex = firstNoteIndex;
        }
    });
    // Sort the notes from shortest to longest (draw order)
    notesToDraw.sort((n1, n2) => n2.height - n1.height);
    return notesToDraw;
}
