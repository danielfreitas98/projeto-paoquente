-- =============================================================================
-- Pão Quente — Migration 001: Schema Inicial
-- CRM + Gestão Financeira para Padarias e Casas de Café
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE public.unidade_medida AS ENUM ('g', 'ml', 'un');
CREATE TYPE public.tipo_categoria AS ENUM ('RECEITA', 'DESPESA');
CREATE TYPE public.tipo_conta AS ENUM ('DINHEIRO', 'BANCO');
CREATE TYPE public.tipo_transacao AS ENUM ('RECEITA', 'DESPESA', 'TRANSFERENCIA');
CREATE TYPE public.status_transacao AS ENUM ('PAGO', 'PENDENTE');
CREATE TYPE public.metodo_pagamento AS ENUM (
  'DINHEIRO', 'PIX', 'DEBITO', 'CREDITO', 'TRANSFERENCIA'
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE public.configuracao_negocio (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa         TEXT NOT NULL DEFAULT 'Minha Padaria',
  percentual_variaveis NUMERIC(5, 2) NOT NULL DEFAULT 35.00
    CHECK (percentual_variaveis >= 0 AND percentual_variaveis < 100),
  percentual_fixas     NUMERIC(5, 2) NOT NULL DEFAULT 20.00
    CHECK (percentual_fixas >= 0 AND percentual_fixas < 100),
  percentual_lucro     NUMERIC(5, 2) NOT NULL DEFAULT 15.00
    CHECK (percentual_lucro >= 0 AND percentual_lucro < 100),
  taxa_cartao_debito   NUMERIC(5, 2) NOT NULL DEFAULT 1.50 CHECK (taxa_cartao_debito >= 0),
  taxa_cartao_credito  NUMERIC(5, 2) NOT NULL DEFAULT 3.50 CHECK (taxa_cartao_credito >= 0),
  categoria_taxa_cartao_id UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_soma_markup_menor_100 CHECK (
    percentual_variaveis + percentual_fixas + percentual_lucro < 100
  )
);

CREATE TABLE public.insumos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome              TEXT NOT NULL,
  unidade_medida    public.unidade_medida NOT NULL,
  preco_compra      NUMERIC(12, 4) NOT NULL CHECK (preco_compra >= 0),
  quantidade_compra NUMERIC(12, 4) NOT NULL CHECK (quantidade_compra > 0),
  custo_unitario    NUMERIC(12, 6) GENERATED ALWAYS AS (preco_compra / quantidade_compra) STORED,
  ativo             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insumos_nome ON public.insumos (nome);
CREATE INDEX idx_insumos_ativo ON public.insumos (ativo) WHERE ativo = TRUE;

CREATE TRIGGER trg_insumos_updated_at
  BEFORE UPDATE ON public.insumos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            TEXT NOT NULL,
  preco_venda     NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (preco_venda >= 0),
  markup_desejado NUMERIC(5, 2) CHECK (markup_desejado IS NULL OR markup_desejado > 0),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_produtos_nome ON public.produtos (nome);

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ficha_tecnica (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id           UUID NOT NULL REFERENCES public.produtos (id) ON DELETE CASCADE,
  insumo_id            UUID NOT NULL REFERENCES public.insumos (id) ON DELETE RESTRICT,
  quantidade_utilizada NUMERIC(12, 4) NOT NULL CHECK (quantidade_utilizada > 0),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_ficha_produto_insumo UNIQUE (produto_id, insumo_id)
);

CREATE INDEX idx_ficha_tecnica_produto ON public.ficha_tecnica (produto_id);
CREATE INDEX idx_ficha_tecnica_insumo ON public.ficha_tecnica (insumo_id);

CREATE TRIGGER trg_ficha_tecnica_updated_at
  BEFORE UPDATE ON public.ficha_tecnica FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.categorias_financeiras (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  tipo       public.tipo_categoria NOT NULL,
  pai_id     UUID REFERENCES public.categorias_financeiras (id) ON DELETE SET NULL,
  ativo      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categorias_tipo ON public.categorias_financeiras (tipo);
CREATE INDEX idx_categorias_pai ON public.categorias_financeiras (pai_id);

CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON public.categorias_financeiras FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.configuracao_negocio
  ADD CONSTRAINT fk_config_categoria_taxa
  FOREIGN KEY (categoria_taxa_cartao_id) REFERENCES public.categorias_financeiras (id) ON DELETE SET NULL;

CREATE TABLE public.contas_bancarias (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  tipo        public.tipo_conta NOT NULL,
  saldo_atual NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_contas_updated_at
  BEFORE UPDATE ON public.contas_bancarias FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.transacoes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao            TEXT NOT NULL,
  tipo                 public.tipo_transacao NOT NULL,
  valor                NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
  categoria_id         UUID REFERENCES public.categorias_financeiras (id) ON DELETE SET NULL,
  conta_id             UUID NOT NULL REFERENCES public.contas_bancarias (id) ON DELETE RESTRICT,
  status               public.status_transacao NOT NULL DEFAULT 'PENDENTE',
  data_competencia     DATE NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento       DATE,
  metodo_pagamento     public.metodo_pagamento,
  taxa_cartao_deduzida BOOLEAN NOT NULL DEFAULT FALSE,
  transacao_origem_id  UUID REFERENCES public.transacoes (id) ON DELETE SET NULL,
  conta_destino_id     UUID REFERENCES public.contas_bancarias (id) ON DELETE RESTRICT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_transferencia_destino CHECK (tipo <> 'TRANSFERENCIA' OR conta_destino_id IS NOT NULL),
  CONSTRAINT chk_data_pagamento_pago CHECK (status <> 'PAGO' OR data_pagamento IS NOT NULL)
);

CREATE INDEX idx_transacoes_tipo ON public.transacoes (tipo);
CREATE INDEX idx_transacoes_competencia ON public.transacoes (data_competencia);
CREATE INDEX idx_transacoes_origem ON public.transacoes (transacao_origem_id) WHERE transacao_origem_id IS NOT NULL;

CREATE TRIGGER trg_transacoes_updated_at
  BEFORE UPDATE ON public.transacoes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.configuracao_negocio (nome_empresa) VALUES ('Minha Padaria');

INSERT INTO public.categorias_financeiras (nome, tipo) VALUES
  ('Vendas', 'RECEITA'),
  ('Outras Receitas', 'RECEITA'),
  ('Matéria-Prima', 'DESPESA'),
  ('Taxas de Cartão', 'DESPESA'),
  ('Salários', 'DESPESA'),
  ('Aluguel', 'DESPESA'),
  ('Utilidades', 'DESPESA'),
  ('Outras Despesas', 'DESPESA');

UPDATE public.configuracao_negocio
SET categoria_taxa_cartao_id = (
  SELECT id FROM public.categorias_financeiras WHERE nome = 'Taxas de Cartão' LIMIT 1
);

INSERT INTO public.contas_bancarias (nome, tipo, saldo_atual) VALUES
  ('Caixa', 'DINHEIRO', 0),
  ('Conta Corrente', 'BANCO', 0);
