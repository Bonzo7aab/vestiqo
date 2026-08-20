-- OPD-164: Rename Przeglądy category and replace inspection subcategories

-- Parent display name
UPDATE job_categories
SET
  name = 'Przeglądy',
  description = 'Przeglądy techniczne budynku i instalacji',
  is_active = TRUE,
  parent_id = NULL
WHERE slug = 'przeglady-obsługa-techniczna'
  AND parent_id IS NULL;

DO $$
DECLARE
  przeglady_id UUID;
BEGIN
  SELECT id INTO przeglady_id
  FROM job_categories
  WHERE slug = 'przeglady-obsługa-techniczna'
    AND parent_id IS NULL;

  IF przeglady_id IS NULL THEN
    RAISE EXCEPTION 'Parent category przeglady-obsługa-techniczna not found';
  END IF;

  -- Deactivate legacy przeglady subcategories
  UPDATE job_categories
  SET is_active = FALSE
  WHERE parent_id = przeglady_id
    AND slug IN (
      'przeglady-ogolnobudowlane-konstrukcyjne',
      'inspekcje-kominiarskie-droznosc-wentylacji',
      'serwis-bram-szlabanow-automatyki',
      'przeglady-instalacji-elektrycznych-piorunochronnych',
      'przeglady-instalacji-gazowych-szczelnosc'
    );

  INSERT INTO job_categories (name, slug, description, parent_id, sort_order, is_active) VALUES
  (
    'Przegląd gazowy (roczny)',
    'przeglad-gazowy-roczny',
    'Coroczny przegląd instalacji gazowej',
    przeglady_id,
    1,
    TRUE
  ),
  (
    'Przegląd kominiarski i wentylacyjny (roczny)',
    'przeglad-kominiarski-wentylacyjny-roczny',
    'Coroczny przegląd kominiarski i wentylacyjny',
    przeglady_id,
    2,
    TRUE
  ),
  (
    'Przegląd ogólnobudowlany (roczny)',
    'przeglad-ogolnobudowlany-roczny',
    'Coroczny przegląd ogólnobudowlany',
    przeglady_id,
    3,
    TRUE
  ),
  (
    'Przegląd ogólnobudowlany (5-letni)',
    'przeglad-ogolnobudowlany-5-letni',
    'Pięcioletni przegląd ogólnobudowlany',
    przeglady_id,
    4,
    TRUE
  ),
  (
    'Przegląd elektryczny i odgromowy (5-letni)',
    'przeglad-elektryczny-odgromowy-5-letni',
    'Pięcioletni przegląd instalacji elektrycznej i odgromowej',
    przeglady_id,
    5,
    TRUE
  ),
  (
    'Przegląd instalacji Ppoż. i hydrantów (roczny)',
    'przeglad-ppoz-hydrantow-roczny',
    'Coroczny przegląd instalacji przeciwpożarowej i hydrantów',
    przeglady_id,
    6,
    TRUE
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    parent_id = EXCLUDED.parent_id,
    sort_order = EXCLUDED.sort_order,
    is_active = TRUE;
END $$;
