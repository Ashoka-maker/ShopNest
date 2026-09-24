export type Seller = {
  id: string;
  userId: string;
  supabaseSellerId?: string;
  storeName: string;
  bio: string;
  createdAt: string;
  approvalStatus: "pending" | "approved" | "rejected";
  isActive: boolean;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  verificationNote?: string;
};
