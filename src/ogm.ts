import * as neo4j from "neo4j-driver";
import { NodeRepository } from "./repository.js";
import type { NumberAnnotation, StringAnnotation } from "./typeAnnotation.js";
import { hydratedResultTransformer } from "./mapping/resulttransformer.js";
import type { Rules } from "./mapping/mapping.js";

export type SchemaAnnotation = NumberAnnotation | StringAnnotation;

export type OGMSchema = Record<string, SchemaAnnotation>;

export class OGM {
    private driver: neo4j.Driver;

    constructor(driver: neo4j.Driver) {
        this.driver = driver;
    }

    public registerNode(label: string, schema: OGMSchema): NodeRepository {
        return new NodeRepository(this, label, schema);
    }

    // Max add resultsMapper here
    public async runCypher<T extends Record<string, any>>(
        cypher: string,
        params: Record<string, any> = {},
        rules: Rules,
    ): Promise<T[]> {
        return this.driver.executeQuery<T[]>(cypher, params, {resultTransformer: hydratedResultTransformer<T[]>(rules)});
    }
}
