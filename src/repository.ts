import * as Cypher from "@neo4j/cypher-builder";
import type { Rules } from "./mapping/mapping.js";
import { rule } from "./mapping/rulesfactories.js";
import type { OGM, OGMSchema } from "./ogm.js";
import { OGMNumber, OGMString } from "./typeAnnotation.js";

export class NodeRepository<T extends Record<string, any> = Record<string, any>> {
    private schema: OGMSchema;
    private ogm: OGM;
    private label: string;
    private rules: Rules;

    constructor(ogm: OGM, label: string, schema: OGMSchema) {
        this.schema = schema;
        this.ogm = ogm;
        this.label = label;
        this.rules = schemaToRules(schema);
    }

    public async find(where: Record<string, any>): Promise<T[]> {
        const node = new Cypher.Node();

        const parsedPredicates = this.getPredicates(where);

        const projection = this.getProjection(node);

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        )
            .where(node, parsedPredicates)
            .return(...projection);

        console.log(query);
        const { cypher, params } = query.build();

        const results = await this.ogm.runCypher<T>(cypher, params, this.rules);

        return results;
    }

    public async create(data: T): Promise<T> {
        const node = new Cypher.Node();

        const inputParams = this.getInputParams(node, data);

        const projection = this.getProjection(node);

        const query = new Cypher.Create(new Cypher.Pattern(node, { labels: [this.label] }))
            .set(...inputParams)
            .return(...projection);
        console.log(query);
        const { cypher, params } = query.build();

        const result = await this.ogm.runCypher<T>(cypher, params, this.rules);
        return result[0]!;
    }

    public async update(where: Record<string, any>, values: Partial<T>): Promise<T[]> {
        const node = new Cypher.Node();

        const parsedPredicates = this.getPredicates(where);
        const inputParams = this.getInputParams(node, values);

        const projection = this.getProjection(node);

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        )
            .where(node, parsedPredicates)
            .set(...inputParams)
            .return(...projection);

        console.log(query);
        const { cypher, params } = query.build();

        const results = await this.ogm.runCypher<T>(cypher, params, this.rules);

        return results;
    }

    private getProjection(node: Cypher.Node): Array<[Cypher.Expr, string]> {
        return Object.keys(this.schema).map((key) => {
            return [node.property(key), key];
        });
    }

    private getPredicates(where: Record<string, any>): Record<string, Cypher.Param> {
        return Object.entries(where).reduce((acc, [key, value]) => {
            if (this.rules[key]?.validate !== undefined) {
                this.rules[key].validate(value, key);
            }
            acc[key] = new Cypher.Param(value);
            return acc;
        }, {} as Record<string, Cypher.Param>);
    }

    private getInputParams(node: Cypher.Node, data: Partial<T>): Array<[Cypher.Property, Cypher.Param]> {
        return Object.entries(data).map(([key, value]) => {
            return [node.property(key), new Cypher.Param(value)];
        });
    }
}

function schemaToRules(schema: OGMSchema): Rules {
    const rules: OGMSchema = {};

    for (const [key, value] of Object.entries(schema)) {
        if (value === OGMNumber) {
            rules[key] = rule.asNumber();
        } else if (value === OGMString) {
            rules[key] = rule.asString();
        }
    }
    return rules;
}
