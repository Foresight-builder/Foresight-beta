import type { ProfileUserSummary } from "@/app/profile/types";

export type UserFollowsCountsResponse = {
  followersCount: number;
  followingCount: number;
};

export type UserFollowsUsersResponse = {
  users: ProfileUserSummary[];
  total: number;
  page: number;
  limit: number;
};

export type UserFollowsEvent = {
  id: number;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  image_url?: string | null;
  deadline?: string | null;
  min_stake?: number | null;
  status?: string | null;
  created_at?: string | null;
  followers_count: number;
};

export type UserFollowsEventsResponse = {
  follows: UserFollowsEvent[];
  total: number;
};

export type UserFollowStatusResponse = {
  followed: boolean;
};

export type UserFollowToggleResponse = {
  followed: boolean;
};
