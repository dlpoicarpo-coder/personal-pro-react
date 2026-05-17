# Personal PRO — React Edition

Sistema profissional para Personal Trainers, migrado para **React 18 + Vite**.

## Stack

| Tecnologia | Uso |
|------------|-----|
| React 18 | UI components + hooks |
| Vite 5 | Build tool + dev server |
| React Router v6 | Roteamento declarativo |
| @supabase/supabase-js | Backend + Auth |
| Chart.js / react-chartjs-2 | Gráficos |
| CSS puro com variáveis | Design System (dark/light) |

## Funcionalidades

- ✅ Autenticação (login / cadastro) via Supabase
- ✅ Dashboard com KPIs e gráficos em tempo real
- ✅ Gestão de Alunos (CRUD completo)
- ✅ Criação de Treinos com exercícios dinâmicos
- ✅ Tracker de Treino ao Vivo (timer + séries)
- ✅ Agenda / Calendário (mensal + repetição semanal)
- ✅ Periodização (macrociclos linear/DUP/blocos)
- ✅ Avaliações corporais + Zonas de Treino (Karvonen)
- ✅ Biofeedback com radar de bem-estar
- ✅ Financeiro com controle de pagamentos
- ✅ Relatórios / Dossiê do aluno
- ✅ Biblioteca de Exercícios (80+ exercícios)
- ✅ Anamnese (link público para alunos)
- ✅ Configurações + backup de dados
- ✅ Dark Mode / Light Mode
- ✅ Code splitting automático por rota (Vite)
- ✅ Offline-first (LocalStorage + Supabase)

## Instalação

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

O projeto está configurado para deploy automático via **Vercel**.
Cada push na branch `main` dispara um novo deploy.

## Estrutura

```
src/
├── context/       # AuthContext (estado global)
├── lib/           # Supabase client + DB wrapper
├── components/    # Modal, Toast, Sidebar/AppLayout
├── pages/         # 13 páginas (lazy loaded)
└── styles/        # index.css + components.css
```
