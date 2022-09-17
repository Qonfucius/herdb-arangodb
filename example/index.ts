import { User } from "./models/user.ts";
import { type IndexDef, IndexType } from "../mod.ts";

let index: IndexDef;
let newIndex: IndexDef;

// Clean collection
await User.truncateCollection();

const indexes = (await User.getIndexes()).result();
console.log("Default indexes:\n ", indexes, "\n");

index = (await User.getIndex("primary")).result();
console.log("Primary index:\n ", index, "\n");

newIndex = (await User.createIndex({
  type: IndexType.Persistent,
  name: "username_unique_index",
  unique: true,
  fields: ["username"],
})).result();
console.log("New index username_unique_index:\n ", newIndex, "\n");

index = (await User.getIndex("username_unique_index")).result();
console.log("username_unique_index index:\n ", index, "\n");

index = (await User.getIndex("username_unique_index")).result();
console.log("Removed index username_unique_index:\n ", index, "\n");

newIndex = (await User.createIndex({
  type: IndexType.Persistent,
  name: "random_properties_prop1_and_panda_weapon_index",
  unique: false,
  fields: ["random_properties.prop1", "random_properties.panda_weapon"],
})).result();
console.log(
  "New index random_properties_prop1_and_panda_weapon_index index:\n ",
  newIndex,
  "\n",
);

(await User.removeIndex("random_properties_prop1_and_panda_weapon_index"))
  .result();
