import { useCallback, useEffect, useState } from 'react';
import { getVolcanoes } from '../services/volcanoService';

export const useVolcanoes = (filters = {}) => {
  const [volcanoes, setVolcanoes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    country = '',
    type = '',
    search = '',
    page = 1,
    limit = 20,
  } = filters;

  const fetchVolcanoes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getVolcanoes({
        country,
        type,
        search,
        page,
        limit,
      });

      setVolcanoes(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [country, type, search, page, limit]);

  useEffect(() => {
    let active = true;

    getVolcanoes({ country, type, search, page, limit })
      .then((result) => {
        if (!active) return;

        setVolcanoes(result.data);
        setTotal(result.total);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Unable to load volcanoes.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [country, type, search, page, limit]);

  return {
    volcanoes,
    total,
    loading,
    error,
    refresh: fetchVolcanoes,
  };
};