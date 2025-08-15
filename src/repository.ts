import * as Cypher from "@neo4j/cypher-builder";
import type { Rules } from "./mapping/mapping.js";
import type { OGM, OGMSchema } from "./ogm.js";
import { RelationshipAnnotation } from "./typeAnnotation.js";
import { PlaceholderRelationships } from "./relationships.js";
import { schemaToRules } from "./schemaToRules.js";

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

        const queryWithRelationships = this.addRelationshipsToQueryAndProjection(node, query, projection)
        
        queryWithRelationships.return(...projection);

        console.log(queryWithRelationships);
        const { cypher, params } = query.build();

        const results =  this.addLazyRelationships(await this.ogm.runCypher<T>(cypher, params, this.rules));
        return results;
    }

    public async create(data: T): Promise<T> {
        const node = new Cypher.Node();

        const inputParams = this.getInputParams(node, data);

        const projection = this.addEmptyRelationships(this.getProjection(node));

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

        const queryWithRelationships = this.addRelationshipsToQueryAndProjection(node, query, projection)

        queryWithRelationships.set(...inputParams)
        queryWithRelationships.return(...projection);

        console.log(queryWithRelationships);
        const { cypher, params } = query.build();

        const results = await this.ogm.runCypher<T>(cypher, params, this.rules);

        return results;
    }

    public async delete(where: Record<string, any>): Promise<void> {
        const node = new Cypher.Node();

        const parsedPredicates = this.getPredicates(where);

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        )
            .where(node, parsedPredicates)
            .delete(node);

        console.log(query);
        const { cypher, params } = query.build();

        await this.ogm.runCypher<T>(cypher, params, this.rules);
    }

    private getProjection(node: Cypher.Node): Array<[Cypher.Expr, string]> {
        return Object.keys(this.schema).filter(value => !(this.schema[value] instanceof RelationshipAnnotation)).map((key) => {
            return [node.property(key), key];
        });
    }

    private addRelationshipsToQueryAndProjection(node: Cypher.Node, query: Cypher.Match, projection: Array<[Cypher.Expr, string]>) {
        let lastQuery = query
        for (const [key, value] of Object.entries(this.schema).filter((val) => {
            if (val[1] instanceof RelationshipAnnotation && val[1].eager === true) {
                return true
            }
            return false
        })) {
            const relationshipSchema = value as RelationshipAnnotation
            const relNode = new Cypher.Node()
            const rel = new Cypher.Relationship()
            lastQuery = lastQuery.optionalMatch(new Cypher.Pattern(node)
                .related(rel, { type: relationshipSchema.label, direction: relationshipSchema.direction == "IN" ? "left" : "right" })
                .to(relNode))
            const relationshipProjection = this.getRelationshipProjection(relNode, relationshipSchema.targetNodeSchema)
            relationshipProjection.relationshipProperties = Cypher.properties(rel)
            projection.push([Cypher.collect(new Cypher.Map(relationshipProjection)), key])
        }
        return lastQuery
    }

    private getRelationshipProjection(node: Cypher.Node, schema: OGMSchema): Record<string, Cypher.Expr> {
        const record: Record<string, Cypher.Expr> = {}
        Object.keys(schema).filter(value => !(schema[value] instanceof RelationshipAnnotation)).forEach((key) => {
            record[key] = node.property(key);
        });
        return record
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

    private addEmptyRelationships(predicate: any) {
        const relationships = Object.keys(this.schema).filter(value => this.schema[value] instanceof RelationshipAnnotation).map((key) => {
            return [new Cypher.List([]), key];
        });
        return predicate.concat(relationships)
    }

    private addLazyRelationships(results: any[]) {
        Object.entries(this.schema).forEach(([key, value]) => {
            if( (value instanceof RelationshipAnnotation && value.eager === false)) {
                results.forEach(result => result[key] = new PlaceholderRelationships(value.label, value.direction, value.targetNodeSchema))
            }
        });
        return results
    }
}
