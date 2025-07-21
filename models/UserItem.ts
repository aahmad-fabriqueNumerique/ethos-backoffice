export default interface UserItem {
  id: string;
  email: string;
  role: "admin" | "user" | "organisateur" | "groupe";
  userId: string;
}
