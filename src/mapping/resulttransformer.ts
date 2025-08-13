import type { RecordShape, ResultTransformer } from "neo4j-driver";
import { as, type Rules } from "./mapping.js";

interface Gettable { get: <V>(key: string) => V }

export function hydratedResultTransformer<T extends {}>( rules: Rules) : ResultTransformer<T>{
    return async (result: Promise<RecordShape>) => {
        const records = (await result).records
        return records.map((record: Gettable) => as<T>(record, rules))
    }
}
