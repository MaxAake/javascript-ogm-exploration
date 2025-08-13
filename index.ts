import * as neo4j from "neo4j-driver";
import { OGM } from "./src/ogm.js";
import { OGMNumber, OGMString, OGMRelationship } from "./src/typeAnnotation.js";

const PersonSchema = {
    name: OGMString,
    born: OGMNumber
}

const MovieSchema = {
    title: OGMString,
    release: OGMNumber,
    actors: OGMRelationship(() => PersonSchema, "ACTED_IN", "IN")
};

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "password"), {disableLosslessIntegers: true});

const ogm = new OGM(driver);

const movieRepository = ogm.registerNode("Movie", MovieSchema);

const movies = await movieRepository.find({
    title: "The Matrix",
});

console.log(movies);

driver.close();
