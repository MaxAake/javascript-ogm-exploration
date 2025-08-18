TODO:

-   Return items on create <- Andres
-   Update operation with where and values <- Andres
-   If possible, update using ID over DAOs <- Andres

-   Eager relationship (1-level) <- Max **DONE**
-   Relationships in find (with where if possible) <- Max

```ts
import { driver, Relationship } from "neo4j-driver"
import { OGMString, OGMNumber, OGMRelationship } from "./src/typeAnnotation.js"
import { gt } from "@neo4j/cypher-builder"
import type { OGM } from "./src/ogm.js"


// Second Draft
const roleSchema = {
    characterName: String
}

const movieSchema = {
    name: neo4jOGM.String,
    release: neo4jOGM.Number
    actors: InboundRelationship("ACTED_IN", roleSchema)
}

const Matrix = {
    name: "The Matrix",
    release: 2000,
    //four Best option currently
    actors: [{name: "Keanu Reeves", born: 1789, relationshipProperties: () => {return {characterName: "Neo"}}}]
}


const personSchema = {
    name: String,
    born: Number
    roles: OutboundRelationship("ACTED_IN", roleSchema)
}


// Task two: Query a person by name


personRepository.find({name: "Keanu Reeves", born: 1789})
personRepository.find({born: neo4jOGM.greaterThan(1789)})
personRepository.find(neo4jOGM.Or({name: "Keanu Reeves"}, {name: "Travis Scott", born: neo4jOGM.greaterThan(1997)}))


// Task three: create a repository

const neogm = createOGMInstance(driver)

const personRepository = neogm.loadSchemaAndCreateRepositry(personSchema)


///////// RElationships

const PersonSchema = {
    name: OGMString,
    born: OGMNumber,
};


const MovieSchema = {
    title: OGMString,
    release: OGMNumber,
    actors: OGMRelationship(() => PersonSchema, "ACTED_IN", "IN"),
};

const driver = neo4j.driver("neo4j://localhost:7687", neo4j.auth.basic("neo4j", "password"), {
    disableLosslessIntegers: true,
});



////// Eager

//  actors: OGMRelationship(() => PersonSchema, "ACTED_IN", "IN", {eager: true})

const moviesWithActors = await movieRepository.find({}); // Returns Movies with actors

///// Lazy

////// Option A - 2 cypher queries

const movies = await movieRepository.find({
    // Query Movies
    title: "The Matrix",
});

const actors = movies.actors.find({
    // Query Actors
    name: "Keanu",
});

///// Option B - Lazy Get, only one query, but need to explicitly ask for the data

const movies = movieRepository.find({
    // Returns a MoviesLazyQuery
    // This is a LazyMovies
    title: "The Matrix",
});

const actors = movies.actors.find({
    // Returns ActorsLazyQuery
    // This returns LazyActor
    name: "Keanu",
});

const directors = movies.directors.findAll();

// const actualMovies = await movies; // Return movies
// const actualActors = await actors; // Return actors
const actualMovies = await movies.query(); // Query actors and movies

/////// Include relationships

const moviesWithActors = await movieRepository.find({ where: {}, include: [Actors, Actors.Movies, Actors.friends, Directors] });

////// Path - Closest to cypher?

// Option 1
const result = ogm
    .queryGraph(["MovieSchema", "actors"], ["MovieSchema", "directors", "Movies"], ["Directors", "spouses"])
    .exec(); // Retrieves 2 paths

// Option 2
const path = [
    {
        Movie: {
            Directors: {
                Movies: {},
                Spouses: {},
            },
        },
    },
];

result[0].movieSchema.actors; // This is mapped data
result[1].movieSchema.directors;


// Use cases

// Get movies  --- Trivial

// Get movies with relationships --- Can be solve with includes


// Get movies, if the data matches something in the code, retrieve actors --- Requires lazy relationships (2 queries)


// Graph use cases ---

// get list of movies where two or more actors from the Matrix starred


//// Get movies where the actors bla
//// Get movies and actors where bla

moviesRepository.find(where: {
    actors_COUNT: gt({
        movies_EXIST: {
            where: {
                title: "The Matrix"
            }
        }
    }, 2)
})





// Option 1:

const movie=await movieRepository.create({title: "The Matrix"})


// Option 2:

const movie=new Movie() // movieRepository.instance({title: "The Matrix"})

movie.title="The Matrix"

await movieRepository.save(movie);


////////////////////

// Update

// Option 1 - Force ID
const movies=movieRespository.find()

const updatedMovie=movieRepositry.update(movies, {
    title: "New value"
})

// Option 2 - Force ID
const movies=movieRespository.find()

movies.title="New Value"

const updatedMovie=movieRepository.save(movies)

// Option 3 - Another use case - Need to be done

await movieRepository.update(where: {}, values: {});

await movieRepository.find(where: {}).update({dsadsa: dsa})





////////////////////////////////////


// 1 - Eager relationship
// We can start with a single layer

OGMRelationship(() => PersonSchema, "ACTED_IN", "IN", {eager: true})



// 2- Query with explicit relationships
const result = await movieRespository.find({where: {}, relationships: {
    actors: true,
    director: {
        movies: true
    }
}})

await movieRespository.find({where: {}, relationships: {
        actors: {where: {name: "Keanu"}},
        directors: {relationship: {movies: true}}
}})


// 3- Query path - rejected

const moviepath = OGM.path(movie)
moviepath.actors().where({name:Keanu})
moviepath.directors().directed()


const moviepath = {
    relationships: {
        actors: {
            where: {
                name: "Keanu"
            }
        },
        directors: {
            relationships: {
                directed: true
            }
        }
    }
}


// 4 - Lazy relationships


{
    title: "Movie",
    actor: [{
        relatedMovie: [{

        }]
    }]
}


// Option for single relationships

const moviesWithRelationsips= movieRepository.find({}, [
    "directors",
    "actors"
])


const movie={
    title: "The Matrix",
    actors: Relationship<Actor>
}

movie.actors.get(); // IF it was included, returns, if not, query DB


//////////

const movies = movieRepository.find({}) // LazyList<Movie>

movies.forEach((movie)=>{
})

for(const movie of movies){
    // Actual movie object
}


movie.withRelationship(actors)



//////////////////////////7

```
