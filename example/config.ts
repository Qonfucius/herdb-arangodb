// deno run --allow-net example/config.ts

import "https://deno.land/x/reflection/mod.ts";
import {
  aql,
  ConnectionFactory as ArangoDBConnectionFactory,
  DefineConnectionOptions as DefineArangoDBConnectionOptions,
  Document as ArangoDBDocument,
} from "../mod.ts";
import { Registry as HerdbRegistry } from "https://deno.land/x/herdb@v0.1.0/mod.ts";

// Init arango db connection
class DatabaseRegistry extends HerdbRegistry<typeof DatabaseRegistry> {
  @DefineArangoDBConnectionOptions({
    uri: "arangodb+http://root:root@localhost:8529/_system",
  })
  public static arangodb = ArangoDBConnectionFactory;
}

const registry = new DatabaseRegistry();
await registry.connectInParallel();

// Creation and registration of the collection
interface User {
  username: string;
}
class User extends ArangoDBDocument<User> implements User {
}

registry.get("arangodb").register(User);
const UserModel = registry.get("arangodb").model("User");
await UserModel.createCollection();

// Create a new record
const newUsername = "Red_Panda";
await User.create(new User({ username: newUsername }));

// Retrieve records with username equal to "Red_Panda"
const users = await User.query(
  aql`
    FOR doc IN users
    FILTER doc.username == ${newUsername}
    RETURN doc
  `,
).dataLookup("result").ok().result();

console.log(`Users with username = ${newUsername}:`, users);

// Retrieve a record by its key.
const user = await User.findByKey(users[0]._key).ok().result();

console.log(`User with key = ${users[0]._key}:`, user);

// Retrieve all users
const allUsers = await User.find().ok().result();

console.log("All users", allUsers);
