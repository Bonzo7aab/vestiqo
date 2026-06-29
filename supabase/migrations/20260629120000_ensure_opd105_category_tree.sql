-- Ensure OPD-105 category tree exists (idempotent).
-- Fixes environments that still have legacy sample-data categories active.

UPDATE job_categories
SET is_active = FALSE
WHERE parent_id IS NULL
  AND slug NOT IN (
    'roboty-budowlane-remonty',
    'sprzatanie-utrzymanie-czystosci',
    'zielen-tereny-zewnetrzne',
    'instalacje-systemy-techniczne',
    'przeglady-obsługa-techniczna',
    'ekspertyzy-projekty'
  );

INSERT INTO job_categories (name, slug, description, icon, sort_order, is_active) VALUES
('Budowlanka', 'roboty-budowlane-remonty', 'Remonty dachów, termomodernizacja, renowacja, wymiana stolarki', 'hammer', 1, TRUE),
('Sprzątanie', 'sprzatanie-utrzymanie-czystosci', 'Sprzątanie nieruchomości, mycie okien, DDD', 'sparkles', 2, TRUE),
('Zieleń i Otoczenie', 'zielen-tereny-zewnetrzne', 'Pielęgnacja zieleni, brukarstwo, mała architektura, odśnieżanie', 'tree-pine', 3, TRUE),
('Instalacje', 'instalacje-systemy-techniczne', 'Instalacje wodno-kanalizacyjne, elektryczne, systemy bezpieczeństwa', 'zap', 4, TRUE),
('Przeglądy i Serwis', 'przeglady-obsługa-techniczna', 'Przeglądy techniczne, inspekcje, serwis urządzeń', 'clipboard-check', 5, TRUE),
('Inżynieria', 'ekspertyzy-projekty', 'Audyty energetyczne, projekty budowlane, nadzór inwestorski', 'file-text', 6, TRUE)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  parent_id = NULL;

DO $$
DECLARE
    roboty_id UUID;
    sprzatanie_id UUID;
    zielen_id UUID;
    instalacje_id UUID;
    przeglady_id UUID;
    ekspertyzy_id UUID;
