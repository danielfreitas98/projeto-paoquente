-- Seed de demonstração para desenvolvimento local
-- Executar após migrations: supabase db reset (ou psql manual)
-- Insumos vêm de estoque_produtos com categoria INSUMO (view public.insumos)

INSERT INTO public.estoque_produtos (codigo, descricao, categoria, unidade_medida, estoque_atual, estoque_minimo, custo_medio)
VALUES
  ('INS-FT-001', 'Farinha de Trigo', 'INSUMO', 'kg', 50, 5, 4.50),
  ('INS-FT-002', 'Manteiga', 'INSUMO', 'kg', 10, 1, 38.00),
  ('INS-FT-003', 'Açúcar', 'INSUMO', 'kg', 25, 2.5, 5.00),
  ('INS-FT-004', 'Ovos', 'INSUMO', 'un', 500, 50, 0.65),
  ('INS-FT-005', 'Leite Integral', 'INSUMO', 'l', 30, 3, 4.80),
  ('INS-FT-006', 'Fermento Biológico', 'INSUMO', 'g', 2000, 200, 0.022),
  ('INS-FT-007', 'Chocolate ao Leite', 'INSUMO', 'g', 5000, 500, 0.055),
  ('INS-FT-008', 'Café em Grãos', 'INSUMO', 'g', 10000, 1000, 0.08)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.produtos (nome, preco_venda, markup_desejado) VALUES
  ('Croissant', 12.90, 15.00),
  ('Pão de Queijo', 6.50, 15.00),
  ('Cappuccino', 9.90, 20.00)
ON CONFLICT DO NOTHING;

INSERT INTO public.ficha_tecnica (produto_id, insumo_id, quantidade_utilizada)
SELECT p.id, i.id, v.qtd
FROM public.produtos p
CROSS JOIN (VALUES
  ('Farinha de Trigo', 120),
  ('Manteiga', 45),
  ('Fermento Biológico', 8)
) AS v(nome, qtd)
JOIN public.insumos i ON i.nome = v.nome
WHERE p.nome = 'Croissant'
ON CONFLICT (produto_id, insumo_id) DO NOTHING;

-- Transações de exemplo (mês atual)
INSERT INTO public.transacoes (descricao, tipo, valor, categoria_id, conta_id, status, data_competencia, data_pagamento)
SELECT v.descricao, v.tipo::public.tipo_transacao, v.valor, cf.id, cb.id, 'PAGO', CURRENT_DATE - v.dias, CURRENT_DATE - v.dias
FROM (VALUES
  ('Venda balcão — manhã', 'RECEITA', 620.00, 'Vendas', 0),
  ('Venda balcão — tarde', 'RECEITA', 480.00, 'Vendas', 1),
  ('Compra de farinha', 'DESPESA', 180.00, 'Matéria-Prima', 2),
  ('Aluguel', 'DESPESA', 3500.00, 'Aluguel', 3)
) AS v(descricao, tipo, valor, cat_nome, dias)
JOIN public.categorias_financeiras cf ON cf.nome = v.cat_nome
JOIN public.contas_bancarias cb ON cb.nome = 'Caixa'
ON CONFLICT DO NOTHING;
