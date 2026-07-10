-- =============================================================================
-- Pão Quente — Insumos derivados de estoque_produtos (categoria INSUMO)
-- A ficha técnica passa a referenciar produtos de estoque categorizados como insumo.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funções auxiliares: conversão de unidade/custo entre estoque e ficha técnica
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.estoque_unidade_para_ficha(
  p_unidade public.unidade_medida_estoque
)
RETURNS public.unidade_medida
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_unidade
    WHEN 'kg' THEN 'g'::public.unidade_medida
    WHEN 'l'  THEN 'ml'::public.unidade_medida
    WHEN 'g'  THEN 'g'::public.unidade_medida
    WHEN 'ml' THEN 'ml'::public.unidade_medida
    ELSE 'un'::public.unidade_medida
  END;
$$;

CREATE OR REPLACE FUNCTION public.estoque_custo_unitario_ficha(
  p_unidade public.unidade_medida_estoque,
  p_custo_medio NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_unidade
    WHEN 'kg' THEN p_custo_medio / 1000
    WHEN 'l'  THEN p_custo_medio / 1000
    ELSE p_custo_medio
  END;
$$;

CREATE OR REPLACE FUNCTION public.converter_quantidade_ficha_para_estoque(
  p_quantidade_ficha NUMERIC,
  p_unidade_ficha public.unidade_medida,
  p_unidade_estoque public.unidade_medida_estoque
)
RETURNS NUMERIC
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_unidade_estoque = 'kg' AND p_unidade_ficha = 'g' THEN
    RETURN p_quantidade_ficha / 1000;
  ELSIF p_unidade_estoque = 'l' AND p_unidade_ficha = 'ml' THEN
    RETURN p_quantidade_ficha / 1000;
  ELSIF p_unidade_estoque = 'g' AND p_unidade_ficha = 'g' THEN
    RETURN p_quantidade_ficha;
  ELSIF p_unidade_estoque = 'ml' AND p_unidade_ficha = 'ml' THEN
    RETURN p_quantidade_ficha;
  ELSIF p_unidade_estoque IN ('un', 'cx', 'pct') AND p_unidade_ficha = 'un' THEN
    RETURN p_quantidade_ficha;
  END IF;

  RETURN p_quantidade_ficha;
END;
$$;

-- ---------------------------------------------------------------------------
-- Migrar insumos legados para estoque_produtos (quando ainda não existirem)
-- ---------------------------------------------------------------------------
INSERT INTO public.estoque_produtos (
  codigo, descricao, categoria, unidade_medida, estoque_atual, estoque_minimo, custo_medio
)
SELECT
  'INS-MIG-' || UPPER(SUBSTRING(REPLACE(i.id::TEXT, '-', ''), 1, 8)),
  i.nome,
  'INSUMO'::public.categoria_estoque,
  CASE i.unidade_medida
    WHEN 'g'  THEN 'g'::public.unidade_medida_estoque
    WHEN 'ml' THEN 'ml'::public.unidade_medida_estoque
    ELSE 'un'::public.unidade_medida_estoque
  END,
  COALESCE(ei.estoque_atual, 0),
  COALESCE(ei.estoque_minimo, 0),
  i.custo_unitario * CASE i.unidade_medida
    WHEN 'g'  THEN 1000
    WHEN 'ml' THEN 1000
    ELSE 1
  END
FROM public.insumos i
LEFT JOIN public.estoque_insumos ei ON ei.insumo_id = i.id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.estoque_produtos ep
  WHERE ep.categoria = 'INSUMO'
    AND (
      ep.descricao = i.nome
      OR ep.descricao ILIKE i.nome || '%'
      OR i.nome ILIKE '%' || ep.descricao || '%'
    )
);

-- ---------------------------------------------------------------------------
-- Redirecionar ficha_tecnica.insumo_id para estoque_produtos
-- ---------------------------------------------------------------------------
UPDATE public.ficha_tecnica ft
SET insumo_id = ep.id
FROM public.insumos i
JOIN public.estoque_produtos ep ON ep.categoria = 'INSUMO'
  AND (
    ep.descricao = i.nome
    OR ep.descricao ILIKE i.nome || '%'
    OR i.nome ILIKE '%' || ep.descricao || '%'
  )
WHERE ft.insumo_id = i.id;

DELETE FROM public.ficha_tecnica ft
WHERE NOT EXISTS (
  SELECT 1
  FROM public.estoque_produtos ep
  WHERE ep.id = ft.insumo_id
    AND ep.categoria = 'INSUMO'
);

ALTER TABLE public.ficha_tecnica
  DROP CONSTRAINT IF EXISTS ficha_tecnica_insumo_id_fkey;

