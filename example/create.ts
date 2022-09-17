import { buildUser, User } from "./models/user.ts";

// Clean collection
await User.truncateCollection();

let user: User;

user = (await User.create(buildUser())).ok().toModel();

console.log("created user, toModel, from static method:\n", user, "\n");

user = (await buildUser().create()).ok().toModel();
console.log("created user, toModel, from instance method:\n", user, "\n");

const userDocument = (await buildUser().create()).ok().result();
console.log(
  "created user, document data, from instance method:\n",
  userDocument,
  "\n",
);

const userJson = (await buildUser().create()).ok().json();
console.log("created user, json data :\n", userJson, "\n");

// Clean collection
await User.truncateCollection();
