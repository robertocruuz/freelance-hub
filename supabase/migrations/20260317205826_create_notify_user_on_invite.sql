-- Create an RPC function to notify a user securely when they are invited to an org
CREATE OR REPLACE FUNCTION public.notify_user_on_invite(
  _user_id uuid,
  _org_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Required to bypass RLS and allow the inviter to insert a notification for another user
SET search_path = public
AS $$
DECLARE
  _org_name text;
  _inviter_name text;
BEGIN
  -- Get the organization name
  SELECT COALESCE(trade_name, company_name, 'uma organização') INTO _org_name
  FROM organizations
  WHERE id = _org_id;

  -- Get the inviter's name
  SELECT COALESCE(name, 'Alguém') INTO _inviter_name
  FROM profiles
  WHERE user_id = auth.uid();

  -- Insert the notification
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (
    _user_id,
    'Novo convite de equipe',
    _inviter_name || ' convidou você para participar da equipe: ' || _org_name,
    'org',
    '/dashboard/profile'
  );
END;
$$;
