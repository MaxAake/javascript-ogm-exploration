import type { OGMSchema } from "./ogm.js";

export abstract class SchemaAnnotation {}

export class NumberAnnotation extends SchemaAnnotation {}

export class StringAnnotation extends SchemaAnnotation {}

export type Direction = "IN" | "OUT"

export class RelationshipAnnotation extends SchemaAnnotation {
    //propertiesSchema: OGMSchema
    targetNodeSchema: OGMSchema
    label: string
    direction: Direction
    constructor(targetNodeSchema: OGMSchema, label: string, direction: Direction) {
        super()
        this.targetNodeSchema = targetNodeSchema
        this.label = label
        this.direction = direction
    }
}

export function OGMRelationship(callback: () => OGMSchema, label: string, direction: Direction) {
    return new RelationshipAnnotation(callback(), label, direction)
}

export const OGMString = new StringAnnotation();
export const OGMNumber = new NumberAnnotation();
