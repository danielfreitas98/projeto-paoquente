-- Seed PDV: códigos, estoque de insumos e produtos acabados vinculados

UPDATE public.produtos SET codigo = v.codigo
FROM (VALUES
  ('Croissant', 'CRO001'),
  ('Pão de Queijo', 'PQ001'),
  ('Cappuccino', 'CAP001')
) AS v(nome, codigo)
WHERE public.produtos.nome = v.nome;

INSERT INTO public.produtos (nome, preco_venda, markup_desejado, codigo) VALUES
  ('Pão Francês', 1.50, 15.00, 'PF001'),
  ('Café Expresso', 5.00, 20.00, 'CAF001')
ON CONFLICT DO NOTHING;

INSERT INTO public.insumos (nome, unidade_medida, preco_compra, quantidade_compra)
SELECT v.nome, v.unidade, v.preco, v.qtd
FROM (VALUES
  ('Farinha de Trigo', 'g'::public.unidade_medida, 4.50::NUMERIC, 1000::NUMERIC),
  ('Manteiga', 'g'::public.unidade_medida, 19.00::NUMERIC, 500::NUMERIC),
  ('Açúcar', 'g'::public.unidade_medida, 5.00::NUMERIC, 1000::NUMERIC),
  ('Ovos', 'un'::public.unidade_medida, 0.65::NUMERIC, 1::NUMERIC),
  ('Leite Integral', 'ml'::public.unidade_medida, 4.80::NUMERIC, 1000::NUMERIC),
  ('Fermento Biológico', 'g'::public.unidade_medida, 2.20::NUMERIC, 100::NUMERIC),
  ('Chocolate ao Leite', 'g'::public.unidade_medida, 11.00::NUMERIC, 200::NUMERIC),
  ('Café em Grãos', 'g'::public.unidade_medida, 40.00::NUMERIC, 500::NUMERIC)
) AS v(nome, unidade, preco, qtd)
WHERE NOT EXISTS (
  SELECT 1 FROM public.insumos i WHERE i.nome = v.nome
);

INSERT INTO public.estoque_produtos (codigo, descricao, categoria, unidade_medida, estoque_atual, estoque_minimo, custo_medio)
SELECT v.codigo, v.descricao, 'INSUMO'::public.categoria_estoque, v.unidade, v.estoque, v.minimo, v.custo
FROM (VALUES
  ('INS-PDV-001', 'Farinha de Trigo', 'kg', 50, 5, 4.50),
  ('INS-PDV-002', 'Manteiga', 'kg', 10, 1, 38.00),
  ('INS-PDV-003', 'Açúcar', 'kg', 20, 2, 5.00),
  ('INS-PDV-004', 'Ovos', 'un', 500, 50, 0.65),
  ('INS-PDV-005', 'Leite Integral', 'l', 30, 3, 4.80),
  ('INS-PDV-006', 'Fermento Biológico', 'g', 2000, 200, 0.022),
  ('INS-PDV-007', 'Chocolate ao Leite', 'g', 5000, 500, 0.055),
  ('INS-PDV-008', 'Café em Grãos', 'g', 10000, 1000, 0.08)
) AS v(codigo, descricao, unidade, estoque, minimo, custo)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.ficha_tecnica (produto_id, insumo_id, quantidade_utilizada)
SELECT p.id, i.id, v.qtd
FROM public.produtos p
CROSS JOIN (VALUES
  ('Pão Francês', 'Farinha de Trigo', 60),
  ('Pão Francês', 'Fermento Biológico', 3),
  ('Pão de Queijo', 'Farinha de Trigo', 80),
  ('Pão de Queijo', 'Manteiga', 20),
  ('Cappuccino', 'Café em Grãos', 18),
  ('Cappuccino', 'Leite Integral', 150),
  ('Café Expresso', 'Café em Grãos', 12)
) AS v(produto, insumo, qtd)
JOIN public.insumos i ON i.nome = v.insumo
WHERE p.nome = v.produto
ON CONFLICT (produto_id, insumo_id) DO NOTHING;

INSERT INTO public.estoque_produtos (codigo, descricao, categoria, unidade_medida, estoque_atual, estoque_minimo, produto_venda_id)
SELECT v.codigo, v.descricao, 'ACABADO'::public.categoria_estoque, 'un', v.estoque, v.minimo, p.id
FROM (VALUES
  ('ACAB-PF', 'Pão Francês', 'Pão Francês', 200, 20),
  ('ACAB-PQ', 'Pão de Queijo', 'Pão de Queijo', 150, 15),
  ('ACAB-CRO', 'Croissant', 'Croissant', 80, 10)
) AS v(codigo, descricao, produto_nome, estoque, minimo)
JOIN public.produtos p ON p.nome = v.produto_nome
ON CONFLICT (codigo) DO NOTHING;
