import { Relationship, rule, type Rules } from "neo4j-driver";
import type { OGMSchema } from "./ogm.js";
import { OGMId, OGMNumber, OGMString, RelationshipAnnotation } from "./typeAnnotation.js";

export function schemaToRules(schema: OGMSchema): Rules {
    const rules: Rules = {};

    for (const [key, value] of Object.entries(schema)) {
        if (value === OGMNumber) {
            // @ts-ignore
            rules[key] = rule.asNumber();
        } else if (value === OGMString || value === OGMId) {
            // @ts-ignore
            rules[key] = rule.asString();
        }
        else if (value instanceof RelationshipAnnotation) {
            if(value.eager) {
                // @ts-ignore
                rules[key] = rule.asList({apply: {convert: (val: Relationship & {relationshipProperties: any[] }) => {
                        if(Object.entries(val).filter(([_, value]) => value !== null).length === 0) {
                            return undefined
                        }
                        let obj: any = val.as(schemaToRules(value.targetNodeSchema))
                        obj.getRelationshipProperties = () => val.relationshipProperties
                        return obj
                    }}
                })
            }
        }
    }
    return rules;
}
