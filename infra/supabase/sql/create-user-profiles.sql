
-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  wallet_address TEXT PRIMARY KEY,
  username TEXT,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
-- Allow read access to everyone (or authenticated users?)
-- API uses supabaseAdmin for some ops, but let's allow public read for profiles if needed by frontend directly?
-- The API /api/user-profiles handles fetching, so maybe we don't need public read if only API accesses it?
-- But frontend might use Supabase client directly?
-- WalletModal uses /api/user-profiles.
-- ProfilePage uses /api/user-profiles.

-- So strict RLS is fine if only service role accesses it.
-- But wait, is_admin check in API:
-- const { data, error } = await client.from('user_profiles')...
-- client can be supabaseAdmin or supabase (anon).
-- If it uses supabase (anon), we need RLS allowing read.

CREATE POLICY "Allow public read access" ON public.user_profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile?
-- The API handles updates using supabaseAdmin usually?
-- Check /api/user-profiles/route.ts:
-- POST uses supabaseAdmin.
-- GET uses supabaseAdmin || supabase.

-- So we need read policy.
-- Write is done via API with admin key, so RLS doesn't block it (service role bypasses RLS).

-- Optional: Create index on email if unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
