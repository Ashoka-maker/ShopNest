/**
 * Data Source Adapter
 * 
 * This adapter provides a unified interface for data operations that can work with
 * either localStorage or Supabase depending on the configuration.
 * 
 * This enables gradual migration from localStorage to Supabase without breaking
 * existing functionality.
 */

import { createClient } from "@/lib/supabase/client";

/**
 * Data source mode
 */
export type DataSourceMode = "local" | "supabase" | "hybrid";

/**
 * Get the current data source mode from environment
 */
export function getDataSourceMode(): DataSourceMode {
  const mode = process.env.NEXT_PUBLIC_DATA_SOURCE_MODE as DataSourceMode;
  return mode || "local"; // Default to localStorage for safety
}

/**
 * Check if we should use Supabase for a specific data type
 */
export function shouldUseSupabase(dataType: string): boolean {
  const mode = getDataSourceMode();
  
  if (mode === "supabase") return true;
  if (mode === "local") return false;
  
  // Hybrid mode: specific data types can be migrated individually
  const supabaseEnabledTypes = process.env.NEXT_PUBLIC_SUPABASE_ENABLED_TYPES?.split(",") || [];
  return supabaseEnabledTypes.includes(dataType);
}

/**
 * Generic adapter base class
 */
export abstract class DataSourceAdapter<T, CreateInput, UpdateInput> {
  protected mode: DataSourceMode;
  private supabaseClient?: ReturnType<typeof createClient>;

  protected get supabase() {
    this.supabaseClient ??= createClient();
    return this.supabaseClient;
  }

  constructor() {
    this.mode = getDataSourceMode();
  }

  /**
   * Get all items
   */
  abstract getAll(): Promise<T[]>;

  /**
   * Get item by ID
   */
  abstract getById(id: string): Promise<T | null>;

  /**
   * Create new item
   */
  abstract create(input: CreateInput): Promise<T>;

  /**
   * Update existing item
   */
  abstract update(id: string, input: UpdateInput): Promise<T | null>;

  /**
   * Delete item
   */
  abstract delete(id: string): Promise<boolean>;

  /**
   * Query items with filters
   */
  abstract query(filters: Record<string, any>): Promise<T[]>;

  /**
   * Execute operation based on current mode
   */
  protected async executeOperation<R>(
    localOperation: () => R | Promise<R>,
    supabaseOperation: () => R | Promise<R>,
    dataType: string
  ): Promise<R> {
    if (shouldUseSupabase(dataType)) {
      try {
        return await supabaseOperation();
      } catch (error) {
        console.error(`Supabase operation failed for ${dataType}, falling back to localStorage:`, error);
        // Fallback to localStorage on error
        return await localOperation();
      }
    }
    return await localOperation();
  }
}

/**
 * User data adapter
 */
export class UserAdapter extends DataSourceAdapter<
  any,
  { name: string; email: string; password: string; role: string },
  Partial<{ name: string; email: string; password: string; role: string }>
