import { request } from './apiClient';

const API_PAGE_SIZE = 100;

let volcanoCache = null;

const toNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const normalizeVolcano = (item) => ({
  id: String(item.Volcano_Number ?? ''),
  name: item.Volcano_Name || 'Unknown volcano',
  country: item.Country || 'Unknown',
  region: item.Region || 'Unknown',
  latitude: toNumber(item.Latitude),
  longitude: toNumber(item.Longitude),
  elevation: toNumber(item.Elevation),
  lastEruptionYear:
    item.Last_Eruption_Year !== null &&
    item.Last_Eruption_Year !== undefined
      ? String(item.Last_Eruption_Year)
      : null,
  type: item.Primary_Volcano_Type || 'Unknown',
  tectonicSetting: item.Tectonic_Setting || 'Unknown',
  evidenceCategory: item.Evidence_Category || 'Unknown',
  rockType: item.Major_Rock_Type || 'Unknown',
  raw: item,
});

const loadAllVolcanoes = async () => {
  const volcanoes = [];
  let nextToken = null;

  do {
    const params = new URLSearchParams({
      limit: String(API_PAGE_SIZE),
    });

    if (nextToken) {
      params.set('next_token', nextToken);
    }

    const response = await request(`/items?${params.toString()}`);

    if (!Array.isArray(response?.data)) {
      throw new Error('La API devolvió una respuesta de datos inválida.');
    }

    volcanoes.push(...response.data.map(normalizeVolcano));

    nextToken = response.page?.next_token ?? null;
  } while (nextToken);

  return volcanoes;
};

const getAllVolcanoes = async () => {
  if (!volcanoCache) {
    volcanoCache = loadAllVolcanoes().catch((error) => {
      volcanoCache = null;
      throw error;
    });
  }

  return volcanoCache;
};

export const clearVolcanoCache = () => {
  volcanoCache = null;
};

export const getVolcanoes = async (filters = {}) => {
  const volcanoes = await getAllVolcanoes();

  const {
    country = '',
    type = '',
    search = '',
    page = 1,
    limit = 20,
  } = filters;

  const searchTerm = search.toLowerCase().trim();

  const filtered = volcanoes.filter((volcano) => {
    const matchesCountry =
      !country || volcano.country === country;

    const matchesType =
      !type || volcano.type === type;

    const matchesSearch =
      !searchTerm ||
      volcano.name.toLowerCase().includes(searchTerm) ||
      volcano.id.toLowerCase().includes(searchTerm);

    return matchesCountry && matchesType && matchesSearch;
  });

  const start = (page - 1) * limit;

  return {
    data: filtered.slice(start, start + limit),
    total: filtered.length,
    page,
    limit,
    totalPages: Math.ceil(filtered.length / limit),
  };
};

export const getVolcanoById = async (id) => {
  const volcanoes = await getAllVolcanoes();

  return volcanoes.find(
    (volcano) => volcano.id === String(id),
  ) || null;
};

export const getFilterOptions = async () => {
  const volcanoes = await getAllVolcanoes();

  return {
    countries: [...new Set(volcanoes.map((v) => v.country))]
      .filter((value) => value !== 'Unknown')
      .sort(),

    types: [...new Set(volcanoes.map((v) => v.type))]
      .filter((value) => value !== 'Unknown')
      .sort(),
  };
};

export const getStatistics = async () => {
  const volcanoes = await getAllVolcanoes();

  const countries = new Set(volcanoes.map((v) => v.country));
  const regions = new Set(volcanoes.map((v) => v.region));

  const elevations = volcanoes
    .filter((v) => v.elevation !== null)
    .map((v) => v.elevation);

  const countryCounts = {};
  const typeCounts = {};

  volcanoes.forEach((volcano) => {
    countryCounts[volcano.country] =
      (countryCounts[volcano.country] || 0) + 1;

    typeCounts[volcano.type] =
      (typeCounts[volcano.type] || 0) + 1;
  });

  return {
    totalVolcanoes: volcanoes.length,
    totalCountries: countries.size,
    totalRegions: regions.size,

    averageElevation: elevations.length
      ? Math.round(
          elevations.reduce((sum, value) => sum + value, 0) /
            elevations.length,
        )
      : null,

    countries: Object.entries(countryCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),

    types: Object.entries(typeCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
};

export const getAllVolcanoesForMap = async () => {
  const volcanoes = await getAllVolcanoes();

  return volcanoes.filter(
    (volcano) =>
      volcano.latitude !== null &&
      volcano.longitude !== null,
  );
};
