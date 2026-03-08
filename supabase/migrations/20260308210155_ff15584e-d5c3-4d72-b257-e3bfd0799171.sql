
-- Allow authenticated users to look up profiles by email for sharing
CREATE POLICY "Authenticated users can find profiles by email"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Drop the old restrictive policies that are now redundant
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Org colleagues can view profiles" ON public.profiles;
