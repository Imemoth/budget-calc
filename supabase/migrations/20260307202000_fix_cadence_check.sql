-- Cadence CHECK constraint bővítése: monthly mellett quarterly és yearly is engedélyezett
ALTER TABLE recurring_items DROP CONSTRAINT IF EXISTS recurring_items_cadence_check;
ALTER TABLE recurring_items ADD CONSTRAINT recurring_items_cadence_check
  CHECK (cadence IN ('monthly', 'quarterly', 'yearly'));
