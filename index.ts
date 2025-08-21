import * as neo4j from "neo4j-driver";
import { OGM, type OGMSchema } from "./src/ogm.js";
import { OGMId, OGMNumber, OGMRelationship, OGMString } from "./src/typeAnnotation.js";

let MovieSchema: OGMSchema = {};

const PersonSchema: OGMSchema = {
    id: OGMId,
    name: OGMString,
    born: OGMNumber,
    roles: OGMRelationship(() => MovieSchema, "ACTED_IN", "OUT"),
};

MovieSchema = {
    id: OGMId,
    title: OGMString,
    released: OGMNumber,
    actors: OGMRelationship(() => PersonSchema, "ACTED_IN", "IN"),
    directors: OGMRelationship(() => PersonSchema, "DIRECTED", "IN"),
};

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "password"), {
    disableLosslessIntegers: true,
});

const ogm = new OGM(driver);

const movieRepository = ogm.registerNode("Movie", MovieSchema);
ogm.registerNode("Person", PersonSchema);

const movies = await movieRepository.find(
    {
        title: "The Matrix",
    },
    { actors: { roles: true } }
);

console.log(movies);
console.log(movies[0]?.actors[0].getRelationshipProperties());

const movie = await movieRepository.create({
    id: "onetwo",
    title: "The Fountain",
    released: 1999,
});

console.log(movie);

const updatedMovie = await movieRepository.update(
    {
        title: "The Fountain",
    },
    {
        released: 1000,
    }
);

console.log(updatedMovie);

await movieRepository.delete({
    title: "The Fountain",
});

driver.close();

// TODO:
// update with DAOs using ID
