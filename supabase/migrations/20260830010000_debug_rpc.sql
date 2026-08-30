CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  EXECUTE 'SELECT coalesce(jsonb_agg(t), ''[]''::jsonb) FROM (' || sql || ') t' INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
