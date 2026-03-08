
-- Create enum for organization roles
CREATE TYPE public.org_role AS ENUM ('admin', 'editor', 'viewer');

-- Create organization_members table
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create organization_invites table
CREATE TABLE public.organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT,
  invite_token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  role org_role NOT NULL DEFAULT 'viewer',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.organization_invites ENABLE ROW LEVEL SECURITY;

-- Security definer function: check if current user is an accepted member of the same org as _data_user_id
CREATE OR REPLACE FUNCTION public.is_org_colleague(_data_user_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om1
    JOIN organization_members om2 ON om1.organization_id = om2.organization_id
    WHERE om1.user_id = auth.uid()
    AND om2.user_id = _data_user_id
    AND om1.status = 'accepted'
    AND om2.status = 'accepted'
    AND om1.user_id <> _data_user_id
  )
$$;

-- Security definer function: get org role of current user relative to data owner
CREATE OR REPLACE FUNCTION public.get_org_role(_data_user_id UUID)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om1.role::text
  FROM organization_members om1
  JOIN organization_members om2 ON om1.organization_id = om2.organization_id
  WHERE om1.user_id = auth.uid()
  AND om2.user_id = _data_user_id
  AND om1.status = 'accepted'
  AND om2.status = 'accepted'
  LIMIT 1
$$;

-- Security definer: check if user is admin of a given org
CREATE OR REPLACE FUNCTION public.is_org_admin(_org_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members
    WHERE organization_id = _org_id
    AND user_id = auth.uid()
    AND role = 'admin'
    AND status = 'accepted'
  )
$$;

-- Security definer: get user's org id
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = _user_id
  AND om.status = 'accepted'
  LIMIT 1
$$;

-- RLS for organization_members
CREATE POLICY "Members can view own org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members sub
      WHERE sub.user_id = auth.uid() AND sub.status = 'accepted'
    )
  );

-- Wait, this causes recursion. Let me use the security definer function instead.
DROP POLICY IF EXISTS "Members can view own org members" ON public.organization_members;

CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT
  TO authenticated
  USING (
    public.is_org_admin(organization_id)
    OR user_id = auth.uid()
    OR public.get_user_org_id(auth.uid()) = organization_id
  );

CREATE POLICY "Admins can insert org members"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id) OR user_id = auth.uid()
  );

CREATE POLICY "Admins can update org members"
  ON public.organization_members FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Admins can delete org members"
  ON public.organization_members FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id) OR user_id = auth.uid());

-- RLS for organization_invites
CREATE POLICY "Admins can view org invites"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Admins can insert org invites"
  ON public.organization_invites FOR INSERT
  TO authenticated
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "Admins can update org invites"
  ON public.organization_invites FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(organization_id));

CREATE POLICY "Admins can delete org invites"
  ON public.organization_invites FOR DELETE
  TO authenticated
  USING (public.is_org_admin(organization_id));

-- Allow anyone to read an invite by token (for accepting)
CREATE POLICY "Anyone can read invite by token"
  ON public.organization_invites FOR SELECT
  TO authenticated
  USING (true);

-- Trigger: auto-add org owner as admin member when org is created
CREATE OR REPLACE FUNCTION public.auto_add_org_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (NEW.id, NEW.user_id, 'admin', 'accepted')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_org_owner();

-- Add unique constraint on organizations.user_id if not exists (for upsert)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_user_id_key'
  ) THEN
    ALTER TABLE public.organizations ADD CONSTRAINT organizations_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Backfill: add existing org owners as admin members
INSERT INTO public.organization_members (organization_id, user_id, role, status)
SELECT id, user_id, 'admin', 'accepted'
FROM public.organizations
ON CONFLICT (organization_id, user_id) DO NOTHING;
