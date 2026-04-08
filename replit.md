# VendlySys

## Overview

VendlySys é um sistema SaaS multiempresa de gestão para salões de beleza, clínicas e barbearias. Construído com React + Vite no frontend web, Express no backend, PostgreSQL, e Expo React Native para o app mobile.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend web**: React + Vite + Tailwind CSS + shadcn/ui + Wouter (routing) + TanStack Query
- **Frontend mobile**: Expo React Native (iOS + Android) — `artifacts/vendlysys-app`
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: JWT via `jsonwebtoken` + localStorage
- **Charts**: Recharts

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Project Structure

- `artifacts/vendlysys/` — React frontend (Vite)
- `artifacts/api-server/` — Express backend
- `lib/db/` — Drizzle ORM schema and DB client
- `lib/api-spec/` — OpenAPI spec + Orval config
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas

## Modules

- **Login** — Auth JWT com perfis admin/agenda
- **Inicio** — Central de módulos por perfil
- **Agenda** — CRUD de agendamentos com filtros
- **Agendamentos** — Lista detalhada
- **Clientes** — CRUD com stats (total atendimentos, gasto)
- **Financeiro** — Lista de lançamentos com "Marcar como Pago" e edição de forma de pagamento
- **Despesas** — CRUD de despesas por categoria
- **Caixa** — Fechamento de caixa com breakdown por forma de pagamento
- **Dashboard** — Gráficos com Recharts (receita/mês, agendamentos/mês, top serviços, top profissionais)
- **Usuarios** — Admin pode criar/editar/resetar senha (apenas admin)
- **Configuracoes** — Dados da empresa (apenas admin)
- **Assinatura** — Plano R$50/mês via PIX, carência 3 meses, cancelamento, aceite de termos
- **Termos** — Tela obrigatória de aceite de termos pós-cadastro (bloqueia todas as outras telas)

## Excel / Planilha

- **Serviços** — Botões de importação/exportação Excel na página de Serviços (web):
  - **⬇ Modelo**: Baixa planilha `.xlsx` com exemplo de preenchimento + aba de instruções
  - **⬆ Exportar**: Exporta todos os serviços cadastrados para Excel
  - **📥 Importar Excel**: Faz upload de `.xlsx`/`.xls`/`.csv`, envia ao `POST /api/servicos/importar` e exibe resultado
  - API: `POST /api/servicos/importar` — aceita array de até 500 serviços com validação; campos: `nome` (obrigatório), `categoria`, `valor` (obrigatório), `preco_promocional`, `duracao_minutos`, `preco_descricao`, `ativo`
- **Financeiro** — Botão **⬆ Exportar Excel** no cabeçalho da tabela de Lançamentos; exporta: Data, Cliente, Serviço, Profissional, Tipo, Valor Cobrado, Valor Pago, Status, Forma Pagamento, Observações
- Pacote: `xlsx` (SheetJS) instalado em `artifacts/vendlysys/`

## Regras de Negócio — Assinatura

- Plano mensal: R$50 via PIX (MercadoPago)
- `plano_status`: `trial` | `ativo` | `inativo` | `vitalicio`
- Carência de 3 meses a partir do `plano_inicio_em` (primeiro pagamento confirmado)
- `termos_aceitos_em`: quando null, bloqueia TODAS as telas (web e mobile) e redireciona para `/termos`
- Web: `ProtectedRoute` checa `termos_aceitos_em` e redireciona para `/termos` se null
- Mobile: `staff/_layout.tsx` redireciona para `/(staff)/termos` se `termos_aceitos_em` é null

## Acesso de Teste

- Admin: `admin@studiobella.com` / `admin123`
- Agenda: `maria@studiobella.com` / `agenda123`

## Auth

- Perfil **admin**: acesso total a todos os módulos
- Perfil **agenda**: acessa apenas inicio, agenda, agendamentos, clientes

## Database Schema

- `empresas` — dados da empresa (multiempresa)
- `usuarios` — usuários com empresa_id e perfil (admin/agenda)
- `clientes` — clientes da empresa
- `agendamentos` — agendamentos com status e pagamento
- `despesas` — despesas por categoria
