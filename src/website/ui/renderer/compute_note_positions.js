import { MAX_NOTES, MIN_NOTE_HEIGHT_PX, NOTE_MARGIN, PRESSED_EFFECT_TIME, STROKE_THICKNESS } from './renderer.js'

/**
 * @param renderImmediately {boolean}
 * @returns {NoteToRender[]}
 * @this {Renderer}
 */
export function computeNotePositions(renderImmediately=false)
{
    // math
    this.notesOnScreen = 0;

    const keysAmount = this.keyRange.max - this.keyRange.min;
    const keyStep = this.canvas.width / (keysAmount + 1); // add one because it works
    const noteWidth = keyStep - (NOTE_MARGIN * 2);

    const fallingTime = this.noteFallingTimeMs / 1000
    const afterTime = this.noteAfterTriggerTimeMs / 1000;

    const currentSeqTime = this.seq.currentHighResolutionTime;
    const currentStartTime = currentSeqTime - afterTime;
    const fallingTimeSeconds = fallingTime + afterTime;
    const currentEndTime = currentStartTime + fallingTimeSeconds;
    const minNoteHeight = MIN_NOTE_HEIGHT_PX / fallingTimeSeconds;
    /**
     * compute note pitch bend visual shift (for each channel)
     * @type {number[]}
     */
    const pitchBendXShift = [];
    this.synth.channelProperties.forEach(channel => {
        // pitch range * (bend - 8192) / 8192)) * key width
        if(this.showVisualPitch) {
            pitchBendXShift.push((channel.pitchBendRangeSemitones * ((channel.pitchBend - 8192 + this.visualPitchBendOffset) / 8192)) * keyStep);
        }
        else
        {
            pitchBendXShift.push(0);
        }
    })
    /**
     * @type {NoteToRender[]}
     */
    const notesToDraw = [];
    this.noteTimes.forEach((channel, channelNumder) => {

        if(channel.renderStartIndex >= channel.notes.length || !this.renderChannels[channelNumder]) return;

        let noteIndex = channel.renderStartIndex;
        const notes = channel.notes;
        let note = notes[noteIndex];

        let firstNoteIndex = -1;

        // while the note start is in range
        while(note.start <= currentEndTime){
            noteIndex++;
            // cap notes
            if(this.notesOnScreen > MAX_NOTES)
            {
                break;
            }

            const noteSum = note.start + note.length

            // if the note is out of range, append the render start index
            if(noteSum > currentStartTime && note.length > 0) {
                const height = ((note.length / fallingTimeSeconds) * this.canvas.height) - (NOTE_MARGIN * 2);

                // height less than that can be ommitted (come on)
                if(height > minNoteHeight || this.notesOnScreen < 1000) {
                    if(firstNoteIndex === -1)
                    {
                        firstNoteIndex = noteIndex - 1;
                    }
                    const yPos = this.canvas.height - height
                        - (((note.start - currentStartTime) / fallingTimeSeconds) * this.canvas.height) + NOTE_MARGIN;

                    // if the note out of range, skip
                    if(note.midiNote < this.keyRange.min || note.midiNote > this.keyRange.max)
                    {
                        if(noteIndex >= notes.length)
                        {
                            break;
                        }
                        note = notes[noteIndex];
                        continue;
                    }
                    const correctedNote = note.midiNote - this.keyRange.min;
                    const xPos = keyStep * correctedNote + NOTE_MARGIN;

                    if(renderImmediately)
                    {
                        // draw the notes right away, we don't care about the order
                        this.drawingContext.fillStyle = this.plainColors[channelNumder];
                        this.drawingContext.fillRect(xPos + STROKE_THICKNESS + NOTE_MARGIN,
                            yPos + STROKE_THICKNESS,
                            noteWidth - (STROKE_THICKNESS * 2),
                            height - (STROKE_THICKNESS * 2));
                    }
                    else {
                        // save the notes to draw
                        // determine if notes are active or not (i.e. currently playing)
                        // not active notes
                        if ((note.start > currentSeqTime || noteSum < currentSeqTime)) {
                            notesToDraw.push({
                                xPos: xPos,
                                yPos: yPos,
                                height: height,
                                width: noteWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: 0, // not pressed
                                velocity: note.velocity, // VELOCITY IS MAPPED FROM 0 TO 1!!!!
                                // if we ignore drawing active notes, draw those with regular colors
                                color: this.drawActiveNotes ? this.darkerColors[channelNumder] : this.channelColors[channelNumder],
                            })
                        } else {
                            // determine for how long the note has been pressed
                            let noteProgress;
                            if(this.drawActiveNotes)
                            {
                                noteProgress = 1 + (note.start - currentSeqTime) / (note.length * PRESSED_EFFECT_TIME);
                            }
                            else
                            {
                                noteProgress = 0;
                            }
                            // active notes
                            notesToDraw.push({
                                xPos: xPos + pitchBendXShift[channelNumder], // add pitch bend shift only to active notes
                                yPos: yPos,
                                height: height,
                                width: noteWidth,
                                stroke: STROKE_THICKNESS,
                                pressedProgress: noteProgress,
                                velocity: note.velocity,
                                color: this.channelColors[channelNumder]
                            })
                        }
                    }
                    this.notesOnScreen++;
                }
            }

            if(noteIndex >= notes.length)
            {
                break;
            }

            note = notes[noteIndex];
        }
        if(firstNoteIndex > -1) channel.renderStartIndex = firstNoteIndex;
    });
    // sort the notes from shortest to longest (draw order)
    notesToDraw.sort((n1, n2) => n2.height - n1.height);
    return notesToDraw;
}