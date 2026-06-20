-- =============================================
-- DOMIO PLATFORM - SAMPLE DATA
-- =============================================

-- =============================================
-- JOB CATEGORIES
-- =============================================

-- Insert main job categories (5 main categories from Domio platform)
INSERT INTO job_categories (name, slug, description, icon, sort_order) VALUES
('Remonty i Budownictwo', 'remonty-budownictwo', 'Remonty mieszkań, budynków, konstrukcje', 'hammer', 1),
('Instalacje Techniczne', 'instalacje-techniczne', 'Elektryka, hydraulika, gaz, klimatyzacja', 'wrench', 2),
('Wykończenia i Dekoracje', 'wykończenia-dekoracje', 'Malowanie, podłogi, tynki, dekoracje', 'paint-brush', 3),
('Usługi Sprzątające', 'usługi-sprzątające', 'Sprzątanie, mycie, utrzymanie czystości', 'broom', 4),
('Zarządzanie Nieruchomościami', 'zarządzanie-nieruchomościami', 'Administracja, zarządzanie, konserwacja', 'building', 5);

-- Get the main category IDs for subcategories
DO $$
DECLARE
    remonty_id UUID;
    instalacje_id UUID;
    wykończenia_id UUID;
    sprzątanie_id UUID;
    zarządzanie_id UUID;
BEGIN
    SELECT id INTO remonty_id FROM job_categories WHERE slug = 'remonty-budownictwo';
    SELECT id INTO instalacje_id FROM job_categories WHERE slug = 'instalacje-techniczne';
    SELECT id INTO wykończenia_id FROM job_categories WHERE slug = 'wykończenia-dekoracje';
    SELECT id INTO sprzątanie_id FROM job_categories WHERE slug = 'usługi-sprzątające';
    SELECT id INTO zarządzanie_id FROM job_categories WHERE slug = 'zarządzanie-nieruchomościami';

    -- Remonty i Budownictwo subcategories
    INSERT INTO job_categories (name, slug, description, parent_id, sort_order) VALUES
    ('Remonty mieszkań', 'remonty-mieszkań', 'Kompleksowe remonty mieszkań i domów', remonty_id, 1),
    ('Remonty łazienek', 'remonty-łazienek', 'Specjalistyczne remonty łazienek i toalet', remonty_id, 2),
    ('Remonty kuchni', 'remonty-kuchni', 'Projekty i realizacja kuchni', remonty_id, 3),
    ('Termomodernizacja', 'termomodernizacja', 'Ocieplanie budynków, wymiana okien', remonty_id, 4),
    ('Konstrukcje', 'konstrukcje', 'Budowa, rozbiórki, konstrukcje żelbetowe', remonty_id, 5);

    -- Instalacje Techniczne subcategories
    INSERT INTO job_categories (name, slug, description, parent_id, sort_order) VALUES
    ('Instalacje elektryczne', 'instalacje-elektryczne', 'Elektryka, automatyka, Smart Home', instalacje_id, 1),
    ('Instalacje hydrauliczne', 'instalacje-hydrauliczne', 'Hydraulika, ogrzewanie, pompy ciepła', instalacje_id, 2),
    ('Instalacje gazowe', 'instalacje-gazowe', 'Gaz, bezpieczeństwo, certyfikaty', instalacje_id, 3),
    ('Klimatyzacja i wentylacja', 'klimatyzacja-wentylacja', 'Klimatyzacja, wentylacja, rekuperacja', instalacje_id, 4),
    ('Fotowoltaika', 'fotowoltaika', 'Instalacje fotowoltaiczne, OZE', instalacje_id, 5);

    -- Wykończenia i Dekoracje subcategories
    INSERT INTO job_categories (name, slug, description, parent_id, sort_order) VALUES
    ('Malowanie', 'malowanie', 'Malowanie ścian, sufitu, dekoracje', wykończenia_id, 1),
    ('Podłogi', 'podłogi', 'Panele, parkiet, płytki, wykładziny', wykończenia_id, 2),
    ('Tynki ozdobne', 'tynki-ozdobne', 'Tynki dekoracyjne, strukturalne', wykończenia_id, 3),
    ('Tapety i okładziny', 'tapety-okładziny', 'Tapety, okładziny ścienne', wykończenia_id, 4),
    ('Dekoracje artystyczne', 'dekoracje-artystyczne', 'Freski, malowidła, sztuka', wykończenia_id, 5);

    -- Usługi Sprzątające subcategories
    INSERT INTO job_categories (name, slug, description, parent_id, sort_order) VALUES
    ('Sprzątanie mieszkań', 'sprzątanie-mieszkań', 'Sprzątanie domów i mieszkań', sprzątanie_id, 1),
    ('Sprzątanie biur', 'sprzątanie-biur', 'Sprzątanie biur i pomieszczeń biurowych', sprzątanie_id, 2),
    ('Sprzątanie budynków', 'sprzątanie-budynków', 'Sprzątanie wspólnych części budynków', sprzątanie_id, 3),
    ('Mycie okien', 'mycie-okien', 'Mycie okien i fasad', sprzątanie_id, 4),
    ('Sprzątanie po remoncie', 'sprzątanie-po-remoncie', 'Sprzątanie po pracach budowlanych', sprzątanie_id, 5);

    -- Zarządzanie Nieruchomościami subcategories
    INSERT INTO job_categories (name, slug, description, parent_id, sort_order) VALUES
    ('Administracja', 'administracja', 'Zarządzanie nieruchomościami', zarządzanie_id, 1),
    ('Konserwacja', 'konserwacja', 'Utrzymanie i konserwacja budynków', zarządzanie_id, 2),
    ('Monitoring', 'monitoring', 'Systemy monitoringu i bezpieczeństwa', zarządzanie_id, 3),
    ('Zarządzanie odpadami', 'zarządzanie-odpadami', 'Segregacja i wywóz odpadów', zarządzanie_id, 4),
    ('Utrzymanie terenów zielonych', 'utrzymanie-terenów-zielonych', 'Pielęgnacja ogrodów i terenów', zarządzanie_id, 5);
