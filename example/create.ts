import { buildUser, User } from "./config.ts";

let user: User;
let userRaw: any;

user = await User.create(buildUser()).ok().toModel();
console.log("created user, toModel, from static method: ", user);

user = await buildUser().create().ok().toModel();
console.log("created user, toModel, from instance method: ", user);

userRaw = await buildUser().create().ok().returnNew().result();
console.log("created user, raw data, from instance method: ", userRaw);

userRaw = await buildUser().create().ok().returnNew().dataLookup("new")
  .result();
console.log(
  "created user, raw data, from instance method with dataLookup: ",
  userRaw,
);

userRaw = await buildUser().create().ok().result();
console.log("created user from instance instance without returnNew: ", userRaw);
