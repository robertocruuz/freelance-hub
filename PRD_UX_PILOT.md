# Product Requirements Document (PRD) - Projeto de Redesign UX/UI: Freelance Hub

## 1. Visão Geral do Produto
O **Freelance Hub** é uma plataforma completa e integrada (SaaS/Dashboard) voltada para freelancers e pequenas agências. O objetivo principal do sistema é centralizar a gestão do negócio, oferecendo controle sobre clientes, projetos, tarefas, finanças, controle de tempo e captação de leads. 
A plataforma precisa de um redesign focado em modernidade, dinamismo e uma experiência "premium", superando os visuais engessados de dashboards tradicionais.

## 2. Público-Alvo
- **Freelancers Independentes**: Designers, Desenvolvedores, Consultores, Copywriters.
- **Pequenas Agências / Estúdios**: Equipes reduzidas que precisam gerenciar múltiplos projetos e colaboradores de forma centralizada.
- **Perfil do Usuário**: Profissionais modernos, que valorizam estética, agilidade na navegação e interfaces limpas (clean), responsivas e minimalistas.

## 3. Stack Tecnológico Atual (Referência para UI/UX)
- **Frontend**: React.js (Vite), TypeScript.
- **Estilização e Componentes**: Tailwind CSS, Shadcn UI (Radix UI base), Framer Motion / Tailwind Animate para animações.
- **Gerenciamento de Estado/Dados**: React Query, Zustand (ou Context API), Supabase (Backend as a Service).
- **Ícones**: Lucide React.
- O redesign deve manter a viabilidade de implementação usando Tailwind e a biblioteca Shadcn UI como componentes base, porém elevando o visual com *guidelines* customizados.

## 4. Arquitetura de Navegação
O sistema é estruturado em uma **Single Page Application (SPA)** dividida entre rotas públicas e rotas autenticadas (Dashboard Layout).

### 4.1. Visão Externa (Rotas Públicas)
- **Landing Page (`/`)**: A vitrine do produto. Deve focar em conversão, mostrando os diferenciais do Freelance Hub.
- **Autenticação**:
  - Login (`/login`)
  - Redefinição de Senha (`/reset-password`)
  - Aceite de Convite de Equipe (`/invite/:token`)

### 4.2. Visão Interna (Dashboard Layout - Rotas Protegidas)
O Layout principal deve conter uma **Sidebar (Menu Lateral)** expansível/retrátil e uma **Top Bar (Barra Superior)** com ações globais (notificações, profile, timer global).

**Menu Principal:**
1. **Home / Dashboard (`/dashboard`)**: Visão geral, métricas principais, resumo de tarefas do dia.
2. **Clientes (`/dashboard/clients`)**: Gestão de carteira de clientes, dados de contato e histórico.
3. **Leads (`/dashboard/leads`)**: CRM simplificado para captação e conversão de novos clientes.
4. **Projetos (`/dashboard/projects`)**: Controle de projetos em andamento, escopo e prazos.
5. **Tarefas / Kanban (`/dashboard/kanban`)**: Gestão ágil de tarefas com interface *Drag and Drop* (arrastar e soltar).
6. **Tempo (`/dashboard/time`)**: Timesheet e cronômetro (*Time Tracking*) integrados às tarefas e projetos.
7. **Orçamentos (`/dashboard/budgets`)**: Criação e acompanhamento de propostas comerciais.
8. **Financeiro (`/dashboard/finance`)**: Fluxo de caixa, recebimentos, faturamentos (invoices) e despesas.

**Menu de Configurações (Geralmente no rodapé da Sidebar ou no Perfil):**
- **Perfil (`/dashboard/profile`)**: Dados do usuário, avatar.
- **Equipe (`/dashboard/team`)**: Gestão de convites e membros.
- **Configurações (`/dashboard/settings`)**: Preferências gerais, tema (Light/Dark mode).

## 5. Funcionalidades Core & Requisitos de UI por Tela

### 5.1. Dashboard Geral (Home)
- **Objetivo**: Fornecer um "raio-x" instantâneo da saúde do negócio.
- **Elementos UI**: Métricas em cards (Faturamento mensal, Tarefas pendentes, Horas trabalhadas), gráficos de desempenho (Recharts), lista rápida das próximas entregas.

