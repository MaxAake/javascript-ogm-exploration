import { driver } from "neo4j-driver"


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
