import { buildUser, User } from "./models/user.ts";
import { Book, buildBook } from "./models/book.ts";

await User.truncateCollection();
await Book.truncateCollection();

const user: User = (await User.create(buildUser())).toModel();

const book1: Book = (await Book.create(buildBook())).toModel();
const book2: Book = (await Book.create(buildBook())).toModel();
const book3: Book = (await Book.create(buildBook())).toModel();
const book4: Book = (await Book.create(buildBook())).toModel();
const book5: Book = (await Book.create(buildBook())).toModel();
const book6: Book = (await Book.create(buildBook())).toModel();

(await user.books.get()).toModel().push(book1, book2);

const userBooks = await user.books.toModel();
console.log("The User's Book\n", userBooks, "\n");

userBooks.push(book3, book4);
userBooks.splice(1, 1);

await user.update();

const reloadedUser = (await User.findByKey(user._key!)).toModel();

console.log(
  "reloadedUser document Book and user document Book keys are identical",
  reloadedUser.getDocument().books,
  user.getDocument().books,
  "\n",
);

reloadedUser.books.set([book5, book6]);
(await reloadedUser.books.get()).toModel().push(book1);

console.log(
  "reloadedUser new document Books keys",
  reloadedUser.getDocument().books,
  "\n",
);
