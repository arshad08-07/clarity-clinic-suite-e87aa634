-- Collection reporting: payment-transaction based aggregation (RLS-respecting, invoker rights)

CREATE OR REPLACE FUNCTION public.collection_totals(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _branch uuid DEFAULT NULL,
  _method text DEFAULT NULL
)
RETURNS TABLE(collected numeric, refunds numeric, net numeric, txns bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(p.amount) FILTER (WHERE p.amount > 0), 0)::numeric AS collected,
    COALESCE(ABS(SUM(p.amount) FILTER (WHERE p.amount < 0)), 0)::numeric AS refunds,
    COALESCE(SUM(p.amount), 0)::numeric AS net,
    COUNT(*)::bigint AS txns
  FROM public.payments p
  JOIN public.invoices i ON i.id = p.invoice_id
  WHERE (_from IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date >= _from)
    AND (_to IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date <= _to)
    AND (_branch IS NULL OR i.branch_id = _branch)
    AND (_method IS NULL OR _method = '' OR _method = 'all' OR p.method = _method);
$$;

CREATE OR REPLACE FUNCTION public.collection_by_day(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _branch uuid DEFAULT NULL,
  _method text DEFAULT NULL
)
RETURNS TABLE(day date, collected numeric, refunds numeric, net numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    (p.paid_at AT TIME ZONE 'UTC')::date AS day,
    COALESCE(SUM(p.amount) FILTER (WHERE p.amount > 0), 0)::numeric,
    COALESCE(ABS(SUM(p.amount) FILTER (WHERE p.amount < 0)), 0)::numeric,
    COALESCE(SUM(p.amount), 0)::numeric
  FROM public.payments p
  JOIN public.invoices i ON i.id = p.invoice_id
  WHERE (_from IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date >= _from)
    AND (_to IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date <= _to)
    AND (_branch IS NULL OR i.branch_id = _branch)
    AND (_method IS NULL OR _method = '' OR _method = 'all' OR p.method = _method)
  GROUP BY 1
  ORDER BY 1;
$$;

CREATE OR REPLACE FUNCTION public.collection_by_method(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _branch uuid DEFAULT NULL
)
RETURNS TABLE(method text, collected numeric, refunds numeric, net numeric)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    p.method,
    COALESCE(SUM(p.amount) FILTER (WHERE p.amount > 0), 0)::numeric,
    COALESCE(ABS(SUM(p.amount) FILTER (WHERE p.amount < 0)), 0)::numeric,
    COALESCE(SUM(p.amount), 0)::numeric
  FROM public.payments p
  JOIN public.invoices i ON i.id = p.invoice_id
  WHERE (_from IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date >= _from)
    AND (_to IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date <= _to)
    AND (_branch IS NULL OR i.branch_id = _branch)
  GROUP BY 1
  ORDER BY 4 DESC;
$$;

-- Outstanding: invoice-level receivable (billed minus settled), excludes legacy rows
CREATE OR REPLACE FUNCTION public.receivables_summary(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _branch uuid DEFAULT NULL
)
RETURNS TABLE(billed numeric, settled numeric, outstanding numeric, invoices bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    COALESCE(SUM(i.total), 0)::numeric,
    COALESCE(SUM(i.paid_amount), 0)::numeric,
    COALESCE(SUM(GREATEST(i.total - i.paid_amount, 0)), 0)::numeric,
    COUNT(*)::bigint
  FROM public.invoices i
  WHERE i.is_legacy = false
    AND (_from IS NULL OR (i.created_at AT TIME ZONE 'UTC')::date >= _from)
    AND (_to IS NULL OR (i.created_at AT TIME ZONE 'UTC')::date <= _to)
    AND (_branch IS NULL OR i.branch_id = _branch);
$$;

CREATE OR REPLACE FUNCTION public.revenue_by_stream(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _branch uuid DEFAULT NULL
)
RETURNS TABLE(invoice_type text, billed numeric, collected numeric, invoices bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    i.invoice_type,
    COALESCE(SUM(i.total), 0)::numeric,
    COALESCE(SUM(pay.net), 0)::numeric,
    COUNT(*)::bigint
  FROM public.invoices i
  LEFT JOIN LATERAL (
    SELECT COALESCE(SUM(p.amount), 0) AS net
    FROM public.payments p
    WHERE p.invoice_id = i.id
      AND (_from IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date >= _from)
      AND (_to IS NULL OR (p.paid_at AT TIME ZONE 'UTC')::date <= _to)
  ) pay ON true
  WHERE i.is_legacy = false
    AND (_branch IS NULL OR i.branch_id = _branch)
    AND (
      (_from IS NULL OR (i.created_at AT TIME ZONE 'UTC')::date >= _from)
      AND (_to IS NULL OR (i.created_at AT TIME ZONE 'UTC')::date <= _to)
    )
  GROUP BY 1
  ORDER BY 2 DESC;
$$;

CREATE OR REPLACE FUNCTION public.expense_total(
  _from date DEFAULT NULL,
  _to date DEFAULT NULL,
  _branch uuid DEFAULT NULL
)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(e.amount), 0)::numeric
  FROM public.expenses e
  WHERE (_from IS NULL OR e.expense_date >= _from)
    AND (_to IS NULL OR e.expense_date <= _to)
    AND (_branch IS NULL OR e.branch_id = _branch);
$$;

CREATE INDEX IF NOT EXISTS payments_paid_at_idx ON public.payments (paid_at);
CREATE INDEX IF NOT EXISTS payments_invoice_id_idx ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS invoices_branch_created_idx ON public.invoices (branch_id, created_at);

GRANT EXECUTE ON FUNCTION public.collection_totals(date, date, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collection_by_day(date, date, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collection_by_method(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.receivables_summary(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revenue_by_stream(date, date, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expense_total(date, date, uuid) TO authenticated;