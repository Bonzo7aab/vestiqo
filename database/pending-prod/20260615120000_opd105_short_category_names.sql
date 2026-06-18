-- OPD-105: Skrócone nazwy kategorii i podkategorii
-- https://sadurski.atlassian.net/browse/OPD-105

-- =============================================
-- 1. Budowlanka
-- =============================================
UPDATE job_categories SET name = 'Budowlanka'
WHERE slug = 'roboty-budowlane-remonty' AND parent_id IS NULL;

UPDATE job_categories SET name = 'Dachy i izolacje'
WHERE slug = 'remonty-dachow-izolacje';

UPDATE job_categories SET name = 'Elewacje i docieplenia'
WHERE slug = 'termomodernizacja-elewacje';

UPDATE job_categories SET name = 'Remonty klatek'
WHERE slug = 'renowacja-klatek-schodowych';

UPDATE job_categories SET name = 'Okna i drzwi'
WHERE slug = 'wymiana-stolarki';

-- =============================================
-- 2. Sprzątanie
-- =============================================
UPDATE job_categories SET name = 'Sprzątanie'
WHERE slug = 'sprzatanie-utrzymanie-czystosci' AND parent_id IS NULL;

UPDATE job_categories SET name = 'Stałe sprzątanie'
WHERE slug = 'biezace-sprzatanie';

UPDATE job_categories SET name = 'Hale i parkingi'
WHERE slug = 'sprzatanie-garazy-parkingi';

UPDATE job_categories SET name = 'Mycie okien / Alpinizm'
WHERE slug = 'mycie-okien-przeszklen';

UPDATE job_categories SET name = 'Sprzątanie pobudowlane'
WHERE slug = 'sprzatanie-poremontowe';

UPDATE job_categories SET name = 'Dezynfekcja i DDD'
WHERE slug = 'dezynsekcja-deratyzacja-ddd';

-- =============================================
-- 3. Zieleń i Otoczenie
-- =============================================
UPDATE job_categories SET name = 'Zieleń i Otoczenie'
WHERE slug = 'zielen-tereny-zewnetrzne' AND parent_id IS NULL;

UPDATE job_categories SET name = 'Trawniki i roślinność'
WHERE slug = 'pielegnacja-roslinnosci';

UPDATE job_categories SET name = 'Brukarstwo i drogi'
WHERE slug = 'brukarstwo-naprawy-drog';

UPDATE job_categories SET name = 'Place zabaw i ławki'
WHERE slug = 'mala-architektura-place-zabaw';

UPDATE job_categories SET name = 'Odśnieżanie'
WHERE slug = 'odsniezanie-utrzymanie-zimowe';

-- =============================================
-- 4. Instalacje (3 podkategorie)
-- =============================================
UPDATE job_categories SET name = 'Instalacje'
WHERE slug = 'instalacje-systemy-techniczne' AND parent_id IS NULL;

UPDATE job_categories SET name = 'Hydraulika i C.O.'
WHERE slug = 'instalacje-wodno-kanalizacyjne-co';

UPDATE job_categories SET name = 'Elektryka i oświetlenie'
WHERE slug = 'instalacje-elektryczne-oswietlenie';

DO $$
DECLARE
    instalacje_id UUID;
    merged_id UUID;
    old_niskie_id UUID;
    old_ppoz_id UUID;
    migrated_jobs INTEGER;
BEGIN
    SELECT id INTO instalacje_id
    FROM job_categories
    WHERE slug = 'instalacje-systemy-techniczne' AND parent_id IS NULL;

    IF instalacje_id IS NULL THEN
        RAISE EXCEPTION 'Main category instalacje-systemy-techniczne not found';
    END IF;

    INSERT INTO job_categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    (
        'CCTV, domofony, PPOŻ',
        'cctv-domofony-ppoz',
        'CCTV, domofony, kontrola dostępu, systemy PPOŻ',
        instalacje_id,
        3,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;

    SELECT id INTO merged_id FROM job_categories WHERE slug = 'cctv-domofony-ppoz';
    SELECT id INTO old_niskie_id FROM job_categories WHERE slug = 'systemy-bezpieczenstwa-niskie-prady';
    SELECT id INTO old_ppoz_id FROM job_categories WHERE slug = 'systemy-zabezpieczenia-ppoz';

    IF merged_id IS NOT NULL AND old_niskie_id IS NOT NULL THEN
        UPDATE jobs SET subcategory_id = merged_id WHERE subcategory_id = old_niskie_id;
        UPDATE contests SET subcategory_id = merged_id WHERE subcategory_id = old_niskie_id;
        GET DIAGNOSTICS migrated_jobs = ROW_COUNT;
        RAISE NOTICE 'Migrated % rows from systemy-bezpieczenstwa-niskie-prady', migrated_jobs;
    END IF;

    IF merged_id IS NOT NULL AND old_ppoz_id IS NOT NULL THEN
        UPDATE jobs SET subcategory_id = merged_id WHERE subcategory_id = old_ppoz_id;
        UPDATE contests SET subcategory_id = merged_id WHERE subcategory_id = old_ppoz_id;
        GET DIAGNOSTICS migrated_jobs = ROW_COUNT;
        RAISE NOTICE 'Migrated % rows from systemy-zabezpieczenia-ppoz', migrated_jobs;
    END IF;

    UPDATE job_categories SET is_active = FALSE
    WHERE slug IN (
        'systemy-bezpieczenstwa-niskie-prady',
        'systemy-zabezpieczenia-ppoz',
        'serwis-modernizacja-wind'
    );
END $$;

-- =============================================
-- 5. Przeglądy i Serwis (3 podkategorie)
-- =============================================
UPDATE job_categories SET name = 'Przeglądy i Serwis'
WHERE slug = 'przeglady-obsługa-techniczna' AND parent_id IS NULL;

UPDATE job_categories SET name = 'Przeglądy budowlane'
WHERE slug = 'przeglady-ogolnobudowlane-konstrukcyjne';

UPDATE job_categories SET name = 'Kominiarz i wentylacja'
WHERE slug = 'inspekcje-kominiarskie-droznosc-wentylacji';

UPDATE job_categories SET name = 'Bramy i automatyka'
WHERE slug = 'serwis-bram-szlabanow-automatyki';

UPDATE job_categories SET is_active = FALSE
WHERE slug IN (
    'przeglady-instalacji-elektrycznych-piorunochronnych',
    'przeglady-instalacji-gazowych-szczelnosc'
);

-- =============================================
-- 6. Inżynieria
-- =============================================
UPDATE job_categories SET name = 'Inżynieria'
WHERE slug = 'ekspertyzy-projekty' AND parent_id IS NULL;

UPDATE job_categories SET name = 'Audyty i ESG'
WHERE slug = 'audyty-energetyczne-esg';

UPDATE job_categories SET name = 'Projekty i ekspertyzy'
WHERE slug = 'projekty-budowlane-inzynierskie';

UPDATE job_categories SET name = 'Nadzór i kosztorysy'
WHERE slug = 'nadzor-inwestorski-kosztorysowanie';
