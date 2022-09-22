import { buildUser, User } from "./models/user.ts";

(await User.truncateCollection()).ok().result();

const user = (await User.create(buildUser())).ok().toModel();
console.log(
  "Number of users:",
  (await User.find()).ok().toModel().length,
  "\n",
);
console.log(
  "Deletion applied from the model:",
  (await user.delete()).ok().result(),
  "\n",
);
console.log(
  "Number of users:",
  (await User.find()).ok().toModel().length,
  "\n",
);

console.log("Creating a new user", "\n");
const documentUser = (await User.create(buildUser())).ok().result();

console.log(
  "Number of users:",
  (await User.find()).ok().toModel().length,
  "\n",
);
console.log(
  "Deletion applied from the document record:",
  (await User.delete(documentUser)).ok().result(),
  "\n",
);
console.log(
  "Number of users:",
  (await User.find()).ok().toModel().length,
  "\n",
);

// Clean collection
(await User.truncateCollection()).ok().result();
