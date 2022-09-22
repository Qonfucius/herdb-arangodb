import "https://deno.land/x/reflection@0.0.2/mod.ts";

import { arangodb, registry } from "../config.ts";
import {
  configure,
  DocumentMetadata,
  mapFactory,
  MapMany,
  ModelClassFactory,
} from "../../mod.ts";
import { User } from "./user.ts";

export interface BookDocument extends DocumentMetadata {
  title: string;
  users: string[];
}

const { map, mapMany } = mapFactory<Book, BookDocument>();

@configure()
export class Book extends ModelClassFactory<Book, BookDocument>() {
  @map()
  title!: string;

  @mapMany(() => User)
  users!: MapMany<Book, User>;
}

arangodb.register(Book);

const BookModel = registry.get("arangodb").model("Book");
await BookModel.createCollection();

export function buildBook(partialBook: Partial<BookDocument> = {}) {
  return new Book({
    title: `Kung Fu Panda ${Date.now()}`,
    users: [],
    ...partialBook,
  });
}
