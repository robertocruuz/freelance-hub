-- Migration: Add Team Chat RPC and Sync Triggers

-- 1. Create Team Channel RPC
CREATE OR REPLACE FUNCTION public.create_team_channel(org_id uuid, ch_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_channel_id uuid;
  existing_id uuid;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for existing team channel with same name in org
  SELECT id INTO existing_id FROM public.channels 
  WHERE organization_id = org_id AND type = 'team' AND name = ch_name LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RETURN existing_id;
  END IF;

  -- Create channel
  INSERT INTO public.channels (type, organization_id, name)
  VALUES ('team', org_id, ch_name)
  RETURNING id INTO new_channel_id;

  -- Add all accepted organization members to the channel
  INSERT INTO public.channel_members (channel_id, user_id, role)
  SELECT new_channel_id, user_id, 'member'
  FROM public.organization_members
  WHERE organization_id = org_id AND status = 'accepted'
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  -- Ensure creator is added as admin
  INSERT INTO public.channel_members (channel_id, user_id, role)
  VALUES (new_channel_id, auth.uid(), 'admin')
  ON CONFLICT (channel_id, user_id) DO UPDATE SET role = 'admin';

  RETURN new_channel_id;
END;
$$;

-- 2. Trigger to sync future org members to all existing team channels
CREATE OR REPLACE FUNCTION public.add_org_member_to_team_channels()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'accepted' THEN
    INSERT INTO public.channel_members (channel_id, user_id, role)
    SELECT c.id, NEW.user_id, 'member'
    FROM public.channels c
    WHERE c.organization_id = NEW.organization_id AND c.type = 'team'
    ON CONFLICT (channel_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists (to allow re-running)
DROP TRIGGER IF EXISTS on_org_member_added ON public.organization_members;

CREATE TRIGGER on_org_member_added
AFTER INSERT OR UPDATE OF status ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION public.add_org_member_to_team_channels();
