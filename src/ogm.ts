import * as neo4j from "neo4j-driver";
import { NodeRepository } from "./repository.js";
import type { NumberAnnotation, StringAnnotation } from "./typeAnnotation.js";

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
        params: Record<string, any> = {}
    ): Promise<T[]> {
        const rawResults = await this.driver.executeQuery(cypher, params);

        return rawResults.records.map((r) => {
            const rawObject = r.toObject();
            return rawObject;
        });
    }
}