BEGIN
    SELECT id INTO roboty_id FROM job_categories WHERE slug = 'roboty-budowlane-remonty' AND parent_id IS NULL;
    SELECT id INTO sprzatanie_id FROM job_categories WHERE slug = 'sprzatanie-utrzymanie-czystosci' AND parent_id IS NULL;
    SELECT id INTO zielen_id FROM job_categories WHERE slug = 'zielen-tereny-zewnetrzne' AND parent_id IS NULL;
    SELECT id INTO instalacje_id FROM job_categories WHERE slug = 'instalacje-systemy-techniczne' AND parent_id IS NULL;
    SELECT id INTO przeglady_id FROM job_categories WHERE slug = 'przeglady-obsługa-techniczna' AND parent_id IS NULL;
    SELECT id INTO ekspertyzy_id FROM job_categories WHERE slug = 'ekspertyzy-projekty' AND parent_id IS NULL;

    INSERT INTO job_categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    ('Dachy i izolacje', 'remonty-dachow-izolacje', 'Naprawa i wymiana pokryć dachowych, izolacje termiczne i przeciwwilgociowe', roboty_id, 1, TRUE),
    ('Elewacje i docieplenia', 'termomodernizacja-elewacje', 'Ocieplanie budynków, modernizacja elewacji, wymiana systemów grzewczych', roboty_id, 2, TRUE),
    ('Remonty klatek', 'renowacja-klatek-schodowych', 'Remonty części wspólnych, malowanie, wymiana posadzek', roboty_id, 3, TRUE),
    ('Okna i drzwi', 'wymiana-stolarki', 'Wymiana okien, drzwi, modernizacja stolarki', roboty_id, 4, TRUE),

    ('Stałe sprzątanie', 'biezace-sprzatanie', 'Sprzątanie części wspólnych, klatek schodowych, korytarzy', sprzatanie_id, 1, TRUE),
    ('Hale i parkingi', 'sprzatanie-garazy-parkingi', 'Czyszczenie hal garażowych, parkingów, miejsc postojowych', sprzatanie_id, 2, TRUE),
    ('Mycie okien / Alpinizm', 'mycie-okien-przeszklen', 'Mycie okien, fasad, przeszkleń (w tym alpinistyczne)', sprzatanie_id, 3, TRUE),
    ('Sprzątanie pobudowlane', 'sprzatanie-poremontowe', 'Sprzątanie po remontach i pracach budowlanych', sprzatanie_id, 4, TRUE),
    ('Dezynfekcja i DDD', 'dezynsekcja-deratyzacja-ddd', 'Usługi dezynfekcji, dezynsekcji, deratyzacji', sprzatanie_id, 5, TRUE),

    ('Trawniki i roślinność', 'pielegnacja-roslinnosci', 'Koszenie trawy, przycinanie krzewów, pielęgnacja roślin', zielen_id, 1, TRUE),
    ('Brukarstwo i drogi', 'brukarstwo-naprawy-drog', 'Naprawa i układanie kostki brukowej, remonty dróg osiedlowych', zielen_id, 2, TRUE),
    ('Place zabaw i ławki', 'mala-architektura-place-zabaw', 'Budowa i konserwacja placów zabaw, małej architektury', zielen_id, 3, TRUE),
    ('Odśnieżanie', 'odsniezanie-utrzymanie-zimowe', 'Odśnieżanie, posypywanie, utrzymanie terenów zimą', zielen_id, 4, TRUE),

    ('Hydraulika i C.O.', 'instalacje-wodno-kanalizacyjne-co', 'Instalacje wodne, kanalizacyjne, centralne ogrzewanie', instalacje_id, 1, TRUE),
    ('Elektryka i oświetlenie', 'instalacje-elektryczne-oswietlenie', 'Instalacje elektryczne, oświetlenie części wspólnych', instalacje_id, 2, TRUE),
    ('CCTV, domofony, PPOŻ', 'cctv-domofony-ppoz', 'CCTV, domofony, kontrola dostępu, systemy PPOŻ', instalacje_id, 3, TRUE),

    ('Przeglądy budowlane', 'przeglady-ogolnobudowlane-konstrukcyjne', 'Przeglądy roczne i 5-letnie, konstrukcja budynku, stan techniczny', przeglady_id, 1, TRUE),
    ('Kominiarz i wentylacja', 'inspekcje-kominiarskie-droznosc-wentylacji', 'Kontrola kominów, drożność przewodów wentylacyjnych', przeglady_id, 2, TRUE),
    ('Bramy i automatyka', 'serwis-bram-szlabanow-automatyki', 'Naprawa i konserwacja bram wjazdowych, szlabanów, automatyki', przeglady_id, 3, TRUE),

    ('Audyty i ESG', 'audyty-energetyczne-esg', 'Audyty energetyczne, certyfikaty ESG, dokumentacja do dotacji', ekspertyzy_id, 1, TRUE),
    ('Projekty i ekspertyzy', 'projekty-budowlane-inzynierskie', 'Projekty architektoniczne, konstrukcyjne, inżynierskie', ekspertyzy_id, 2, TRUE),
    ('Nadzór i kosztorysy', 'nadzor-inwestorski-kosztorysowanie', 'Nadzór budowlany, kosztorysy, zarządzanie projektami', ekspertyzy_id, 3, TRUE)
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      parent_id = EXCLUDED.parent_id,
      sort_order = EXCLUDED.sort_order,
      is_active = TRUE;
END $$;

UPDATE job_categories
SET is_active = FALSE
WHERE parent_id IS NOT NULL
  AND slug NOT IN (
    'remonty-dachow-izolacje',
    'termomodernizacja-elewacje',
    'renowacja-klatek-schodowych',
    'wymiana-stolarki',
    'biezace-sprzatanie',
    'sprzatanie-garazy-parkingi',
    'mycie-okien-przeszklen',
    'sprzatanie-poremontowe',
    'dezynsekcja-deratyzacja-ddd',
    'pielegnacja-roslinnosci',
    'brukarstwo-naprawy-drog',
    'mala-architektura-place-zabaw',
    'odsniezanie-utrzymanie-zimowe',
    'instalacje-wodno-kanalizacyjne-co',
    'instalacje-elektryczne-oswietlenie',
    'cctv-domofony-ppoz',
    'przeglady-ogolnobudowlane-konstrukcyjne',
    'inspekcje-kominiarskie-droznosc-wentylacji',
    'serwis-bram-szlabanow-automatyki',
    'audyty-energetyczne-esg',
    'projekty-budowlane-inzynierskie',
    'nadzor-inwestorski-kosztorysowanie'
  );
