-- =============================================
-- DOMIO PLATFORM - MANAGED HOUSING ENTITIES
-- =============================================
-- Wspólnoty mieszkaniowe and spółdzielnie mieszkaniowe managed by property managers

CREATE TABLE managed_housing_entities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('wspólnota', 'spółdzielnia')),
    nip VARCHAR(10) NOT NULL,
    regon VARCHAR(14),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(10),
    bank_account_iban TEXT,
    vat_status TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (manager_company_id, nip)
);

CREATE INDEX idx_managed_housing_entities_manager_company_id ON managed_housing_entities(manager_company_id);
CREATE INDEX idx_managed_housing_entities_nip ON managed_housing_entities(nip);

ALTER TABLE managed_housing_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company managed housing entities" ON managed_housing_entities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can view public managed housing entities" ON managed_housing_entities
    FOR SELECT USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM companies c
            WHERE c.id = managed_housing_entities.manager_company_id
            AND c.is_public = true
        )
    );

CREATE POLICY "Users can insert company managed housing entities" ON managed_housing_entities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );

CREATE POLICY "Users can update company managed housing entities" ON managed_housing_entities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );

CREATE POLICY "Users can delete company managed housing entities" ON managed_housing_entities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_companies
            WHERE company_id = managed_housing_entities.manager_company_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'manager')
            AND is_active = true
        )
    );

CREATE TRIGGER update_managed_housing_entities_updated_at
    BEFORE UPDATE ON managed_housing_entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
