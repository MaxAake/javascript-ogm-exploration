import * as Cypher from "@neo4j/cypher-builder";
import type { OGM, OGMSchema } from "./ogm.js";
import type { Rules } from "./mapping/mapping.js";
import { OGMNumber, OGMString } from "./typeAnnotation.js";
import { rule } from "./mapping/rulesfactories.js";

export class NodeRepository<T extends Record<string, any> = Record<string, any>> {
    private schema: OGMSchema;
    private ogm: OGM;
    private label: string;
    private rules: Rules;

    constructor(ogm: OGM, label: string, schema: OGMSchema) {
        this.schema = schema;
        this.ogm = ogm;
        this.label = label;
        this.rules = schemaToRules(schema)
    }

    public async find(where: Record<string, any>): Promise<T[]> {
        const movieNode = new Cypher.Node();

        const parsedPredicates = Object.entries(where).reduce((acc, [key, value]) => {
            acc[key] = new Cypher.Param(value);
            return acc;
        }, {} as Record<string, Cypher.Param>);

        const projection: Array<[Cypher.Expr, string]> = Object.keys(this.schema).map((key) => {
            return [movieNode.property(key), key];
        });

        const query = new Cypher.Match(
            new Cypher.Pattern(movieNode, {
                labels: [this.label],
            })
        )
            .where(movieNode, parsedPredicates)
            .return(...projection);

        console.log(query);
        const { cypher, params } = query.build();

        const results = await this.ogm.runCypher<T>(cypher, params, this.rules);

        return results;
    }
}

function schemaToRules(schema: OGMSchema): Rules {
    const rules: OGMSchema = {}

    for (const [key, value] of Object.entries(schema)) {
        if (value === OGMNumber) {
            rules[key] = rule.asNumber()
        }
        else if (value === OGMString) {
            rules[key] = rule.asString()
        }
    }
    return rules
}
