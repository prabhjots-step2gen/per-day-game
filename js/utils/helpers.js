/**
 * Helpers — shared utility functions for all games.
 */
const Helpers = {
    /**
     * Random float between min and max (inclusive).
     */
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    /**
     * Random integer between min and max (inclusive).
     */
    randomInt(min, max) {
        return Math.floor(this.random(min, max + 1));
    },

    /**
     * Pick a random element from an array.
     */
    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /**
     * Shuffle an array (Fisher-Yates). Returns a new shuffled array.
     */
    shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    },

    /**
     * Clamp a value between min and max.
     */
    clamp(val, min, max) {
        return Math.min(Math.max(val, min), max);
    },

    /**
     * Linear interpolation.
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },

    /**
     * Convert degrees to radians.
     */
    degToRad(deg) {
        return deg * Math.PI / 180;
    },

    /**
     * Convert radians to degrees.
     */
    radToDeg(rad) {
        return rad * 180 / Math.PI;
    },

    /**
     * Euclidean distance between two 3D points (objects with x, y, z).
     */
    distance3D(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dz = p1.z - p2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },

    /**
     * Parse a hex color string (#FF6B6B) into {r, g, b}.
     */
    hexToRGB(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            }
            : null;
    },

    /**
     * Show a brief toast notification at the top of the screen.
     * @param {string} message
     * @param {number} [duration=2000] - ms to show
     */
    showToast(message, duration = 2000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Force reflow to trigger transition
        void toast.offsetHeight;
        toast.classList.add('toast-visible');

        setTimeout(() => {
            toast.classList.remove('toast-visible');
            setTimeout(() => toast.remove(), 350);
        }, duration);
    },

    /**
     * Debounce a function by a delay in ms.
     */
    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    /**
     * Create a THREE.Color from a CSS hex string.
     * @param {string} hex - e.g. '#FF6B6B'
     * @returns {THREE.Color}
     */
    threeColor(hex) {
        return new THREE.Color(hex);
    }
};
