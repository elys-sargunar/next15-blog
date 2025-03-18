import "server-only"
import {MongoClient, ServerApiVersion} from "mongodb"

if(!process.env.DB_URI){
    throw new Error("Mongo URI not found.")
}

const client = new MongoClient(process.env.DB_URI, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
})

async function GetDB(dbName: string) {
    try {
        await client.connect()
        console.log("connected to DB...")
        return client.db(dbName);
    }
    catch(err) {
        console.log("unable to connect to DB - " + err);
    }
}

export async function getCollection(collectionName: string){
    const db = await GetDB("TestCluster")
    if(db) return db.collection(collectionName)
    return null
}

export async function isValidPassword(password: string, hashedPassword: string){
    return (await hashPassword(password)) === hashedPassword
}

export async function hashPassword(password: string) {
    const arrayBuffer = await crypto.subtle.digest("SHA-512",
    new TextEncoder().encode(password))

    return Buffer.from(arrayBuffer).toString("base64")
}