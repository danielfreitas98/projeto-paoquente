-- Permite leitura pública de estoque_produtos para o PDV (fallback sem service role)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'estoque_produtos'
      AND policyname = 'anon_select_estoque_produtos'
  ) THEN
    CREATE POLICY "anon_select_estoque_produtos"
      ON public.estoque_produtos
      FOR SELECT TO anon
      USING (ativo = TRUE);
  END IF;
END $$;

GRANT SELECT ON public.estoque_produtos TO anon;
