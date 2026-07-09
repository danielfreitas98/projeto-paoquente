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

INSERT INTO public.estoque_insumos (insumo_id, estoque_atual, estoque_minimo)
SELECT i.id, v.estoque, v.minimo
FROM public.insumos i
JOIN (VALUES
  ('Farinha de Trigo', 50000, 5000),
  ('Manteiga', 10000, 1000),
  ('Açúcar', 20000, 2000),
  ('Ovos', 500, 50),
  ('Leite Integral', 30000, 3000),
  ('Fermento Biológico', 2000, 200),
  ('Chocolate ao Leite', 5000, 500),
  ('Café em Grãos', 10000, 1000)
) AS v(nome, estoque, minimo) ON i.nome = v.nome
ON CONFLICT (insumo_id) DO NOTHING;

INSERT INTO public.estoque_produtos (codigo, descricao, categoria, unidade_medida, estoque_atual, estoque_minimo, produto_venda_id)
SELECT v.codigo, v.descricao, 'ACABADO'::public.categoria_estoque, 'un', v.estoque, v.minimo, p.id
FROM (VALUES
  ('ACAB-PF', 'Pão Francês', 'Pão Francês', 200, 20),
  ('ACAB-PQ', 'Pão de Queijo', 'Pão de Queijo', 150, 15),
  ('ACAB-CRO', 'Croissant', 'Croissant', 80, 10)
) AS v(codigo, descricao, produto_nome, estoque, minimo)
JOIN public.produtos p ON p.nome = v.produto_nome
ON CONFLICT (codigo) DO NOTHING;
