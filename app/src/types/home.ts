export interface Home {
  _id: string;
  name: string;
  description: string;
  creator_id: string;
  members: string[];
  member_count: number;
  createdAt: number;
  updatedAt: number;
}

export interface HomeMember {
  _id: string;
  name: string;
  email: string;
  photo?: string;
}

export interface HomeInvitation {
  _id: string;
  home_id: string;
  from_user_id: string;
  to_user_email: string;
  to_user_id?: string;
  type: "invite" | "request";
  status: "pending" | "accepted" | "rejected";
  message: string;
  createdAt: number;
  updatedAt: number;
  // Enriched fields (added by backend)
  home?: {
    id: string;
    name: string;
    description: string;
    member_count?: number;
  };
  from_user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface HomePermissions {
  can_edit: boolean;
  can_invite: boolean;
  can_remove_members: boolean;
  can_delete: boolean;
}

export interface HomeFilterOption {
  id: string;
  label: string;
  type: "all" | "personal" | "home";
  home_id?: string;
}

export interface HomeMember {
  id: string;
  name: string;
  email: string;
  photo?: string;
  is_creator: boolean;
}

export interface CreateHomeData {
  name: string;
  description?: string;
}

export interface UpdateHomeData {
  name?: string;
  description?: string;
}

export interface InviteUserData {
  email: string;
  message?: string;
}

export interface JoinRequestData {
  message?: string;
}

export interface HomeStats {
  total_homes: number;
  created_homes: number;
  member_homes: number;
  pending_invitations: number;
  pending_requests: number;
}

// Default values
export const createDefaultHome = (): Home => ({
  _id: "",
  name: "",
  description: "",
  creator_id: "",
  members: [],
  member_count: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const createDefaultInvitation = (): HomeInvitation => ({
  _id: "",
  home_id: "",
  from_user_id: "",
  to_user_email: "",
  type: "invite",
  status: "pending",
  message: "",
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
