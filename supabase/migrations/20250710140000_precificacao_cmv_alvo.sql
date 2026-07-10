-- =============================================================================
-- Precificação por CMV Alvo — alinha funções SQL com o módulo de precificação
-- Preço Sugerido = CMV / (CMV Alvo / 100)
-- Indicador: VERDE < meta, AMARELO ≤ meta+5pp, VERMELHO > meta+5pp
-- =============================================================================

CREATE OR REPLACE FUNCTION public.calcular_preco_venda_sugerido(
  p_produto_id UUID,
  p_cmv_alvo   NUMERIC DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_cmv      NUMERIC;
  v_cmv_alvo NUMERIC;
BEGIN
  SELECT c.cmv, COALESCE(p_cmv_alvo, c.markup_desejado, 30)
  INTO v_cmv, v_cmv_alvo
  FROM public.vw_produto_cmv c
  WHERE c.produto_id = p_produto_id;

  IF v_cmv IS NULL THEN
    RAISE EXCEPTION 'Produto não encontrado.';
  END IF;

  IF v_cmv_alvo <= 0 OR v_cmv_alvo >= 100 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(v_cmv / (v_cmv_alvo / 100.0), 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.classificar_margem_lucro(
  p_cmv_percentual NUMERIC,
  p_cmv_alvo       NUMERIC DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_cmv_alvo NUMERIC;
BEGIN
  v_cmv_alvo := COALESCE(p_cmv_alvo, 30);

  IF p_cmv_percentual < v_cmv_alvo THEN
    RETURN 'VERDE';
  ELSIF p_cmv_percentual <= v_cmv_alvo + 5 THEN
    RETURN 'AMARELO';
  ELSE
    RETURN 'VERMELHO';
  END IF;
END;
$$;

CREATE OR REPLACE VIEW public.vw_produto_termometro AS
SELECT
  c.*,
  public.calcular_preco_venda_sugerido(c.produto_id, c.markup_desejado) AS preco_sugerido,
  public.classificar_margem_lucro(
    CASE
      WHEN c.preco_venda > 0 THEN ROUND((c.cmv / c.preco_venda) * 100, 2)
      ELSE 0
    END,
    COALESCE(c.markup_desejado, 30)
  ) AS termometro
FROM public.vw_produto_cmv c;

ALTER VIEW public.vw_produto_termometro SET (security_invoker = true);
