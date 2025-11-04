import neo4j, { ResultSummary } from "neo4j-driver";
import type { EagerResult, Rules } from "neo4j-driver"
import { NodeRepository } from "./repository.js";
import { IdAnnotation, type SchemaAnnotation } from "./typeAnnotation.js";

export type OGMSchema = Record<string, SchemaAnnotation>;

export class OGM {
    private driver: neo4j.Driver;

    constructor(driver: neo4j.Driver) {
        this.driver = driver;
    }

    public registerNode(label: string, schema: OGMSchema): NodeRepository {
        this.validateSchema(label, schema);
        return new NodeRepository(this, label, schema);
    }

    // Max add resultsMapper here
    public async runCypher<T extends Record<string, any>>(
        cypher: string,
        params: Record<string, any> = {},
        rules: Rules
    ): Promise<T[]> {
        return this.driver.executeQuery<T[]>(cypher, params, {
            // @ts-ignore
            resultTransformer: neo4j.resultTransformers.hydrated<T[]>(rules),
        });
    }

    private validateSchema(label: string, schema: OGMSchema): void {
        let hasId = false;
        for (const annotation of Object.values(schema)) {
            if (annotation instanceof IdAnnotation) {
                if (hasId) {
                    throw new Error(`Invalid schema "${label}", only one ID is allowed`);
                }
                hasId = true;
            }
        }
        if (!hasId) {
            throw new Error(`Invalid schema "${label}", ID not found`);
        }
    }
}
