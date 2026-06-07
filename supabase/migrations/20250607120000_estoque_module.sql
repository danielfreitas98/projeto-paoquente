-- =============================================================================
-- Pão Quente — Migration 005: Módulo de Estoque
-- Controle de insumos, produtos acabados e refrigerados + NF-e
-- Nota: tabela estoque_produtos evita conflito com public.produtos (ficha técnica)
-- =============================================================================

CREATE TYPE public.categoria_estoque AS ENUM ('INSUMO', 'ACABADO', 'REFRIGERADO');
CREATE TYPE public.tipo_movimentacao_estoque AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');
CREATE TYPE public.unidade_medida_estoque AS ENUM ('g', 'ml', 'un', 'kg', 'l', 'cx', 'pct');

-- ---------------------------------------------------------------------------
-- Produtos de estoque
-- ---------------------------------------------------------------------------
CREATE TABLE public.estoque_produtos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          TEXT NOT NULL,
  descricao       TEXT NOT NULL,
  categoria       public.categoria_estoque NOT NULL,
  unidade_medida  public.unidade_medida_estoque NOT NULL DEFAULT 'un',
  estoque_atual   NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  estoque_minimo  NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  custo_medio     NUMERIC(14, 6) NOT NULL DEFAULT 0 CHECK (custo_medio >= 0),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  organizacao_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_estoque_produtos_codigo UNIQUE (codigo)
);

CREATE INDEX idx_estoque_produtos_categoria ON public.estoque_produtos (categoria);
CREATE INDEX idx_estoque_produtos_ativo ON public.estoque_produtos (ativo) WHERE ativo = TRUE;
CREATE INDEX idx_estoque_produtos_estoque_baixo ON public.estoque_produtos (estoque_atual, estoque_minimo)
  WHERE ativo = TRUE AND estoque_atual <= estoque_minimo;

CREATE TRIGGER trg_estoque_produtos_updated_at
  BEFORE UPDATE ON public.estoque_produtos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Lotes refrigerados (controle de validade)
-- ---------------------------------------------------------------------------
CREATE TABLE public.lotes_refrigerados (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id       UUID NOT NULL REFERENCES public.estoque_produtos (id) ON DELETE CASCADE,
  lote             TEXT NOT NULL,
  quantidade       NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  data_fabricacao  DATE,
  data_validade    DATE NOT NULL,
  ativo            BOOLEAN NOT NULL DEFAULT TRUE,
  organizacao_id   UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lote_produto UNIQUE (produto_id, lote)
);

CREATE INDEX idx_lotes_validade ON public.lotes_refrigerados (data_validade)
  WHERE ativo = TRUE AND quantidade > 0;

CREATE TRIGGER trg_lotes_refrigerados_updated_at
  BEFORE UPDATE ON public.lotes_refrigerados
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Fornecedores
-- ---------------------------------------------------------------------------
CREATE TABLE public.fornecedores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            TEXT NOT NULL,
  razao_social    TEXT NOT NULL,
  organizacao_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_fornecedores_cnpj UNIQUE (cnpj)
);

CREATE INDEX idx_fornecedores_razao ON public.fornecedores (razao_social);

-- ---------------------------------------------------------------------------
-- Notas fiscais
-- ---------------------------------------------------------------------------
CREATE TABLE public.notas_fiscais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_nfe       TEXT NOT NULL,
  numero_nota     TEXT NOT NULL,
  fornecedor_id   UUID NOT NULL REFERENCES public.fornecedores (id) ON DELETE RESTRICT,
  data_emissao    DATE NOT NULL,
  valor_total     NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  xml_original    TEXT NOT NULL,
  organizacao_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notas_fiscais_chave UNIQUE (chave_nfe)
);

CREATE INDEX idx_notas_fiscais_fornecedor ON public.notas_fiscais (fornecedor_id);
CREATE INDEX idx_notas_fiscais_data ON public.notas_fiscais (data_emissao DESC);

-- ---------------------------------------------------------------------------
-- Itens da nota fiscal
-- ---------------------------------------------------------------------------
CREATE TABLE public.itens_nota_fiscal (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_fiscal_id    UUID NOT NULL REFERENCES public.notas_fiscais (id) ON DELETE CASCADE,
  produto_id        UUID NOT NULL REFERENCES public.estoque_produtos (id) ON DELETE RESTRICT,
  codigo_fornecedor TEXT,
  descricao_xml     TEXT NOT NULL,
  quantidade        NUMERIC(14, 4) NOT NULL CHECK (quantidade > 0),
  valor_unitario    NUMERIC(14, 6) NOT NULL CHECK (valor_unitario >= 0)
);

CREATE INDEX idx_itens_nota_fiscal_nota ON public.itens_nota_fiscal (nota_fiscal_id);

-- ---------------------------------------------------------------------------
-- Vinculação produto XML → produto interno
-- ---------------------------------------------------------------------------
CREATE TABLE public.vinculacao_produtos_xml (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao_xml   TEXT NOT NULL,
  produto_id      UUID NOT NULL REFERENCES public.estoque_produtos (id) ON DELETE CASCADE,
  organizacao_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_vinculacao_descricao UNIQUE (descricao_xml)
);

CREATE INDEX idx_vinculacao_produto ON public.vinculacao_produtos_xml (produto_id);

