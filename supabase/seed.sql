-- Seed de demonstração para desenvolvimento local
-- Executar após migrations: supabase db reset (ou psql manual)

INSERT INTO public.insumos (nome, unidade_medida, preco_compra, quantidade_compra) VALUES
  ('Farinha de Trigo', 'g', 4.50, 1000),
  ('Manteiga', 'g', 19.00, 500),
  ('Açúcar', 'g', 5.00, 1000),
  ('Ovos', 'un', 0.65, 1),
  ('Leite Integral', 'ml', 4.80, 1000),
  ('Fermento Biológico', 'g', 2.20, 100),
  ('Chocolate ao Leite', 'g', 11.00, 200),
  ('Café em Grãos', 'g', 40.00, 500)
ON CONFLICT DO NOTHING;

INSERT INTO public.produtos (nome, preco_venda, markup_desejado) VALUES
  ('Croissant', 12.90, 15.00),
  ('Pão de Queijo', 6.50, 15.00),
  ('Cappuccino', 9.90, 20.00)
ON CONFLICT DO NOTHING;

-- Ficha técnica do Croissant (usa IDs gerados — ajuste se necessário)
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
