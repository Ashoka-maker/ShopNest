export type Seller = {
  id: string;
  userId: string;
  storeName: string;
  bio: string;
  createdAt: string;
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
};
