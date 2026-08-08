// engine/ui/js/api.mjs — thin fetch wrapper over the LOOM ENGINE HTTP API (see engine/SPEC.md)

const BASE = "/api";

async function req(method, path, body) {
  const opts = { method, headers: {} };
  if (body !== undefined) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(BASE + path, opts);
  } catch (err) {
    throw new ApiError("NETWORK", `could not reach engine: ${err.message}`, 0);
  }
  let json = null;
  try {
    json = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const e = json && json.error ? json.error : { code: "UNKNOWN", message: res.statusText };
    throw new ApiError(e.code, e.message, res.status);
  }
  return json;
}

export class ApiError extends Error {
  constructor(code, message, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const api = {
  health: () => req("GET", "/health"),

  clients: () => req("GET", "/clients"),
  createClient: (body) => req("POST", "/clients", body),
  patchClient: (id, body) => req("PATCH", `/clients/${id}`, body),
  deleteClient: (id) => req("DELETE", `/clients/${id}`),

  products: (clientId) => req("GET", `/products?clientId=${encodeURIComponent(clientId)}`),
  createProduct: (body) => req("POST", "/products", body),
  patchProduct: (id, body) => req("PATCH", `/products/${id}`, body),
  deleteProduct: (id) => req("DELETE", `/products/${id}`),

  posts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req("GET", `/posts${q ? "?" + q : ""}`);
  },
  createPost: (body) => req("POST", "/posts", body),
  patchPost: (id, body) => req("PATCH", `/posts/${id}`, body),
  deletePost: (id) => req("DELETE", `/posts/${id}`),
  regeneratePost: (id, body) => req("POST", `/posts/${id}/regenerate`, body),

  generateMonth: (body) => req("POST", "/generate/month", body),
  job: (id) => req("GET", `/jobs/${id}`),

  carouselCut: (body) => req("POST", "/carousel/cut", body),

  createApproval: (body) => req("POST", "/approvals", body),
  approval: (token) => req("GET", `/approvals/${token}`),
  decide: (token, body) => req("POST", `/approvals/${token}/decide`, body),

  creatives: (category) => req("GET", `/creatives${category ? "?category=" + encodeURIComponent(category) : ""}`),
  createCreative: (body) => req("POST", "/creatives", body),
  patchCreative: (id, body) => req("PATCH", `/creatives/${id}`, body),
  bestCreative: (category) => req("GET", `/creatives/best?category=${encodeURIComponent(category)}`),

  campaigns: (clientId) => req("GET", `/campaigns${clientId ? "?clientId=" + encodeURIComponent(clientId) : ""}`),
  createCampaign: (body) => req("POST", "/campaigns", body),
  patchCampaign: (id, body) => req("PATCH", `/campaigns/${id}`, body),

  conversations: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req("GET", `/conversations${q ? "?" + q : ""}`);
  },
  createConversation: (body) => req("POST", "/conversations", body),
  importConversations: (body) => req("POST", "/conversations/import", body),

  invoices: (month) => req("GET", `/invoices${month ? "?month=" + encodeURIComponent(month) : ""}`),
  generateInvoices: (month) => req("POST", "/invoices/generate", { month }),
  patchInvoice: (id, body) => req("PATCH", `/invoices/${id}`, body),

  ops: (month) => req("GET", `/ops${month ? "?month=" + encodeURIComponent(month) : ""}`),
  settings: () => req("GET", "/settings"),
  patchSettings: (body) => req("PATCH", "/settings", body),
};
