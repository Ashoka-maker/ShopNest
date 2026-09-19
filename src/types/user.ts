export type UserRole = "customer" | "seller" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};
