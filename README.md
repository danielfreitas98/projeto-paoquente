# Pão Quente — CRM + Gestão Financeira

MVP para padarias e casas de café: ficha técnica com CMV, markup, fluxo de caixa e DRE simplificado.

## Stack

| Camada    | Tecnologia              |
|-----------|-------------------------|
| Frontend  | Next.js 15 + React + TS |
| Backend   | Supabase (PostgreSQL)   |
| Deploy FE | Vercel                  |
| Deploy BE | Supabase Cloud          |

## Estrutura de pastas

```
projeto-paoquente/
├── apps/web/                  # Next.js (frontend)
│   └── src/
│       ├── app/               # App Router
│       ├── components/        # UI reutilizável
│       ├── lib/supabase/      # Clientes Supabase
│       └── types/             # Tipos gerados do banco
├── supabase/
│   ├── config.toml
│   └── migrations/            # SQL versionado
├── package.json               # Monorepo (npm workspaces)
└── .env.example
```

## Banco de dados

### Tabelas principais

- `insumos` — ingredientes com `custo_unitario` calculado automaticamente
- `produtos` — itens de venda
- `ficha_tecnica` — receita (produto × insumo × quantidade)
- `categorias_financeiras` — plano de contas hierárquico
- `contas_bancarias` — caixa e bancos
- `transacoes` — receitas, despesas e transferências
- `configuracao_negocio` — markup e taxas de cartão

### Regras já implementadas no SQL

1. **Custo unitário** — coluna gerada: `preco_compra / quantidade_compra`
2. **CMV** — view `vw_produto_cmv`
3. **Preço sugerido** — função `calcular_preco_venda_sugerido()` com markup
4. **Termômetro de lucro** — view `vw_produto_termometro` (VERDE / AMARELO / VERMELHO)
5. **Impacto de reajuste** — `contar_produtos_afetados_por_insumo()` + `reajustar_precos_por_insumo()`
6. **Taxa de cartão** — trigger gera despesa vinculada automaticamente
7. **Dashboard** — views `vw_fluxo_caixa_mensal`, `vw_plano_contas_resumo`, `vw_dre_simplificado`

## Setup local

```bash
# 1. Instalar Supabase CLI: https://supabase.com/docs/guides/cli

# 2. Na raiz do projeto
npm install
cp .env.example apps/web/.env.local

# 3. Subir banco local e aplicar migrations
supabase start
supabase db reset

# 4. Gerar tipos TypeScript
npm run db:types

# 5. Frontend (quando configurado)
npm run dev
```

## Próximos passos

1. Scaffold Next.js com Tailwind + shadcn/ui
2. Telas: Dashboard, Insumos, Ficha Técnica, Transações
3. Integração Supabase Auth
4. Deploy: Vercel + Supabase Cloud
