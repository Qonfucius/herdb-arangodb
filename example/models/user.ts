import "https://deno.land/x/reflection@0.0.2/mod.ts";

import { arangodb, registry } from "../config.ts";
import {
  configure,
  DocumentMetadata,
  mapFactory,
  MapMany,
  ModelClassFactory,
} from "../../mod.ts";
import { Book } from "./book.ts";

export interface UserDocument extends DocumentMetadata {
  username: string;
  age: string;
  aNumberToString: number;
  aStringToNumber: string;
  random_properties: Record<string, string>;
  books: string[];
}

const { map, mapWith, mapMany } = mapFactory<User, UserDocument>();

// Inject document options, including the name of the collection
@configure()
export class User extends ModelClassFactory<User, UserDocument>() {
  @map()
  username!: string;

  @mapWith({
    get(v: string) {
      return parseInt(v);
    },
    set(v: number) {
      return (v + 30).toString();
    },
  })
  age!: number;

  @mapWith({
    get(v: number) {
      return v.toString();
    },
    set(v: string) {
      return parseInt(v);
    },
  })
  aNumberToString!: string;

  @mapWith({
    get(v: string) {
      return parseInt(v);
    },
    set(v: number) {
      return v.toString();
    },
  })
  aStringToNumber!: number;

  @map()
  random_properties!: Record<string, string>;

  @mapMany(() => Book)
  books!: MapMany<User, Book>;
}

arangodb.register(User);

const UserModel = registry.get("arangodb").model("User");
await UserModel.createCollection();

// Helper function for others examples
export function buildUser(partialUser: Partial<UserDocument> = {}) {
  return new User({
    username: `Red_Panda ${Date.now()}`,
    random_properties: { prop1: "prop1" },
    age: "10",
    books: [],
    aStringToNumber: "12",
    aNumberToString: 12,
    ...partialUser,
  });
}
