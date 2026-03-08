
CREATE OR REPLACE FUNCTION public.notify_org_admins_on_accept(
  _org_id uuid,
  _accepted_user_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invite record;
BEGIN
  -- Find the invite that was accepted by the current user for this org
  SELECT invited_by INTO _invite
  FROM organization_invites
  WHERE organization_id = _org_id
  AND status = 'accepted'
  AND (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
  ORDER BY created_at DESC
  LIMIT 1;

  IF _invite.invited_by IS NOT NULL AND _invite.invited_by != auth.uid() THEN
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      _invite.invited_by,
      _accepted_user_name || ' aceitou o convite',
      _accepted_user_name || ' agora faz parte da organização.',
      'org',
      '/dashboard/profile'
    );
  END IF;
END;
$$;
