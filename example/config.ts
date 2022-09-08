// deno run --allow-net example/config.ts

import "https://deno.land/x/reflection/mod.ts";
import {
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

export interface TUser {
  username: string;
  random_properties: Record<string, string>;
}

// By creating an interface with the same name as the class, this allows
// to automatically include the interface properties in the class
// deno-lint-ignore no-empty-interface
export interface User extends TUser {}
export class User extends ArangoDBDocument<User> implements TUser {
}

registry.get("arangodb").register(User);

const UserModel = registry.get("arangodb").model("User");
await UserModel.createCollection();

await User.create(new User());

// Helper function for others examples
export function buildUser(partialUser: Partial<User> = {}) {
  return new User({
    username: `Red_Panda ${Date.now()}`,
    random_properties: { prop1: "prop1" },
    ...partialUser,
  });
}
