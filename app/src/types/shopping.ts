export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  category: string;
  notes: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShoppingList {
  _id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  archived: boolean;
  items: ShoppingItem[];
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds
}

export interface ShoppingListStats {
  total_lists: number;
  active_lists: number;
  archived_lists: number;
  total_items: number;
  completed_items: number;
  completion_rate: number;
}

export interface CreateShoppingListData {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateShoppingListData {
  name?: string;
  description?: string;
  color?: string;
  archived?: boolean;
}

export interface CreateShoppingItemData {
  name: string;
  quantity?: number;
  category?: string;
  notes?: string;
}

export interface UpdateShoppingItemData {
  name?: string;
  quantity?: number;
  category?: string;
  notes?: string;
  completed?: boolean;
}
