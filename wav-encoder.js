/**
 * wav-encoder.js
 * Utility to encode an AudioBuffer or specific slice into a WAV file Blob.
 */

class WavEncoder {
    /**
     * Encodes a portion of an AudioBuffer to a WAV Blob.
     * @param {AudioBuffer} audioBuffer 
     * @param {number} startTime in seconds
     * @param {number} endTime in seconds
     * @returns {Blob} The WAV file as a Blob
     */
    static encode(audioBuffer, startTime = 0, endTime = audioBuffer.duration) {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const startOffset = Math.floor(startTime * sampleRate);
        const endOffset = Math.floor(endTime * sampleRate);
        const frameCount = endOffset - startOffset;

        const channels = [];
        for (let i = 0; i < numChannels; i++) {
            channels.push(audioBuffer.getChannelData(i).subarray(startOffset, endOffset));
        }

        const interleaved = this._interleave(channels);
        const dataView = this._writeHeaders(interleaved, numChannels, sampleRate);
        
        return new Blob([dataView], { type: 'audio/wav' });
    }

    static _interleave(channels) {
        const numChannels = channels.length;
        const length = channels[0].length;
        const result = new Float32Array(length * numChannels);

        let offset = 0;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numChannels; channel++) {
                result[offset++] = channels[channel][i];
            }
        }
        return result;
    }

    static _writeHeaders(samples, numChannels, sampleRate) {
        const buffer = new ArrayBuffer(44 + samples.length * 2);
        const view = new DataView(buffer);

        /* RIFF identifier */
        this._writeString(view, 0, 'RIFF');
        /* file length */
        view.setUint32(4, 36 + samples.length * 2, true);
        /* RIFF type */
        this._writeString(view, 8, 'WAVE');
        /* format chunk identifier */
        this._writeString(view, 12, 'fmt ');
        /* format chunk length */
        view.setUint32(16, 16, true);
        /* sample format (raw) */
        view.setUint16(20, 1, true);
        /* channel count */
        view.setUint16(22, numChannels, true);
        /* sample rate */
        view.setUint32(24, sampleRate, true);
        /* byte rate (sample rate * block align) */
        view.setUint32(28, sampleRate * numChannels * 2, true);
        /* block align (channel count * bytes per sample) */
        view.setUint16(32, numChannels * 2, true);
        /* bits per sample */
        view.setUint16(34, 16, true);
        /* data chunk identifier */
        this._writeString(view, 36, 'data');
        /* data chunk length */
        view.setUint32(40, samples.length * 2, true);

        // Write the PCM samples
        this._floatTo16BitPCM(view, 44, samples);

        return view;
    }

    static _floatTo16BitPCM(output, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            let s = Math.max(-1, Math.min(1, input[i]));
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    static _writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
}
