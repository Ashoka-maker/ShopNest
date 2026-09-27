-- Ensure the canonical marketplace categories exist and normalize legacy aliases.

INSERT INTO public.categories (slug, name, description)
VALUES
  ('home-living', 'Home & Living', 'Comfort, kitchen, and everyday essentials.'),
  ('fashion', 'Fashion', 'Apparel and accessories for every season.'),
  ('electronics', 'Electronics', 'Gadgets, audio, and smart home tech.'),
  ('beauty', 'Beauty', 'Personal care from trusted brands.'),
  ('sports', 'Sports', 'Gear for training, outdoors, and play.'),
  ('groceries', 'Groceries', 'Pantry staples delivered with care.')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

WITH canonical_categories(slug) AS (
  VALUES
    ('home-living'),
    ('fashion'),
    ('electronics'),
    ('beauty'),
    ('sports'),
    ('groceries')
)
UPDATE public.products AS p
SET category_id = canonical.id
FROM public.categories AS alias
JOIN canonical_categories AS canonical_slug
  ON lower(btrim(alias.slug)) = canonical_slug.slug
JOIN public.categories AS canonical
  ON canonical.slug = canonical_slug.slug
WHERE p.category_id = alias.id
  AND alias.id <> canonical.id;

WITH canonical_categories(slug) AS (
  VALUES
    ('home-living'),
    ('fashion'),
    ('electronics'),
    ('beauty'),
    ('sports'),
    ('groceries')
)
DELETE FROM public.categories AS alias
USING canonical_categories AS canonical_slug,
      public.categories AS canonical
WHERE lower(btrim(alias.slug)) = canonical_slug.slug
  AND canonical.slug = canonical_slug.slug
  AND alias.id <> canonical.id;

CREATE UNIQUE INDEX IF NOT EXISTS categories_canonical_slug_normalized_uidx
  ON public.categories (lower(btrim(slug)))
  WHERE lower(btrim(slug)) IN (
    'home-living', 'fashion', 'electronics', 'beauty', 'sports', 'groceries'
  );