> {
  private readonly USERS_KEY = "shopnest_users";

  async getAll(): Promise<any[]> {
    return this.executeOperation(
      () => this.getLocalUsers(),
      () => this.getSupabaseUsers(),
      "users"
    );
  }

  async getById(id: string): Promise<any | null> {
    return this.executeOperation(
      () => this.getLocalUserById(id),
      () => this.getSupabaseUserById(id),
      "users"
    );
  }

  async create(input: { name: string; email: string; password: string; role: string }): Promise<any> {
    return this.executeOperation(
      () => this.createLocalUser(input),
      () => this.createSupabaseUser(input),
      "users"
    );
  }

  async update(id: string, input: Partial<{ name: string; email: string; password: string; role: string }>): Promise<any | null> {
    return this.executeOperation(
      () => this.updateLocalUser(id, input),
      () => this.updateSupabaseUser(id, input),
      "users"
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.executeOperation(
      () => this.deleteLocalUser(id),
      () => this.deleteSupabaseUser(id),
      "users"
    );
  }

  async query(filters: Record<string, any>): Promise<any[]> {
    return this.executeOperation(
      () => this.queryLocalUsers(filters),
      () => this.querySupabaseUsers(filters),
      "users"
    );
  }

  // LocalStorage implementations
  private getLocalUsers(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(this.USERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getLocalUserById(id: string): any | null {
    const users = this.getLocalUsers();
    return users.find((u) => u.id === id) || null;
  }

  private createLocalUser(input: { name: string; email: string; password: string; role: string }): any {
    const users = this.getLocalUsers();
    const newUser = {
      id: `user-${Date.now()}`,
      ...input,
    };
    users.push(newUser);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return newUser;
  }

  private updateLocalUser(id: string, input: Partial<{ name: string; email: string; password: string; role: string }>): any | null {
    const users = this.getLocalUsers();
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    users[index] = { ...users[index], ...input };
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    return users[index];
  }

  private deleteLocalUser(id: string): boolean {
    const users = this.getLocalUsers();
    const filtered = users.filter((u) => u.id !== id);
    if (filtered.length === users.length) return false;
    localStorage.setItem(this.USERS_KEY, JSON.stringify(filtered));
    return true;
  }

  private queryLocalUsers(filters: Record<string, any>): any[] {
    let users = this.getLocalUsers();
    Object.entries(filters).forEach(([key, value]) => {
      users = users.filter((u) => u[key] === value);
    });
    return users;
  }

  // Supabase implementations (placeholders for Phase 2)
  private async getSupabaseUsers(): Promise<any[]> {
    // Will be implemented in Phase 2
    const { data, error } = await this.supabase.from("profiles").select("*");
    if (error) throw error;
    return data || [];
  }

  private async getSupabaseUserById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase.from("profiles").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  private async createSupabaseUser(input: { name: string; email: string; password: string; role: string }): Promise<any> {
    // Will be implemented in Phase 2 with Supabase Auth
    throw new Error("Supabase user creation not implemented yet - use Phase 2");
  }

  private async updateSupabaseUser(id: string, input: Partial<{ name: string; email: string; password: string; role: string }>): Promise<any | null> {
    const { data, error } = await this.supabase.from("profiles").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }

  private async deleteSupabaseUser(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("profiles").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  private async querySupabaseUsers(filters: Record<string, any>): Promise<any[]> {
    let query = this.supabase.from("profiles").select("*");
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

/**
 * Product data adapter
 */
export class ProductAdapter extends DataSourceAdapter<
  any,
  any,
  Partial<any>
> {
  private readonly PRODUCTS_KEY = "shopnest_seller_products";

  async getAll(): Promise<any[]> {
    return this.executeOperation(
      () => this.getLocalProducts(),
      () => this.getSupabaseProducts(),
      "products"
    );
  }

  async getById(id: string): Promise<any | null> {
    return this.executeOperation(
      () => this.getLocalProductById(id),
      () => this.getSupabaseProductById(id),
      "products"
    );
  }

  async create(input: any): Promise<any> {
    return this.executeOperation(
      () => this.createLocalProduct(input),
      () => this.createSupabaseProduct(input),
      "products"
    );
  }

  async update(id: string, input: Partial<any>): Promise<any | null> {
    return this.executeOperation(
      () => this.updateLocalProduct(id, input),
      () => this.updateSupabaseProduct(id, input),
      "products"
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.executeOperation(
      () => this.deleteLocalProduct(id),
      () => this.deleteSupabaseProduct(id),
      "products"
    );
  }

  async query(filters: Record<string, any>): Promise<any[]> {
    return this.executeOperation(
      () => this.queryLocalProducts(filters),
      () => this.querySupabaseProducts(filters),
      "products"
    );
  }

  // LocalStorage implementations
  private getLocalProducts(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(this.PRODUCTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getLocalProductById(id: string): any | null {
    const products = this.getLocalProducts();
    return products.find((p) => p.id === id) || null;
  }

  private createLocalProduct(input: any): any {
    const products = this.getLocalProducts();
    const newProduct = {
      id: `p-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products.push(newProduct);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return newProduct;
  }

  private updateLocalProduct(id: string, input: Partial<any>): any | null {
    const products = this.getLocalProducts();
    const index = products.findIndex((p) => p.id === id);
    if (index === -1) return null;
    products[index] = { ...products[index], ...input, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return products[index];
  }

  private deleteLocalProduct(id: string): boolean {
    const products = this.getLocalProducts();
    const filtered = products.filter((p) => p.id !== id);
    if (filtered.length === products.length) return false;
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(filtered));
    return true;
  }

  private queryLocalProducts(filters: Record<string, any>): any[] {
    let products = this.getLocalProducts();
    Object.entries(filters).forEach(([key, value]) => {
      products = products.filter((p) => p[key] === value);
    });
    return products;
  }

  // Supabase implementations (placeholders for Phase 4)
  private async getSupabaseProducts(): Promise<any[]> {
    const { data, error } = await this.supabase.from("products").select("*");
    if (error) throw error;
    return data || [];
  }

  private async getSupabaseProductById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase.from("products").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  private async createSupabaseProduct(input: any): Promise<any> {
    const { data, error } = await this.supabase.from("products").insert(input).select().single();
    if (error) throw error;
    return data;
  }

  private async updateSupabaseProduct(id: string, input: Partial<any>): Promise<any | null> {
    const { data, error } = await this.supabase.from("products").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }

  private async deleteSupabaseProduct(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("products").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  private async querySupabaseProducts(filters: Record<string, any>): Promise<any[]> {
    let query = this.supabase.from("products").select("*");
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

/**
 * Order data adapter
 */
export class OrderAdapter extends DataSourceAdapter<
  any,
  any,
  Partial<any>
> {
  private readonly ORDERS_KEY = "shopnest_orders";

  async getAll(): Promise<any[]> {
    return this.executeOperation(
      () => this.getLocalOrders(),
      () => this.getSupabaseOrders(),
      "orders"
    );
  }

  async getById(id: string): Promise<any | null> {
    return this.executeOperation(
      () => this.getLocalOrderById(id),
      () => this.getSupabaseOrderById(id),
      "orders"
    );
  }

  async create(input: any): Promise<any> {
    return this.executeOperation(
      () => this.createLocalOrder(input),
      () => this.createSupabaseOrder(input),
      "orders"
    );
  }

  async update(id: string, input: Partial<any>): Promise<any | null> {
    return this.executeOperation(
      () => this.updateLocalOrder(id, input),
      () => this.updateSupabaseOrder(id, input),
      "orders"
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.executeOperation(
      () => this.deleteLocalOrder(id),
      () => this.deleteSupabaseOrder(id),
      "orders"
    );
  }

  async query(filters: Record<string, any>): Promise<any[]> {
    return this.executeOperation(
      () => this.queryLocalOrders(filters),
      () => this.querySupabaseOrders(filters),
      "orders"
    );
  }

  // LocalStorage implementations
  private getLocalOrders(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(this.ORDERS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  private getLocalOrderById(id: string): any | null {
    const orders = this.getLocalOrders();
    return orders.find((o) => o.id === id) || null;
  }

  private createLocalOrder(input: any): any {
    const orders = this.getLocalOrders();
    const newOrder = {
      id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...input,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    orders.push(newOrder);
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
    return newOrder;
  }

  private updateLocalOrder(id: string, input: Partial<any>): any | null {
    const orders = this.getLocalOrders();
    const index = orders.findIndex((o) => o.id === id);
    if (index === -1) return null;
    orders[index] = { ...orders[index], ...input, updatedAt: new Date().toISOString() };
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
    return orders[index];
  }

  private deleteLocalOrder(id: string): boolean {
    const orders = this.getLocalOrders();
    const filtered = orders.filter((o) => o.id !== id);
    if (filtered.length === orders.length) return false;
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(filtered));
    return true;
  }

  private queryLocalOrders(filters: Record<string, any>): any[] {
    let orders = this.getLocalOrders();
    Object.entries(filters).forEach(([key, value]) => {
      orders = orders.filter((o) => o[key] === value);
    });
    return orders;
  }

  // Supabase implementations (placeholders for Phase 6)
  private async getSupabaseOrders(): Promise<any[]> {
    const { data, error } = await this.supabase.from("orders").select("*");
    if (error) throw error;
    return data || [];
  }

  private async getSupabaseOrderById(id: string): Promise<any | null> {
    const { data, error } = await this.supabase.from("orders").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }

  private async createSupabaseOrder(input: any): Promise<any> {
    const { data, error } = await this.supabase.from("orders").insert(input).select().single();
    if (error) throw error;
    return data;
  }

  private async updateSupabaseOrder(id: string, input: Partial<any>): Promise<any | null> {
    const { data, error } = await this.supabase.from("orders").update(input).eq("id", id).select().single();
    if (error) throw error;
    return data;
  }

  private async deleteSupabaseOrder(id: string): Promise<boolean> {
    const { error } = await this.supabase.from("orders").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  private async querySupabaseOrders(filters: Record<string, any>): Promise<any[]> {
    let query = this.supabase.from("orders").select("*");
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

/**
 * Cart adapter - keeps localStorage as primary for now
 * Cart migration will happen in Phase 5
 */
export class CartAdapter extends DataSourceAdapter<
  any,
  any,
  Partial<any>
> {
  private readonly CART_KEY = "shopnest_cart";

  async getAll(): Promise<any[]> {
    // Cart is currently localStorage-only until Phase 5
    return this.getLocalCart();
  }

  async getById(id: string): Promise<any | null> {
    // Cart doesn't use getById
    return null;
  }

  async create(input: any): Promise<any> {
    // Cart operations are handled differently
    return input;
  }

  async update(id: string, input: Partial<any>): Promise<any | null> {
    // Cart operations are handled differently
    return null;
  }

  async delete(id: string): Promise<boolean> {
    // Cart operations are handled differently
    return false;
  }

  async query(filters: Record<string, any>): Promise<any[]> {
    return this.getLocalCart();
  }

  private getLocalCart(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(this.CART_KEY);
      const cart = stored ? JSON.parse(stored) : { items: [] };
      return cart.items || [];
    } catch {
      return [];
    }
  }
}

/**
 * Singleton instances for use throughout the app
 */
export const userAdapter = new UserAdapter();
export const productAdapter = new ProductAdapter();
export const orderAdapter = new OrderAdapter();
export const cartAdapter = new CartAdapter();
