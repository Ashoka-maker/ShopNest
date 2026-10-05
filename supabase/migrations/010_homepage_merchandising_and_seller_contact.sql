ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS homepage_section TEXT NOT NULL DEFAULT 'none';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_homepage_section_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_homepage_section_check
  CHECK (homepage_section IN ('none', 'deal', 'trending', 'new'));

WITH ranked_products AS (
  SELECT
    id,
    (
      compare_at_price_cents IS NOT NULL
      AND compare_at_price_cents > price_cents
    ) AS is_discounted,
    ROW_NUMBER() OVER (ORDER BY created_at DESC, id) AS catalog_rank,
    ROW_NUMBER() OVER (
      PARTITION BY (
        compare_at_price_cents IS NOT NULL
        AND compare_at_price_cents > price_cents
      )
      ORDER BY created_at DESC, id
    ) AS group_rank
  FROM public.products
  WHERE approval_status = 'approved'
    AND publish_status = 'published'
)
UPDATE public.products AS products
SET homepage_section = CASE
  WHEN ranked_products.is_discounted AND ranked_products.group_rank <= 8 THEN 'deal'
  WHEN ranked_products.catalog_rank % 2 = 0 THEN 'trending'
  ELSE 'new'
END
FROM ranked_products
WHERE products.id = ranked_products.id
  AND products.homepage_section = 'none';

ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS address_line1 TEXT,
  ADD COLUMN IF NOT EXISTS address_line2 TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS state TEXT,
  ADD COLUMN IF NOT EXISTS postal_code TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

UPDATE public.sellers AS sellers
SET contact_name = profiles.full_name
FROM public.profiles AS profiles
WHERE sellers.user_id = profiles.id
  AND sellers.contact_name IS NULL
  AND profiles.full_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.protect_product_homepage_section()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_admin_user() THEN
    IF TG_OP = 'INSERT' THEN
      NEW.homepage_section := 'none';
    ELSIF NEW.homepage_section IS DISTINCT FROM OLD.homepage_section THEN
      RAISE EXCEPTION 'Homepage product assignments are managed by admins';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_product_homepage_section_before_write ON public.products;
CREATE TRIGGER protect_product_homepage_section_before_write
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.protect_product_homepage_section();
