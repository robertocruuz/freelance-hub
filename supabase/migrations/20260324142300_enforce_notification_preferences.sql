-- Fail-safe Trigger to enforce notification preferences based on profiles.notifications
-- This intercepts IN-APP notifications before they are added to the DB.

CREATE OR REPLACE FUNCTION filter_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pref JSONB;
BEGIN
  -- Wraps EVERYTHING in a BEGIN...EXCEPTION block to ensure this trigger NEVER crashes an insert action
  BEGIN
    -- 1. Fetch user preferences
    SELECT notifications INTO pref 
    FROM public.profiles 
    WHERE user_id = NEW.user_id;
    
    -- 2. If no preferences exist, allow the notification
    IF pref IS NULL THEN
      RETURN NEW;
    END IF;

    -- 3. Check Tasks (Tarefas e Prazos)
    IF NEW.link LIKE '%/kanban%' OR NEW.link LIKE '%/tasks%' OR NEW.title ILIKE '%tarefa%' THEN
      IF NOT COALESCE((pref->>'tasks')::boolean, true) THEN
        RETURN NULL; -- Cancel insert safely
      END IF;
    END IF;

    -- 4. Check Leads (Novos leads e conversões)
    IF NEW.link LIKE '%/leads%' OR NEW.title ILIKE '%lead%' THEN
      IF NOT COALESCE((pref->>'leads')::boolean, true) THEN
        RETURN NULL;
      END IF;
    END IF;

    -- 5. Check Invites (Convites de organização)
    IF NEW.link LIKE '%/settings?openOrg=true%' OR NEW.title ILIKE '%convidou%' OR NEW.title ILIKE '%convite%' THEN
      IF NOT COALESCE((pref->>'invites')::boolean, true) THEN
        RETURN NULL;
      END IF;
    END IF;

    -- 6. Check Finance (Alertas financeiros)
    IF NEW.link LIKE '%/finance%' OR NEW.title ILIKE '%fatura%' OR NEW.title ILIKE '%despesa%' OR NEW.title ILIKE '%pagamento%' THEN
      IF NOT COALESCE((pref->>'finance')::boolean, true) THEN
        RETURN NULL;
      END IF;
    END IF;

    -- If it doesn't match any blocked category, or the user hasn't explicitly disabled it, allow it
    RETURN NEW;

  EXCEPTION WHEN OTHERS THEN
    -- FAIL-SAFE: If any error happens parsing JSON or matching rules, just let the notification happen
    -- instead of breaking the platform!
    RETURN NEW;
  END;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_notification_preferences ON public.notifications;

-- Create the before insert trigger
CREATE TRIGGER trg_enforce_notification_preferences
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION filter_notifications();
