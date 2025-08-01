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
  status: "active" | "completed" | "archived" | "deleted";
  home_id?: string;
  items: ShoppingItem[];
  createdAt: number; // Unix timestamp in milliseconds
  updatedAt: number; // Unix timestamp in milliseconds

  // Computed fields (added by backend)
  can_be_completed?: boolean;
  completion_percentage?: number;

  // Permission fields (added by backend)
  permissions?: {
    can_edit: boolean;
    can_complete_items: boolean;
  };

  // Enriched fields (added by backend)
  creator?: {
    id: string;
    name: string;
    photo?: string;
  };
  home?: {
    id: string;
    name: string;
  };
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
  home_id?: string;
}

export interface UpdateShoppingListData {
  name?: string;
  description?: string;
  color?: string;
  archived?: boolean;
  status?: "active" | "completed" | "archived" | "deleted";
  home_id?: string;
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
