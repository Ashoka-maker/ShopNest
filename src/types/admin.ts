export type AdminStats = {
  totalUsers: number;
  totalSellers: number;
  totalProducts: number;
  totalOrders: number;
  pendingSellers: number;
  pendingProducts: number;
  totalRevenue: number;
};

export type AdminAction = {
  id: string;
  type: "user_created" | "seller_registered" | "product_added" | "order_placed" | "seller_approved" | "product_approved" | "seller_rejected" | "product_rejected";
  description: string;
  timestamp: string;
  userId?: string;
  targetId?: string;
};