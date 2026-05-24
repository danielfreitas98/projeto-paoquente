-- =============================================================================
-- Pão Quente — Migration 003: Row Level Security
-- =============================================================================

ALTER TABLE public.configuracao_negocio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ficha_tecnica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_config" ON public.configuracao_negocio FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_insumos" ON public.insumos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_produtos" ON public.produtos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_ficha" ON public.ficha_tecnica FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_categorias" ON public.categorias_financeiras FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_contas" ON public.contas_bancarias FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_transacoes" ON public.transacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

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
