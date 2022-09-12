// deno run --allow-net example/config.ts

import "https://deno.land/x/reflection/mod.ts";
import * as HerdbArangoDB from "../mod.ts";
import * as Herdb from "https://deno.land/x/herdb@v0.1.0/mod.ts";

// Init arango db connection
class DatabaseRegistry extends Herdb.Registry<typeof DatabaseRegistry> {
  @HerdbArangoDB.DefineConnectionOptions({
    uri: "arangodb+http://root:root@localhost:8529/_system",
  })
  static arangodb = HerdbArangoDB.ConnectionFactory;
}

const registry = new DatabaseRegistry();
await registry.connectInParallel();

const arangodb = registry.get("arangodb");

export interface TUser extends HerdbArangoDB.DocumentMetadata {
  username: string;
  random_properties: Record<string, string>;
}

// By creating an interface with the same name as the class, this allows
// to automatically include the interface properties in the class
// deno-lint-ignore no-empty-interface
export interface User extends TUser {}

// Inject document options, including the name of the collection
@HerdbArangoDB.DDocumentOptions()
export class User extends HerdbArangoDB.DocumentClassFactory<User, TUser>() {
}

arangodb.register(User);

const UserModel = registry.get("arangodb").model("User");
await UserModel.createCollection();

// Helper function for others examples
export function buildUser(partialUser: Partial<User> = {}) {
  return new User({
    username: `Red_Panda ${Date.now()}`,
    random_properties: { prop1: "prop1" },
    ...partialUser,
  });
}