### 5.2. CRM e Clientes (Leads & Clients)
- **Objetivo**: Cadastrar, editar e visualizar informações de contatos.
- **Elementos UI**: Tabelas de dados robustas com filtros, paginação e busca, menus de contexto *dropdown* nas linhas (*ações: editar, excluir, ver detalhes*), Modais (Dialog/Sheet) de cadastro deslizantes na lateral para manter o contexto sem trocar de página.

### 5.3. Gestão de Projetos e Tarefas (Kanban)
- **Objetivo**: Acompanhamento visual da execução dos serviços.
- **Elementos UI**:
  - **Projetos**: Visualização em lista ou grid de cards detalhados com barra de progresso.
  - **Kanban**: Colunas (*To Do, In Progress, Review, Done*). Cards de tarefas interativos (Drag & Drop), exibindo avatares dos responsáveis (criador/atribuído), tags coloridas para prioridade, e prazo. Efeito de *hover* e *grabbing* ao interagir com o card.

### 5.4. Time Tracking (Tempo)
- **Objetivo**: Registrar horas trabalhadas por projeto/tarefa de forma fácil.
- **Elementos UI**: Um widget flutuante ou fixo na *Top bar* que mostre o cronômetro rodando. Na página em si, um histórico de entradas (log), calendário (Date Picker) e gráficos de horas semanais.

### 5.5. Financeiro e Orçamentos
- **Objetivo**: Controlar o que entra e o que sai, além das propostas enviadas aos clientes.
- **Elementos UI**: Listagens de transações com indicadores visuais claros (verde para entrada, vermelho para saída), status de pagamento (*pago, pendente, atrasado*). Formulários complexos em "step-by-step" (Wizards) para criar novos orçamentos, com visualização de prévia (PDF preview).

## 6. Diretrizes para o Visual Redesign (UX/UI Pilot Guidelines)

O UX Pilot deve focar nestas premissas para entregar um visual "Novo e Dinâmico":

1. **Aesthetics (Estética Premium)**:
   - Afaste-se do visual "painel de controle padrão". Use **Glassmorphism** sutil (fundos translúcidos com blur) para barras de navegação ou modais.
   - **Paleta de Cores**: Utilize escalas cromáticas HSL modernas. Recomenda-se um Dark Mode profundo (tons de cinza carvão/azul meia-noite) e um Light Mode vibrante com contrastes de cores acentuadas (ex: Azul Elétrico ou Roxo como cor primária).
   - **Tipografia**: Fontes modernas sem serifa como *Inter*, *Outfit*, ou *Plus Jakarta Sans*. Hierarquia clara entre títulos e dados numéricos nos dashboards.

2. **Dinamismo e Micro-interações**:
   - Elementos devem reagir ao usuário. Animações de transição de estado suaves, botões que têm *feedback* tátil (scale down on click), linhas de tabela que destacam sutilmente no *hover*.
   - **Esqueletos de Carregamento (Skeleton Loaders)** elegantes e brilhantes durante chamadas assíncronas de dados.

3. **Uso do Espaço e *Clean UI***:
   - Evitar sobrecarga de informações. O uso intensivo de *White Space* (respiro visual) é obrigatório.
   - Ao invés de exibir todos os botões de ação em uma tabela, escondê-los em menus de contexto (`...`) ou revelar ao passar o mouse.
   - Uso de bordas sutis apenas onde necessário e shadows (sombras) suaves e difusas para criar profundidade de elevação de cards.

4. **Componentização Baseada no Shadcn UI**:
   - As interfaces desenhadas pelo UX Pilot deverão ser fáceis de traduzir em componentes Radix + Tailwind. 
   - Exemplo: Uso de abas (Tabs) animadas para alternar visões, e *Drawers/Sheets* que deslizam das laterais para edições rápidas ao invés de navegar para uma nova página inteira.

## 7. Entregáveis Esperados do UX Pilot
1. **Style Guide / Design System Atualizado**: Cores, Tipografia, Sombras, Estados de Botões e Inputs.
2. **Wireframes / UI Designs (Telas-Chave)**:
   - Login & Layout Geral do Dashboard.
   - Home Dashboard (Métricas).
   - Board Kanban (Gestão de Tarefas).
   - Página Financeira.
3. **Protótipo Interativo**: Demonstrar como o fluxo de navegação e as micro-interaçoes funcionam (ex: abrindo um card de tarefa, ligando o timer de horas).

---
**Documento gerado para instrução de Inteligências Artificiais e Designers trabalhando no UX Pilot para a condução do projeto de reformulação visual da plataforma Freelance Hub.**
