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
        this.kickLevel = 0.15;
        this.songPart = 'chorus';
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
        this.musicalOctave = 0;
        this.stepsPerBeat = 4;
        this.stepsPerBar = 16;
        this.currentMeter = "4/4";

        // Global ADSR
        this.adsr = { attack: 0.02, decay: 0.15, sustain: 0.0, release: 0.08 };
        
        this.allSlices = {};
        this.activeAlgo = 'transient';
        this.padMapping = Array.from({length: 16}, (_, i) => i);
        this.toneLevel = 0.04;
        this.activeTimbre = 'pure-sine';
        this.chordsEnabled = true;
        this.sampleLevel = 1.0;
        this._cachedMaskedPattern = null;
        this._lastMaskParams = "";

        this.fxEnabled = false;
        this.smartCompEnabled = false;
        this.contrastEnabled = false;
        this.contrastPattern = null;
        this._setupEffects();
    }

    stopAllNodes() {
        const fadeTime = 0.025; // 25ms soft fade for total smoothness
        const now = this.ctx.currentTime;
        this.activeSources.forEach(item => {
            try {
                if (item.gain) {
                    item.gain.gain.cancelScheduledValues(now);
                    item.gain.gain.setTargetAtTime(0, now, 0.01);
                }
                if (item.source) {
                    item.source.stop(now + fadeTime);
                }
            } catch(e) {}
        });
        this.activeSources.clear();
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
        this.delayGain.gain.value = 0.4;

        // 4. Reverb
        this.reverb = this.ctx.createConvolver();
        this.reverb.buffer = this._generateReverbImpulse(1.5, 2.0);
        this.reverbGain = this.ctx.createGain();
        this.reverbGain.gain.value = 0.3;

        // 5. Compressor (Safety Limiter)
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -3; 
        this.compressor.ratio.value = 12;
        this.compressor.knee.value = 5;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.1;

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
        if (params.delay !== undefined) {
            this.delay.delayTime.setTargetAtTime(params.delay / 1000, this.ctx.currentTime, 0.05);
        }
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

    setMeter(meter) {
        this.currentMeter = meter;
        if (meter === '3/4') { this.stepsPerBeat = 3; this.stepsPerBar = 12; }
        else if (meter === '5/4') { this.stepsPerBeat = 5; this.stepsPerBar = 20; }
        else if (meter === '7/4') { this.stepsPerBeat = 7; this.stepsPerBar = 28; }
        else if (meter === '6/8') { this.stepsPerBeat = 3; this.stepsPerBar = 12; }
        else { this.stepsPerBeat = 4; this.stepsPerBar = 16; } // Default 4/4
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

        // Enforce 100ms minimum duration
        const minDur = 0.1; // 100ms
        let filteredCuts = [cuts[0]];
        let lastValidCut = cuts[0];

        for (let i = 1; i < cuts.length - 1; i++) {
            const dur = cuts[i] - lastValidCut;
            const remaining = cuts[cuts.length - 1] - cuts[i];
            
            // Only add this cut if it's far enough from the last one AND far enough from the end
            if (dur >= minDur && remaining >= minDur) {
                filteredCuts.push(cuts[i]);
                lastValidCut = cuts[i];
            }
        }
        filteredCuts.push(cuts[cuts.length - 1]);
        cuts = filteredCuts;

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



    _createSource(sliceId, time, playbackRate = 1.0, ctx = this.ctx, destination = null, holdDurOverride = 0, gainMult = 1.0, isLong = false) {
        const dest = destination || (this.fxEnabled ? this.eqLow : this.globalGain);
        const slice = this.slices.find(s => s.id === sliceId);
        if (!slice || !this.buffer) return null;

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
        const holdDur = holdDurOverride > 0 ? holdDurOverride : (slice.duration / playbackRate);
        
        // Boost sustain only for true long notes (>1 step) if it's currently low
        let effectiveSustain = S;
        if (isLong && S < 0.7) effectiveSustain = 0.7;

        let audibleDur;
        let releaseEndTime;
        
        gainNode.gain.setValueAtTime(0.0001, time);
        
        if (!isLong) {
            // Single steps respect the ADSR envelope as set without holdDur cutoffs/choking
            const peakTime = time + A;
            gainNode.gain.exponentialRampToValueAtTime(0.7 * gainMult, peakTime);
            
            const decayEndTime = peakTime + D;
            gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, effectiveSustain * gainMult), decayEndTime);
            
            releaseEndTime = decayEndTime + R;
            gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEndTime);
            
            audibleDur = A + D + R;
        } else {
            // Extended delay/hold for long notes across multiple steps
            let peakTime = time + A;
            if (peakTime > time + holdDur) peakTime = time + holdDur;
            gainNode.gain.exponentialRampToValueAtTime(0.7 * gainMult, peakTime);
            
            let decayEndTime = peakTime + D;
            if (decayEndTime > time + holdDur) decayEndTime = time + holdDur;
            gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, effectiveSustain * gainMult), decayEndTime);
            
            gainNode.gain.setValueAtTime(Math.max(0.0001, effectiveSustain * gainMult), time + holdDur);
            
            releaseEndTime = time + holdDur + R;
            gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEndTime);
            
            audibleDur = holdDur + R;
            if (effectiveSustain <= 0.001) {
                audibleDur = Math.min(holdDur, A + D);
            }
        }
        
        const maxAvailableDur = (this.buffer.duration - slice.start) / playbackRate;
        let playDur = Math.min(audibleDur, maxAvailableDur);

        if (isLong) {
            source.loop = true;
            source.loopStart = slice.start;
            source.loopEnd = slice.end;
            playDur = audibleDur;
        }

        source.connect(gainNode);
        gainNode.connect(dest);

        const playId = Math.random().toString(36).substr(2, 9);
        
        const item = { source, gain: gainNode };
        if (ctx === this.ctx) {
            this.activeSources.add(item);
            source.onended = () => {
                this.activeSources.delete(item);
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



    _createTone(midiNote, time, holdDur = 0.2, ctx = this.ctx, destination = null, gainMult = 1.0, isLong = false, strategy = 'default') {
        const dest = destination || (this.fxEnabled ? this.eqLow : this.globalGain);
        if (midiNote < 0) return null;
        
        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

        const gainNode = ctx.createGain();
        
        let A = this.adsr.attack;
        let D = this.adsr.decay;
        const S = this.adsr.sustain;
        let R = this.adsr.release;

        let effectiveSustain = S;
        if (isLong && S < 0.7) effectiveSustain = 0.7;

        if (this.adsrDeviation !== 0) {
            const mult = 1.0 + (Math.random() * this.adsrDeviation);
            A *= Math.max(0.001, mult);
            D *= Math.max(0.001, mult);
            R *= Math.max(0.001, mult);
        }

        gainNode.gain.setValueAtTime(0.0001, time);
        
        let releaseEndTime;
        if (!isLong) {
            const peakTime = time + A;
            gainNode.gain.exponentialRampToValueAtTime(0.4 * gainMult, peakTime);
            
            const decayEndTime = peakTime + D;
            gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, effectiveSustain * 0.4 * gainMult), decayEndTime);
            
            releaseEndTime = decayEndTime + R;
            gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEndTime);
        } else {
            let peakTime = time + A;
            if (peakTime > time + holdDur) peakTime = time + holdDur;
            gainNode.gain.exponentialRampToValueAtTime(0.4 * gainMult, peakTime);
            
            let decayEndTime = peakTime + D;
            if (decayEndTime > time + holdDur) decayEndTime = time + holdDur;
            gainNode.gain.exponentialRampToValueAtTime(Math.max(0.0001, effectiveSustain * 0.4 * gainMult), decayEndTime);
            
            gainNode.gain.setValueAtTime(Math.max(0.0001, effectiveSustain * 0.4 * gainMult), time + holdDur);
            
            releaseEndTime = time + holdDur + R;
            gainNode.gain.exponentialRampToValueAtTime(0.0001, releaseEndTime);
        }

        const timbre = this.activeTimbre || 'pure-sine';
        const subNodes = [];
        let outputNode = null;

        if (timbre === 'pure-sine') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            outputNode = osc;
            subNodes.push(osc);
        } else if (timbre === 'fm-pluck') {
            const carrier = ctx.createOscillator();
            carrier.type = 'sine';
            carrier.frequency.setValueAtTime(freq, time);
            
            const modulator = ctx.createOscillator();
            modulator.type = 'sine';
            modulator.frequency.setValueAtTime(freq * 2, time);
            
            const modGain = ctx.createGain();
            modGain.gain.setValueAtTime(freq * 3, time);
            modGain.gain.exponentialRampToValueAtTime(10, time + 0.08);
            
            modulator.connect(modGain);
            modGain.connect(carrier.frequency);
            
            outputNode = carrier;
            subNodes.push(carrier, modulator);
        } else if (timbre === 'sub-bass') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(1.0, time);
            
            const osc1 = ctx.createOscillator();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(freq, time);
            
            const osc2 = ctx.createOscillator();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(freq * 0.5, time);
            
            const gain2 = ctx.createGain();
            gain2.gain.setValueAtTime(0.5, time);
            
            osc1.connect(merger);
            osc2.connect(gain2);
            gain2.connect(merger);
            
            outputNode = merger;
            subNodes.push(osc1, osc2);
        } else if (timbre === 'analog-saw') {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(Math.min(20000, freq * 4 + 400), time);
            filter.Q.setValueAtTime(1.2, time);
            
            osc.connect(filter);
            outputNode = filter;
            subNodes.push(osc);
        } else if (timbre === 'square-lead') {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(Math.min(20000, freq * 6 + 600), time);
            
            osc.connect(filter);
            outputNode = filter;
            subNodes.push(osc);
        } else if (timbre === 'triangle-flute') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            outputNode = osc;
            subNodes.push(osc);
        } else if (timbre === 'detuned-supersaw') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(0.7, time);
            
            const osc1 = ctx.createOscillator();
            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(freq, time);
            osc1.detune.setValueAtTime(-8, time);
            
            const osc2 = ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.setValueAtTime(freq, time);
            osc2.detune.setValueAtTime(8, time);
            
            osc1.connect(merger);
            osc2.connect(merger);
            
            outputNode = merger;
            subNodes.push(osc1, osc2);
        } else if (timbre === 'electric-piano') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(1.0, time);
            
            const fundamental = ctx.createOscillator();
            fundamental.type = 'sine';
            fundamental.frequency.setValueAtTime(freq, time);
            
            const tine = ctx.createOscillator();
            tine.type = 'sine';
            tine.frequency.setValueAtTime(freq * 4.5, time);
            
            const tineGain = ctx.createGain();
            tineGain.gain.setValueAtTime(0.4, time);
            tineGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            
            fundamental.connect(merger);
            tine.connect(tineGain);
            tineGain.connect(merger);
            
            outputNode = merger;
            subNodes.push(fundamental, tine);
        } else if (timbre === 'glockenspiel') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(0.8, time);
            
            const fund = ctx.createOscillator(); fund.type = 'sine'; fund.frequency.setValueAtTime(freq, time);
            const part1 = ctx.createOscillator(); part1.type = 'sine'; part1.frequency.setValueAtTime(freq * 2.75, time);
            const part2 = ctx.createOscillator(); part2.type = 'sine'; part2.frequency.setValueAtTime(freq * 5.4, time);
            
            const g1 = ctx.createGain(); g1.gain.setValueAtTime(0.3, time);
            const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.15, time);
            
            fund.connect(merger);
            part1.connect(g1); g1.connect(merger);
            part2.connect(g2); g2.connect(merger);
            
            outputNode = merger;
            subNodes.push(fund, part1, part2);
        } else if (timbre === 'organ-drawbar') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(0.6, time);
            
            const fund = ctx.createOscillator(); fund.type = 'sine'; fund.frequency.setValueAtTime(freq, time);
            const oct = ctx.createOscillator(); oct.type = 'sine'; oct.frequency.setValueAtTime(freq * 2, time);
            const fifth = ctx.createOscillator(); fifth.type = 'sine'; fifth.frequency.setValueAtTime(freq * 2.996, time);
            
            const gOct = ctx.createGain(); gOct.gain.setValueAtTime(0.5, time);
            const gFifth = ctx.createGain(); gFifth.gain.setValueAtTime(0.35, time);
            
            fund.connect(merger);
            oct.connect(gOct); gOct.connect(merger);
            fifth.connect(gFifth); gFifth.connect(merger);
            
            outputNode = merger;
            subNodes.push(fund, oct, fifth);
        } else if (timbre === 'muted-brass') {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(Math.min(20000, freq * 5 + 500), time);
            filter.frequency.exponentialRampToValueAtTime(Math.min(20000, freq * 1.5 + 200), time + 0.15);
            filter.Q.setValueAtTime(2.0, time);
            
            osc.connect(filter);
            outputNode = filter;
            subNodes.push(osc);
        } else if (timbre === 'chiptune-pulse') {
            const osc = ctx.createOscillator();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, time);
            
            const hp = ctx.createBiquadFilter();
            hp.type = 'highpass';
            hp.frequency.setValueAtTime(Math.min(20000, freq * 0.8), time);
            
            osc.connect(hp);
            outputNode = hp;
            subNodes.push(osc);
        } else if (timbre === 'ghostly-pad') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, time);
            
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(3.0, time);
            
            const lfoGain = ctx.createGain();
            lfoGain.gain.setValueAtTime(6.0, time);
            
            lfo.connect(lfoGain);
            lfoGain.connect(osc.frequency);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(Math.min(20000, freq * 2.5 + 300), time);
            
            osc.connect(filter);
            outputNode = filter;
            subNodes.push(osc, lfo);
        } else if (timbre === 'plucked-string') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(1.0, time);
            
            const fund = ctx.createOscillator();
            fund.type = 'sine';
            fund.frequency.setValueAtTime(freq, time);
            
            const snap = ctx.createOscillator();
            snap.type = 'sawtooth';
            snap.frequency.setValueAtTime(freq * 2, time);
            
            const snapGain = ctx.createGain();
            snapGain.gain.setValueAtTime(0.5, time);
            snapGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
            
            fund.connect(merger);
            snap.connect(snapGain); snapGain.connect(merger);
            
            outputNode = merger;
            subNodes.push(fund, snap);
        } else if (timbre === 'hollow-bell') {
            const merger = ctx.createGain();
            merger.gain.setValueAtTime(0.8, time);
            
            const fund = ctx.createOscillator(); fund.type = 'sine'; fund.frequency.setValueAtTime(freq, time);
            const h5 = ctx.createOscillator(); h5.type = 'sine'; h5.frequency.setValueAtTime(freq * 2.996, time);
            const h7 = ctx.createOscillator(); h7.type = 'sine'; h7.frequency.setValueAtTime(freq * 4.1, time);
            
            const g5 = ctx.createGain(); g5.gain.setValueAtTime(0.4, time);
            const g7 = ctx.createGain(); g7.gain.setValueAtTime(0.2, time);
            
            fund.connect(merger);
            h5.connect(g5); g5.connect(merger);
            h7.connect(g7); g7.connect(merger);
            
            outputNode = merger;
            subNodes.push(fund, h5, h7);
        } else if (timbre === 'acid-synth') {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, time);
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(Math.min(20000, freq * 8 + 1000), time);
            filter.frequency.exponentialRampToValueAtTime(Math.min(20000, freq * 2 + 300), time + 0.12);
            filter.Q.setValueAtTime(6.0, time);
            
            osc.connect(filter);
            outputNode = filter;
            subNodes.push(osc);
        } else {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            outputNode = osc;
            subNodes.push(osc);
        }

        outputNode.connect(gainNode);
        gainNode.connect(dest);

        subNodes.forEach(osc => {
            const item = { source: osc, gain: gainNode };
            if (ctx === this.ctx) {
                this.activeSources.add(item);
                osc.onended = () => {
                    this.activeSources.delete(item);
                };
            }
            osc.start(time);
            osc.stop(releaseEndTime);
        });

        return outputNode;
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
                // Note Repeat (Ratchet) - Only for notes <= 2 steps
                if (repeatLikelihood > 0 && Math.random() < repeatLikelihood && (step.duration || 1) <= 2) {
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

    getMaskedContrastPattern() {
        if (!this.contrastPattern || !this.contrastEnabled) return [];
        
        const density = this.seqDensity;
        const baseActiveSteps = this.contrastPattern.filter(s => s && s.active);
        const targetActive = Math.round(baseActiveSteps.length * density);
        
        let priorities = baseActiveSteps.map(step => {
            let score = 1000;
            const i = step.step;
            if (i % 4 === 0) score += 40;
            else if (i % 2 === 0) score += 20;
            else score += 10;
            score += (i * 7 % 13) / 13;
            return { stepIndex: i, score: score };
        });
        
        priorities.sort((a, b) => b.score - a.score);
        
        let maskedActiveIndices = new Set();
        for (let i = 0; i < targetActive; i++) {
            if (priorities[i]) {
                maskedActiveIndices.add(priorities[i].stepIndex);
            }
        }
        
        return this.contrastPattern.map((step, i) => {
            if (!step) return null;
            return {
                ...step,
                active: step.active && maskedActiveIndices.has(i)
            };
        });
    }

    classifySlicesForDrumKit() {
        const instruments = ['kick', 'snare', 'clap', 'chat', 'ohat', 'tom', 'perc', 'cymbal'];
        let mapping = {};
        
        if (!this.slices || this.slices.length === 0) {
            instruments.forEach((inst, idx) => mapping[inst] = 0);
            return mapping;
        }

        let candidates = {};
        instruments.forEach(inst => candidates[inst] = []);
        
        this.slices.forEach((slice, idx) => {
            if (idx === 0 && this.slices.length > 1) return;
            if (slice && slice.pitch && slice.pitch.drumType) {
                const t = slice.pitch.drumType;
                if (candidates[t]) candidates[t].push(idx);
            }
        });

        const fallbacks = {
            kick: ['tom', 'perc'],
            snare: ['clap', 'chat', 'perc'],
            clap: ['snare', 'chat', 'perc'],
            chat: ['ohat', 'cymbal', 'snare'],
            ohat: ['cymbal', 'chat', 'clap'],
            tom: ['kick', 'perc'],
            perc: ['tom', 'snare'],
            cymbal: ['ohat', 'chat']
        };

        instruments.forEach((inst, trackIdx) => {
            if (candidates[inst] && candidates[inst].length > 0) {
                mapping[inst] = candidates[inst][0];
            } else {
                let found = false;
                if (fallbacks[inst]) {
                    for (let fb of fallbacks[inst]) {
                        if (candidates[fb] && candidates[fb].length > 0) {
                            mapping[inst] = candidates[fb][0];
                            found = true;
                            break;
                        }
                    }
                }
                if (!found) {
                    const validLen = this.slices.length > 1 ? this.slices.length - 1 : 1;
                    mapping[inst] = this.slices.length > 1 ? 1 + (trackIdx % validLen) : 0;
                }
            }
        });
        
        return mapping;
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

    _createSynthDrumHit(instrument, time, holdDur, ctx, destination, gainMult = 1.0) {
        const dest = destination || (this.fxEnabled ? this.eqLow : this.globalGain);
        const gainNode = ctx.createGain();
        gainNode.connect(dest);
        
        const createNoiseBuffer = (dur) => {
            const frameCount = ctx.sampleRate * dur;
            const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < frameCount; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            return buffer;
        };

        const subNodes = [];

        if (instrument === 'kick') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(120, time);
            osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
            
            gainNode.gain.setValueAtTime(0.8 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.25);
            
            osc.connect(gainNode);
            subNodes.push({ source: osc, end: time + 0.25 });
        } else if (instrument === 'snare') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(180, time);
            osc.frequency.exponentialRampToValueAtTime(120, time + 0.05);
            
            const toneGain = ctx.createGain();
            toneGain.gain.setValueAtTime(0.5 * gainMult, time);
            toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
            osc.connect(toneGain); toneGain.connect(dest);
            
            const noise = ctx.createBufferSource();
            noise.buffer = createNoiseBuffer(0.2);
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(1000, time);
            
            gainNode.gain.setValueAtTime(0.6 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.18);
            
            noise.connect(filter); filter.connect(gainNode);
            subNodes.push({ source: osc, end: time + 0.18 }, { source: noise, end: time + 0.18 });
        } else if (instrument === 'clap') {
            const noiseBuf = createNoiseBuffer(0.3);
            [0, 0.015, 0.03].forEach((offset, idx) => {
                const noise = ctx.createBufferSource();
                noise.buffer = noiseBuf;
                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(1500 + idx * 200, time + offset);
                filter.Q.setValueAtTime(1.5, time + offset);
                
                const curGain = ctx.createGain();
                curGain.gain.setValueAtTime(0.4 * gainMult, time + offset);
                curGain.gain.exponentialRampToValueAtTime(0.001, time + offset + 0.15);
                
                noise.connect(filter); filter.connect(curGain); curGain.connect(dest);
                subNodes.push({ source: noise, start: time + offset, end: time + offset + 0.15 });
            });
        } else if (instrument === 'chat') {
            const noise = ctx.createBufferSource();
            noise.buffer = createNoiseBuffer(0.1);
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(7000, time);
            
            gainNode.gain.setValueAtTime(0.5 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
            
            noise.connect(filter); filter.connect(gainNode);
            subNodes.push({ source: noise, end: time + 0.04 });
        } else if (instrument === 'ohat') {
            const noise = ctx.createBufferSource();
            noise.buffer = createNoiseBuffer(0.4);
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(6000, time);
            
            gainNode.gain.setValueAtTime(0.5 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
            
            noise.connect(filter); filter.connect(gainNode);
            subNodes.push({ source: noise, end: time + 0.28 });
        } else if (instrument === 'tom') {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(100, time);
            osc.frequency.exponentialRampToValueAtTime(65, time + 0.1);
            
            gainNode.gain.setValueAtTime(0.7 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
            
            osc.connect(gainNode);
            subNodes.push({ source: osc, end: time + 0.2 });
        } else if (instrument === 'perc') {
            const osc = ctx.createOscillator();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(350, time);
            osc.frequency.exponentialRampToValueAtTime(200, time + 0.03);
            
            gainNode.gain.setValueAtTime(0.6 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
            
            osc.connect(gainNode);
            subNodes.push({ source: osc, end: time + 0.08 });
        } else if (instrument === 'cymbal') {
            const noise = ctx.createBufferSource();
            noise.buffer = createNoiseBuffer(0.8);
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(5000, time);
            
            gainNode.gain.setValueAtTime(0.4 * gainMult, time);
            gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
            
            noise.connect(filter); filter.connect(gainNode);
            subNodes.push({ source: noise, end: time + 0.6 });
        }

        subNodes.forEach(item => {
            const src = item.source;
            const startT = item.start || time;
            if (ctx === this.ctx && src.onended !== undefined) {
                const trackItem = { source: src, gain: gainNode };
                this.activeSources.add(trackItem);
                src.onended = () => {
                    this.activeSources.delete(trackItem);
                };
            }
            src.start(startT);
            src.stop(item.end);
        });
    }

    _scheduleNote(stepNumber, baseTime) {
        if (this.globalChoke) {
            this.stopAllNodes();
        }
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

        if (this.kickEnabled && stepNumber % this.stepsPerBeat === 0) {
            this._playKick(baseTime, this.ctx, this.globalGain);
        }

        const triggerStep = (stepData) => {
            if (!stepData || !stepData.active) return;
            if (this.seqProbability < 1.0 && Math.random() > this.seqProbability) return;

            let stepTime = time;
            if (stepData.microTiming) {
                stepTime += stepData.microTiming;
            }

            const isDrumHit = stepData.instrument !== undefined;
            const sliceIdLookup = stepData.sliceId !== undefined ? stepData.sliceId : stepNumber;
            const sliceId = this.slices.length > 0 ? (sliceIdLookup % this.slices.length) : 0;
            const slice = this.slices[sliceId];

            if (!isDrumHit && (!slice || this.slices.length === 0)) return;

            let rate = 1.0;
            if (!isDrumHit && this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
                if (slice && slice.pitch && slice.pitch.midi > 0) {
                    const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode, 2, 4);
                    const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                    let idx = validNotes.indexOf(closestMidi);
                    if (idx !== -1) {
                        idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                        let targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                        targetMidi = Math.max(24, Math.min(102, targetMidi));
                        rate = ScaleQuantizer.getPlaybackRate(slice.pitch.midi, targetMidi);
                    }
                }
            }

            let ratchets = stepData.ratchets || 1;
            const noteSteps = stepData.duration || 1;
            const totalNoteDur = noteSteps * stepDuration;
            const ratchetSpacing = totalNoteDur / ratchets;
            
            for (let r = 0; r < ratchets; r++) {
                let t = stepTime + (r * ratchetSpacing);
                const holdDur = ratchetSpacing * 0.9;
                
                const isLong = noteSteps > 1;
                const isChordTrigger = this.chordsEnabled && stepData.isChord;
                const volMult = isChordTrigger ? 0.45 : 1.0;

                if (this.sampleLevel > 0 && slice && this.slices.length > 0) {
                    const triggerSample = (targetSliceIdx, pitchRate) => this._createSource(targetSliceIdx, t, pitchRate, this.ctx, null, holdDur, volMult * this.sampleLevel, isLong);
                    triggerSample(sliceId, rate);
                    
                    if (isChordTrigger) {
                        const intervals = [3, 4, 7];
                        intervals.forEach((semi, idx) => {
                            const curSliceId = (sliceId + idx + 1) % this.slices.length;
                            const curSlice = this.slices[curSliceId];
                            let curRate = rate * Math.pow(2, semi / 12);
                            if (curSlice && curSlice.pitch && curSlice.pitch.midi > 0 && slice.pitch && slice.pitch.midi > 0) {
                                let rootTargetMidi = slice.pitch.midi + (Math.log2(rate) * 12);
                                let voiceTargetMidi = rootTargetMidi + semi;
                                curRate = ScaleQuantizer.getPlaybackRate(curSlice.pitch.midi, voiceTargetMidi);
                            }
                            triggerSample(curSliceId, curRate);
                        });
                    }
                }

                if (this.toneLevel > 0) {
                    if (isDrumHit) {
                        this._createSynthDrumHit(stepData.instrument, t, holdDur, this.ctx, null, volMult * this.toneLevel);
                    } else if (slice && slice.pitch && slice.pitch.midi > 0) {
                        let targetMidi = slice.pitch.midi;
                        if (this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
                            const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode, 2, 4);
                            const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                            let idx = validNotes.indexOf(closestMidi);
                            if (idx !== -1) {
                                idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                                targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                                targetMidi = Math.max(24, Math.min(102, targetMidi));
                            }
                        }
                        
                        const strategy = this.seqPattern.strategy || 'default';
                        this._createTone(targetMidi, t, holdDur, this.ctx, null, volMult * this.toneLevel, isLong, strategy);

                        if (isChordTrigger) {
                            const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode, 2, 4);
                            let idx = validNotes.indexOf(targetMidi);
                            if (idx !== -1) {
                                [2, 4].forEach(offset => {
                                    if (idx + offset < validNotes.length) {
                                        this._createTone(validNotes[idx + offset], t, holdDur, this.ctx, null, volMult * this.toneLevel, isLong, strategy);
                                    }
                                });
                            }
                        }
                    }
                }
            }
        };

        if (this.seqPattern && this.seqPattern.type === 'drum') {
            if (this.seqPattern.drumTracks) {
                this.seqPattern.drumTracks.forEach(track => {
                    const stepData = track.steps ? track.steps[stepNumber] : null;
                    if (stepData && stepData.active) {
                        triggerStep({
                            ...stepData,
                            sliceId: track.sliceId !== undefined ? track.sliceId : stepData.sliceId,
                            instrument: track.instrument
                        });
                    }
                });
            }
        } else {
            const maskedPattern = this.getMaskedPattern();
            triggerStep(maskedPattern[stepNumber]);

            if (this.contrastEnabled && this.contrastPattern) {
                const maskedContrast = this.getMaskedContrastPattern();
                triggerStep(maskedContrast[stepNumber]);
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
        const stepDuration = 0.25 * secondsPerBeat;
        const loopDuration = this.seqPattern.length * stepDuration;
        const totalTime = (loopDuration * 2) + 2.0; // Two loops + 2s tail for reverb/delay
        
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

        const maskedPattern = this.getMaskedPattern();
        const maskedContrastPattern = this.getMaskedContrastPattern();
        
        for (let loop = 0; loop < 2; loop++) {
            const loopOffset = loop * loopDuration;
            
            for(let stepNumber=0; stepNumber < this.seqPattern.length; stepNumber++) {
                const baseTime = loopOffset + (stepNumber * stepDuration);
                
                if (this.kickEnabled && stepNumber % this.stepsPerBeat === 0 && includeEffects) {
                    this._playKick(baseTime, offlineCtx, finalDest);
                }

                const renderStep = (stepData) => {
                    if (!stepData || !stepData.active) return;

                    let time = baseTime;
                    if (stepData.microTiming) {
                        time += stepData.microTiming;
                    }

                    const isDrumHit = stepData.instrument !== undefined;
                    const sliceIdLookup = stepData.sliceId !== undefined ? stepData.sliceId : stepNumber;
                    const sliceId = this.slices.length > 0 ? (sliceIdLookup % this.slices.length) : 0;
                    const slice = this.slices[sliceId];

                    if (!isDrumHit && (!slice || this.slices.length === 0)) return;

                    let rate = 1.0;
                    if (!isDrumHit && this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
                        if (slice && slice.pitch && slice.pitch.midi > 0) {
                            const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode, 2, 4);
                            const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                            let idx = validNotes.indexOf(closestMidi);
                            if (idx !== -1) {
                                idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                                let targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                                targetMidi = Math.max(24, Math.min(102, targetMidi));
                                rate = ScaleQuantizer.getPlaybackRate(slice.pitch.midi, targetMidi);
                            }
                        }
                    }

                    let ratchets = stepData.ratchets || 1;
                    const noteSteps = stepData.duration || 1;
                    const totalNoteDur = noteSteps * stepDuration;
                    const ratchetSpacing = totalNoteDur / ratchets;
                    const isLong = noteSteps > 1;
                    const isChordTrigger = this.chordsEnabled && stepData.isChord;
                    const volMult = isChordTrigger ? 0.45 : 1.0;

                    for (let r = 0; r < ratchets; r++) {
                        let t = time + (r * ratchetSpacing);
                        const holdDur = ratchetSpacing * 0.9;
                        
                        if (this.sampleLevel > 0 && slice && this.slices.length > 0) {
                            this._createSource(sliceId, t, rate, offlineCtx, finalDest, holdDur, volMult * this.sampleLevel, isLong);
                            if (isChordTrigger) {
                                const intervals = [3, 4, 7];
                                intervals.forEach((semi, idx) => {
                                    const curSliceId = (sliceId + idx + 1) % this.slices.length;
                                    const curSlice = this.slices[curSliceId];
                                    let curRate = rate * Math.pow(2, semi / 12);
                                    if (curSlice && curSlice.pitch && curSlice.pitch.midi > 0 && slice.pitch && slice.pitch.midi > 0) {
                                        let rootTargetMidi = slice.pitch.midi + (Math.log2(rate) * 12);
                                        let voiceTargetMidi = rootTargetMidi + semi;
                                        curRate = ScaleQuantizer.getPlaybackRate(curSlice.pitch.midi, voiceTargetMidi);
                                    }
                                    this._createSource(curSliceId, t, curRate, offlineCtx, finalDest, holdDur, volMult * this.sampleLevel, isLong);
                                });
                            }
                        }

                        if (this.toneLevel > 0) {
                            if (isDrumHit) {
                                this._createSynthDrumHit(stepData.instrument, t, holdDur, offlineCtx, finalDest, volMult * this.toneLevel);
                            } else if (slice && slice.pitch && slice.pitch.midi > 0) {
                                let targetMidi = slice.pitch.midi;
                                if (this.seqPattern.type === 'melodic' && stepData.melodicOffset !== undefined) {
                                    const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode, 2, 4);
                                    const closestMidi = ScaleQuantizer.quantizeMidi(slice.pitch.midi, this.musicalKey, this.musicalMode);
                                    let idx = validNotes.indexOf(closestMidi);
                                    if (idx !== -1) {
                                        idx = Math.max(0, Math.min(validNotes.length - 1, idx + stepData.melodicOffset));
                                        targetMidi = validNotes[idx] + (this.musicalOctave * 12);
                                        targetMidi = Math.max(24, Math.min(102, targetMidi));
                                    }
                                }
                                const strategy = this.seqPattern.strategy || 'default';
                                this._createTone(targetMidi, t, holdDur, offlineCtx, finalDest, volMult * this.toneLevel, isLong, strategy);
                                if (isChordTrigger) {
                                    const validNotes = ScaleQuantizer.getValidMidiNotes(this.musicalKey, this.musicalMode, 2, 4);
                                    let idx = validNotes.indexOf(targetMidi);
                                    if (idx !== -1) {
                                        [2, 4].forEach(offset => {
                                            if (idx + offset < validNotes.length) {
                                                this._createTone(validNotes[idx + offset], t, holdDur, offlineCtx, finalDest, volMult * this.toneLevel, isLong, strategy);
                                            }
                                        });
                                    }
                                }
                            }
                        }
                    }
                };

                if (this.seqPattern && this.seqPattern.type === 'drum') {
                    if (this.seqPattern.drumTracks) {
                        this.seqPattern.drumTracks.forEach(track => {
                            const stepData = track.steps ? track.steps[stepNumber] : null;
                            if (stepData && stepData.active) {
                                renderStep({
                                    ...stepData,
                                    sliceId: track.sliceId !== undefined ? track.sliceId : stepData.sliceId,
                                    instrument: track.instrument
                                });
                            }
                        });
                    }
                } else {
                    renderStep(maskedPattern[stepNumber]);

                    if (this.contrastEnabled && maskedContrastPattern) {
                        renderStep(maskedContrastPattern[stepNumber]);
                    }
                }
            }
        }

        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
    }
}
