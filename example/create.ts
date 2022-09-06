import { buildUser, User } from "./config.ts";

console.log(
  "created user, toModel, from static method: ",
  await User.create(buildUser()).ok().toModel(),
);

console.log(
  "created user, toModel, from instance method: ",
  await buildUser().create().ok().toModel(),
);

console.log(
  "created user, raw data, from instance method: ",
  await buildUser().create().ok().returnNew().result(),
);

console.log(
  "created user, raw data, from instance method with dataLookup: ",
  await buildUser().create().ok().returnNew().dataLookup("new").result(),
);

console.log(
  "created user from instance instance without return new: ",
  await buildUser().create().ok().result(),
);
