-- =============================================================================
-- Pão Quente — Migration 006: Módulo PDV (Frente de Caixa)
-- Vendas, baixa automática de estoque e lançamento financeiro
-- =============================================================================

CREATE TYPE public.status_venda AS ENUM ('CONCLUIDA', 'CANCELADA');
CREATE TYPE public.metodo_pagamento_venda AS ENUM ('DINHEIRO', 'PIX', 'CARTAO');

-- ---------------------------------------------------------------------------
-- Clientes (CRM — opcional no PDV)
-- ---------------------------------------------------------------------------
CREATE TABLE public.clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  telefone    TEXT,
  email       TEXT,
  cpf         TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clientes_nome ON public.clientes (nome);

CREATE TRIGGER trg_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Estoque de insumos (vinculado à ficha técnica)
-- ---------------------------------------------------------------------------
CREATE TABLE public.estoque_insumos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id       UUID NOT NULL UNIQUE REFERENCES public.insumos (id) ON DELETE RESTRICT,
  estoque_atual   NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (estoque_atual >= 0),
  estoque_minimo  NUMERIC(14, 4) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estoque_insumos_insumo ON public.estoque_insumos (insumo_id);

CREATE TRIGGER trg_estoque_insumos_updated_at
  BEFORE UPDATE ON public.estoque_insumos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Código de barras / atalho no PDV
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS codigo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_produtos_codigo
  ON public.produtos (codigo) WHERE codigo IS NOT NULL;

