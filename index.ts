import * as neo4j from "neo4j-driver";
import { OGM } from "./src/ogm.js";
import { OGMNumber, OGMRelationship, OGMString } from "./src/typeAnnotation.js";

const PersonSchema = {
    name: OGMString,
    born: OGMNumber,
};

const MovieSchema = {
    title: OGMString,
    released: OGMNumber,
    actors: OGMRelationship(() => PersonSchema, "ACTED_IN", "IN", {eager: true}),
    directors: OGMRelationship(() => PersonSchema, "DIRECTED", "IN")
};

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "password"), {
    disableLosslessIntegers: true,
});

const ogm = new OGM(driver);

const movieRepository = ogm.registerNode("Movie", MovieSchema);

const movies = await movieRepository.find({
    title: "The Matrix",
});

console.log(movies);
console.log(movies[0]?.actors[0].getRelationshipProperties());

const movie = await movieRepository.create({
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
