-- =============================================================================
-- Pão Quente — Seed: Dados iniciais do módulo de Estoque
-- =============================================================================

INSERT INTO public.estoque_produtos (codigo, descricao, categoria, unidade_medida, estoque_atual, estoque_minimo, custo_medio)
VALUES
  ('INS-001', 'Farinha de Trigo Tipo 1', 'INSUMO', 'kg', 50, 10, 4.50),
  ('INS-002', 'Açúcar Refinado', 'INSUMO', 'kg', 25, 5, 3.80),
  ('INS-003', 'Manteiga sem Sal', 'INSUMO', 'kg', 8, 3, 32.00),
  ('ACB-001', 'Pão Francês (unidade)', 'ACABADO', 'un', 120, 30, 0.45),
  ('ACB-002', 'Bolo de Chocolate (fatia)', 'ACABADO', 'un', 24, 6, 3.20),
  ('REF-001', 'Creme de Confeiteiro', 'REFRIGERADO', 'kg', 5, 2, 18.50),
  ('REF-002', 'Leite Integral', 'REFRIGERADO', 'l', 12, 4, 5.20)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.lotes_refrigerados (produto_id, lote, quantidade, data_fabricacao, data_validade)
SELECT p.id, 'L2025-001', 3, CURRENT_DATE - 5, CURRENT_DATE + 3
FROM public.estoque_produtos p WHERE p.codigo = 'REF-001'
ON CONFLICT (produto_id, lote) DO NOTHING;

INSERT INTO public.lotes_refrigerados (produto_id, lote, quantidade, data_fabricacao, data_validade)
SELECT p.id, 'L2025-002', 8, CURRENT_DATE - 2, CURRENT_DATE + 5
FROM public.estoque_produtos p WHERE p.codigo = 'REF-002'
ON CONFLICT (produto_id, lote) DO NOTHING;
