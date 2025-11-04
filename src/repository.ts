import * as Cypher from "@neo4j/cypher-builder";
import type { QueryResult, Result, Rules } from "neo4j-driver";
import type { OGM, OGMSchema } from "./ogm.js";
import { LazyRelationship } from "./relationships.js";
import { schemaToRules } from "./schemaToRules.js";
import { RelationshipAnnotation } from "./typeAnnotation.js";

export class NodeRepository<T extends Record<string, any> = Record<string, any>> {
    private schema: OGMSchema;
    private ogm: OGM;
    private label: string;

    constructor(ogm: OGM, label: string, schema: OGMSchema) {
        this.schema = schema;
        this.ogm = ogm;
        this.label = label;
    }

    public async find(
        where: Record<string, any>,
        relationships?: Record<string, boolean | Record<string, any>>
    ): Promise<T[]> {
        const node = new Cypher.Node();

        // NOTE: There is a bug with this approach, as schema is modified
        const schema: OGMSchema = relationships !== undefined ? buildSchema(this.schema, relationships) : this.schema;
        const parsedPredicates = this.getPredicates(where, schemaToRules(schema));

        const projection = this.getProjection(node, schema);

        const query = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        ).where(node, parsedPredicates);

        const subqueries = this.addRelationshipsToQueryAndProjection(node, projection, schema);

        const queryWithRelationships = Cypher.utils.concat(query, ...subqueries, new Cypher.Return(...projection));

        console.log(queryWithRelationships);
        const { cypher, params } = query.build();

        const results = this.addLazyRelationships(
            await this.ogm.runCypher<T>(cypher, params, schemaToRules(schema)),
            schema
        );
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

        const match = new Cypher.Match(
            new Cypher.Pattern(node, {
                labels: [this.label],
            })
        ).where(node, parsedPredicates);

        const subqueries = this.addRelationshipsToQueryAndProjection(node, projection, this.schema);

        match.set(...inputParams);

        match.with("*");

        const queryWithRelationships = Cypher.utils.concat(match, ...subqueries, new Cypher.Return(...projection));

        console.log(queryWithRelationships);
        const { cypher, params } = queryWithRelationships.build();

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
        return Object.keys(schema)
            .filter((value) => !(schema[value] instanceof RelationshipAnnotation))
            .map((key) => {
                return [node.property(key), key];
            });
    }

    private addRelationshipsToQueryAndProjection(
        node: Cypher.Node,
        projection: Array<[Cypher.Expr, string]>,
        schema: OGMSchema
    ): Cypher.Call[] {
        const subqueries: Cypher.Call[] = [];
        for (const [key, value] of Object.entries(schema).filter((val) => {
            if (val[1] instanceof RelationshipAnnotation && val[1].eager === true) {
                return true;
            }
            return false;
        })) {
            const relationshipSchema = value as RelationshipAnnotation;
            const relNode = new Cypher.Node();
            const rel = new Cypher.Relationship();
            const relname = new Cypher.NamedVariable(key);

            const match = new Cypher.Match(
                new Cypher.Pattern(node)
                    .related(rel, {
                        type: relationshipSchema.label,
                        direction: relationshipSchema.direction == "IN" ? "left" : "right",
                    })
                    .to(relNode)
            );

            const relationshipProjection = this.getProjection(relNode, relationshipSchema.targetNodeSchema);
            relationshipProjection.push([Cypher.properties(rel), "relationshipProperties"]);
            const nestedSubqueries = this.addRelationshipsToQueryAndProjection(
                relNode,
                relationshipProjection,
                relationshipSchema.targetNodeSchema
            );
            const relationshipProjectionRecord: Record<string, Cypher.Expr> = {};
            relationshipProjection.forEach(([value, key]) => (relationshipProjectionRecord[key] = value));
            projection.push([relname, key]);
            // lastQuery = lastQuery.call(subquery);

            subqueries.push(
                new Cypher.Call(
                    Cypher.utils.concat(
                        match,
                        ...nestedSubqueries,
                        new Cypher.Return([Cypher.collect(new Cypher.Map(relationshipProjectionRecord)), key])
                    )
                )
            );
        }
        return subqueries;
    }

    // <Clause Call> """
    //     MATCH (this0:Movie)
    //     WHERE this0.title = $param0
    //     CALL {
    //         MATCH (this0)<-[this1:ACTED_IN]-(this2)
    //         CALL {
    //             MATCH (this2)-[this3:ACTED_IN]->(this4)
    //             RETURN collect({ relationshipProperties: properties(this3) }) AS roles
    //         }
    //         RETURN collect({ id: this2.id, name: this2.name, born: this2.born, relationshipProperties: properties(this1), roles: roles }) AS actors
    //     }
    //     RETURN this0.id AS id, this0.title AS title, this0.released AS released, actors AS actors
    // """

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
        const relationships = Object.keys(this.schema)
            .filter((value) => this.schema[value] instanceof RelationshipAnnotation)
            .map((key) => {
                return [new Cypher.List([]), key];
            });
        return predicate.concat(relationships);
    }

    private addLazyRelationships(results: QueryResult, schema: OGMSchema) {
        Object.entries(schema).forEach(([key, value]) => {
            if (value instanceof RelationshipAnnotation && value.eager === false) {
                console.log(results)
                results.records.forEach((record) => {
                    // @ts-ignore
                    record[key] = new LazyRelationship(value.label, value.direction, value.targetNodeSchema);
                });
            }
        });
        return results;
    }
}

function buildSchema(schema: OGMSchema, relationships: Record<string, boolean | Record<string, any>>): OGMSchema {
    const newSchema = cloneSchema(schema);
    for (const [key, value] of Object.entries(relationships)) {
        if (value instanceof Object) {
            (newSchema[key] as RelationshipAnnotation).targetNodeSchema = buildSchema(
                (newSchema[key] as RelationshipAnnotation).targetNodeSchema,
                value
            );
            (newSchema[key] as RelationshipAnnotation).eager = true;
        } else if (value === true) {
            (newSchema[key] as RelationshipAnnotation).eager = true;
        }
    }
    return newSchema;
}

function cloneSchema(schema: OGMSchema): OGMSchema {
    return Object.entries(schema).reduce<OGMSchema>((acc, [key, value]) => {
        acc[key] = value.clone();
        return acc;
    }, {});
}
