import { http, HttpResponse } from "msw";
import { mockUser, mockShoppingList, mockApiResponse } from "./mockData";

const API_BASE = "https://shop-list-api.the-cube-lab.com";

export const handlers = [
  // Auth endpoints
  http.get(`${API_BASE}/api/auth/google/url`, () => {
    return HttpResponse.json({
      auth_url: "https://accounts.google.com/oauth2/auth?mock=true",
      state: "mock-state",
    });
  }),

  http.get(`${API_BASE}/api/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      message: "Success",
      data: { user: mockUser },
    });
  }),

  http.post(`${API_BASE}/api/auth/login`, async ({ request }) => {
    const body = (await request.json()) as any;

    // Check for test credentials
    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        success: true,
        message: "Success",
        data: {
          user: mockUser,
          access_token: "mock-access-token",
          refresh_token: "mock-refresh-token",
        },
      });
    }

    // Return error for invalid credentials
    return HttpResponse.json(
      { success: false, message: "Invalid email or password" },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/api/auth/logout`, () => {
    return HttpResponse.json(mockApiResponse);
  }),

  // User endpoints
  http.get(`${API_BASE}/api/user/profile`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { user: mockUser },
    });
  }),

  http.put(`${API_BASE}/api/user/profile`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { user: mockUser },
    });
  }),

  // Shopping list endpoints
  http.get(`${API_BASE}/api/shopping/lists`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { lists: [mockShoppingList] },
    });
  }),

  http.post(`${API_BASE}/api/shopping/lists`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { list: mockShoppingList },
    });
  }),

  http.get(`${API_BASE}/api/shopping/lists/:id`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { list: mockShoppingList },
    });
  }),

  http.put(`${API_BASE}/api/shopping/lists/:id`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { list: mockShoppingList },
    });
  }),

  http.delete(`${API_BASE}/api/shopping/lists/:id`, () => {
    return HttpResponse.json(mockApiResponse);
  }),

  // Shopping items endpoints
  http.post(`${API_BASE}/api/shopping/lists/:listId/items`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { item: mockShoppingList.items[0] },
    });
  }),

  http.put(`${API_BASE}/api/shopping/lists/:listId/items/:itemId`, () => {
    return HttpResponse.json({
      ...mockApiResponse,
      data: { item: mockShoppingList.items[0] },
    });
  }),

  http.delete(`${API_BASE}/api/shopping/lists/:listId/items/:itemId`, () => {
    return HttpResponse.json(mockApiResponse);
  }),

  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: "ok" });
  }),
];