END $$;

-- =============================================
-- HELPER FUNCTIONS FOR SAMPLE DATA
-- =============================================

-- Function to create sample companies
CREATE OR REPLACE FUNCTION create_sample_companies()
RETURNS VOID AS $$
BEGIN
    -- Sample property management companies (managers)
    INSERT INTO companies (name, short_name, type, nip, regon, address, city, postal_code, phone, email, website, description, founded_year, employee_count, is_verified, verification_level) VALUES
    ('WSM "Osiedle Parkowe"', 'WSM Parkowe', 'wspólnota', '1234567890', '123456789', 'ul. Parkowa 15, 02-001 Warszawa', 'Warszawa', '02-001', '+48 22 123 45 67', 'kontakt@wsm-parkowe.pl', 'www.wsm-parkowe.pl', 'Nowoczesna wspólnota mieszkaniowa w centrum Warszawy', 2015, '5-10', true, 'verified'),
    
    ('Spółdzielnia Mieszkaniowa "Nowa Huta"', 'SM Nowa Huta', 'spółdzielnia', '2345678901', '234567890', 'al. Róż 1, 31-001 Kraków', 'Kraków', '31-001', '+48 12 234 56 78', 'biuro@sm-nowahuta.pl', 'www.sm-nowahuta.pl', 'Tradycyjna spółdzielnia mieszkaniowa z długoletnią tradycją', 1978, '50-100', true, 'verified'),
    
    ('Zarząd Nieruchomości "Baltic Properties"', 'Baltic Properties', 'property_management', '3456789012', '345678901', 'ul. Długi Targ 1, 80-828 Gdańsk', 'Gdańsk', '80-828', '+48 58 345 67 89', 'info@baltic-properties.pl', 'www.baltic-properties.pl', 'Premium zarządca nieruchomości z certyfikatem RICS', 2015, '10-20', true, 'premium'),
    
    -- Sample contractor companies
    ('RenoBud Sp. z o.o.', 'RenoBud', 'contractor', '4567890123', '456789012', 'ul. Budowlana 10, 02-001 Warszawa', 'Warszawa', '02-001', '+48 22 456 78 90', 'kontakt@renobud.pl', 'www.renobud.pl', 'Kompleksowe remonty mieszkań premium', 2015, '10-20', true, 'verified'),
    
    ('HydroMaster Instalacje', 'HydroMaster', 'contractor', '5678901234', '567890123', 'ul. Techniczna 5, 31-001 Kraków', 'Kraków', '31-001', '+48 12 567 89 01', 'biuro@hydromaster.pl', 'www.hydromaster.pl', 'Specjalistyczne instalacje hydrauliczne i gazowe', 2018, '5-10', true, 'verified'),
    
    ('ElektroProfi Sp. z o.o.', 'ElektroProfi', 'contractor', '6789012345', '678901234', 'ul. Elektryczna 3, 80-828 Gdańsk', 'Gdańsk', '80-828', '+48 58 678 90 12', 'info@elektroprofi.pl', 'www.elektroprofi.pl', 'Nowoczesne instalacje elektryczne i automatyka', 2012, '15-25', true, 'verified');

END;
$$ LANGUAGE plpgsql;

-- Function to create sample certificates
CREATE OR REPLACE FUNCTION create_sample_certificates()
RETURNS VOID AS $$
DECLARE
    company_record RECORD;
