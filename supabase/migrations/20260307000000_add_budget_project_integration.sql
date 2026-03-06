
-- Add budget_id to projects to link them and prevent duplicates
ALTER TABLE public.projects ADD COLUMN budget_id UUID REFERENCES public.budgets(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX idx_projects_budget_id ON public.projects(budget_id);

-- Function to handle budget approval
CREATE OR REPLACE FUNCTION public.handle_budget_approved()
RETURNS TRIGGER AS $$
DECLARE
  new_project_id UUID;
  first_column_id UUID;
  item JSONB;
BEGIN
  -- Only proceed if status changed to 'approved'
  IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved')) THEN

    -- Check if project already exists for this budget (redundant because of unique index but good for safety)
    IF NOT EXISTS (SELECT 1 FROM public.projects WHERE budget_id = NEW.id) THEN

      -- Create the project
      INSERT INTO public.projects (user_id, client_id, name, hourly_rate, budget_id)
      VALUES (
        NEW.user_id,
        NEW.client_id,
        'Projeto - Orçamento ' || substring(NEW.id::text from 1 for 8),
        0,
        NEW.id
      )
      RETURNING id INTO new_project_id;

      -- Get the first kanban column for this user
      SELECT id INTO first_column_id
      FROM public.kanban_columns
      WHERE user_id = NEW.user_id
      ORDER BY position ASC
      LIMIT 1;

      -- If no column exists, we might need to create default ones or just skip task creation
      -- But usually useKanban hook ensures columns exist.
      -- If still null, tasks will have null column_id (allowed by schema)

      -- Create tasks for each budget item
      FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
      LOOP
        INSERT INTO public.tasks (
          user_id,
          column_id,
          client_id,
          project_id,
          title,
          description,
          estimated_value,
          status
        )
        VALUES (
          NEW.user_id,
          first_column_id,
          NEW.client_id,
          new_project_id,
          COALESCE(item->>'description', 'Sem descrição'),
          'Tarefa criada automaticamente a partir do Orçamento ' || NEW.id,
          (COALESCE(item->>'quantity', '0'))::numeric * (COALESCE(item->>'unitPrice', '0'))::numeric,
          'todo'
        );
      END LOOP;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for budget status updates
CREATE TRIGGER on_budget_approved
  AFTER UPDATE ON public.budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_budget_approved();
