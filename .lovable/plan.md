

## Problema

A função `loadExistingTasks` verifica se existe tarefa para um item de projeto usando a combinação `title::project_id`. Porém, existem tarefas órfãs no banco (com `column_id = null`) que continuam sendo encontradas mesmo após o usuário excluir a tarefa "real" do Kanban. Isso faz o botão mostrar "Criada" incorretamente.

Nos dados atuais, existem duas tarefas "Remover função" para o mesmo projeto -- uma com `column_id` válido e outra com `column_id: null` (órfã). Excluir uma não resolve porque a outra permanece.

## Plano

### 1. Filtrar tarefas órfãs em `loadExistingTasks`

Em `src/pages/ProjectsPage.tsx`, alterar a query de `loadExistingTasks` para ignorar tarefas com `column_id` nulo:

```typescript
const { data } = await supabase
  .from('tasks')
  .select('title, project_id')
  .not('project_id', 'is', null)
  .not('column_id', 'is', null);  // ← adicionar este filtro
```

### 2. Filtrar duplicatas na verificação de criação

Na função que cria a tarefa a partir do item de projeto (linha ~521), também filtrar `column_id IS NOT NULL` na checagem de duplicatas:

```typescript
const { data: existingDup } = await supabase
  .from('tasks')
  .select('id')
  .eq('title', pendingTaskItem.name)
  .eq('project_id', pendingTaskItem.projectId)
  .not('column_id', 'is', null)  // ← adicionar
  .limit(1);
```

### 3. Limpar tarefas órfãs existentes

Criar uma migration SQL para remover tarefas órfãs (sem `column_id`) que foram criadas a partir de itens de projeto, evitando lixo no banco:

```sql
DELETE FROM tasks WHERE column_id IS NULL AND project_id IS NOT NULL;
```

**Arquivos afetados:**
- `src/pages/ProjectsPage.tsx` (2 alterações)
- Nova migration SQL (limpeza)

