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
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  verificationNote?: string;
};

export type SellerContactDetails = Pick<
  Seller,
  | "contactName"
  | "contactEmail"
  | "contactPhone"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country"
>;
