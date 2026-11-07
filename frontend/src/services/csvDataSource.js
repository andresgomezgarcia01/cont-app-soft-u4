import Papa from 'papaparse';

const CSV_URL = '/data/volcanoes.csv';

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeVolcano = (row) => ({
  id: row.Volcano_Number?.trim() || '',
  name: row.Volcano_Name?.trim() || 'Unknown volcano',
  country: row.Country?.trim() || 'Unknown',
  region: row.Region?.trim() || 'Unknown',
  latitude: toNumber(row.Latitude),
  longitude: toNumber(row.Longitude),
  elevation: toNumber(row.Elevation),
  lastEruptionYear: row.Last_Eruption_Year?.trim() || null,
  type: row.Primary_Volcano_Type?.trim() || 'Unknown',
  tectonicSetting: row.Tectonic_Setting?.trim() || 'Unknown',
  evidenceCategory: row.Evidence_Category?.trim() || 'Unknown',
  rockType: row.Major_Rock_Type?.trim() || 'Unknown',
  raw: row,
});

export const loadVolcanoCSV = () =>
  new Promise((resolve, reject) => {
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }

        const volcanoes = results.data
          .map(normalizeVolcano)
          .filter((volcano) => volcano.id);

        resolve(volcanoes);
      },
      error: (error) => reject(error),
    });
  });
