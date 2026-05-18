-- Seed data for patients table
-- Run in: carenexus_postgres_ai database

INSERT INTO patients (national_id, full_name, dob, sex, hiv_status, art_regimen, facility_id, created_at)
VALUES
    ('ZW12345678', 'Tendai Mthembu', '1985-03-15', 'M', 'positive', 'TDF/FTC/EFV', 'HARARE_CENTRAL', NOW()),
    ('ZW87654321', 'Amahle Dlamini', '1992-07-22', 'F', 'positive', 'TAF/FTC/DTG', 'BULAWAYO_GENERAL', NOW()),
    ('ZW55555555', 'Blessing Nyamande', '1978-11-08', 'M', 'negative', NULL, 'CHITUNGWIZA_HC', NOW()),
    ('ZW99999999', 'Grace Kamukuyu', '1988-05-19', 'F', 'unknown', NULL, 'GWERU_HOSPITAL', NOW()),
    ('ZW11111111', 'Daniel Khumalo', '1995-09-30', 'M', 'positive', 'AZT/3TC/NVP', 'VICTORIA_FALLS_HC', NOW());
