import { buildUser, User } from "./config.ts";

await User.truncateCollection().ok().result();

console.log("Creating a new user", "\n");
const user = await User.create(buildUser()).ok().toModel();

console.log(
  "Number of users:",
  (await User.find().ok().toModels()).length,
  "\n",
);
console.log(
  "Deletion applied from the model:",
  await user.delete().ok().result(),
  "\n",
);
console.log(
  "Number of users:",
  (await User.find().ok().toModels()).length,
  "\n",
);

console.log("Creating a new user", "\n");
const rawUser = await User.create(buildUser()).ok().result();

console.log(
  "Number of users:",
  (await User.find().ok().toModels()).length,
  "\n",
);
console.log(
  "Deletion applied from the raw record:",
  await User.delete(rawUser).ok().result(),
  "\n",
);
console.log(
  "Number of users:",
  (await User.find().ok().toModels()).length,
  "\n",
);

// Clean collection
await User.truncateCollection().ok().result();
