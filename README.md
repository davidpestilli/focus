# App de Estudos Multi-Disciplinar para Concursos Públicos

Aplicativo para estudos voltado para concursos públicos, abrangendo Direito, Matemática e Português, com funcionalidades de IA integradas.

## 🚀 Tecnologias

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Estilização**: Tailwind CSS 3.3.5
- **Backend**: Supabase
- **Autenticação**: Supabase Auth
- **Ícones**: Lucide React

## 📋 Pré-requisitos

- Node.js (versão 16 ou superior)
- npm ou yarn
- Conta no Supabase

## 🔧 Configuração

### 1. Instalação das dependências

```bash
npm install
```

### 2. Configuração do Supabase

Crie um arquivo `.env.local` na raiz do projeto com suas credenciais do Supabase:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Configuração do banco de dados

Execute os scripts SQL fornecidos no seu projeto Supabase:
- `DIREITO_PENAL_SQL.sql` - Estrutura das leis de Direito Penal
- Certifique-se de que as tabelas foram criadas conforme o esquema em `Organizacao_App_Estudos.md`

## 🏃‍♂️ Executando o projeto

### Modo desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

### Build para produção
```bash
npm run build
```

### Preview da build
```bash
npm run preview
```

## 📁 Estrutura do projeto

```
src/
├── components/          # Componentes reutilizáveis
├── contexts/           # Contextos do React (Auth, etc.)
├── hooks/              # Custom hooks
├── lib/                # Configurações (Supabase, etc.)
├── pages/              # Páginas principais
├── types/              # Definições de tipos TypeScript
└── utils/              # Funções utilitárias
```

## 🎯 Funcionalidades Principais

### ✅ Implementado (Fase 1)
- Autenticação com Supabase
- Interface principal com abas (Direito, Matemática, Português)
- Dashboard com cards principais
- Layout responsivo com Tailwind CSS

### 🚧 Em desenvolvimento (Próximas fases)
- CRUD de leis e concursos
- Sistema de geração de questões com IA
- Interface de estudo hierárquica
- Sistema anti-duplicata de questões
- Analytics e métricas de estudo

## 🗃️ Esquema do Banco de Dados

O projeto utiliza as seguintes tabelas principais:
- `study_users` - Usuários do sistema
- `laws` - Leis cadastradas
- `law_elements` - Estrutura hierárquica das leis
- `contests` - Concursos públicos
- `study_questions` - Questões geradas
- `user_answers` - Respostas dos usuários
- `study_sessions` - Sessões de estudo

## 📝 Próximos passos

1. **Fase 2**: Implementar CRUD de leis e concursos
2. **Fase 3**: Integração com IA (DeepSeek)
3. **Fase 4**: Sistema avançado de questões
4. **Fase 5**: Deploy e otimizações

## 🤝 Contribuição

Este é um projeto em desenvolvimento seguindo o roadmap definido em `Organizacao_App_Estudos.md`.

## 📄 Licença

Projeto privado para estudos e concursos públicos.
