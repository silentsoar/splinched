/**
 * sequencer-patterns.js
 * Generates 128 built-in sequencer patterns (64 Rhythmic, 64 Melodic).
 */

const SequencerPatterns = (function() {
    const patterns = [];

    // Helper to create a pattern
    function createPattern(id, name, type, length, generateSteps) {
        let sparseSteps = generateSteps();
        let denseSteps = [];
        for (let i = 0; i < length; i++) {
            let existing = sparseSteps.find(s => s.step === i);
            if (existing) {
                existing.active = true;
                existing.sliceId = i;
                denseSteps.push(existing);
            } else {
                denseSteps.push({ step: i, active: false, sliceId: i });
            }
        }
        return {
            id,
            name,
            type, // 'rhythmic' or 'melodic'
            length, // 16, 32, 64
            steps: denseSteps
        };
    }

    // --- Rhythmic Patterns (0-63) ---
    // 0: 4-on-the-floor
    patterns.push(createPattern(0, "4-on-the-floor", "rhythmic", 16, () => {
        return [{step:0}, {step:4}, {step:8}, {step:12}];
    }));
    
    // 1: Breakbeat
    patterns.push(createPattern(1, "Breakbeat Basic", "rhythmic", 16, () => {
        return [{step:0}, {step:4}, {step:7}, {step:10}, {step:12}];
    }));

    // Generate remaining rhythmic patterns procedurally
    const rhythmNames = ["Syncopated", "Euclidean", "Trap Rolls", "Boom Bap", "House Grooves", "Jungle Breaks", "Dilla Swing"];
    for(let i=2; i<64; i++) {
        let len = (i%3 === 0 ? 64 : (i%2 === 0 ? 32 : 16));
        patterns.push(createPattern(i, `${rhythmNames[i%rhythmNames.length]} ${i}`, "rhythmic", len, () => {
            let steps = [];
            let hits = Math.floor(len * (0.2 + Math.random() * 0.3)); // 20-50% fill
            for(let j=0; j<hits; j++) {
                let stepObj = { step: Math.floor(Math.random() * len) };
                const genre = rhythmNames[i%rhythmNames.length];
                
                // Ratchets for Trap/Jungle
                if (genre === "Trap Rolls" || genre === "Jungle Breaks") {
                    if (Math.random() > 0.7) {
                        stepObj.ratchets = [2, 3, 4][Math.floor(Math.random() * 3)];
                    }
                }
                
                // Micro-timing for Dilla/House
                if (genre === "Dilla Swing" || genre === "House Grooves") {
                    if (Math.random() > 0.5) {
                        stepObj.microTiming = (Math.random() * 0.6) - 0.3; // -0.3 to 0.3
                    }
                }
                steps.push(stepObj);
            }
            // Remove duplicates
            return steps.filter((v, idx, a) => a.findIndex(t => (t.step === v.step)) === idx).sort((a,b)=>a.step-b.step);
        }));
    }

    // --- Melodic Patterns (64-127) ---
    // 64: Arpeggio Up
    patterns.push(createPattern(64, "Arp Up (16th)", "melodic", 16, () => {
        let steps = [];
        for(let i=0; i<16; i++) {
            // melodicOffset represents scale degrees offset (0 = root, 1 = 2nd, 2 = 3rd, etc.)
            // We will let the audio engine interpret this.
            steps.push({ step: i, melodicOffset: i % 8 });
        }
        return steps;
    }));

    // Generate remaining melodic patterns
    const melodicNames = ["Arpeggio Down", "Chord Stabs", "Bassline Groove", "Lead Melody", "Pluck Sequence"];
    for(let i=65; i<128; i++) {
        let len = (i%3 === 0 ? 64 : (i%2 === 0 ? 32 : 16));
        patterns.push(createPattern(i, `${melodicNames[i%melodicNames.length]} ${i-64}`, "melodic", len, () => {
            let steps = [];
            let hits = Math.floor(len * (0.2 + Math.random() * 0.3)); 
            let offsetTracker = 0;
            for(let j=0; j<hits; j++) {
                let s = Math.floor(Math.random() * len);
                offsetTracker += Math.floor(Math.random() * 5) - 2; // Wander -2 to +2
                
                let stepObj = { step: s, melodicOffset: offsetTracker };
                const genre = melodicNames[i%melodicNames.length];
                if (genre === "Bassline Groove" && Math.random() > 0.5) {
                    stepObj.microTiming = (Math.random() * 0.4) - 0.2;
                }
                steps.push(stepObj);
            }
            return steps.filter((v, idx, a) => a.findIndex(t => (t.step === v.step)) === idx).sort((a,b)=>a.step-b.step);
        }));
    }

    
    return patterns;
})();

// Euclidean algorithm using bucket distribution
SequencerPatterns.generateEuclidean = function(steps, pulses) {
    if (pulses > steps) pulses = steps;
    const pattern = [];
    let bucket = 0;
    
    for (let i = 0; i < steps; i++) {
        bucket += pulses;
        if (bucket >= steps) {
            bucket -= steps;
            pattern.push(1);
        } else {
            pattern.push(0);
        }
    }
    
    const seqSteps = [];
    pattern.forEach((val, index) => {
        seqSteps.push({ step: index, active: val === 1, sliceId: index });
    });
    
    const id = "euc_" + Date.now().toString(); // unique ID
    return {
        id: id,
        name: `Euc (${pulses}/${steps})`,
        type: 'rhythmic',
        length: steps,
        steps: seqSteps,
        isCustom: true // marker
    };
};
