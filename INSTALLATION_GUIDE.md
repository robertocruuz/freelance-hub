# Manual de Instalação e Guia Técnico - Plataforma Freelance

Este documento fornece uma análise técnica detalhada da plataforma e um guia passo a passo para sua instalação e hospedagem.

## 1. Análise da Plataforma
A plataforma é uma aplicação de alta performance do tipo **SPA (Single Page Application)**, projetada para gestão de freelancers e agências. Ela utiliza uma estética **Neo-Brutalista** com alto contraste e foco em usabilidade.

### Stack Tecnológica:
- **Frontend**:
  - **React 18**: Base para construção de interfaces reativas.
  - **Vite**: Build tool de última geração para performance otimizada.
  - **TypeScript**: Tipagem estática para maior robustez.
  - **Tailwind CSS & shadcn/ui**: Design system moderno e componentes acessíveis.
  - **Framer Motion**: Animações fluidas e transições de página.
  - **Recharts**: Visualização de dados e métricas financeiras.
  - **TanStack Query**: Gerenciamento eficiente de cache e estado do servidor.
- **Backend (BaaS)**:
  - **Supabase**: Solução completa para Banco de Dados (PostgreSQL), Autenticação e Segurança (RLS).
- **Funcionalidades**:
  - Dashboard Analítico com gráficos de receita.
  - Gestão de Clientes e Projetos com Kanban.
  - Emissão de Orçamentos (PDF) e Faturas.
  - Registro de Horas (Time Tracking) com timer em tempo real.
  - Cofre de Senhas integrado.
  - Suporte Multi-idioma e Temas (Light/Dark).

---

## 2. Requisitos de Hospedagem

Para colocar a plataforma no ar, você precisará de dois serviços principais:

### A. Hospedagem do Frontend (Estática)
Como a aplicação é compilada em arquivos estáticos (HTML, JS, CSS), você não precisa de um servidor Node.js robusto para o runtime.
- **Serviços Recomendados**:
  - **Vercel** (Recomendado pela integração fácil).
  - **Netlify**.
  - **Cloudflare Pages**.
  - **Hospedagem Compartilhada**: Possível, desde que suporte configuração de redirecionamento (através de `.htaccess` no Apache ou configuração no Nginx).

