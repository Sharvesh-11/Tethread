// Returns Authorization header for admin endpoints: localStorage token, else NextAuth session jwt
export async function getAdminHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
  let token: string | null = null;
  if (typeof window !== "undefined") {
    token = localStorage.getItem(AUTH_TOKEN_KEY);
  }
  if (!token) {
    try {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      token = (session?.user as any)?.jwt ?? null;
    } catch {
      // ignore
    }
  }
  return token ? { Authorization: `Bearer ${token}`, ...extra } : { ...extra };
}
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const AUTH_TOKEN_KEY = "token";

export type Product = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category?: string;
  featured?: boolean;
  stock_quantity?: number;
  created_at?: string;
  updated_at?: string;
};

export type OrderItem = {
  id?: string;
  product_id: number;
  quantity: number;
  unit_price?: number;
  subtotal?: number;
  product?: Product;
};

export type User = {
  id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  is_active?: boolean;
  is_admin?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type Order = {
  id: number;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  items: OrderItem[];
  shipping_address: string;
  delivery_address?: string;
  status?: string;
  total_amount?: number;
  total_price?: number;
  created_at?: string;
  updated_at?: string;
};

type RegisterResponse = {
  user: User;
  token?: string;
  message?: string;
};

type LoginResponse = {
  access_token?: string;
  token?: string;
  token_type?: string;
  user?: User;
  message?: string;
};

type CreateOrderPayload = {
  items: OrderItem[];
  shipping_address: string;
};

type CheckoutOrderPayload = {
  user_id: number;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
  total_price: number;
  user_name: string;
  user_email: string;
  user_phone: string;
  delivery_address: string;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function parseErrorResponse(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    const message = data?.detail || data?.message || data?.error;
    if (typeof message === "string" && message.trim()) return message;
  }
  const text = await response.text().catch(() => "");
  return text || `Request failed with status ${response.status}`;
}

async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = getAuthToken();

  if (!token) {
    try {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      console.log("fetchAPI session user:", JSON.stringify(session?.user));
      token = (session?.user as any)?.jwt ?? null;
      console.log("fetchAPI token found:", !!token);
    } catch {
      // ignore
    }
  }

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return {} as T;

  return (await response.json()) as T;
}

export async function getAuthHeadersAsync(): Promise<{ [key: string]: string }> {
  let token = getAuthToken();
  if (!token) {
    try {
      const { getSession } = await import("next-auth/react");
      const session = await getSession();
      token = (session?.user as any)?.jwt ?? null;
    } catch {
      // ignore
    }
  }
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function registerUser(
  full_name: string,
  email: string,
  password: string,
  phone_number?: string,
): Promise<RegisterResponse> {
  return fetchAPI<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      full_name,
      email,
      password,
      ...(phone_number ? { phone_number } : {}),
    }),
  });
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams();
  formData.append("username", email);
  formData.append("password", password);

  const response = await fetchAPI<LoginResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData,
  });

  const token = response.access_token || response.token;
  if (token) setAuthToken(token);

  return response;
}

export async function getMe(): Promise<User> {
  return fetchAPI<User>("/auth/me", { method: "GET" });
}

export function logoutUser(): void {
  clearAuthToken();
}

export async function getProducts(category?: string, featured?: boolean): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (typeof featured === "boolean") params.set("featured", String(featured));
  const query = params.toString();
  return fetchAPI<Product[]>(query ? `/products?${query}` : "/products", { method: "GET" });
}

export async function getProduct(id: number | string): Promise<Product> {
  return fetchAPI<Product>(`/products/${id}`, { method: "GET" });
}

export async function createOrder(items: OrderItem[], shipping_address: string): Promise<Order> {
  return fetchAPI<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({ items, shipping_address }),
  });
}

export async function createCheckoutOrder(payload: CheckoutOrderPayload): Promise<Order> {
  return fetchAPI<Order>("/orders", {
    method: "POST",
    body: JSON.stringify({
      items: payload.items.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      })),
      shipping_address: {
        full_name: payload.user_name,
        phone: payload.user_phone,
        address: payload.delivery_address,
        city: "",
      },
    }),
  });
}

export async function getOrders(): Promise<Order[]> {
  return fetchAPI<Order[]>("/orders", { method: "GET" });
}

export async function getOrder(id: number | string): Promise<Order> {
  return fetchAPI<Order>(`/orders/${id}`, { method: "GET" });
}

export type CompletedOrderAnalytic = {
  user_name: string;
  user_email: string;
  product_name: string;
  product_id: string;
  order_date: string;
  order_status: string;
};

export async function getCompletedOrdersAnalytics(): Promise<CompletedOrderAnalytic[]> {
  return fetchAPI<CompletedOrderAnalytic[]>("/orders/analytics/completed", { method: "GET" });
}

export type CancelledOrderAnalytic = {
  user_name: string;
  user_email: string;
  product_name: string;
  product_id: string;
  cancellation_date: string;
};

export async function getCancelledOrdersAnalytics(): Promise<CancelledOrderAnalytic[]> {
  return fetchAPI<CancelledOrderAnalytic[]>("/orders/analytics/cancelled", { method: "GET" });
}