-- ---------------------------------------------------------------------------
-- Movimentações de estoque
-- ---------------------------------------------------------------------------
CREATE TABLE public.movimentacoes_estoque (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id      UUID NOT NULL REFERENCES public.estoque_produtos (id) ON DELETE RESTRICT,
  tipo            public.tipo_movimentacao_estoque NOT NULL,
  quantidade      NUMERIC(14, 4) NOT NULL CHECK (quantidade > 0),
  custo_unitario  NUMERIC(14, 6) NOT NULL DEFAULT 0 CHECK (custo_unitario >= 0),
  observacao      TEXT,
  usuario         TEXT,
  usuario_id      UUID,
  nota_fiscal_id  UUID REFERENCES public.notas_fiscais (id) ON DELETE SET NULL,
  lote_id         UUID REFERENCES public.lotes_refrigerados (id) ON DELETE SET NULL,
  organizacao_id  UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_movimentacoes_produto ON public.movimentacoes_estoque (produto_id);
CREATE INDEX idx_movimentacoes_created ON public.movimentacoes_estoque (created_at DESC);
CREATE INDEX idx_movimentacoes_tipo ON public.movimentacoes_estoque (tipo);

-- ---------------------------------------------------------------------------
-- Função: atualizar estoque após movimentação
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.atualizar_estoque_apos_movimentacao()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_estoque_atual NUMERIC(14, 4);
  v_custo_medio   NUMERIC(14, 6);
  v_novo_estoque  NUMERIC(14, 4);
  v_novo_custo    NUMERIC(14, 6);
BEGIN
  SELECT estoque_atual, custo_medio
  INTO v_estoque_atual, v_custo_medio
  FROM public.estoque_produtos
  WHERE id = NEW.produto_id
  FOR UPDATE;

  IF NEW.tipo = 'ENTRADA' THEN
    v_novo_estoque := v_estoque_atual + NEW.quantidade;
    IF v_novo_estoque > 0 AND NEW.custo_unitario > 0 THEN
      v_novo_custo := (
        (v_estoque_atual * v_custo_medio) + (NEW.quantidade * NEW.custo_unitario)
      ) / v_novo_estoque;
    ELSE
      v_novo_custo := v_custo_medio;
    END IF;
  ELSIF NEW.tipo = 'SAIDA' THEN
    IF v_estoque_atual < NEW.quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente para produto %. Disponível: %, solicitado: %',
        NEW.produto_id, v_estoque_atual, NEW.quantidade;
    END IF;
    v_novo_estoque := v_estoque_atual - NEW.quantidade;
    v_novo_custo := v_custo_medio;
  ELSIF NEW.tipo = 'AJUSTE' THEN
    v_novo_estoque := NEW.quantidade;
    v_novo_custo := CASE WHEN NEW.custo_unitario > 0 THEN NEW.custo_unitario ELSE v_custo_medio END;
  END IF;

  UPDATE public.estoque_produtos
  SET estoque_atual = v_novo_estoque,
      custo_medio = v_novo_custo
  WHERE id = NEW.produto_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_movimentacao_atualiza_estoque
  AFTER INSERT ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.atualizar_estoque_apos_movimentacao();

-- ---------------------------------------------------------------------------
-- View: alertas de validade (próximos 7 dias)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_lotes_validade_alerta
WITH (security_invoker = true) AS
SELECT
  l.id,
  l.lote,
  l.quantidade,
  l.data_fabricacao,
  l.data_validade,
  l.produto_id,
  p.codigo AS produto_codigo,
  p.descricao AS produto_descricao,
  (l.data_validade - CURRENT_DATE) AS dias_para_vencer,
  CASE
    WHEN l.data_validade < CURRENT_DATE THEN 'VENCIDO'
    WHEN l.data_validade <= CURRENT_DATE + INTERVAL '3 days' THEN 'CRITICO'
    WHEN l.data_validade <= CURRENT_DATE + INTERVAL '7 days' THEN 'ATENCAO'
    ELSE 'OK'
  END AS status_validade
FROM public.lotes_refrigerados l
JOIN public.estoque_produtos p ON p.id = l.produto_id
WHERE l.ativo = TRUE
  AND l.quantidade > 0
  AND l.data_validade <= CURRENT_DATE + INTERVAL '7 days';

-- ---------------------------------------------------------------------------
-- View: dashboard estoque
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_estoque_dashboard
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.estoque_produtos WHERE ativo = TRUE) AS total_produtos,
  (SELECT COUNT(*) FROM public.estoque_produtos
   WHERE ativo = TRUE AND estoque_atual <= estoque_minimo AND estoque_minimo > 0) AS estoque_baixo,
  (SELECT COUNT(*) FROM public.estoque_produtos
   WHERE ativo = TRUE AND categoria = 'REFRIGERADO') AS produtos_refrigerados,
  (SELECT COUNT(*) FROM public.vw_lotes_validade_alerta
   WHERE status_validade IN ('VENCIDO', 'CRITICO', 'ATENCAO')) AS alertas_validade;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.estoque_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_refrigerados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_nota_fiscal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vinculacao_produtos_xml ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_estoque_produtos" ON public.estoque_produtos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_lotes_refrigerados" ON public.lotes_refrigerados
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_fornecedores" ON public.fornecedores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notas_fiscais" ON public.notas_fiscais
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_itens_nota_fiscal" ON public.itens_nota_fiscal
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vinculacao_xml" ON public.vinculacao_produtos_xml
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_movimentacoes_estoque" ON public.movimentacoes_estoque
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON public.vw_lotes_validade_alerta TO anon, authenticated, service_role;
GRANT SELECT ON public.vw_estoque_dashboard TO anon, authenticated, service_role;
