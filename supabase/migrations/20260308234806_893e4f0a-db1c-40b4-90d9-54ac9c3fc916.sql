-- Função para notificar sobre compartilhamentos
CREATE OR REPLACE FUNCTION public.notify_on_share()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _resource_name text;
  _creator_name text;
  _notification_title text;
  _notification_message text;
  _notification_link text;
  _member_user_id uuid;
BEGIN
  -- Obter nome do criador
  SELECT COALESCE(p.name, p.email, 'Alguém')
  INTO _creator_name
  FROM profiles p
  WHERE p.user_id = NEW.created_by;

  -- Obter nome do recurso e preparar notificação baseado no tipo
  IF NEW.resource_type = 'board' THEN
    SELECT kb.name INTO _resource_name
    FROM kanban_boards kb
    WHERE kb.id = NEW.resource_id;
    
    _notification_title := _creator_name || ' compartilhou um painel';
    _notification_message := 'O painel "' || COALESCE(_resource_name, 'Sem nome') || '" foi compartilhado com você.';
    _notification_link := '/dashboard/kanban?board=' || NEW.resource_id;
    
  ELSIF NEW.resource_type = 'task' THEN
    SELECT t.title INTO _resource_name
    FROM tasks t
    WHERE t.id = NEW.resource_id;
    
    _notification_title := _creator_name || ' compartilhou uma tarefa';
    _notification_message := 'A tarefa "' || COALESCE(_resource_name, 'Sem nome') || '" foi compartilhada com você.';
    _notification_link := '/dashboard/kanban?task=' || NEW.resource_id;
  END IF;

  -- Criar notificações baseado no tipo de compartilhamento
  IF NEW.share_type = 'user' AND NEW.shared_with_user_id IS NOT NULL THEN
    -- Notificar usuário específico
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (
      NEW.shared_with_user_id,
      _notification_title,
      _notification_message,
      'info',
      _notification_link
    );
    
  ELSIF NEW.share_type = 'org' THEN
    -- Notificar todos os membros da organização (exceto o criador)
    FOR _member_user_id IN
      SELECT om.user_id
      FROM organization_members om
      WHERE om.organization_id = (
        SELECT organization_id 
        FROM organization_members 
        WHERE user_id = NEW.created_by 
        AND status = 'accepted'
        LIMIT 1
      )
      AND om.user_id != NEW.created_by
      AND om.status = 'accepted'
    LOOP
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (
        _member_user_id,
        _notification_title,
        _notification_message,
        'info',
        _notification_link
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar trigger para notificar quando um compartilhamento é criado
DROP TRIGGER IF EXISTS on_share_created ON public.shares;
CREATE TRIGGER on_share_created
  AFTER INSERT ON public.shares
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_share();