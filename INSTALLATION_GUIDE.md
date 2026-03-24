# Manual de Instalação e Guia Técnico - Freelance Hub

Este documento fornece uma análise técnica detalhada da plataforma e um guia passo a passo para sua instalação e hospedagem.

## 1. Análise da Plataforma
O **Freelance Hub** é uma aplicação de alta performance do tipo **SPA (Single Page Application)**, projetada para gestão de freelancers e pequenas agências. Ela foca em usabilidade fluida, utilizando uma interface "Premium" baseada em **Flat Design** e um layout **Bento Grid**.

### Stack Tecnológica e Arquitetura:
- **Frontend**:
  - **React 18 & TypeScript**: Base tipada para alta robustez corporativa.
  - **Vite**: Build tool otimizada para performance local e em produção.
  - **Tailwind CSS & Shadcn UI**: Design system customizável (suporta *Custom Colors* dinâmicos por cliente usando cálculo automáticos de contraste em tempo real YIQ).
  - **Bibliotecas Auxiliares**: Framer Motion (Animações), dnd-kit (Kanban), Recharts (Gráficos), jsPDF (Exportação de relatórios).
- **Backend (BaaS)**:
  - **Supabase**: Solução centralizada para Banco de Dados (PostgreSQL), Autenticação integrada, Segurança (Row Level Security - RLS), Storage e WebSockets (Realtime).
- **Destaques**:
  - Ecossistema *Refresh-less*: Tarefas, CRM, Chat e Notificações atualizam em tempo real para toda a equipe.
  - Controle granular de acesso baseado em Roles (Admins vs Collaborators) direto nas queries RLS.

---

## 2. Requisitos de Hospedagem

Para colocar a plataforma no ar, você precisará de dois serviços interligados:

### A. Hospedagem do Frontend (Estática)
Sendo uma SPA compilada de forma pura, o frontend necessita apenas de um ambiente estático capaz de gerenciar roteamento de URL fallback.
- **Serviços Recomendados**:
  - **Vercel** (Altamente Recomendado pela integração fluida com Vite).
  - **Netlify**.
  - **Cloudflare Pages**.
  - **Hospedagem Compartilhada Avançada (Hostinger, cPanel, etc)**: Possível via manipulação de rotas web servidor (`.htaccess` ou `nginx.conf`).