-- Vínculo produto de venda ↔ estoque físico (produto acabado)
ALTER TABLE public.estoque_produtos
  ADD COLUMN IF NOT EXISTS produto_venda_id UUID REFERENCES public.produtos (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estoque_produtos_venda
  ON public.estoque_produtos (produto_venda_id)
  WHERE produto_venda_id IS NOT NULL;

-- Rastreabilidade de movimentações originadas em vendas
ALTER TABLE public.movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS venda_id UUID;

-- ---------------------------------------------------------------------------
-- Vendas
-- ---------------------------------------------------------------------------
CREATE TABLE public.vendas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_bruto       NUMERIC(14, 2) NOT NULL CHECK (total_bruto >= 0),
  desconto          NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  total_liquido     NUMERIC(14, 2) NOT NULL CHECK (total_liquido >= 0),
  metodo_pagamento  public.metodo_pagamento_venda NOT NULL,
  status            public.status_venda NOT NULL DEFAULT 'CONCLUIDA',
  data_venda        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cliente_id        UUID REFERENCES public.clientes (id) ON DELETE SET NULL,
  transacao_id      UUID REFERENCES public.transacoes (id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_venda_desconto CHECK (desconto <= total_bruto)
);

CREATE INDEX idx_vendas_data ON public.vendas (data_venda DESC);
CREATE INDEX idx_vendas_status ON public.vendas (status);
CREATE INDEX idx_vendas_cliente ON public.vendas (cliente_id) WHERE cliente_id IS NOT NULL;

CREATE TRIGGER trg_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.movimentacoes_estoque
  ADD CONSTRAINT fk_movimentacoes_venda
  FOREIGN KEY (venda_id) REFERENCES public.vendas (id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Itens da venda
-- ---------------------------------------------------------------------------
CREATE TABLE public.venda_itens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id        UUID NOT NULL REFERENCES public.vendas (id) ON DELETE CASCADE,
  produto_id      UUID NOT NULL REFERENCES public.produtos (id) ON DELETE RESTRICT,
  quantidade      NUMERIC(12, 4) NOT NULL CHECK (quantidade > 0),
  preco_unitario  NUMERIC(12, 2) NOT NULL CHECK (preco_unitario >= 0),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venda_itens_venda ON public.venda_itens (venda_id);
CREATE INDEX idx_venda_itens_produto ON public.venda_itens (produto_id);

-- ---------------------------------------------------------------------------
-- Função: baixar insumos da ficha técnica
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.baixar_insumos_ficha_tecnica(
  p_produto_id  UUID,
  p_quantidade  NUMERIC,
  p_venda_id    UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  v_consumo     NUMERIC(14, 4);
  v_disponivel  NUMERIC(14, 4);
BEGIN
  FOR r IN
    SELECT ft.insumo_id, ft.quantidade_utilizada, i.nome AS insumo_nome
    FROM public.ficha_tecnica ft
    JOIN public.insumos i ON i.id = ft.insumo_id
    WHERE ft.produto_id = p_produto_id
  LOOP
    v_consumo := ROUND(r.quantidade_utilizada * p_quantidade, 4);

    SELECT estoque_atual INTO v_disponivel
    FROM public.estoque_insumos
    WHERE insumo_id = r.insumo_id
    FOR UPDATE;

    IF v_disponivel IS NULL THEN
      RAISE EXCEPTION 'Estoque de insumo não cadastrado: %', r.insumo_nome;
    END IF;

    IF v_disponivel < v_consumo THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível %, necessário %',
        r.insumo_nome, v_disponivel, v_consumo;
    END IF;

    UPDATE public.estoque_insumos
    SET estoque_atual = estoque_atual - v_consumo
    WHERE insumo_id = r.insumo_id;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Função: baixar produto acabado no estoque físico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.baixar_estoque_produto_venda(
  p_produto_id  UUID,
  p_quantidade  NUMERIC,
  p_venda_id    UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, descricao, estoque_atual, custo_medio
    FROM public.estoque_produtos
    WHERE produto_venda_id = p_produto_id AND ativo = TRUE
  LOOP
    IF r.estoque_atual < p_quantidade THEN
      RAISE EXCEPTION 'Estoque insuficiente de %: disponível %, solicitado %',
        r.descricao, r.estoque_atual, p_quantidade;
    END IF;

    INSERT INTO public.movimentacoes_estoque (
      produto_id, tipo, quantidade, custo_unitario, observacao, venda_id
    ) VALUES (
      r.id, 'SAIDA', p_quantidade, r.custo_medio,
      format('Baixa automática — venda %s', COALESCE(p_venda_id::TEXT, 'PDV')),
      p_venda_id
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Função principal: registrar venda (transação atômica)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_venda(p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_itens             JSONB;
  v_item              JSONB;
  v_produto_id        UUID;
  v_quantidade        NUMERIC(14, 4);
  v_preco_unitario    NUMERIC(12, 2);
  v_total_bruto       NUMERIC(14, 2) := 0;
  v_desconto          NUMERIC(14, 2);
  v_total_liquido     NUMERIC(14, 2);
  v_metodo            public.metodo_pagamento_venda;
  v_cliente_id        UUID;
  v_venda_id          UUID;
  v_transacao_id      UUID;
  v_conta_id          UUID;
  v_categoria_id      UUID;
  v_metodo_transacao  public.metodo_pagamento;
  v_descricao         TEXT;
  v_produto_nomes     TEXT[];
BEGIN
  v_itens := p_payload -> 'itens';
  IF v_itens IS NULL OR jsonb_array_length(v_itens) = 0 THEN
    RAISE EXCEPTION 'Informe ao menos um item na venda.';
  END IF;

  v_desconto := COALESCE((p_payload ->> 'desconto')::NUMERIC, 0);
  v_metodo := (p_payload ->> 'metodo_pagamento')::public.metodo_pagamento_venda;
  v_cliente_id := NULLIF(p_payload ->> 'cliente_id', '')::UUID;

  IF v_metodo IS NULL THEN
    RAISE EXCEPTION 'Método de pagamento inválido.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens)
  LOOP
    v_preco_unitario := (v_item ->> 'preco_unitario')::NUMERIC;
    v_quantidade := (v_item ->> 'quantidade')::NUMERIC;
    v_total_bruto := v_total_bruto + ROUND(v_preco_unitario * v_quantidade, 2);
  END LOOP;

  v_total_liquido := ROUND(v_total_bruto - v_desconto, 2);
  IF v_total_liquido < 0 THEN
    RAISE EXCEPTION 'Desconto maior que o total da venda.';
  END IF;

  INSERT INTO public.vendas (
    total_bruto, desconto, total_liquido, metodo_pagamento, status, cliente_id
  ) VALUES (
    v_total_bruto, v_desconto, v_total_liquido, v_metodo, 'CONCLUIDA', v_cliente_id
  ) RETURNING id INTO v_venda_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_itens)
  LOOP
    v_produto_id := (v_item ->> 'produto_id')::UUID;
    v_quantidade := (v_item ->> 'quantidade')::NUMERIC;
    v_preco_unitario := (v_item ->> 'preco_unitario')::NUMERIC;

    INSERT INTO public.venda_itens (venda_id, produto_id, quantidade, preco_unitario)
    VALUES (v_venda_id, v_produto_id, v_quantidade, v_preco_unitario);

    PERFORM public.baixar_estoque_produto_venda(v_produto_id, v_quantidade, v_venda_id);
    PERFORM public.baixar_insumos_ficha_tecnica(v_produto_id, v_quantidade, v_venda_id);
  END LOOP;

  SELECT id INTO v_categoria_id
  FROM public.categorias_financeiras
  WHERE nome = 'Vendas' AND tipo = 'RECEITA'
  LIMIT 1;

  v_metodo_transacao := CASE v_metodo
    WHEN 'DINHEIRO' THEN 'DINHEIRO'::public.metodo_pagamento
    WHEN 'PIX'     THEN 'PIX'::public.metodo_pagamento
    WHEN 'CARTAO'  THEN 'CREDITO'::public.metodo_pagamento
  END;

  SELECT id INTO v_conta_id
  FROM public.contas_bancarias
  WHERE nome = CASE v_metodo WHEN 'DINHEIRO' THEN 'Caixa' ELSE 'Conta Corrente' END
    AND ativo = TRUE
  LIMIT 1;

  IF v_conta_id IS NULL THEN
    SELECT id INTO v_conta_id FROM public.contas_bancarias WHERE ativo = TRUE LIMIT 1;
  END IF;

  SELECT ARRAY_AGG(p.nome ORDER BY p.nome)
  INTO v_produto_nomes
  FROM public.venda_itens vi
  JOIN public.produtos p ON p.id = vi.produto_id
  WHERE vi.venda_id = v_venda_id;

  v_descricao := format(
    'PDV — Venda %s (%s)',
    LEFT(v_venda_id::TEXT, 8),
    array_to_string(v_produto_nomes, ', ')
  );

  INSERT INTO public.transacoes (
    descricao, tipo, valor, categoria_id, conta_id, status,
    data_competencia, data_pagamento, metodo_pagamento
  ) VALUES (
    v_descricao, 'RECEITA', v_total_liquido, v_categoria_id, v_conta_id, 'PAGO',
    CURRENT_DATE, CURRENT_DATE, v_metodo_transacao
  ) RETURNING id INTO v_transacao_id;

  UPDATE public.vendas SET transacao_id = v_transacao_id WHERE id = v_venda_id;

  RETURN jsonb_build_object(
    'venda_id', v_venda_id,
    'transacao_id', v_transacao_id,
    'total_bruto', v_total_bruto,
    'desconto', v_desconto,
    'total_liquido', v_total_liquido
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venda_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_clientes" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_estoque_insumos" ON public.estoque_insumos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_vendas" ON public.vendas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_venda_itens" ON public.venda_itens
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT EXECUTE ON FUNCTION public.registrar_venda(JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.baixar_insumos_ficha_tecnica(UUID, NUMERIC, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.baixar_estoque_produto_venda(UUID, NUMERIC, UUID) TO authenticated, service_role;