BEGIN
    -- Add certificates for each company
    FOR company_record IN SELECT id, name FROM companies WHERE type = 'contractor' LOOP
        -- Company registration certificate
        INSERT INTO certificates (company_id, name, type, number, issuer, issue_date, expiry_date, description, is_verified) VALUES
        (company_record.id, 'Wypis z KRS/CEIDG', 'registration', 'REG-' || substring(company_record.id::text, 1, 8), 'Sąd Rejonowy', '2023-01-01', '2025-01-01', 'Aktualny wypis potwierdzający rejestrację firmy', true),
        (company_record.id, 'Ubezpieczenie OC', 'insurance', 'OC-' || substring(company_record.id::text, 1, 8), 'PZU SA', '2024-01-01', '2025-01-01', 'Polisa ubezpieczenia odpowiedzialności cywilnej', true);
    END LOOP;
    
    -- Add certificates for manager companies
    FOR company_record IN SELECT id, name FROM companies WHERE type IN ('wspólnota', 'spółdzielnia', 'property_management') LOOP
        INSERT INTO certificates (company_id, name, type, number, issuer, issue_date, expiry_date, description, is_verified) VALUES
        (company_record.id, 'Ubezpieczenie OC zarządcy', 'insurance', 'OC-Z-' || substring(company_record.id::text, 1, 8), 'Allianz', '2024-01-01', '2025-01-01', 'Polisa ubezpieczenia odpowiedzialności cywilnej zarządcy', true);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create sample portfolio projects
CREATE OR REPLACE FUNCTION create_sample_portfolio_projects()
RETURNS VOID AS $$
DECLARE
    contractor_company RECORD;
    remonty_category_id UUID;
    instalacje_category_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO remonty_category_id FROM job_categories WHERE slug = 'remonty-budownictwo';
    SELECT id INTO instalacje_category_id FROM job_categories WHERE slug = 'instalacje-techniczne';
    
    -- Add portfolio projects for contractor companies
    FOR contractor_company IN SELECT id, name FROM companies WHERE type = 'contractor' LOOP
        IF contractor_company.name LIKE '%Reno%' THEN
            -- RenoBud portfolio
            INSERT INTO portfolio_projects (company_id, title, description, category_id, location, project_type, budget_range, duration, completion_date, client_name, client_feedback, is_featured) VALUES
            (contractor_company.id, 'Remont mieszkania 120m² w Mokotowie', 'Kompleksowy remont luksusowego mieszkania z najwyższej jakości materiałami', remonty_category_id, 'Warszawa, Mokotów', 'residential', '150,000 - 200,000 zł', '3 miesiące', '2023-11-15', 'Właściciel mieszkania', 'Doskonała jakość wykonania, terminowość i profesjonalizm. Polecam!', true),
            (contractor_company.id, 'Remont łazienki z jacuzzi', 'Projekt i realizacja luksusowej łazienki z jacuzzi i sauną', remonty_category_id, 'Warszawa, Śródmieście', 'residential', '80,000 - 120,000 zł', '6 tygodni', '2023-09-20', 'Właściciel mieszkania', 'Wspaniały efekt końcowy, wszystko zgodnie z projektem.', false);
        ELSIF contractor_company.name LIKE '%Hydro%' THEN
            -- HydroMaster portfolio
            INSERT INTO portfolio_projects (company_id, title, description, category_id, location, project_type, budget_range, duration, completion_date, client_name, client_feedback, is_featured) VALUES
            (contractor_company.id, 'Instalacja pompy ciepła', 'Kompleksowa instalacja pompy ciepła z systemem ogrzewania podłogowego', instalacje_category_id, 'Kraków, Nowa Huta', 'residential', '45,000 - 65,000 zł', '2 tygodnie', '2023-10-10', 'Wspólnota mieszkaniowa', 'Profesjonalne wykonanie, oszczędności na ogrzewaniu widoczne od razu.', true);
        ELSIF contractor_company.name LIKE '%Elektro%' THEN
            -- ElektroProfi portfolio
            INSERT INTO portfolio_projects (company_id, title, description, category_id, location, project_type, budget_range, duration, completion_date, client_name, client_feedback, is_featured) VALUES
            (contractor_company.id, 'System Smart Home', 'Kompleksowa automatyka domowa KNX z kontrolą oświetlenia, ogrzewania i bezpieczeństwa', instalacje_category_id, 'Gdańsk, Oliwa', 'residential', '25,000 - 35,000 zł', '1 tydzień', '2023-12-05', 'Właściciel domu', 'Nowoczesne rozwiązania, łatwa obsługa, wszystko działa bez zarzutu.', true);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute sample data creation functions
SELECT create_sample_companies();
SELECT create_sample_certificates();
SELECT create_sample_portfolio_projects();

-- =============================================
-- CLEANUP FUNCTIONS
-- =============================================

-- Drop helper functions after use
DROP FUNCTION IF EXISTS create_sample_companies();
DROP FUNCTION IF EXISTS create_sample_certificates();
DROP FUNCTION IF EXISTS create_sample_portfolio_projects();

-- =============================================
-- ADDITIONAL SAMPLE DATA
-- =============================================

-- Note: Sample questions require user profiles to exist first
-- They can be added after user registration in the application

-- Note: user_feedback and support_tickets tables removed 2026-06-11 (supabase/migrations/20260611140000_drop_unused_schema.sql)
