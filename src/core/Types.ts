export type UUID = string & { readonly __uuid: unique symbol };

export function generateUUID(): UUID {
    return crypto.randomUUID() as UUID;
}

export type Point2D = {
    x: number;
    y: number;
};

// integer Orientation (0=N, 1=E, 2=S, 3=W)
export enum Orientation {
    North = 0,
    East = 1,
    South = 2,
    West = 3
}
