import { type Rules, as } from "./mapping/mapping.js";
import { rule } from "./mapping/rulesfactories.js";
import type { OGMSchema } from "./ogm.js";
import { OGMNumber, OGMString, RelationshipAnnotation } from "./typeAnnotation.js";

interface Gettable { get: <V>(key: string) => V }

export function schemaToRules(schema: OGMSchema): Rules {
    const rules: OGMSchema = {};

    for (const [key, value] of Object.entries(schema)) {
        if (value === OGMNumber) {
            rules[key] = rule.asNumber();
        } else if (value === OGMString) {
            rules[key] = rule.asString();
        }
        else if (value instanceof RelationshipAnnotation) {
            if(value.eager) {
                rules[key] = rule.asList({apply: {convert: (val) => {
                        let obj: any = as(objToGettable(val), schemaToRules(value.targetNodeSchema))
                        obj.getRelationshipProperties = () => val.relationshipProperties
                        return obj
                    }
                }})
            }
        }
    }
    return rules;
}



function objToGettable(obj: Record<string, any>): Gettable {
    const gettable = obj
    gettable.get = (key: string) => obj[key]
    return gettable as Gettable
}
