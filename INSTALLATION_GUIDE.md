# Manual de Instalação e Guia Técnico - Plataforma Freelance

Este documento fornece uma análise técnica detalhada da plataforma e um guia passo a passo para sua instalação e hospedagem.

## 1. Análise da Plataforma
A plataforma é uma aplicação moderna do tipo **SPA (Single Page Application)**, construída com foco em performance e escalabilidade.

### Arquitetura e Tecnologias:
- **Frontend**:
  - **React (v18)**: Biblioteca principal para construção da interface.
  - **TypeScript**: Garante segurança de tipos e melhor manutenção do código.
  - **Vite**: Ferramenta de build extremamente rápida para desenvolvimento moderno.
  - **Tailwind CSS**: Framework de CSS utilitário para estilização rápida e responsiva.
  - **shadcn/ui**: Coleção de componentes de UI reutilizáveis e acessíveis.
- **Backend & Infraestrutura (BaaS)**:
  - **Supabase**: Utilizado para Autenticação, Banco de Dados (PostgreSQL) e Segurança (RLS - Row Level Security).
  - **TanStack Query (React Query)**: Gerenciamento de estado assíncrono e cache de dados do servidor.
- **Recursos Principais**:
  - Dashboard de controle.
  - Gerenciador de Clientes e Projetos.
  - Cofre de Senhas com criptografia simulada.
  - Registro de horas (Time Tracking).
  - Emissão de Orçamentos e Faturas.

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
1. Crie uma conta e um novo projeto no [Supabase](https://supabase.com/).
2. No menu lateral, vá em **SQL Editor**.
3. Clique em "New Query" e cole o conteúdo do arquivo presente no seu repositório em: `supabase/migrations/20260227204959_c2f34892-36b1-46bc-8ba7-45f6154e0518.sql`.
4. Execute o script. Isso criará todas as tabelas, funções e políticas de segurança necessárias.
5. Vá em **Project Settings > API** e anote a `Project URL` e a `anon public key`.

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

#### Opção 1: Vercel / Netlify (Mais fácil)
1. Conecte seu GitHub à plataforma de hosting escolhida.
2. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`) no painel de configurações da hospedagem.
3. Configure o comando de build como `npm run build` e a pasta de saída como `dist`.
4. O deploy será feito automaticamente.

#### Opção 2: Servidor Próprio (Nginx / Apache)
1. Execute o comando `npm run build` na sua máquina local ou CI/CD.
2. Uma pasta chamada `dist/` será gerada.
3. Envie o conteúdo desta pasta para o diretório público do seu servidor web (ex: `/var/www/html`).
4. **Importante**: Como é um React Router SPA, você deve configurar o servidor para que todas as rotas apontem para o `index.html`.
   - **Nginx Exemplo**:
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
