import { Point2D } from './Types';
import { GridMap } from './GridMap';

export interface IPowerNode {
    readonly position: Point2D;
    
    // Positive for generation, negative for consumption
    getPowerDelta(): number;
    
    // Callback to receive the calculated power ratio (0.0 to 1.0)
    setPowerRatio(ratio: number): void;
}

export class PowerNetwork {
    public nodes: IPowerNode[] = [];
    public totalGenerated: number = 0;
    public totalConsumed: number = 0;
    public powerRatio: number = 0;

    public calculateRatio(): void {
        this.totalGenerated = 0;
        this.totalConsumed = 0;

        for (const node of this.nodes) {
            const delta = node.getPowerDelta();
            if (delta > 0) {
                this.totalGenerated += delta;
            } else if (delta < 0) {
                this.totalConsumed += Math.abs(delta);
            }
        }

        if (this.totalConsumed === 0) {
            this.powerRatio = 1.0;
        } else {
            this.powerRatio = Math.min(1.0, this.totalGenerated / this.totalConsumed);
        }
    }

    public applyRatio(): void {
        for (const node of this.nodes) {
            // Producers always operate at 1.0 (unless we want to throttle them, but generally consumers are throttled)
            // But we pass the ratio to everyone, they can choose what to do.
            node.setPowerRatio(this.powerRatio);
        }
    }
}

export class PowerGridManager {
    private gridMap: GridMap;
    private powerNodes: IPowerNode[] = [];
    private networks: PowerNetwork[] = [];

    constructor(gridMap: GridMap) {
        this.gridMap = gridMap;
    }

    public registerNode(node: IPowerNode): void {
        this.powerNodes.push(node);
    }

    public removeNode(node: IPowerNode): void {
        const idx = this.powerNodes.indexOf(node);
        if (idx !== -1) {
            this.powerNodes.splice(idx, 1);
        }
    }

    public rebuildNetworks(): void {
        this.networks = [];
        
        // Track visited cells to avoid infinite loops during flood fill
        const visited = new Set<number>();
        const width = this.gridMap.width;

        const getIndex = (x: number, y: number) => y * width + x;

        // Group nodes by position for fast lookup during flood fill
        const nodesByPos = new Map<number, IPowerNode[]>();
        for (const node of this.powerNodes) {
            const idx = getIndex(node.position.x, node.position.y);
            if (!nodesByPos.has(idx)) {
                nodesByPos.set(idx, []);
            }
            nodesByPos.get(idx)!.push(node);
        }

        // We should also ensure nodes that are NOT on any signal get their own isolated network (or power ratio 0)
        const unassignedNodes = new Set(this.powerNodes);

        for (let y = 0; y < this.gridMap.height; y++) {
            for (let x = 0; x < this.gridMap.width; x++) {
                const signal = this.gridMap.getSignal(x, y);
                const idx = getIndex(x, y);
                
                if (signal > 0 && !visited.has(idx)) {
                    // Start flood fill
                    const network = new PowerNetwork();
                    const queue: Point2D[] = [{ x, y }];
                    visited.add(idx);

                    while (queue.length > 0) {
                        const current = queue.shift()!;
                        const cIdx = getIndex(current.x, current.y);
                        
                        // Attach nodes at this position
                        if (nodesByPos.has(cIdx)) {
                            for (const node of nodesByPos.get(cIdx)!) {
                                network.nodes.push(node);
                                unassignedNodes.delete(node);
                            }
                        }

                        // Check neighbors (N, E, S, W)
                        const neighbors = [
                            { x: current.x, y: current.y - 1 },
                            { x: current.x + 1, y: current.y },
                            { x: current.x, y: current.y + 1 },
                            { x: current.x - 1, y: current.y }
                        ];

                        for (const n of neighbors) {
                            if (!this.gridMap.isOutOfBounds(n.x, n.y)) {
                                const nIdx = getIndex(n.x, n.y);
                                if (!visited.has(nIdx) && this.gridMap.getSignal(n.x, n.y) > 0) {
                                    visited.add(nIdx);
                                    queue.push(n);
                                }
                            }
                        }
                    }

                    if (network.nodes.length > 0) {
                        this.networks.push(network);
                    }
                }
            }
        }

        // Any unassigned nodes (not on a conductive signal) get 0 power
        for (const node of unassignedNodes) {
            node.setPowerRatio(0);
        }

        // Calculate and apply ratios
        for (const network of this.networks) {
            network.calculateRatio();
            network.applyRatio();
        }
    }

    public update(): void {
        // In a real scenario we might only rebuild when signal layer changes
        this.rebuildNetworks();
    }
    
    // For tests
    public getNetworks(): PowerNetwork[] {
        return this.networks;
    }
}
