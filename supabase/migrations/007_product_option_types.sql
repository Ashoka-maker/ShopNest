-- Add product-specific option labels while keeping legacy size/color variants.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS option_type TEXT;

UPDATE public.products AS p
SET option_type = CASE
  WHEN EXISTS (
    SELECT 1 FROM public.product_variants AS v
    WHERE v.product_id = p.id AND NULLIF(v.size, '') IS NOT NULL
  ) THEN 'size'
  WHEN EXISTS (
    SELECT 1 FROM public.product_variants AS v
    WHERE v.product_id = p.id AND NULLIF(v.color, '') IS NOT NULL
  ) THEN 'color'
  ELSE 'none'
END
WHERE p.option_type IS NULL;

ALTER TABLE public.products
  ALTER COLUMN option_type SET DEFAULT 'none',
  ALTER COLUMN option_type SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'products_option_type_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_option_type_check
      CHECK (option_type IN ('size', 'shoe-size', 'slipper-size', 'color', 'other', 'none'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_cart_item_variant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants AS v
    WHERE v.id = NEW.variant_id
      AND v.product_id = NEW.product_id
      AND (NEW.size IS NULL OR COALESCE(NULLIF(v.size, ''), v.color) = NEW.size)
  ) THEN
    RAISE EXCEPTION 'Cart variant does not belong to the selected product and option';
  END IF;

  IF NEW.variant_id IS NULL AND NEW.size IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.product_variants AS v
    WHERE v.product_id = NEW.product_id
      AND COALESCE(NULLIF(v.size, ''), v.color) = NEW.size
  ) THEN
    RAISE EXCEPTION 'Cart option does not exist for the selected product';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_order_item_variant()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.variant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.product_variants AS v
    WHERE v.id = NEW.variant_id
      AND v.product_id = NEW.product_id
      AND (NEW.size IS NULL OR COALESCE(NULLIF(v.size, ''), v.color) = NEW.size)
  ) THEN
    RAISE EXCEPTION 'Order variant does not belong to the selected product and option';
  END IF;
  RETURN NEW;
END;
$$;