export type FollowingItem = {
  id: number;
  title: string;
  image_url: string | null;
  category: string | null;
  deadline: string | null;
  followers_count: number;
  followed_at?: string;
};
