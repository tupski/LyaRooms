-- Migration: Update category name from "Jajan KR" to "Jajan LR"
-- Part of Kakarama to Lya Rooms rebrand
-- Requirements: 5.2, 14.2

-- Update the category name
UPDATE public.pengeluaran_categories 
SET name = 'Jajan LR' 
WHERE name = 'Jajan KR';

-- Verify the update (this will show the updated row if successful)
-- Comment: This SELECT is for verification purposes during manual testing
-- SELECT id, name, is_default, created_at 
-- FROM public.pengeluaran_categories 
-- WHERE name = 'Jajan LR';
