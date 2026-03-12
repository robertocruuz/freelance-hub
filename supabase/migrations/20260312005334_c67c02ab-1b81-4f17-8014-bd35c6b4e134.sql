
CREATE OR REPLACE FUNCTION public.notify_lead_updates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _modifier_name text;
  _modifier_id uuid := auth.uid();
  _notification_title text;
  _notification_message text;
  _new_stage_name text;
  _recipient_id uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    -- Only notify on stage change or status change (won/lost)
    IF NEW.stage_id IS DISTINCT FROM OLD.stage_id
       OR NEW.status IS DISTINCT FROM OLD.status THEN

      -- Get modifier name
      SELECT COALESCE(name, email, 'Alguém') INTO _modifier_name
      FROM profiles WHERE user_id = _modifier_id;

      IF NEW.stage_id IS DISTINCT FROM OLD.stage_id AND NEW.stage_id IS NOT NULL THEN
        SELECT name INTO _new_stage_name FROM lead_stages WHERE id = NEW.stage_id;
        _notification_title := _modifier_name || ' moveu um negócio';
        _notification_message := 'O negócio "' || NEW.title || '" foi movido para "' || COALESCE(_new_stage_name, 'outra etapa') || '".';
      ELSIF NEW.status = 'won' AND OLD.status IS DISTINCT FROM 'won' THEN
        _notification_title := _modifier_name || ' ganhou um negócio';
        _notification_message := 'O negócio "' || NEW.title || '" foi marcado como ganho.';
      ELSIF NEW.status = 'lost' AND OLD.status IS DISTINCT FROM 'lost' THEN
        _notification_title := _modifier_name || ' perdeu um negócio';
        _notification_message := 'O negócio "' || NEW.title || '" foi marcado como perdido.';
      END IF;

      IF _notification_title IS NOT NULL THEN
        -- Notify: owner + users with direct lead share + pipeline share (org)
        FOR _recipient_id IN
          SELECT DISTINCT u_id FROM (
            -- Lead owner
            SELECT NEW.user_id AS u_id
            UNION
            -- Directly shared with user (lead)
            SELECT shared_with_user_id FROM shares
            WHERE resource_type = 'lead' AND resource_id = NEW.id
            AND share_type = 'user' AND shared_with_user_id IS NOT NULL
            UNION
            -- Shared with org (lead)
            SELECT om.user_id
            FROM shares s
            JOIN organization_members om1 ON om1.user_id = s.created_by AND om1.status = 'accepted'
            JOIN organization_members om ON om.organization_id = om1.organization_id AND om.status = 'accepted'
            WHERE s.resource_type = 'lead' AND s.resource_id = NEW.id AND s.share_type = 'org'
            UNION
            -- Pipeline shared with user
            SELECT shared_with_user_id FROM shares
            WHERE resource_type = 'pipeline' AND resource_id = NEW.user_id
            AND share_type = 'user' AND shared_with_user_id IS NOT NULL
            UNION
            -- Pipeline shared with org
            SELECT om.user_id
            FROM shares s
            JOIN organization_members om1 ON om1.user_id = s.created_by AND om1.status = 'accepted'
            JOIN organization_members om ON om.organization_id = om1.organization_id AND om.status = 'accepted'
            WHERE s.resource_type = 'pipeline' AND s.resource_id = NEW.user_id AND s.share_type = 'org'
          ) all_users
          WHERE u_id != _modifier_id AND u_id IS NOT NULL
        LOOP
          INSERT INTO notifications (user_id, title, message, type, link)
          VALUES (
            _recipient_id,
            _notification_title,
            _notification_message,
            'info',
            '/dashboard/leads'
          );
        END LOOP;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on leads table
DROP TRIGGER IF EXISTS on_lead_update_notify ON public.leads;
CREATE TRIGGER on_lead_update_notify
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_updates();
