/**
 * pitch-detector.js
 * Pitch detection using Autocorrelation and Scale Quantization logic.
 */

class PitchDetector {
    /**
     * Autocorrelation pitch detection
     * @param {Float32Array} buffer 
     * @param {number} sampleRate 
     * @returns {number} Frequency in Hz, or -1 if no pitch detected
     */
    static detectPitch(buffer, sampleRate) {
        let size = buffer.length;
        let rms = 0;
        for (let i = 0; i < size; i++) {
            rms += buffer[i] * buffer[i];
        }
        rms = Math.sqrt(rms / size);
        
        // If silence or very quiet
        if (rms < 0.01) return -1;

        let r1 = 0, r2 = size - 1, thres = 0.2;
        for (let i = 0; i < size / 2; i++) {
            if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
        }
        for (let i = 1; i < size / 2; i++) {
            if (Math.abs(buffer[size - i]) < thres) { r2 = size - i; break; }
        }

        buffer = buffer.slice(r1, r2);
        size = buffer.length;

        let c = new Array(size).fill(0);
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size - i; j++) {
                c[i] = c[i] + buffer[j] * buffer[j + i];
            }
        }

        let d = 0; while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < size; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;
        
        // Parabolic interpolation
        let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    }

    static freqToMidi(freq) {
        if (freq <= 0) return -1;
        return Math.round(69 + 12 * Math.log2(freq / 440));
    }

    static midiToNoteName(midi) {
        if (midi < 0) return "Drum"; // Unpitched fallback
        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const note = notes[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        return `${note}${octave}`;
    }

    static analyzeSlice(audioBuffer, startOffset, endOffset) {
        // Limit pitch analysis to the first 4096 samples to prevent UI stalling on large slices
        const MAX_SAMPLES = 4096;
        const length = Math.min(endOffset - startOffset, MAX_SAMPLES);
        
        const data = audioBuffer.getChannelData(0).slice(startOffset, startOffset + length);
        const freq = this.detectPitch(data, audioBuffer.sampleRate);
        const midi = this.freqToMidi(freq);
        return {
            freq: freq,
            midi: midi, // -1 means unpitched
            noteName: this.midiToNoteName(midi)
        };
    }

    /**
     * Identify the global key and mode from a collection of slices
     */
    static detectGlobalKey(slices) {
        if (!slices || slices.length === 0) return { key: 'C', mode: 'ionian' };

        // 1. Build chroma histogram (distribution of energy across 12 semitones)
        const chroma = new Array(12).fill(0);
        let pitchedSlicesCount = 0;

        slices.forEach(slice => {
            if (slice.pitch && slice.pitch.midi >= 0) {
                const semitone = slice.pitch.midi % 12;
                chroma[semitone]++;
                pitchedSlicesCount++;
            }
        });

        if (pitchedSlicesCount === 0) return { key: 'C', mode: 'aeolian' };

        // Normalize chroma
        const maxVal = Math.max(...chroma);
        const normalizedChroma = chroma.map(v => v / maxVal);

        // 2. Define scale profiles
        // Krumhansl-Kessler or similar simplified templates
        const majorProfile = [1.0, 0.0, 0.4, 0.0, 0.8, 1.0, 0.0, 1.0, 0.0, 0.4, 0.0, 0.8];
        const minorProfile = [1.0, 0.0, 0.4, 0.8, 0.0, 1.0, 0.0, 1.0, 0.8, 0.0, 0.4, 0.0];

        let bestScore = -1;
        let bestKey = 0;
        let bestMode = 'ionian';

        const notes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

        // 3. Test all 12 keys for both Major and Minor
        for (let key = 0; key < 12; key++) {
            // Major
            let majorScore = 0;
            for (let i = 0; i < 12; i++) {
                majorScore += normalizedChroma[(key + i) % 12] * majorProfile[i];
            }
            if (majorScore > bestScore) {
                bestScore = majorScore;
                bestKey = key;
                bestMode = 'ionian';
            }

            // Minor
            let minorScore = 0;
            for (let i = 0; i < 12; i++) {
                minorScore += normalizedChroma[(key + i) % 12] * minorProfile[i];
            }
            if (minorScore > bestScore) {
                bestScore = minorScore;
                bestKey = key;
                bestMode = 'aeolian';
            }
        }

        return {
            key: notes[bestKey],
            mode: bestMode
        };
    }
}

class ScaleQuantizer {
    static NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    
    // Intervals for modes (half-steps from root)
    static MODES = {
        ionian:     [0, 2, 4, 5, 7, 9, 11], // Major
        dorian:     [0, 2, 3, 5, 7, 9, 10],
        phrygian:   [0, 1, 3, 5, 7, 8, 10],
        lydian:     [0, 2, 4, 6, 7, 9, 11],
        mixolydian: [0, 2, 4, 5, 7, 9, 10],
        aeolian:    [0, 2, 3, 5, 7, 8, 10], // Minor
        locrian:    [0, 1, 3, 5, 6, 8, 10]
    };

    static getValidMidiNotes(rootNoteName, modeName) {
        const rootIndex = this.NOTES.indexOf(rootNoteName);
        const intervals = this.MODES[modeName];
        let validNotes = new Set();
        
        // Generate valid MIDI notes across the entire 0-127 range
        for (let octave = -1; octave <= 9; octave++) {
            const baseMidi = (octave + 1) * 12 + rootIndex;
            intervals.forEach(interval => {
                const midi = baseMidi + interval;
                if (midi >= 0 && midi <= 127) {
                    validNotes.add(midi);
                }
            });
        }
        return Array.from(validNotes).sort((a, b) => a - b);
    }

    /**
     * Snap a given MIDI note to the nearest valid note in the selected scale.
     */
    static quantizeMidi(midiIn, rootNoteName, modeName) {
        if (midiIn < 0) return -1; // Unpitched
        const validNotes = this.getValidMidiNotes(rootNoteName, modeName);
        
        // Find nearest
        let nearest = validNotes[0];
        let minDiff = Math.abs(midiIn - nearest);
        
        for (let note of validNotes) {
            let diff = Math.abs(midiIn - note);
            if (diff < minDiff) {
                minDiff = diff;
                nearest = note;
            }
        }
        return nearest;
    }

    /**
     * Calculate playbackRate needed to pitch-shift from origMidi to targetMidi
     */
    static getPlaybackRate(origMidi, targetMidi) {
        if (origMidi < 0 || targetMidi < 0) return 1.0;
        const semitones = targetMidi - origMidi;
        return Math.pow(2, semitones / 12);
    }
}
