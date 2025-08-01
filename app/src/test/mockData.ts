import type { User } from "../types/user";
import type { ShoppingList, ShoppingItem } from "../types/shopping";

export const mockUser: User = {
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  username: "testuser",
  provider: "google",
  photo: "data:image/jpeg;base64,test-photo-data",
  preferences: {
    theme: "light",
    language: "en",
  },
  createdAt: 1640995200000, // 2022-01-01
  updatedAt: 1640995200000,
};

export const mockShoppingItem: ShoppingItem = {
  id: "test-item-id",
  name: "Test Item",
  quantity: 2,
  category: "groceries",
  completed: false,
  notes: "Test notes",
  createdAt: "2022-01-01T00:00:00.000Z",
  updatedAt: "2022-01-01T00:00:00.000Z",
};

export const mockShoppingList: ShoppingList = {
  _id: "test-list-id",
  user_id: "test-user-id",
  name: "Test Shopping List",
  description: "Test description",
  color: "#2e7d32",
  archived: false,
  status: "active",
  items: [mockShoppingItem],
  createdAt: 1640995200000,
  updatedAt: 1640995200000,
};

export const mockApiResponse = {
  success: true,
  data: {},
  message: "Success",
};

export const mockApiError = {
  success: false,
  error: "Test error",
  message: "Test error message",
};
