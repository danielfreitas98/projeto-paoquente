-- =============================================================================
-- Pão Quente — Migration 004: Reaplicação idempotente para Supabase Cloud
-- Seguro para executar mesmo se partes das migrations 002/003 já existirem.
-- =============================================================================

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
  ft.id, ft.produto_id, p.nome AS produto_nome,
  ft.insumo_id, i.nome AS insumo_nome, i.unidade_medida,
  ft.quantidade_utilizada, i.custo_unitario,
  ROUND(ft.quantidade_utilizada * i.custo_unitario, 4) AS custo_linha
FROM public.ficha_tecnica ft
JOIN public.produtos p ON p.id = ft.produto_id
JOIN public.insumos i ON i.id = ft.insumo_id;

CREATE OR REPLACE FUNCTION public.calcular_markup_multiplicador(
  p_variaveis NUMERIC DEFAULT NULL,
  p_fixas     NUMERIC DEFAULT NULL,
  p_lucro     NUMERIC DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_variaveis NUMERIC; v_fixas NUMERIC; v_lucro NUMERIC; v_soma NUMERIC;
BEGIN
  IF p_variaveis IS NULL OR p_fixas IS NULL OR p_lucro IS NULL THEN
    SELECT percentual_variaveis, percentual_fixas, percentual_lucro
    INTO v_variaveis, v_fixas, v_lucro
    FROM public.configuracao_negocio ORDER BY created_at LIMIT 1;
  ELSE
    v_variaveis := p_variaveis; v_fixas := p_fixas; v_lucro := p_lucro;
  END IF;
  v_soma := v_variaveis + v_fixas + v_lucro;
  IF v_soma >= 100 THEN
    RAISE EXCEPTION 'Soma de variáveis, fixas e lucro deve ser menor que 100.';
  END IF;
  RETURN ROUND(100.0 / (100.0 - v_soma), 4);
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_preco_venda_sugerido(
  p_produto_id UUID,
  p_variaveis  NUMERIC DEFAULT NULL,
  p_fixas      NUMERIC DEFAULT NULL,
  p_lucro      NUMERIC DEFAULT NULL
)
RETURNS NUMERIC LANGUAGE plpgsql STABLE AS $$
DECLARE v_cmv NUMERIC; v_markup NUMERIC;
BEGIN
  SELECT cmv INTO v_cmv FROM public.vw_produto_cmv WHERE produto_id = p_produto_id;
  IF v_cmv IS NULL THEN RAISE EXCEPTION 'Produto não encontrado.'; END IF;
  v_markup := public.calcular_markup_multiplicador(p_variaveis, p_fixas, p_lucro);
  RETURN ROUND(v_cmv * v_markup, 2);
END;
$$;

CREATE OR REPLACE FUNCTION public.classificar_margem_lucro(
  p_margem_percentual NUMERIC,
  p_lucro_desejado    NUMERIC DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE v_lucro NUMERIC;
BEGIN
  IF p_lucro_desejado IS NULL THEN
    SELECT percentual_lucro INTO v_lucro FROM public.configuracao_negocio ORDER BY created_at LIMIT 1;
  ELSE v_lucro := p_lucro_desejado; END IF;
  IF p_margem_percentual < 0 THEN RETURN 'VERMELHO';
  ELSIF p_margem_percentual < v_lucro THEN RETURN 'AMARELO';
  ELSE RETURN 'VERDE'; END IF;
END;
$$;

CREATE OR REPLACE VIEW public.vw_produto_termometro AS
SELECT c.*,
  public.calcular_preco_venda_sugerido(c.produto_id) AS preco_sugerido,
  public.classificar_margem_lucro(c.margem_bruta_percentual) AS termometro
FROM public.vw_produto_cmv c;

CREATE OR REPLACE FUNCTION public.produtos_afetados_por_insumo(p_insumo_id UUID)
RETURNS TABLE (
  produto_id UUID, produto_nome TEXT, cmv_atual NUMERIC,
  preco_venda NUMERIC, preco_sugerido NUMERIC
) LANGUAGE sql STABLE AS $$
  SELECT p.id, p.nome, vc.cmv, p.preco_venda, public.calcular_preco_venda_sugerido(p.id)
  FROM public.ficha_tecnica ft
  JOIN public.produtos p ON p.id = ft.produto_id
  JOIN public.vw_produto_cmv vc ON vc.produto_id = p.id
  WHERE ft.insumo_id = p_insumo_id
  GROUP BY p.id, p.nome, vc.cmv, p.preco_venda;
$$;

CREATE OR REPLACE FUNCTION public.contar_produtos_afetados_por_insumo(p_insumo_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE AS $$
  SELECT COUNT(DISTINCT produto_id)::INTEGER FROM public.ficha_tecnica WHERE insumo_id = p_insumo_id;
$$;

CREATE OR REPLACE FUNCTION public.reajustar_precos_por_insumo(p_insumo_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_count INTEGER := 0; r RECORD;
BEGIN
  FOR r IN SELECT produto_id FROM public.produtos_afetados_por_insumo(p_insumo_id) LOOP
    UPDATE public.produtos SET preco_venda = public.calcular_preco_venda_sugerido(r.produto_id) WHERE id = r.produto_id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_taxa_cartao(p_metodo public.metodo_pagamento)
RETURNS NUMERIC LANGUAGE sql STABLE AS $$
  SELECT CASE p_metodo
    WHEN 'DEBITO'  THEN taxa_cartao_debito
    WHEN 'CREDITO' THEN taxa_cartao_credito ELSE 0 END
  FROM public.configuracao_negocio ORDER BY created_at LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.gerar_despesa_taxa_cartao_after()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_taxa_pct NUMERIC; v_valor_taxa NUMERIC; v_categoria_id UUID; v_descricao_taxa TEXT;
BEGIN
  IF NEW.tipo <> 'RECEITA' OR NEW.metodo_pagamento NOT IN ('DEBITO', 'CREDITO') THEN RETURN NEW; END IF;
  IF NEW.taxa_cartao_deduzida OR NEW.transacao_origem_id IS NOT NULL THEN RETURN NEW; END IF;

  v_taxa_pct := public.obter_taxa_cartao(NEW.metodo_pagamento);
  IF v_taxa_pct <= 0 THEN
    UPDATE public.transacoes SET taxa_cartao_deduzida = TRUE WHERE id = NEW.id; RETURN NEW;
  END IF;

  v_valor_taxa := ROUND(NEW.valor * (v_taxa_pct / 100.0), 2);
  IF v_valor_taxa <= 0 THEN
    UPDATE public.transacoes SET taxa_cartao_deduzida = TRUE WHERE id = NEW.id; RETURN NEW;
  END IF;

  SELECT categoria_taxa_cartao_id INTO v_categoria_id FROM public.configuracao_negocio ORDER BY created_at LIMIT 1;
  v_descricao_taxa := format('Taxa %s — %s (%.2f%%)', NEW.metodo_pagamento, NEW.descricao, v_taxa_pct);

  INSERT INTO public.transacoes (
    descricao, tipo, valor, categoria_id, conta_id, status,
    data_competencia, data_pagamento, metodo_pagamento, taxa_cartao_deduzida, transacao_origem_id
  ) VALUES (
    v_descricao_taxa, 'DESPESA', v_valor_taxa, v_categoria_id, NEW.conta_id, NEW.status,
    NEW.data_competencia, NEW.data_pagamento, NEW.metodo_pagamento, TRUE, NEW.id
  );
  UPDATE public.transacoes SET taxa_cartao_deduzida = TRUE WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transacao_taxa_cartao ON public.transacoes;
CREATE TRIGGER trg_transacao_taxa_cartao
  AFTER INSERT ON public.transacoes FOR EACH ROW EXECUTE FUNCTION public.gerar_despesa_taxa_cartao_after();

CREATE OR REPLACE FUNCTION public.atualizar_saldo_conta()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'PAGO' THEN
    IF NEW.tipo = 'RECEITA' THEN
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_id;
    ELSIF NEW.tipo = 'DESPESA' THEN
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_id;
    ELSIF NEW.tipo = 'TRANSFERENCIA' THEN
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_id;
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_destino_id;
    END IF;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status <> 'PAGO' AND NEW.status = 'PAGO' THEN
    IF NEW.tipo = 'RECEITA' THEN
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_id;
    ELSIF NEW.tipo = 'DESPESA' THEN
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_id;
    ELSIF NEW.tipo = 'TRANSFERENCIA' THEN
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual - NEW.valor WHERE id = NEW.conta_id;
      UPDATE public.contas_bancarias SET saldo_atual = saldo_atual + NEW.valor WHERE id = NEW.conta_destino_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transacao_saldo ON public.transacoes;
CREATE TRIGGER trg_transacao_saldo
  AFTER INSERT OR UPDATE OF status ON public.transacoes FOR EACH ROW EXECUTE FUNCTION public.atualizar_saldo_conta();

CREATE OR REPLACE VIEW public.vw_fluxo_caixa_mensal AS
SELECT DATE_TRUNC('month', data_competencia)::DATE AS mes,
  COALESCE(SUM(CASE WHEN tipo = 'RECEITA' THEN valor END), 0) AS total_receitas,
  COALESCE(SUM(CASE WHEN tipo = 'DESPESA' THEN valor END), 0) AS total_despesas,
  COALESCE(SUM(CASE WHEN tipo = 'RECEITA' THEN valor END), 0)
    - COALESCE(SUM(CASE WHEN tipo = 'DESPESA' THEN valor END), 0) AS resultado
FROM public.transacoes
WHERE status = 'PAGO' AND transacao_origem_id IS NULL
GROUP BY DATE_TRUNC('month', data_competencia) ORDER BY mes;

CREATE OR REPLACE VIEW public.vw_plano_contas_resumo AS
SELECT cf.id AS categoria_id, cf.nome AS categoria_nome, cf.tipo, cp.nome AS categoria_pai,
  COALESCE(SUM(t.valor), 0) AS total
FROM public.categorias_financeiras cf
LEFT JOIN public.categorias_financeiras cp ON cp.id = cf.pai_id
LEFT JOIN public.transacoes t ON t.categoria_id = cf.id AND t.status = 'PAGO' AND t.transacao_origem_id IS NULL
GROUP BY cf.id, cf.nome, cf.tipo, cp.nome ORDER BY cf.tipo, total DESC;

CREATE OR REPLACE VIEW public.vw_dre_simplificado AS
SELECT DATE_TRUNC('month', data_competencia)::DATE AS mes,
  COALESCE(SUM(CASE WHEN tipo = 'RECEITA' THEN valor END), 0) AS receita_bruta,
  COALESCE(SUM(CASE WHEN tipo = 'DESPESA' AND cf.nome = 'Matéria-Prima' THEN valor END), 0) AS cmv_despesas,
  COALESCE(SUM(CASE WHEN tipo = 'DESPESA' THEN valor END), 0) AS despesas_totais,
  COALESCE(SUM(CASE WHEN tipo = 'RECEITA' THEN valor END), 0)
    - COALESCE(SUM(CASE WHEN tipo = 'DESPESA' THEN valor END), 0) AS lucro_liquido
FROM public.transacoes t
LEFT JOIN public.categorias_financeiras cf ON cf.id = t.categoria_id
WHERE t.status = 'PAGO' AND t.transacao_origem_id IS NULL
GROUP BY DATE_TRUNC('month', data_competencia) ORDER BY mes;

ALTER TABLE public.configuracao_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_config' AND tablename = 'configuracao_negocio') THEN
    CREATE POLICY "auth_all_config" ON public.configuracao_negocio FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_insumos' AND tablename = 'insumos') THEN
    CREATE POLICY "auth_all_insumos" ON public.insumos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_produtos' AND tablename = 'produtos') THEN
    CREATE POLICY "auth_all_produtos" ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_ficha' AND tablename = 'ficha_tecnica') THEN
    CREATE POLICY "auth_all_ficha" ON public.ficha_tecnica FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_categorias' AND tablename = 'categorias_financeiras') THEN
    CREATE POLICY "auth_all_categorias" ON public.categorias_financeiras FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_contas' AND tablename = 'contas_bancarias') THEN
    CREATE POLICY "auth_all_contas" ON public.contas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auth_all_transacoes' AND tablename = 'transacoes') THEN
    CREATE POLICY "auth_all_transacoes" ON public.transacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_produtos' AND tablename = 'produtos') THEN
    CREATE POLICY "anon_read_produtos" ON public.produtos FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_insumos' AND tablename = 'insumos') THEN
    CREATE POLICY "anon_read_insumos" ON public.insumos FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_ficha' AND tablename = 'ficha_tecnica') THEN
    CREATE POLICY "anon_read_ficha" ON public.ficha_tecnica FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'anon_read_config' AND tablename = 'configuracao_negocio') THEN
    CREATE POLICY "anon_read_config" ON public.configuracao_negocio FOR SELECT TO anon USING (true);
  END IF;
END $$;

ALTER VIEW public.vw_produto_cmv SET (security_invoker = true);
ALTER VIEW public.vw_ficha_tecnica_detalhada SET (security_invoker = true);
ALTER VIEW public.vw_produto_termometro SET (security_invoker = true);
ALTER VIEW public.vw_fluxo_caixa_mensal SET (security_invoker = true);
ALTER VIEW public.vw_plano_contas_resumo SET (security_invoker = true);
ALTER VIEW public.vw_dre_simplificado SET (security_invoker = true);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
