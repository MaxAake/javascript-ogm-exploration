import type { OGMSchema } from "./ogm.js";
import type { Direction } from "./typeAnnotation.js";

export class PlaceholderRelationships {
    label: string;
    direction: Direction;
    targetNodeSchema: OGMSchema;
    constructor(label: string, direction: Direction, targetNodeSchema: OGMSchema) {
        this.label = label;
        this.direction = direction;
        this.targetNodeSchema = targetNodeSchema;
    }
}
