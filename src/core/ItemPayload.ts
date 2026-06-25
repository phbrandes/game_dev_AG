import type { UUID } from './Types.js';

export class ItemPayload {
    public readonly typeId: string;
    public readonly instanceId: UUID;
    
    private _subTileProgress: number = 0.0;

    constructor(typeId: string, instanceId: UUID) {
        this.typeId = typeId;
        this.instanceId = instanceId;
    }

    public get subTileProgress(): number {
        return this._subTileProgress;
    }

    public set subTileProgress(value: number) {
        this._subTileProgress = Math.max(0.0, Math.min(1.0, value));
    }
}