ALTER TABLE public.ficha_tecnica
  ADD CONSTRAINT ficha_tecnica_insumo_id_fkey
  FOREIGN KEY (insumo_id) REFERENCES public.estoque_produtos (id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- Baixa de insumos via movimentações de estoque (fonte única de verdade)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.baixar_insumos_ficha_tecnica(
  p_produto_id  UUID,
  p_quantidade  NUMERIC,
  p_venda_id    UUID DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  r RECORD;
  v_consumo_ficha NUMERIC(14, 4);
  v_consumo_estoque NUMERIC(14, 4);
  v_unidade_ficha public.unidade_medida;
BEGIN
  FOR r IN
    SELECT
      ft.insumo_id,
      ft.quantidade_utilizada,
      ep.descricao AS insumo_nome,
      ep.unidade_medida AS unidade_estoque,
      ep.custo_medio
    FROM public.ficha_tecnica ft
    JOIN public.estoque_produtos ep ON ep.id = ft.insumo_id
    WHERE ft.produto_id = p_produto_id
      AND ep.categoria = 'INSUMO'
      AND ep.ativo = TRUE
  LOOP
    v_unidade_ficha := public.estoque_unidade_para_ficha(r.unidade_estoque);
    v_consumo_ficha := ROUND(r.quantidade_utilizada * p_quantidade, 4);
    v_consumo_estoque := public.converter_quantidade_ficha_para_estoque(
      v_consumo_ficha,
      v_unidade_ficha,
      r.unidade_estoque
    );

    IF v_consumo_estoque <= 0 THEN
      CONTINUE;
    END IF;

    INSERT INTO public.movimentacoes_estoque (
      produto_id, tipo, quantidade, custo_unitario, observacao, venda_id
    ) VALUES (
      r.insumo_id,
      'SAIDA',
      v_consumo_estoque,
      r.custo_medio,
      format('Baixa ficha técnica — venda %s', COALESCE(p_venda_id::TEXT, 'PDV')),
      p_venda_id
    );
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Substituir tabela insumos por view (somente categoria INSUMO)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_insumos_updated_at ON public.insumos;

DROP TABLE IF EXISTS public.estoque_insumos CASCADE;

DROP TABLE IF EXISTS public.insumos CASCADE;

CREATE OR REPLACE VIEW public.insumos
WITH (security_invoker = true) AS
SELECT
  ep.id,
  ep.descricao AS nome,
  public.estoque_unidade_para_ficha(ep.unidade_medida) AS unidade_medida,
  ep.custo_medio AS preco_compra,
  CASE ep.unidade_medida
    WHEN 'kg' THEN 1000::NUMERIC
    WHEN 'l'  THEN 1000::NUMERIC
    ELSE 1::NUMERIC
  END AS quantidade_compra,
  public.estoque_custo_unitario_ficha(ep.unidade_medida, ep.custo_medio) AS custo_unitario,
  ep.ativo,
  ep.created_at,
  ep.updated_at
FROM public.estoque_produtos ep
WHERE ep.categoria = 'INSUMO';

GRANT SELECT ON public.insumos TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Atualizar views de negócio
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_produto_cmv AS
SELECT
  p.id AS produto_id,
  p.nome AS produto_nome,
  p.preco_venda,
  p.markup_desejado,
  COALESCE(SUM(ft.quantidade_utilizada * i.custo_unitario), 0) AS cmv,
  CASE
    WHEN p.preco_venda > 0 THEN
      ROUND(
        ((p.preco_venda - COALESCE(SUM(ft.quantidade_utilizada * i.custo_unitario), 0))
          / p.preco_venda) * 100, 2
      )
    ELSE 0
  END AS margem_bruta_percentual
FROM public.produtos p
LEFT JOIN public.ficha_tecnica ft ON ft.produto_id = p.id
LEFT JOIN public.insumos i ON i.id = ft.insumo_id
GROUP BY p.id, p.nome, p.preco_venda, p.markup_desejado;

CREATE OR REPLACE VIEW public.vw_ficha_tecnica_detalhada AS
SELECT
  ft.id,
  ft.produto_id,
  p.nome AS produto_nome,
  ft.insumo_id,
  i.nome AS insumo_nome,
  i.unidade_medida,
  ft.quantidade_utilizada,
  i.custo_unitario,
  ROUND(ft.quantidade_utilizada * i.custo_unitario, 4) AS custo_linha
FROM public.ficha_tecnica ft
JOIN public.produtos p ON p.id = ft.produto_id
JOIN public.insumos i ON i.id = ft.insumo_id;
