
-- Create a security definer function to insert notifications for other users
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
  _admin record;
  _current_user_id uuid := auth.uid();
BEGIN
  FOR _admin IN
    SELECT user_id FROM organization_members
    WHERE organization_id = _org_id
    AND role = 'admin'
    AND status = 'accepted'
    AND user_id != _current_user_id
  LOOP
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      _admin.user_id,
      _accepted_user_name || ' aceitou o convite',
      _accepted_user_name || ' agora faz parte da organização.',
      'org',
      '/dashboard/profile'
    );
  END LOOP;
END;
$$;
