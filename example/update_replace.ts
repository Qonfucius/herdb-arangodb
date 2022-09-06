import { buildUser, User } from "./config.ts";

const user = await buildUser().create().ok().toModel();

user.username = "updated_panda";
console.log(
  "updated user, toModel, from static method: ",
  await User.update(user).ok().toModel(),
);

user.username = "updated_panda_inception";
console.log(
  "updated user, toModel, from instance method: ",
  await user.update().ok().toModel(),
);

user.username = "updated_panda";
console.log(
  "updated user, raw data, from instance method: ",
  await user.update().ok().returnNew().result(),
);

user.username = "updated_panda_inception";
console.log(
  "updated user, raw data, from instance method with dataLookup: ",
  await user.update().ok().returnNew().dataLookup("new").result(),
);

user.username = "updated_panda";
console.log(
  "updated user from instance method without return new: ",
  await user.update().ok().result(),
);

user.username = "updated_panda_inception";
user.user_properties.panda_weapon = "bamboo stick";
console.log(
  "updated nested document: ",
  await user.update().ok().toModel(),
);

user.username = "replaced_panda";
user.user_properties = { panda_weapon: "bamboo sword" };
console.log(
  "replaced nested document: ",
  await user.replace().ok().toModel(),
);
