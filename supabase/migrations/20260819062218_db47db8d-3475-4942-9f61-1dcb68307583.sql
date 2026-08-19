REVOKE ALL ON FUNCTION public.product_batch_qty(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_product_stock_from_batches() FROM PUBLIC, anon, authenticated;