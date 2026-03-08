CREATE OR REPLACE FUNCTION public.notify_task_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _modifier_name text;
  _modifier_id uuid := auth.uid();
  _notification_title text;
  _notification_message text;
  _new_col_name text;
  _board_id uuid;
  _recipient_id uuid;
BEGIN
  -- Verifica se é uma atualização de coluna ou status
  IF TG_OP = 'UPDATE' THEN
    IF NEW.column_id IS DISTINCT FROM OLD.column_id OR (NEW.status = 'done' AND OLD.status IS DISTINCT FROM 'done') THEN
      
      -- Obter o nome de quem modificou
      IF _modifier_id IS NOT NULL THEN
        SELECT COALESCE(name, email, 'Alguém') INTO _modifier_name FROM profiles WHERE user_id = _modifier_id;
      ELSE
        _modifier_name := 'Alguém';
      END IF;

      -- Obter os nomes da nova coluna e o board_id
      IF NEW.column_id IS NOT NULL THEN
        SELECT name, board_id INTO _new_col_name, _board_id FROM kanban_columns WHERE id = NEW.column_id;
      END IF;

      IF NEW.column_id IS DISTINCT FROM OLD.column_id THEN
        IF _new_col_name ILIKE '%concluído%' OR _new_col_name ILIKE '%concluido%' THEN
          _notification_title := _modifier_name || ' concluiu uma tarefa';
          _notification_message := 'A tarefa "' || NEW.title || '" foi movida para "' || _new_col_name || '".';
        ELSE
          _notification_title := _modifier_name || ' moveu uma tarefa';
          _notification_message := 'A tarefa "' || NEW.title || '" foi movida para a coluna "' || _new_col_name || '".';
        END IF;
      ELSE
        -- Apenas status mudou para 'done'
        _notification_title := _modifier_name || ' concluiu uma tarefa';
        _notification_message := 'A tarefa "' || NEW.title || '" foi marcada como concluída.';
      END IF;

      -- Enviar notificação para todos os usuários com acesso (exceto o que fez a ação)
      FOR _recipient_id IN
        SELECT DISTINCT u_id FROM (
          -- Dono da tarefa
          SELECT NEW.user_id as u_id
          UNION
          -- Compartilhado diretamente com o usuário (tarefa)
          SELECT shared_with_user_id FROM shares 
          WHERE resource_type = 'task' AND resource_id = NEW.id AND share_type = 'user' AND shared_with_user_id IS NOT NULL
          UNION
          -- Compartilhado com a organização (tarefa)
          SELECT om.user_id 
          FROM shares s
          JOIN organization_members om1 ON om1.user_id = s.created_by AND om1.status = 'accepted'
          JOIN organization_members om ON om.organization_id = om1.organization_id AND om.status = 'accepted'
          WHERE s.resource_type = 'task' AND s.resource_id = NEW.id AND s.share_type = 'org'
          UNION
          -- Quadro compartilhado diretamente com usuário
          SELECT shared_with_user_id 
          FROM shares 
          WHERE resource_type = 'board' AND resource_id = _board_id AND share_type = 'user' AND shared_with_user_id IS NOT NULL
          UNION
          -- Quadro compartilhado com organização
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
          '/dashboard/kanban?task=' || NEW.id
        );
      END LOOP;
      
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_task_updated ON public.tasks;
CREATE TRIGGER on_task_updated
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_updates();