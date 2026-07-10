-- =============================================================================
-- Pão Quente — PDV: vendas diretas de estoque_produtos
-- =============================================================================

ALTER TABLE public.estoque_produtos
  ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(12, 2) NOT NULL DEFAULT 0
    CHECK (preco_venda >= 0);

UPDATE public.estoque_produtos
SET preco_venda = CASE
  WHEN preco_venda > 0 THEN preco_venda
  WHEN custo_medio > 0 THEN ROUND(custo_medio * 2.5, 2)
  ELSE 0
END;

UPDATE public.estoque_produtos ep
SET preco_venda = p.preco_venda
FROM public.produtos p
WHERE ep.produto_venda_id = p.id
  AND ep.preco_venda = 0;

UPDATE public.estoque_produtos SET preco_venda = 1.50 WHERE codigo = 'ACB-001' AND preco_venda = 0;
UPDATE public.estoque_produtos SET preco_venda = 8.90 WHERE codigo = 'ACB-002' AND preco_venda = 0;
UPDATE public.estoque_produtos SET preco_venda = 12.00 WHERE codigo = 'ACAB-PF' AND preco_venda = 0;
UPDATE public.estoque_produtos SET preco_venda = 6.50 WHERE codigo = 'ACAB-PQ' AND preco_venda = 0;
UPDATE public.estoque_produtos SET preco_venda = 12.90 WHERE codigo = 'ACAB-CRO' AND preco_venda = 0;

ALTER TABLE public.venda_itens
  ALTER COLUMN produto_id DROP NOT NULL;

ALTER TABLE public.venda_itens
  ADD COLUMN IF NOT EXISTS estoque_produto_id UUID
    REFERENCES public.estoque_produtos (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_venda_itens_estoque_produto
  ON public.venda_itens (estoque_produto_id)
  WHERE estoque_produto_id IS NOT NULL;

ALTER TABLE public.venda_itens
  DROP CONSTRAINT IF EXISTS chk_venda_item_origem;

ALTER TABLE public.venda_itens
  ADD CONSTRAINT chk_venda_item_origem CHECK (
    (produto_id IS NOT NULL AND estoque_produto_id IS NULL)
    OR (produto_id IS NULL AND estoque_produto_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.baixar_estoque_produto_direto(
  p_estoque_produto_id UUID,
  p_quantidade         NUMERIC,
  p_venda_id           UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT id, descricao, estoque_atual, custo_medio
  INTO r
  FROM public.estoque_produtos
  WHERE id = p_estoque_produto_id AND ativo = TRUE
  FOR UPDATE;

  IF r.id IS NULL THEN
    RAISE EXCEPTION 'Produto de estoque não encontrado ou inativo.';
  END IF;

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
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_venda(p_payload JSONB)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_itens                JSONB;
  v_item                 JSONB;
  v_produto_id           UUID;
  v_estoque_produto_id   UUID;
  v_quantidade           NUMERIC(14, 4);
  v_preco_unitario       NUMERIC(12, 2);
  v_total_bruto          NUMERIC(14, 2) := 0;
  v_desconto             NUMERIC(14, 2);
  v_total_liquido        NUMERIC(14, 2);
  v_metodo               public.metodo_pagamento_venda;
  v_cliente_id           UUID;
  v_venda_id             UUID;
  v_transacao_id         UUID;
  v_conta_id             UUID;
  v_categoria_id         UUID;
  v_metodo_transacao     public.metodo_pagamento;
  v_descricao            TEXT;
  v_produto_nomes        TEXT[];
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
    v_produto_id := NULLIF(v_item ->> 'produto_id', '')::UUID;
    v_estoque_produto_id := NULLIF(v_item ->> 'estoque_produto_id', '')::UUID;
    v_quantidade := (v_item ->> 'quantidade')::NUMERIC;
    v_preco_unitario := (v_item ->> 'preco_unitario')::NUMERIC;

    IF v_produto_id IS NOT NULL AND v_estoque_produto_id IS NOT NULL THEN
      RAISE EXCEPTION 'Item inválido: informe produto_id ou estoque_produto_id, não ambos.';
    END IF;

    IF v_produto_id IS NULL AND v_estoque_produto_id IS NULL THEN
      RAISE EXCEPTION 'Item inválido: produto não informado.';
    END IF;

    INSERT INTO public.venda_itens (
      venda_id, produto_id, estoque_produto_id, quantidade, preco_unitario
    ) VALUES (
      v_venda_id, v_produto_id, v_estoque_produto_id, v_quantidade, v_preco_unitario
    );

    IF v_produto_id IS NOT NULL THEN
      PERFORM public.baixar_estoque_produto_venda(v_produto_id, v_quantidade, v_venda_id);
      PERFORM public.baixar_insumos_ficha_tecnica(v_produto_id, v_quantidade, v_venda_id);
    ELSE
      PERFORM public.baixar_estoque_produto_direto(v_estoque_produto_id, v_quantidade, v_venda_id);
    END IF;
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

  SELECT ARRAY_AGG(nome ORDER BY nome)
  INTO v_produto_nomes
  FROM (
    SELECT p.nome
    FROM public.venda_itens vi
    JOIN public.produtos p ON p.id = vi.produto_id
    WHERE vi.venda_id = v_venda_id
    UNION ALL
    SELECT ep.descricao AS nome
    FROM public.venda_itens vi
    JOIN public.estoque_produtos ep ON ep.id = vi.estoque_produto_id
    WHERE vi.venda_id = v_venda_id
  ) itens;

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

GRANT EXECUTE ON FUNCTION public.baixar_estoque_produto_direto(UUID, NUMERIC, UUID)
  TO authenticated, service_role;