### B. Banco de Dados e Backend (Supabase)
O coração e a "central lógia e stateful" plataforma operam sobre uma nuvem gerenciada PostgreSQL.
- Utilize projetos em nuvem no [Supabase.com](https://supabase.com/).
- Responsável por Triggers cruciais, Views, Realtime Engine e Logs transacionais.

---

## 3. Manual de Instalação Passo a Passo

### Passo 1: Configuração do Supabase
1. **Criação do Projeto**:
   - Acesse [Supabase](https://supabase.com/) e crie um novo projeto.
   - Salve a senha do banco de dados (Database Password) em local seguro.

2. **Configuração do Banco de Dados (Migrations/Schemas)**:
   - No painel do Supabase, vá na aba lateral **SQL Editor**.
   - Para aplicar a estrutura, execute os scripts SQL localizados na pasta `supabase/migrations/` ordenados de forma crescente pelas suas datas de prefixo numérico.
   - *Alternativa rápida CLI*: Caso utilize o `supabase-cli`, conecte-se com `supabase link --project-ref XXXX` seguido e depois execute push com `supabase db push`.

3. **Storage (Buckets para Arquivos e Mídias)**:
   - Vá na seção lateral **Storage**.
   - As migrations já devem criar a infraestrutura básica, mas confira ativamente e assegure que os *Buckets* a seguir existem na lista:
     - `avatars` (Público): Armazena fotos de perfil dos membros do workspace.
     - `client_logos` (Público): Armazena e expõe logotipos renderizados no CRM/Dashboards. 

4. **Autenticação (Auth Rules)**:
   - Navegue por **Authentication > Providers** e certifique-se de que "Email/Senha" está devidamente ativado.
   - Ajuste o roteamento final navegando para **Authentication > URL Configuration**:
     - **Site URL**: Insira o endereço final estático de produção (ex: `https://app.sua-agencia.com`).
     - **Redirect URLs**: Adicione curingas baseados nela: `https://app.sua-agencia.com/**` e se for atuar na máquina também ponha `http://localhost:5173/**`.

5. **Credenciais da API do Sistema**:
   - Resgate o "segredo de proxy" navegando para **Project Settings > API**.
   - Copie o endereçamento web de `Project URL` e o hash encriptado de `anon public key`.

### Passo 2: Configuração de Variáveis (Ambiente Local)
1. Certifique a presença do **Node.js** instaldo (versão 18+ padrão TLS).
2. Tendo copiado o repositório (`git clone`).
3. Crie um arquivo com exato nome `.env` no subdiretorio absoluto principal:
   ```env
   VITE_SUPABASE_URL=https://<SUA-URL-PROJETO-SUPABASE>.supabase.co
   VITE_SUPABASE_ANON_KEY=<SUA-CHAVE-ANON-PUBLIC>
   ```
4. Baixe módulos Node associados e faça bootstrap inicial para preview local:
   ```bash
   npm install
   npm run dev
   ```

### Passo 3: Build Final e Deploy Frontend

#### Trabalhando com Vercel (Recomendado)
1. Instancie e valide seu repositório no hub da Vercel.
2. Defina os parâmetros de pipeline em default do Vite (`Build cmd: npm run build`, Output Folder `dist`).
3. Cadastre as duas variáveis de chave secreta (.env) nas **Environment Variables**.
4. Dispare deploy via clique ou "commit to origin".

#### Trabalhando com Servidor Compartilhado (Apache/NGINX)
1. Realize empacotamento transpilado web rodando: `npm run build` console local.
2. Dispare um rsync / FTP da recenemente recriada pasta `dist/` para a ponta do domínio (`public_html`).
3. Forçe um override de 404 de Apache para o App React gerando script `.htaccess` na raiz:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

---

## 4. Dicas Avançadas e Troubleshooting (Soluções Comuns)

### O Painel Kanban/Chat parou de processar mensagens ou blocos movidos ativamente
- **Sintoma Exato**: Colegas só enxergam uma task trocando de coluna ou sumindo se der reload (F5) na página no exato momento.
- **Resolução via Supabase Dashboard**: Siga caminho **Database > Publications**. Inspecione a Publicação master "supabase_realtime". Lá haverá seletores checkbox indicando tabelas "Listened" via websockets (As migrations rodam query `alter publication...` para isso, mas caso ocorra fallback e reset manual é mandatório). Assegure check verdinho em Tabelas base: `tasks`, `projects`, `messages`, `channels` e `leads`. 

### Variáveis "ReferenceError Undefined" no Browser (React Quebra total ao dar load inicial)
- **Sintoma Exato**: Ao abrir painel, ao ínves do load do Login page, quegra um erro numérico fatal "Uncaught TypeError".
- **Resolução de Ambiente**: O Vite *proíbe e ignora* toda váriavel de sistema injetada durante o build que **não** contenha o prefixo de sintaxe `VITE_`. Verifique a interface ENV no seu servidor (Netlify, Vercel) confinando que o naming style de `REACT_APP_` não foi mesclado por falhas humanas. 

### Renderização falha para Avatares ou Logos do Cliente de cor Custom
- **Sintoma Exato**: Erros Red (403 Forbidden Access) tentado puxar URL publicas CDN vindas do backend.
- **Resolução Storage RLS**: Ocasionalmente durante deleções de teste de Bucket, as regras Row-Level perdem o tracking reference. Confirme na seção **Storage > Policies** que Buckets sensoriais do layout (`avatars`, `client_logos`) se mantêm classificados com tag `Public` e detém uma Police RLS de Select Action rotulada explicitamente permitindo leitura desvinculada (Guest-Level).
