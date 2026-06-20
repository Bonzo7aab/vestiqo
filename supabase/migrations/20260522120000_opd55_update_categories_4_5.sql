-- OPD-55: Aktualizacja podkategorii kategorii 4 i 5
-- See database/59_opd55_update_categories_4_5.sql for full documentation.

DO $$
DECLARE
    instalacje_id UUID;
    old_systemy_id UUID;
    new_niskie_prady_id UUID;
    migrated_jobs INTEGER;
BEGIN
    SELECT id INTO instalacje_id
    FROM job_categories
    WHERE slug = 'instalacje-systemy-techniczne' AND parent_id IS NULL;

    IF instalacje_id IS NULL THEN
        RAISE EXCEPTION 'Main category instalacje-systemy-techniczne not found';
    END IF;

    SELECT id INTO old_systemy_id
    FROM job_categories
    WHERE slug = 'systemy-bezpieczenstwa';

    INSERT INTO job_categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    (
        'Systemy bezpieczeństwa i niskie prądy (CCTV, Domofony, Kontrola dostępu)',
        'systemy-bezpieczenstwa-niskie-prady',
        'CCTV, domofony, kontrola dostępu, instalacje niskoprądowe',
        instalacje_id,
        4,
        TRUE
    ),
    (
        'Systemy i zabezpieczenia PPOŻ',
        'systemy-zabezpieczenia-ppoz',
        'Systemy przeciwpożarowe, zabezpieczenia PPOŻ, monitoring pożarowy',
        instalacje_id,
        5,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;

    SELECT id INTO new_niskie_prady_id
    FROM job_categories
    WHERE slug = 'systemy-bezpieczenstwa-niskie-prady';

    IF old_systemy_id IS NOT NULL AND new_niskie_prady_id IS NOT NULL THEN
        UPDATE jobs
        SET subcategory_id = new_niskie_prady_id
        WHERE subcategory_id = old_systemy_id;

        GET DIAGNOSTICS migrated_jobs = ROW_COUNT;
        RAISE NOTICE 'Migrated % jobs from systemy-bezpieczenstwa to systemy-bezpieczenstwa-niskie-prady', migrated_jobs;
    END IF;

    UPDATE job_categories
    SET is_active = FALSE
    WHERE slug = 'systemy-bezpieczenstwa';
END $$;

DO $$
DECLARE
    przeglady_id UUID;
    old_obowiazkowe_id UUID;
    old_kominiarskie_id UUID;
    old_bram_id UUID;
    new_ogolnobudowlane_id UUID;
    new_kominiarskie_id UUID;
    new_bram_id UUID;
    migrated_jobs INTEGER;
BEGIN
    SELECT id INTO przeglady_id
    FROM job_categories
    WHERE slug = 'przeglady-obsługa-techniczna' AND parent_id IS NULL;

    IF przeglady_id IS NULL THEN
        RAISE EXCEPTION 'Main category przeglady-obsługa-techniczna not found';
    END IF;

    SELECT id INTO old_obowiazkowe_id FROM job_categories WHERE slug = 'obowiazkowe-przeglady-techniczne';
    SELECT id INTO old_kominiarskie_id FROM job_categories WHERE slug = 'inspekcje-kominiarskie-wentylacja';
    SELECT id INTO old_bram_id FROM job_categories WHERE slug = 'serwis-bram-automatyka';

    INSERT INTO job_categories (name, slug, description, parent_id, sort_order, is_active) VALUES
    (
        'Przeglądy ogólnobudowlane i konstrukcyjne (roczne / 5-letnie)',
        'przeglady-ogolnobudowlane-konstrukcyjne',
        'Przeglądy roczne i 5-letnie, konstrukcja budynku, stan techniczny',
        przeglady_id,
        1,
        TRUE
    ),
    (
        'Przeglądy instalacji elektrycznych i piorunochronnych',
        'przeglady-instalacji-elektrycznych-piorunochronnych',
        'Przeglądy instalacji elektrycznych, uziemienia i piorunochronów',
        przeglady_id,
        2,
        TRUE
    ),
    (
        'Inspekcje kominiarskie i drożność wentylacji',
        'inspekcje-kominiarskie-droznosc-wentylacji',
        'Kontrola kominów, drożność przewodów wentylacyjnych',
        przeglady_id,
        3,
        TRUE
    ),
    (
        'Przeglądy instalacji gazowych (szczelność)',
        'przeglady-instalacji-gazowych-szczelnosc',
        'Przeglądy szczelności instalacji gazowych, certyfikaty',
        przeglady_id,
        4,
        TRUE
    ),
    (
        'Serwis bram wjazdowych, szlabanów i automatyki',
        'serwis-bram-szlabanow-automatyki',
        'Naprawa i konserwacja bram wjazdowych, szlabanów, automatyki',
        przeglady_id,
        5,
        TRUE
    )
    ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_id = EXCLUDED.parent_id,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;

    SELECT id INTO new_ogolnobudowlane_id FROM job_categories WHERE slug = 'przeglady-ogolnobudowlane-konstrukcyjne';
    SELECT id INTO new_kominiarskie_id FROM job_categories WHERE slug = 'inspekcje-kominiarskie-droznosc-wentylacji';
    SELECT id INTO new_bram_id FROM job_categories WHERE slug = 'serwis-bram-szlabanow-automatyki';

    IF old_obowiazkowe_id IS NOT NULL AND new_ogolnobudowlane_id IS NOT NULL THEN
        UPDATE jobs SET subcategory_id = new_ogolnobudowlane_id WHERE subcategory_id = old_obowiazkowe_id;
        GET DIAGNOSTICS migrated_jobs = ROW_COUNT;
        RAISE NOTICE 'Migrated % jobs from obowiazkowe-przeglady-techniczne', migrated_jobs;
    END IF;

    IF old_kominiarskie_id IS NOT NULL AND new_kominiarskie_id IS NOT NULL THEN
        UPDATE jobs SET subcategory_id = new_kominiarskie_id WHERE subcategory_id = old_kominiarskie_id;
        GET DIAGNOSTICS migrated_jobs = ROW_COUNT;
        RAISE NOTICE 'Migrated % jobs from inspekcje-kominiarskie-wentylacja', migrated_jobs;
    END IF;

    IF old_bram_id IS NOT NULL AND new_bram_id IS NOT NULL THEN
        UPDATE jobs SET subcategory_id = new_bram_id WHERE subcategory_id = old_bram_id;
        GET DIAGNOSTICS migrated_jobs = ROW_COUNT;
        RAISE NOTICE 'Migrated % jobs from serwis-bram-automatyka', migrated_jobs;
    END IF;

    UPDATE job_categories SET is_active = FALSE
    WHERE slug IN (
        'obowiazkowe-przeglady-techniczne',
        'inspekcje-kominiarskie-wentylacja',
        'serwis-bram-automatyka'
    );
END $$;