### B. Banco de Dados e Backend (Supabase)
A aplicação depende diretamente de uma instância do **Supabase**.
- Você pode usar o plano gratuito do [Supabase.com](https://supabase.com/).
- **Requisitos**: Acesso ao painel do Supabase para criar o projeto e configurar as tabelas via SQL.

---

## 3. Manual de Instalação Passo a Passo

### Passo 1: Configuração do Supabase
1. **Criação do Projeto**:
   - Acesse [Supabase](https://supabase.com/) e crie um novo projeto.
   - Guarde a senha do banco de dados em um local seguro.

2. **Configuração do Banco de Dados (Migrations)**:
   - No painel do Supabase, vá em **SQL Editor**.
   - Você deve executar os scripts SQL localizados na pasta `supabase/migrations/` em ordem cronológica (pela data no nome do arquivo).
   - *Dica*: Se você tiver o Supabase CLI instalado, pode usar `supabase db push` após configurar o link com `supabase link`.

3. **Autenticação**:
   - Vá em **Authentication > Providers** e certifique-se de que "Email" está habilitado.
   - (Opcional) Configure os "URL Configuration" em **Authentication > URL Configuration**:
     - **Site URL**: O endereço final da sua aplicação (ex: `https://seu-app.vercel.app`).
     - **Redirect URLs**: Adicione `https://seu-app.vercel.app/**`.

4. **Credenciais API**:
   - Vá em **Project Settings > API**.
   - Copie a `Project URL` e a `anon public key`. Você precisará delas no próximo passo.

### Passo 2: Configuração do Ambiente Local
1. Certifique-se de ter o **Node.js** (versão 18 ou superior) instalado.
2. Clone este repositório para sua máquina local.
3. Na raiz do projeto, crie um arquivo chamado `.env`:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```
4. Instale as dependências:
   ```bash
   npm install
   ```
5. Inicie o servidor de desenvolvimento para testar:
   ```bash
   npm run dev
   ```

### Passo 3: Build e Deploy para Produção

#### Opção 1: Vercel (Recomendado)
1. **Importação**: No painel da Vercel, clique em "Add New > Project" e importe seu repositório do GitHub.
2. **Configuração de Build**:
   - **Framework Preset**: Vite.
   - **Build Command**: `npm run build`.
   - **Output Directory**: `dist`.
3. **Variáveis de Ambiente**:
   - Expanda a seção "Environment Variables" e adicione:
     - `VITE_SUPABASE_URL`: (Sua URL do Supabase).
     - `VITE_SUPABASE_ANON_KEY`: (Sua chave Anon do Supabase).
4. **Deploy**: Clique em "Deploy". A Vercel cuidará do roteamento SPA automaticamente se o preset do Vite for detectado, mas se necessário, você pode adicionar um arquivo `vercel.json` na raiz:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

#### Opção 2: Hostinger / Hospedagem Compartilhada (Apache)
1. **Build Local**: No seu terminal local, execute `npm run build`. Isso criará a pasta `dist`.
2. **Upload via FTP**:
   - Use um cliente FTP (como FileZilla) ou o Gerenciador de Arquivos da Hostinger.
   - Envie todo o conteúdo de dentro da pasta `dist/` para a pasta `public_html` do seu domínio.
3. **Configuração do `.htaccess`**:
   - Para que as rotas do React (como `/dashboard`) funcionem sem dar erro 404, crie um arquivo chamado `.htaccess` na raiz do seu `public_html` com o seguinte conteúdo:
     ```apache
     <IfModule mod_rewrite.c>
       RewriteEngine On
       RewriteBase /
       RewriteRule ^index\.html$ - [L]
       RewriteCond %{REQUEST_FILENAME} !-f
       RewriteCond %{REQUEST_FILENAME} !-d
       RewriteCond %{REQUEST_FILENAME} !-l
       RewriteRule . /index.html [L]
     </IfModule>
     ```

#### Opção 3: Servidor Próprio (Nginx)
1. Execute `npm run build`.
2. Envie o conteúdo de `dist/` para o servidor (ex: `/var/www/html`).
3. Configure o bloco de servidor do Nginx:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

---

## 4. Recursos Necessários para Manutenção
- **Domínio**: Um domínio (ex: www.suaplataforma.com.br) apontando para o seu host de frontend.
- **Certificado SSL**: Essencial para o funcionamento do Supabase Auth (HTTPS).
- **Node.js**: Apenas no ambiente de desenvolvimento ou build.

Se precisar de ajustes no banco de dados futuramente, utilize a pasta `supabase/migrations/` para manter o controle de versão dos seus esquemas de dados.

---

## 5. Troubleshooting (Solução de Problemas)

### Erro: Variáveis de Ambiente não encontradas
- **Sintoma**: O app carrega mas não consegue buscar dados ou fazer login.
- **Solução**: Verifique se as variáveis no Vercel/Hostinger começam com `VITE_`. No Vite, apenas variáveis com esse prefixo são expostas ao código frontend.

### Erro 404 ao atualizar a página (Refresh)
- **Sintoma**: Você está em `/dashboard`, dá um F5 e a página mostra "Not Found" do servidor (Apache/Nginx).
- **Solução**: Certifique-se de que o arquivo `.htaccess` (Apache) ou a configuração `try_files` (Nginx) está aplicada corretamente. O servidor precisa redirecionar todas as rotas para o `index.html`.

### Erro de CORS no Supabase
- **Sintoma**: Erros de rede no console do navegador ao tentar conectar ao Supabase.
- **Solução**: No painel do Supabase, vá em **API > Settings** e adicione o domínio do seu site (ex: `https://meuapp.com`) à lista de domínios permitidos em **CORS Origin**.

### Erros de Autenticação/Redirect
- **Sintoma**: Após fazer login ou reset de senha, você é levado para uma página errada.
- **Solução**: Verifique as "Redirect URLs" no painel do Supabase (Authentication > URL Configuration). Elas devem coincidir com a URL onde seu app está hospedado.
