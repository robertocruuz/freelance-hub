-- Create a trigger for Task Inserts and Updates to generate notifications globally
CREATE OR REPLACE FUNCTION public.notify_task_updates()
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
  _old_col_name text;
  _new_col_name text;
  _recipient_id uuid;
  _changes text := '';
  _board_id uuid;
BEGIN
  -- Determine modifier
  IF TG_OP = 'UPDATE' AND NEW.updated_by IS NOT NULL THEN
    _modifier_id := NEW.updated_by;
  ELSIF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    _modifier_id := NEW.user_id; -- Or auth.uid()
  END IF;

  SELECT COALESCE(name, email) INTO _modifier_name
  FROM profiles WHERE user_id = _modifier_id;
  
  IF _modifier_name IS NULL THEN
    _modifier_name := 'Alguém';
  END IF;

  -- Verify board for pipeline shares
  SELECT board_id INTO _board_id FROM kanban_columns WHERE id = NEW.column_id;

  IF TG_OP = 'INSERT' THEN
    _notification_title := _modifier_name || ' criou uma nova tarefa';
    _notification_message := 'Tarefa: "' || NEW.title || '"';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.column_id IS DISTINCT FROM OLD.column_id AND NEW.column_id IS NOT NULL THEN
      SELECT name INTO _old_col_name FROM kanban_columns WHERE id = OLD.column_id;
      SELECT name INTO _new_col_name FROM kanban_columns WHERE id = NEW.column_id;
      _changes := 'moveu de "' || COALESCE(_old_col_name, '...') || '" para "' || COALESCE(_new_col_name, '...') || '"';
    END IF;

    IF NEW.priority IS DISTINCT FROM OLD.priority THEN
      IF _changes != '' THEN _changes := _changes || ', '; END IF;
      _changes := _changes || 'mudou prioridade para "' || NEW.priority || '"';
    END IF;

    IF NEW.title IS DISTINCT FROM OLD.title THEN
      IF _changes != '' THEN _changes := _changes || ', '; END IF;
      _changes := _changes || 'alterou o título';
    END IF;

    IF _changes != '' THEN
      _notification_title := _modifier_name || ' ' || _changes;
      _notification_message := 'Tarefa: "' || NEW.title || '"';
    END IF;
  END IF;

  IF _notification_title IS NOT NULL THEN
    -- Notify recipients
    FOR _recipient_id IN
      SELECT DISTINCT u_id FROM (
        -- Owner
        SELECT NEW.user_id AS u_id
        UNION
        -- Direct share
        SELECT shared_with_user_id FROM shares
        WHERE resource_type = 'task' AND resource_id = NEW.id
        AND share_type = 'user' AND shared_with_user_id IS NOT NULL
        UNION
        -- Org share
        SELECT om.user_id
        FROM shares s
        JOIN organization_members om1 ON om1.user_id = s.created_by AND om1.status = 'accepted'
        JOIN organization_members om ON om.organization_id = om1.organization_id AND om.status = 'accepted'
        WHERE s.resource_type = 'task' AND s.resource_id = NEW.id AND s.share_type = 'org'
        UNION
        -- Board direct share (if board_id is found)
        SELECT shared_with_user_id FROM shares
        WHERE resource_type = 'board' AND resource_id = _board_id
        AND share_type = 'user' AND shared_with_user_id IS NOT NULL
        UNION
        -- Board org share
        SELECT om.user_id
        FROM shares s
        JOIN organization_members om1 ON om1.user_id = s.created_by AND om1.status = 'accepted'
        JOIN organization_members om ON om.organization_id = om1.organization_id AND om.status = 'accepted'
        WHERE s.resource_type = 'board' AND s.resource_id = _board_id AND s.share_type = 'org'
      ) all_users
      WHERE u_id != _modifier_id AND u_id IS NOT NULL
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        _recipient_id,
        _notification_title,
        _notification_message,
        'info',
        '/dashboard/kanban'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Drop existing trigger if any (though there was none for task movement originally)
DROP TRIGGER IF EXISTS on_task_changed_notify ON public.tasks;

-- Create the trigger
CREATE TRIGGER on_task_changed_notify
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_updates();
