import { loadVolcanoCSV } from './csvDataSource';

let volcanoCache = null;

const getAllVolcanoes = async () => {
  if (!volcanoCache) {
    volcanoCache = await loadVolcanoCSV();
  }

  return volcanoCache;
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

  const filtered = volcanoes.filter((volcano) => {
    const matchesCountry =
      !country || volcano.country === country;

    const matchesType =
      !type || volcano.type === type;

    const searchTerm = search.toLowerCase().trim();

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

  return volcanoes.find((volcano) => volcano.id === String(id)) || null;
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

  const validElevations = volcanoes.filter(
    (v) => v.elevation !== null
  );

  const elevations = validElevations.map((v) => v.elevation);

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
          elevations.length
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
      volcano.longitude !== null
  );
};
