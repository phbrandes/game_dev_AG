/**
 * Mulberry32 Pseudo-Random Number Generator.
 * Math.random() is strictly banned. Use this class for ALL randomness.
 * Initialize with a hardcoded seed in tests for 100% reproducible runs.
 */
export class SeededPRNG {
    private state: number;

    constructor(seed: string | number) {
        this.state = SeededPRNG.hashSeed(seed);
    }

    private static hashSeed(seed: string | number): number {
        if (typeof seed === 'number') {
            return (seed | 0) >>> 0;
        }
        // FNV-1a string hash
        let h: number = 0x811c9dc5;
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i);
            h = Math.imul(h, 0x01000193) >>> 0;
        }
        return h;
    }

    /** Returns a float in [0, 1). */
    public next(): number {
        this.state += 0x6D2B79F5;
        let t: number = Math.imul(this.state ^ (this.state >>> 15), this.state | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
    }

    /** Returns a float in [min, max). */
    public nextFloat(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /** Returns an integer in [min, max] (inclusive). */
    public nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}
