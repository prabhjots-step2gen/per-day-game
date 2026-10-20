/**
 * Sound Manager — Web Audio API based sound effects.
 * No external audio files needed; all sounds are generated with oscillators.
 *
 * Usage:
 *   SoundManager.play('click');
 *   SoundManager.play('success');
 *   SoundManager.play('pop');
 *
 * Sound types:
 *   'click'    — short click (button presses, navigation)
 *   'success'  — ascending arpeggio (correct answer, completion)
 *   'error'    — low buzz (wrong answer, gentle)
 *   'pop'      — quick pop (object interaction)
 *   'sparkle'  — twinkling sparkles (celebration, magic effect)
 *   'bounce'   — rising pitch (bouncing objects)
 */
const SoundManager = {
    _ctx: null,
    _muted: false,

    /**
     * Initialize the AudioContext.
     * Must be called after a user gesture (click/tap) due to browser autoplay policy.
     * Safe to call multiple times — only initializes once.
     */
    init() {
        if (this._ctx) return;
        this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    },

    /**
     * Ensure the audio context is running.
     * Call this at the start of any sound if you're unsure of the context state.
     */
    _ensureContext() {
        if (!this._ctx) this.init();
        if (this._ctx && this._ctx.state === 'suspended') {
            this._ctx.resume();
        }
    },

    /**
     * Play a sound effect by type.
     * @param {string} type - 'click' | 'success' | 'error' | 'pop' | 'sparkle' | 'bounce'
     */
    play(type) {
        if (this._muted) return;
        this._ensureContext();
        if (!this._ctx) return;

        const t = this._ctx.currentTime;

        switch (type) {
            case 'click':   this._click(t);    break;
            case 'success': this._success(t);  break;
            case 'error':   this._error(t);    break;
            case 'pop':     this._pop(t);      break;
            case 'sparkle': this._sparkle(t);  break;
            case 'bounce':  this._bounce(t);   break;
            default:        this._click(t);
        }
    },

    /**
     * Toggle mute. Returns true if now muted.
     */
    toggleMute() {
        this._muted = !this._muted;
        return this._muted;
    },

    /**
     * Check if sound is muted.
     */
    isMuted() {
        return this._muted;
    },

    // ==========================================
    // Sound Generators
    // ==========================================

    /** Short click: 800→600 Hz sine, 150ms */
    _click(t) {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.1);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(gain).connect(this._ctx.destination);
        osc.start(t);
        osc.stop(t + 0.15);
    },

    /** Success: C5→E5→G5→C6 arpeggio, 0.4s each */
    _success(t) {
        const notes = [523.25, 659.25, 783.98, 1046.50];
        notes.forEach((freq, i) => {
            const start = t + i * 0.1;
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.12, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
            osc.connect(gain).connect(this._ctx.destination);
            osc.start(start);
            osc.stop(start + 0.4);
        });
    },

    /** Error: 300→200 Hz triangle, 250ms — gentle, not harsh */
    _error(t) {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(200, t + 0.2);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain).connect(this._ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);
    },

    /** Pop: 400→800→400 Hz sine, 120ms — object interaction */
    _pop(t) {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.05);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.1);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain).connect(this._ctx.destination);
        osc.start(t);
        osc.stop(t + 0.12);
    },

    /** Sparkle: 5 ascending random-high tones, twinkly */
    _sparkle(t) {
        for (let i = 0; i < 5; i++) {
            const start = t + i * 0.05;
            const freq = 1000 + i * 300 + Math.random() * 200;
            const osc = this._ctx.createOscillator();
            const gain = this._ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.06, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
            osc.connect(gain).connect(this._ctx.destination);
            osc.start(start);
            osc.stop(start + 0.3);
        }
    },

    /** Bounce: 200→600 Hz sine, 200ms — rising pitch */
    _bounce(t) {
        const osc = this._ctx.createOscillator();
        const gain = this._ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.15);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain).connect(this._ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);
    }
};
