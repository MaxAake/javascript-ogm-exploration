
// TASK: Type Annotation
function registerRulesToClass(class: any, rules: any) {
    throw Error("Not Implemented")
}

class Movie {
    name : string
    release : number
    constructor(name: string, release: number) {
        this.name = name
        this.release = release
    }
}

//First draft:
const movieRules = {
    name: String
    release: rulesFactories.asNumber({optional: true})
    role: rulesFactories.asRelationship(as: roleRules) //TODO: create as property on relationships and nodes
}

const movieNodeRules = rulesFactories.asNode({convert: (node) => node.as(movieRules)})

registerRulesToClass(Movie, movieRules)


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

    //one
    rolesOne: [
        {
            name: "Neo",
            node: keanuReeves
        }

    ],
    //two
    rolesTwo: {"keanuReevesStringified": "Neo"},
    //three
    rolesThree: [{edge: neoRelationship, node: keanuReeves}],
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
