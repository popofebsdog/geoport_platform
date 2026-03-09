-- Migration 039: Convert absolute storage_path values to relative paths
-- Affects: data_files records uploaded via temporalDataController or temporalDataEnhancedController
-- Old format: /Users/lanyanlin/Desktop/geoport/backend/uploads/temporal/filename.csv
-- New format: uploads/temporal/filename.csv
--
-- The regex strips everything up to and including "backend/" so this works even
-- if the project root ever moves, as long as the path contains "backend/uploads".

UPDATE data_files
SET storage_path = regexp_replace(storage_path, '^.+/backend/', '')
WHERE storage_path LIKE '/Users/%/backend/uploads/%'
  AND storage_path NOT LIKE 'uploads/%';

-- Also fix any other absolute paths pointing to the project's backend/ dir
-- (catches cases where cwd differed at upload time)
UPDATE data_files
SET storage_path = regexp_replace(storage_path, '^.+/backend/', '')
WHERE storage_path ~ '^/.+/backend/uploads/'
  AND storage_path NOT LIKE 'uploads/%';
