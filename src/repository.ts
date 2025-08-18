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

    constructor(ogm: OGM, label: string, schema: OGMSchema) {
        this.schema = schema;
        this.ogm = ogm;
        this.label = label;
    }

    public async find(where: Record<string, any>, relationships?: object): Promise<T[]> {
        const node = new Cypher.Node();

        const schema: OGMSchema = relationships !== undefined ? buildSchema(this.schema, relationships) : this.schema
        
        const parsedPredicates = this.getPredicates(where, schemaToRules(this.schema));

        const projection = this.getProjection(node, schema);

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        )
            .where(node, parsedPredicates)

        const queryWithRelationships = this.addRelationshipsToQueryAndProjection(node, query, projection, schema)
        
        queryWithRelationships.return(...projection);

        console.log(queryWithRelationships);
        const { cypher, params } = query.build();

        const results =  this.addLazyRelationships(await this.ogm.runCypher<T>(cypher, params, schemaToRules(schema)));
        return results;
    }

    public async create(data: T): Promise<T> {
        const node = new Cypher.Node();

        const inputParams = this.getInputParams(node, data);

        const projection = this.addEmptyRelationships(this.getProjection(node, this.schema));

        const query = new Cypher.Create(new Cypher.Pattern(node, { labels: [this.label] }))
            .set(...inputParams)
            .return(...projection);
        console.log(query);
        const { cypher, params } = query.build();

        const result = await this.ogm.runCypher<T>(cypher, params, schemaToRules(this.schema));
        return result[0]!;
    }

    public async update(where: Record<string, any>, values: Partial<T>): Promise<T[]> {
        const node = new Cypher.Node();

        const parsedPredicates = this.getPredicates(where, schemaToRules(this.schema));
        const inputParams = this.getInputParams(node, values);

        const projection = this.getProjection(node, this.schema);

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        )
            .where(node, parsedPredicates)

        const queryWithRelationships = this.addRelationshipsToQueryAndProjection(node, query, projection, this.schema)

        queryWithRelationships.set(...inputParams)
        queryWithRelationships.return(...projection);

        console.log(queryWithRelationships);
        const { cypher, params } = query.build();

        const results = await this.ogm.runCypher<T>(cypher, params, schemaToRules(this.schema));

        return results;
    }

    public async delete(where: Record<string, any>): Promise<void> {
        const node = new Cypher.Node();

        const parsedPredicates = this.getPredicates(where, schemaToRules(this.schema));

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        )
            .where(node, parsedPredicates)
            .delete(node);

        console.log(query);
        const { cypher, params } = query.build();

        await this.ogm.runCypher<T>(cypher, params, schemaToRules(this.schema));
    }

    private getProjection(node: Cypher.Node, schema: OGMSchema): Array<[Cypher.Expr, string]> {
        return Object.keys(schema).filter(value => !(schema[value] instanceof RelationshipAnnotation)).map((key) => {
            return [node.property(key), key];
        });
    }

    private addRelationshipsToQueryAndProjection(node: Cypher.Node, query: Cypher.Match, projection: Array<[Cypher.Expr, string]>, schema: OGMSchema) {
        let lastQuery = query
        for (const [key, value] of Object.entries(schema).filter((val) => {
            if (val[1] instanceof RelationshipAnnotation && val[1].eager === true) {
                return true
            }
            return false
        })) {
            const relationshipSchema = value as RelationshipAnnotation
            const relNode = new Cypher.Node()
            const rel = new Cypher.Relationship()
            const relname = new Cypher.NamedVariable(key);

            let subquery = new Cypher.Match(new Cypher.Pattern(node)
                .related(rel, { type: relationshipSchema.label, direction: relationshipSchema.direction == "IN" ? "left" : "right" })
                .to(relNode))

            const relationshipProjection = this.getProjection(relNode, relationshipSchema.targetNodeSchema)
            relationshipProjection.push([Cypher.properties(rel), "relationshipProperties"])
            subquery = this.addRelationshipsToQueryAndProjection(relNode, subquery, relationshipProjection, relationshipSchema.targetNodeSchema)
            const relationshipProjectionRecord:Record<string, Cypher.Expr> = {}
            relationshipProjection.forEach(([value, key]) => relationshipProjectionRecord[key] = value)
            projection.push([relname, key])
            subquery.return(new Cypher.Return([Cypher.collect(new Cypher.Map(relationshipProjectionRecord)), key]))
            lastQuery = lastQuery.call(subquery)
        }
        return lastQuery
    }

    private getPredicates(where: Record<string, any>, rules: Rules): Record<string, Cypher.Param> {
        return Object.entries(where).reduce((acc, [key, value]) => {
            if (rules[key]?.validate !== undefined) {
                rules[key].validate(value, key);
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

function buildSchema(schema: OGMSchema, relationships: object): OGMSchema {
    for(const [key, value] of Object.entries(relationships)) {
        if (value instanceof Object) {
            (schema[key] as RelationshipAnnotation).targetNodeSchema = buildSchema((schema[key] as RelationshipAnnotation).targetNodeSchema, value);
            (schema[key] as RelationshipAnnotation).eager = true;
        }
        else if (value === true) {
            (schema[key] as RelationshipAnnotation).eager = true;
        }
    }
    return schema
}