import type { OGMSchema } from "./ogm.js";

export abstract class SchemaAnnotation {
    public clone() {
        return new (this.constructor as any)();
    }
}

export class NumberAnnotation extends SchemaAnnotation {}

export class StringAnnotation extends SchemaAnnotation {}

export class IdAnnotation extends StringAnnotation {}

export type Direction = "IN" | "OUT";

export class RelationshipAnnotation extends SchemaAnnotation {
    //propertiesSchema: OGMSchema
    targetNodeSchema: OGMSchema;
    label: string;
    direction: Direction;
    eager: boolean;
    constructor(targetNodeSchema: OGMSchema, label: string, direction: Direction, config?: { eager?: boolean }) {
        super();
        this.targetNodeSchema = targetNodeSchema;
        this.label = label;
        this.direction = direction;
        if (config?.eager === undefined) {
            this.eager = false;
        } else {
            this.eager = config.eager;
        }
    }

    public clone() {
        return new RelationshipAnnotation(this.targetNodeSchema, this.label, this.direction, {
            eager: this.eager,
        });
    }
}

export function OGMRelationship(
    callback: () => OGMSchema,
    label: string,
    direction: Direction,
    config?: { eager?: boolean }
) {
    return new RelationshipAnnotation(callback(), label, direction, config);
}

export const OGMString = new StringAnnotation();
export const OGMNumber = new NumberAnnotation();
export const OGMId = new IdAnnotation();
