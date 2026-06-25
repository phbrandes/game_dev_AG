import { GameConfig } from './GameConfig';

const FLOOR_SHIFT = 0;
const FLOOR_MASK = 0xFF; // 8 bits
const ENTITY_SHIFT = 8;
const ENTITY_MASK = 0xFFFF; // 16 bits
const SIGNAL_SHIFT = 24;
const SIGNAL_MASK = 0xFF; // 8 bits

export class GridMap {
    private readonly data: Int32Array;
    public readonly width: number;
    public readonly height: number;

    constructor(width: number = GameConfig.MAP_WIDTH, height: number = GameConfig.MAP_HEIGHT) {
        this.width = width;
        this.height = height;
        this.data = new Int32Array(this.width * this.height);
    }

    private getIndex(x: number, y: number): number {
        return Math.floor(y) * this.width + Math.floor(x);
    }

    public isOutOfBounds(x: number, y: number): boolean {
        return x < 0 || x >= this.width || y < 0 || y >= this.height;
    }

    public getFloor(x: number, y: number): number {
        if (this.isOutOfBounds(x, y)) return 0;
        const val = this.data[this.getIndex(x, y)];
        return (val >>> FLOOR_SHIFT) & FLOOR_MASK;
    }

    public setFloor(x: number, y: number, floorId: number): void {
        if (this.isOutOfBounds(x, y)) return;
        const index = this.getIndex(x, y);
        let val = this.data[index];
        val = (val & ~(FLOOR_MASK << FLOOR_SHIFT)) | ((floorId & FLOOR_MASK) << FLOOR_SHIFT);
        this.data[index] = val;
    }

    public getEntityIndex(x: number, y: number): number {
        if (this.isOutOfBounds(x, y)) return 0;
        const val = this.data[this.getIndex(x, y)];
        return (val >>> ENTITY_SHIFT) & ENTITY_MASK;
    }

    public setEntityIndex(x: number, y: number, entityIndex: number): void {
        if (this.isOutOfBounds(x, y)) return;
        const index = this.getIndex(x, y);
        let val = this.data[index];
        val = (val & ~(ENTITY_MASK << ENTITY_SHIFT)) | ((entityIndex & ENTITY_MASK) << ENTITY_SHIFT);
        this.data[index] = val;
    }

    public getSignal(x: number, y: number): number {
        if (this.isOutOfBounds(x, y)) return 0;
        const val = this.data[this.getIndex(x, y)];
        return (val >>> SIGNAL_SHIFT) & SIGNAL_MASK;
    }

    public setSignal(x: number, y: number, signalLevel: number): void {
        if (this.isOutOfBounds(x, y)) return;
        const index = this.getIndex(x, y);
        let val = this.data[index];
        val = (val & ~(SIGNAL_MASK << SIGNAL_SHIFT)) | ((signalLevel & SIGNAL_MASK) << SIGNAL_SHIFT);
        this.data[index] = val;
    }
}
