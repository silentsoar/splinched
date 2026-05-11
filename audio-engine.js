/**
 * audio-engine.js
 * Handles Web Audio API processing, chopping algorithms, and the step sequencer scheduler.
 */

class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.buffer = null; // AudioBuffer
        this.slices = []; // Array of { id, start, end, duration, pitch: {freq, midi, noteName} }
        
        // Output routing
        this.globalGain = this.ctx.createGain();
        this.globalGain.connect(this.ctx.destination);
        
        // Playback state
        this.globalChoke = false;
        this.activeSources = new Set();
        
        // Sequencer state
        this.seqPattern = null;
        this.seqBpm = 120;
        this.seqDensity = 0.5;
        this.seqSyncopation = 0.3;
        this.seqNoteRepeat = 0.3;
        this.seqMicroTiming = 0.0;
        this.seqProbability = 1.0;
        this.seqSwing = 0.0;
        this.kickEnabled = true;
        this.kickLevel = 0.3;
        this.seqIsPlaying = false;
        this.seqNextNoteTime = 0.0;
        this.seqCurrentStep = 0;
        this.seqTimerID = null;
        this.seqLookahead = 25.0; // ms
        this.seqScheduleAheadTime = 0.1; // s

        this.onStepPlay = null; // Callback for UI visual sync

        // Musical config
        this.musicalKey = "C";
        this.musicalMode = "ionian";

        // Global ADSR
        this.adsr = { attack: 0.02, decay: 0.15, sustain: 0.0, release: 0.08 };
        
        this.allSlices = {};
        this.activeAlgo = 'transient';
        this.padMapping = Array.from({length: 16}, (_, i) => i);
        this.toneEnabled = false;
        this.chordsEnabled = false;
        this.sampleEnabled = true;
        this._cachedMaskedPattern = null;
        this._lastMaskParams = "";

        this.fxEnabled = true;
        this.smartCompEnabled = false;
        this._setupEffects();
    }

    _setupEffects() {
        // 1. EQ Nodes
        this.eqLow = this.ctx.createBiquadFilter();
        this.eqLow.type = 'lowshelf';
        this.eqLow.frequency.value = 320;

        this.eqMid = this.ctx.createBiquadFilter();
        this.eqMid.type = 'peaking';
        this.eqMid.frequency.value = 1000;
        this.eqMid.Q.value = 1;

        this.eqHigh = this.ctx.createBiquadFilter();
        this.eqHigh.type = 'highshelf';
        this.eqHigh.frequency.value = 3200;

        // 2. Distortion
        this.distortion = this.ctx.createWaveShaper();
        this.distortion.curve = this._makeDistortionCurve(0);
        this.distortion.oversample = '4x';

        // 3. Delay
        this.delay = this.ctx.createDelay(1.0);
        this.delay.delayTime.value = 0.25;
        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.3;
        this.delayGain = this.ctx.createGain();
        this.delayGain.gain.value = 0;

        // 4. Reverb
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._generateReverbImpulse(1.5, 2.0);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.3;

        // 5. Compressor
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = 0; 
        this.compressor.ratio.value = 12;
        this.compressor.knee.value = 30;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.25;

        // 6. Routing
        // Source -> EQ Low -> EQ Mid -> EQ High -> Distortion -> Compressor -> Output
        this.eqLow.connect(this.eqMid);
        this.eqMid.connect(this.eqHigh);
        this.eqHigh.connect(this.distortion);
        this.distortion.connect(this.compressor);
        this.compressor.connect(this.globalGain);

        // Parallel Routing for Delay/Reverb
        this.distortion.connect(this.delay);
        this.delay.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delay);
        this.delay.connect(this.delayGain);
        this.delayGain.connect(this.globalGain);

        this.distortion.connect(this.reverb);
        this.reverb.connect(this.reverbGain);
        this.reverbGain.connect(this.globalGain);
    }

    _optimizeCompressor() {
        if (!this.buffer || !this.smartCompEnabled) return;

        // Analyze buffer for peak levels to set intelligent threshold
        let maxPeak = 0;
        for (let i = 0; i < this.buffer.numberOfChannels; i++) {
            const data = this.buffer.getChannelData(i);
            // Sample only a portion for performance if buffer is huge, or use a loop
            for (let j = 0; j < data.length; j += 100) {
                const abs = Math.abs(data[j]);
                if (abs > maxPeak) maxPeak = abs;
            }
        }

        const peakDb = 20 * Math.log10(Math.max(maxPeak, 0.01));
        
        // Intelligent Threshold: 12dB below peak for "glue" and punch
        const optimalThreshold = Math.max(peakDb - 12, -60);
        
        // Settings for a high-quality "smart" drum/sample compressor
        this.compressor.threshold.setTargetAtTime(optimalThreshold, this.ctx.currentTime, 0.1);
        this.compressor.ratio.setTargetAtTime(6, this.ctx.currentTime, 0.1);
        this.compressor.knee.setTargetAtTime(30, this.ctx.currentTime, 0.1);
        this.compressor.attack.setTargetAtTime(0.005, this.ctx.currentTime, 0.1);
        this.compressor.release.setTargetAtTime(0.15, this.ctx.currentTime, 0.1);
    }

    _makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = (i * 2) / n_samples - 1;
            curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    _generateReverbImpulse(duration, decay) {
        const sampleRate = this.ctx.sampleRate;
        const length = sampleRate * duration;
        const impulse = this.ctx.createBuffer(2, length, sampleRate);
        for (let i = 0; i < 2; i++) {
            const channelData = impulse.getChannelData(i);
            for (let j = 0; j < length; j++) {
                channelData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, decay);
            }
        }
        return impulse;
    }

    updateEffects(params) {
        if (params.reverb !== undefined) this.reverbGain.gain.setTargetAtTime(params.reverb, this.ctx.currentTime, 0.05);
        if (params.delay !== undefined) this.delayGain.gain.setTargetAtTime(params.delay, this.ctx.currentTime, 0.05);
        if (params.distort !== undefined) this.distortion.curve = this._makeDistortionCurve(params.distort * 100);
        
        // Smart Compressor Toggle
        if (params.smartCompEnabled !== undefined) {
            this.smartCompEnabled = params.smartCompEnabled;
            if (this.smartCompEnabled) {
                this._optimizeCompressor();
            } else {
                // Bypass: reset to transparent settings
                this.compressor.threshold.setTargetAtTime(0, this.ctx.currentTime, 0.05);
                this.compressor.ratio.setTargetAtTime(1, this.ctx.currentTime, 0.05);
            }
        }

        if (params.eqLow !== undefined) this.eqLow.gain.setTargetAtTime(params.eqLow, this.ctx.currentTime, 0.05);
        if (params.eqMid !== undefined) this.eqMid.gain.setTargetAtTime(params.eqMid, this.ctx.currentTime, 0.05);
        if (params.eqHigh !== undefined) this.eqHigh.gain.setTargetAtTime(params.eqHigh, this.ctx.currentTime, 0.05);
    }

    async loadAudio(arrayBuffer) {
        if (this.ctx.state === 'suspended') await this.ctx.resume();
        this.buffer = await this.ctx.decodeAudioData(arrayBuffer);
        this._optimizeCompressor(); // Adapt to new sample levels
        return this.buffer;
    }

    setMusicalConfig(key, mode, octave = 0) {
        this.musicalKey = key;
        this.musicalMode = mode;
        this.musicalOctave = parseInt(octave) || 0;
    }

    // --- Slicing Algorithms ---

    async processAllAlgorithms(targetSlices) {
        if (!this.buffer) return;
        this.allSlices['grid'] = await this.chopGrid(targetSlices);
        this.allSlices['transient'] = await this.chopTransient(targetSlices);
        this.allSlices['random'] = await this.chopRandom(targetSlices);
        this.allSlices['silence'] = await this.chopSilence(targetSlices);
        this.allSlices['beatsync'] = await this.chopBeatSync(targetSlices);
        this.allSlices['golden'] = await this.chopGolden(targetSlices);
        this.padMapping = Array.from({length: 16}, (_, i) => i);
    }

    setActiveAlgorithm(algo) {
        if (this.allSlices[algo]) {
            this.activeAlgo = algo;
            this.slices = this.allSlices[algo];
        }
    }

    async _finalizeSlices(cuts, targetSlices) {
        // Enforce target slices limit roughly
        if (cuts.length > targetSlices + 1) {
            const step = (cuts.length - 2) / (targetSlices - 1);
            let newCuts = [cuts[0]];
            for(let i=1; i<targetSlices; i++) {
                newCuts.push(cuts[Math.floor(i * step)]);
            }
            newCuts.push(cuts[cuts.length - 1]);
            cuts = newCuts;
        }

        this.slices = [];
        for (let i = 0; i < cuts.length - 1; i++) {
            const start = cuts[i];
            const end = cuts[i+1];
            
            // Pitch analysis for this slice
            const startSample = Math.floor(start * this.buffer.sampleRate);
            const endSample = Math.floor(end * this.buffer.sampleRate);
            const pitch = PitchDetector.analyzeSlice(this.buffer, startSample, endSample);

            this.slices.push({
                id: i,
                start: start,
                end: end,
                duration: end - start,
                pitch: pitch
            });

            if (this.onProgress) {
                this.onProgress(i + 1, cuts.length - 1);
            }

            // Yield to main thread every 16 slices to prevent "Page Unresponsive" modal
            if (i > 0 && i % 16 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }
        return this.slices;
    }

    async chopGrid(targetSlices) {
        if (!this.buffer) return [];
        const dur = this.buffer.duration;
        let cuts = [];
        for (let i = 0; i <= targetSlices; i++) {
            cuts.push((i / targetSlices) * dur);
        }
        return await this._finalizeSlices(cuts, targetSlices);
    }

    async chopRandom(targetSlices) {
        if (!this.buffer) return [];
        const dur = this.buffer.duration;
        let cuts = [0, dur];
        for (let i = 0; i < targetSlices - 1; i++) cuts.push(Math.random() * dur);
        cuts.sort((a,b) => a-b);
        return await this._finalizeSlices(cuts, targetSlices);
    }

    async chopTransient(targetSlices) {
        if (!this.buffer) return [];
        const data = this.buffer.getChannelData(0);
        const sr = this.buffer.sampleRate;
        const dur = this.buffer.duration;
        
        let cuts = [0];
        let threshold = 0.1; // start low, find peaks
        let minSamples = 0.05 * sr;
        let lastCut = 0;

        // Simple peak finder
        for(let i=0; i<data.length; i++) {
            if(Math.abs(data[i]) > threshold && (i - lastCut) > minSamples) {
                cuts.push(i / sr);
                lastCut = i;
            }
        }
        cuts.push(dur);
        return await this._finalizeSlices(cuts, targetSlices);
    }

    async chopSilence(targetSlices) {
        if (!this.buffer) return [];
        const data = this.buffer.getChannelData(0);
        const sr = this.buffer.sampleRate;
        const dur = this.buffer.duration;
        
        let cuts = [0];
        let isSilent = false;
        let threshold = 0.02; 

        for(let i=0; i<data.length; i+=100) { // check blocks
            if(Math.abs(data[i]) < threshold && !isSilent) {
                isSilent = true;
                cuts.push(i / sr);
            } else if (Math.abs(data[i]) >= threshold) {
                isSilent = false;
            }
        }
        cuts.push(dur);
        cuts.sort((a,b)=>a-b);
        return await this._finalizeSlices(cuts, targetSlices);
    }

    async chopBeatSync(targetSlices) {
        // Assume 120 BPM for now if not analyzed
        if (!this.buffer) return [];
        const dur = this.buffer.duration;
        const bps = 120 / 60;
        const beatDur = 1 / bps;
        let cuts = [];
        for(let t=0; t<dur; t+=beatDur) cuts.push(t);
        if(cuts[cuts.length-1] !== dur) cuts.push(dur);
        return await this._finalizeSlices(cuts, targetSlices);
    }

    async chopGolden(targetSlices) {
        if (!this.buffer) return [];
        const dur = this.buffer.duration;
        let cuts = [0, dur];
        const PHI = 1.61803398875;
        
        // Recursively divide by Golden Ratio
        let queue = [{start:0, end:dur}];
        while(cuts.length < targetSlices + 1 && queue.length > 0) {
            let seg = queue.shift();
            let cutPoint = seg.start + (seg.end - seg.start) / PHI;
            cuts.push(cutPoint);
            queue.push({start: seg.start, end: cutPoint});
            queue.push({start: cutPoint, end: seg.end});
        }
        cuts.sort((a,b)=>a-b);
        return await this._finalizeSlices(cuts, targetSlices);
    }

    // --- Playback & Sequencer ---

    stopAllNodes() {
        this.activeSources.forEach(src => {
            try { src.stop(); } catch(e) {}
        });
        this.activeSources.clear();
    }

    _createSource(sliceId, time, playbackRate = 1.0, ctx = this.ctx, destination = null, holdDurOverride = -1) {
        const dest = destination || (this.fxEnabled ? this.eqLow : this.globalGain);
        const slice = this.slices.find(s => s.id === sliceId);
        if (!slice || !this.buffer) return null;

        if (this.globalChoke && ctx === this.ctx) {
            this.stopAllNodes();
        }

        const source = ctx.createBufferSource();
        source.buffer = this.buffer;
        source.playbackRate.value = playbackRate;

        const gainNode = ctx.createGain();
        
        // ADSR Envelope
        let A = this.adsr.attack;
        let D = this.adsr.decay;
        const S = this.adsr.sustain;
        let R = this.adsr.release;

        if (this.adsrDeviation !== 0) {
            const mult = 1.0 + (Math.random() * this.adsrDeviation);
            A *= Math.max(0.001, mult);
            D *= Math.max(0.001, mult);
            R *= Math.max(0.001, mult);
        }

        // Base slice duration (how long the note is logically "held" before release)
        const isExtended = holdDurOverride > 0;
        const holdDur = isExtended ? holdDurOverride : (slice.duration / playbackRate);
        
        // Boost sustain for extended notes if it's currently low
        let effectiveSustain = S;
        if (isExtended && S < 0.7) effectiveSustain = 0.7;

        let audibleDur = holdDur + R;
        // If sustain is zero, the sound dies completely after Attack + Decay phase
        if (effectiveSustain <= 0.001) {
            audibleDur = Math.min(holdDur, A + D);
        }
        
        // Total physical play duration (bound by actual buffer length, unless looping)
        const maxAvailableDur = (this.buffer.duration - slice.start) / playbackRate;
        let playDur = Math.min(audibleDur, maxAvailableDur);

        // If extended, enable looping to sustain short slices
        if (isExtended) {
            source.loop = true;
            source.loopStart = slice.start;
            source.loopEnd = slice.end;
            playDur = audibleDur; // Allow playing past the physical end since we loop
        }

        gainNode.gain.setValueAtTime(0, time);
        
        // Attack
        let peakTime = time + A;
        if (peakTime > time + holdDur) peakTime = time + holdDur;
        gainNode.gain.linearRampToValueAtTime(1.0, peakTime);
        
        // Decay
        let decayEndTime = peakTime + D;
        if (decayEndTime > time + holdDur) decayEndTime = time + holdDur;
        gainNode.gain.linearRampToValueAtTime(effectiveSustain, decayEndTime);
        
        // Sustain (hold S until holdDur)
        gainNode.gain.setValueAtTime(effectiveSustain, time + holdDur);
        
        // Release
        const releaseEndTime = time + holdDur + R;
        gainNode.gain.linearRampToValueAtTime(0.0001, releaseEndTime);

        source.connect(gainNode);
        gainNode.connect(dest);

        const playId = Math.random().toString(36).substr(2, 9);
        
        if (ctx === this.ctx) {
            this.activeSources.add(source);
            source.onended = () => {
                this.activeSources.delete(source);
                if (this.onSliceStop) this.onSliceStop(playId);
            };
        }

        source.start(time, slice.start, playDur);
        
        if (ctx === this.ctx && this.onPlayheadStart) {
            const delayMs = Math.max(0, (time - this.ctx.currentTime) * 1000);
            setTimeout(() => this.onPlayheadStart(slice.start, playDur, playbackRate, sliceId, playId), delayMs);
        }

        return source;
    }

    _createTone(midiNote, time, holdDur = 0.2, ctx = this.ctx, destination = null) {
        const dest = destination || (this.fxEnabled ? this.eqLow : this.globalGain);
        if (midiNote < 0) return null;
        
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        
        if (this.globalChoke && ctx === this.ctx) {
            this.stopAllNodes();
        }

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        const gainNode = ctx.createGain();
        
        // ADSR Envelope
        let A = this.adsr.attack;
        let D = this.adsr.decay;
        const S = this.adsr.sustain;
        let R = this.adsr.release;

        // Boost sustain for longer notes
        let effectiveSustain = S;
        if (holdDur > 0.3 && S < 0.7) effectiveSustain = 0.7;

        if (this.adsrDeviation !== 0) {
            const mult = 1.0 + (Math.random() * this.adsrDeviation);
            A *= Math.max(0.001, mult);
            D *= Math.max(0.001, mult);
            R *= Math.max(0.001, mult);
        }

        let audibleDur = holdDur + R;
        if (effectiveSustain <= 0.001) {
            audibleDur = Math.min(holdDur, A + D);
        }

        gainNode.gain.setValueAtTime(0, time);
        
        // Attack
        let peakTime = time + A;
        if (peakTime > time + holdDur) peakTime = time + holdDur;
        gainNode.gain.linearRampToValueAtTime(0.7, peakTime);
        
        // Decay
        let decayEndTime = peakTime + D;
        if (decayEndTime > time + holdDur) decayEndTime = time + holdDur;
        gainNode.gain.linearRampToValueAtTime(effectiveSustain * 0.7, decayEndTime);
        
        // Sustain
        gainNode.gain.setValueAtTime(effectiveSustain * 0.7, time + holdDur);
        
        // Release
        const releaseEndTime = time + holdDur + R;
        gainNode.gain.linearRampToValueAtTime(0.0001, releaseEndTime);

        osc.connect(gainNode);
        gainNode.connect(dest);

        if (ctx === this.ctx) {
            this.activeSources.add(osc);
            osc.onended = () => {
                this.activeSources.delete(osc);
            };
        }

        osc.start(time);
        osc.stop(releaseEndTime);
        
        return osc;
    }

    playPad(sliceId, midiNoteOverride = -1) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        const slice = this.slices.find(s => s.id === sliceId);
        if (!slice) return;

        let rate = 1.0;
        // If Chromatic mode (MIDI note override provided)
        if (midiNoteOverride > 0 && slice.pitch.midi > 0) {
            rate = ScaleQuantizer.getPlaybackRate(slice.pitch.midi, midiNoteOverride);
        }

        if (this.sampleEnabled) {
            this._createSource(sliceId, this.ctx.currentTime, rate);
        }
        if (this.toneEnabled && slice.pitch.midi > 0) {
            this._createTone(slice.pitch.midi, this.ctx.currentTime);
        }
    }

    // --- Scheduler ---
    
    startSequencer(pattern, bpm) {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        this.seqPattern = pattern;
        this.seqBpm = bpm;
        this.seqCurrentStep = 0;
        this.seqNextNoteTime = this.ctx.currentTime + 0.05;
        this.seqIsPlaying = true;
        this._scheduler();
    }

    stopSequencer() {
        this.seqIsPlaying = false;
        clearTimeout(this.seqTimerID);
    }

    _nextNote() {
        const secondsPerBeat = 60.0 / this.seqBpm;
        this.seqNextNoteTime += 0.25 * secondsPerBeat; // 16th notes
        this.seqCurrentStep++;
        if (this.seqCurrentStep >= this.seqPattern.length) {
            this.seqCurrentStep = 0;
        }
    }

    getMaskedPattern(forceRegenerate = false) {
        if (!this.seqPattern || !this.seqPattern.steps) return [];
        
        const currentParams = `${this.seqPattern.id}_${this.seqPattern.steps.length}_${this.seqDensity}_${this.seqSyncopation}_${this.seqProbability}_${this.seqNoteRepeat}_${this.seqMicroTiming}`;
        
        if (!forceRegenerate && this._cachedMaskedPattern && this._lastMaskParams === currentParams) {
            return this._cachedMaskedPattern;
        }

        const pattern = this.seqPattern;
        const N = pattern.steps.length;
        const density = this.seqDensity;
        const syncopation = this.seqSyncopation;
        const prob = this.seqProbability;
        const repeatLikelihood = this.seqNoteRepeat;
        const microLikelihood = this.seqMicroTiming;
        
        // 1. Density: Calculate how many steps should be active
        let targetActive = Math.round(N * density);
        
        let priorities = pattern.steps.map((step, i) => {
            let score = 0;
            if (step.active) score += 1000;
            if (i % 4 === 0) score += 40;
            else if (i % 2 === 0) score += 20;
            else score += 10;
            score += (i * 7 % 13) / 13;
            return { index: i, score: score };
        });
        
        priorities.sort((a, b) => b.score - a.score);
        
        let maskedActiveIndices = new Set();
        for (let i = 0; i < targetActive; i++) {
            maskedActiveIndices.add(priorities[i].index);
        }
        
        // 2. Syncopation: Identify primary slices for repetition
        let sliceFreq = {};
        pattern.steps.forEach(s => {
            if (s.active && s.sliceId !== undefined) {
                sliceFreq[s.sliceId] = (sliceFreq[s.sliceId] || 0) + 1;
            }
        });
        let sortedSlices = Object.keys(sliceFreq).sort((a, b) => sliceFreq[b] - sliceFreq[a]).map(Number);
        const primarySlice = sortedSlices.length > 0 ? sortedSlices[0] : 0;
        
        // 3. Assemble Masked Pattern
        const maskedSteps = pattern.steps.map((step, i) => {
            let mActive = maskedActiveIndices.has(i);
            let mSliceId = step.sliceId;
            
            // Syncopation increases the likelihood of remapping to the primary slice
            if (mActive && mSliceId !== undefined && syncopation > 0) {
                // Deterministic "randomness" based on index
                const threshold = ((i * 31) % 100) / 100;
                if (threshold < syncopation) {
                    mSliceId = primarySlice;
                }
            }


            let mRatchets = step.ratchets || 1;
            let mMicroTiming = step.microTiming || 0;

            if (mActive) {
                // Note Repeat (Ratchet)
                if (repeatLikelihood > 0 && Math.random() < repeatLikelihood) {
                    // Randomly choose 2, 3, or 4 ratchets
                    mRatchets = [2, 2, 2, 3, 3, 4][Math.floor(Math.random() * 6)];
                }

                // Micro-Timing (0-30ms)
                if (microLikelihood > 0 && Math.random() < microLikelihood) {
                    mMicroTiming = Math.random() * 0.030; // 0 to 30ms
                }
            }
            
            return {
                ...step,
                active: mActive,
                sliceId: mSliceId,
                ratchets: mRatchets,
                microTiming: mMicroTiming
            };
        });
        
        this.lastMaskedPattern = maskedSteps;
        this._cachedMaskedPattern = maskedSteps;
        this._lastMaskParams = currentParams;
        return maskedSteps;
    }

    _playKick(time, ctx, destination) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(destination);

        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);

        gain.gain.setValueAtTime(this.kickLevel, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);

        osc.start(time);
        osc.stop(time + 0.5);
    }

    _scheduleNote(stepNumber, baseTime) {
        let time = baseTime;
        const secondsPerBeat = 60.0 / this.seqBpm;
        const stepDuration = 0.25 * secondsPerBeat;
        
        // Apply swing
        if (stepNumber % 2 !== 0) {
            const swingDelay = (this.seqSwing * stepDuration) * 0.5;
            time += swingDelay;
        }

        if (this.onStepPlay) {
            // Send UI update sync
            setTimeout(() => this.onStepPlay(stepNumber), (time - this.ctx.currentTime) * 1000);
        }

        if (this.kickEnabled && stepNumber % 4 === 0) {
            this._playKick(baseTime, this.ctx, this.globalGain);
        }

        const maskedPattern = this.getMaskedPattern();
        const stepData = maskedPattern[stepNumber];
        if (!stepData || !stepData.active) return;

        // Apply Probability during playback only (not reflected in UI)
        if (this.seqProbability < 1.0 && Math.random() > this.seqProbability) return;

        if (this.slices.length === 0) return;

        // Apply microTiming
        if (stepData.microTiming) {
            time += stepData.microTiming; // It's already in seconds in my new logic
        }

        const sliceIdLookup = stepData.sliceId !== undefined ? stepData.sliceId : stepNumber;
        const sliceId = sliceIdLookup % this.slices.length;
        const slice = this.slices[sliceId];

        let rate = 1.0;
        if (this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
            if (slice.pitch.midi > 0) {
                const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode);
                const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                let idx = validNotes.indexOf(closestMidi);
                if (idx !== -1) {
                    idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                    const targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                    rate = ScaleQuantizer.getPlaybackRate(slice.pitch.midi, targetMidi);
                }
            }
        }

        let ratchets = stepData.ratchets || 1;
        const noteSteps = stepData.duration || 1;
        const totalNoteDur = noteSteps * stepDuration;
        const ratchetSpacing = totalNoteDur / ratchets;
        
        for (let r = 0; r < ratchets; r++) {
            let t = time + (r * ratchetSpacing);
            const holdDur = ratchetSpacing * 0.9; // Small gap between ratchets
            
            // Independent layering: Sample and Tone can both be enabled
            if (this.sampleEnabled) {
                const triggerSample = (pitchRate) => this._createSource(sliceId, t, pitchRate, this.ctx, null, holdDur);
                triggerSample(rate);
                
                if (this.chordsEnabled && stepData.isChord) {
                    // Play major/minor third and fifth based on scale
                    const intervals = [3, 4, 7]; // Basic intervals for color
                    intervals.forEach(semi => {
                        const chordRate = rate * Math.pow(2, semi / 12);
                        triggerSample(chordRate);
                    });
                }
            }

            if (this.toneEnabled && slice.pitch.midi > 0) {
                // Determine the target MIDI note
                let targetMidi = slice.pitch.midi;
                if (this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
                    const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode);
                    const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                    let idx = validNotes.indexOf(closestMidi);
                    if (idx !== -1) {
                        idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                        targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                    }
                }
                
                this._createTone(targetMidi, t, holdDur);

                if (this.chordsEnabled && stepData.isChord) {
                    const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode);
                    let idx = validNotes.indexOf(targetMidi);
                    if (idx !== -1) {
                        // Diatonic thirds and fifths
                        [2, 4].forEach(offset => {
                            if (idx + offset < validNotes.length) {
                                this._createTone(validNotes[idx + offset], t, holdDur);
                            }
                        });
                    }
                }
            }
        }
    }

    _scheduler() {
        while (this.seqNextNoteTime < this.ctx.currentTime + this.seqScheduleAheadTime) {
            this._scheduleNote(this.seqCurrentStep, this.seqNextNoteTime);
            this._nextNote();
        }
        if (this.seqIsPlaying) {
            this.seqTimerID = setTimeout(() => this._scheduler(), this.seqLookahead);
        }
    }

    // --- Effects Listeners ---
    // Note: The logic for toggling engine.fxEnabled and UI updates is handled in the app controller.

    // --- Offline Render ---
    
    async renderSequenceToBuffer(includeEffects = false) {
        if (!this.seqPattern || this.slices.length === 0 || !this.buffer) return null;
        
        const secondsPerBeat = 60.0 / this.seqBpm;
        const totalTime = (this.seqPattern.length * 0.25 * secondsPerBeat) + 2.0; // Add 2s tail for reverb/delay
        
        const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
            this.buffer.numberOfChannels, 
            Math.ceil(totalTime * this.buffer.sampleRate), 
            this.buffer.sampleRate
        );

        // Recreate effects chain in offline context if needed
        let finalDest = offlineCtx.destination;
        
        if (includeEffects) {
            const oEqLow = offlineCtx.createBiquadFilter();
            oEqLow.type = 'lowshelf';
            oEqLow.frequency.value = this.eqLow.frequency.value;
            oEqLow.gain.value = this.eqLow.gain.value;

            const oEqMid = offlineCtx.createBiquadFilter();
            oEqMid.type = 'peaking';
            oEqMid.frequency.value = this.eqMid.frequency.value;
            oEqMid.Q.value = this.eqMid.Q.value;
            oEqMid.gain.value = this.eqMid.gain.value;

            const oEqHigh = offlineCtx.createBiquadFilter();
            oEqHigh.type = 'highshelf';
            oEqHigh.frequency.value = this.eqHigh.frequency.value;
            oEqHigh.gain.value = this.eqHigh.gain.value;

            const oDist = offlineCtx.createWaveShaper();
            oDist.curve = this.distortion.curve;

            const oComp = offlineCtx.createDynamicsCompressor();
            oComp.threshold.value = this.compressor.threshold.value;
            oComp.ratio.value = this.compressor.ratio.value;
            oComp.knee.value = this.compressor.knee.value;
            oComp.attack.value = this.compressor.attack.value;
            oComp.release.value = this.compressor.release.value;

            const oDelay = offlineCtx.createDelay(1.0);
            oDelay.delayTime.value = this.delay.delayTime.value;
            const oDelayFB = offlineCtx.createGain();
            oDelayFB.gain.value = this.delayFeedback.gain.value;
            const oDelayGain = offlineCtx.createGain();
            oDelayGain.gain.value = this.delayGain.gain.value;

            const oReverb = offlineCtx.createConvolver();
            oReverb.buffer = this.reverb.buffer;
            const oReverbGain = offlineCtx.createGain();
            oReverbGain.gain.value = this.reverbGain.gain.value;

            // Routing
            oEqLow.connect(oEqMid);
            oEqMid.connect(oEqHigh);
            oEqHigh.connect(oDist);
            oDist.connect(oComp);
            oComp.connect(offlineCtx.destination);

            oDist.connect(oDelay);
            oDelay.connect(oDelayFB);
            oDelayFB.connect(oDelay);
            oDelay.connect(oDelayGain);
            oDelayGain.connect(offlineCtx.destination);

            oDist.connect(oReverb);
            oReverb.connect(oReverbGain);
            oReverbGain.connect(offlineCtx.destination);

            finalDest = oEqLow;
        }

        let baseTime = 0;
        const maskedPattern = this.getMaskedPattern();
        for(let stepNumber=0; stepNumber < this.seqPattern.length; stepNumber++) {
            if (this.kickEnabled && stepNumber % 4 === 0 && includeEffects) {
                this._playKick(baseTime, offlineCtx, finalDest);
            }

            const stepData = maskedPattern[stepNumber];
            if (stepData && stepData.active) {
                let time = baseTime;
                const stepDuration = 0.25 * secondsPerBeat;
                
                if (stepNumber % 2 !== 0) {
                    const swingDelay = (this.seqSwing * stepDuration) * 0.5;
                    time += swingDelay;
                }
                
                if (stepData.microTiming) {
                    time += stepData.microTiming;
                }

                const sliceIdLookup = stepData.sliceId !== undefined ? stepData.sliceId : stepNumber;
                const sliceId = sliceIdLookup % this.slices.length;
                const slice = this.slices[sliceId];

                let rate = 1.0;
                if (this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined && slice.pitch.midi > 0) {
                    const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode);
                    const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                    let idx = validNotes.indexOf(closestMidi);
                    if (idx !== -1) {
                        idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                        const targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                        rate = ScaleQuantizer.getPlaybackRate(slice.pitch.midi, targetMidi);
                    }
                }

                let ratchets = stepData.ratchets || 1;
                const ratchetSpacing = stepDuration / ratchets;
                
                for (let r = 0; r < ratchets; r++) {
                    let t = time + (r * ratchetSpacing);
                    
                    if (this.sampleEnabled) {
                        this._createSource(sliceId, t, rate, offlineCtx, finalDest);
                    }
                    if (this.toneEnabled && slice.pitch.midi > 0) {
                        let targetMidi = slice.pitch.midi;
                        if (this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
                            const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode);
                            const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                            let idx = validNotes.indexOf(closestMidi);
                            if (idx !== -1) {
                                idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                                targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                            }
                        }
                        this._createTone(targetMidi, t, ratchetSpacing, offlineCtx, finalDest);
                    }
                }
            }
            baseTime += 0.25 * secondsPerBeat;
        }

        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
    }
}
