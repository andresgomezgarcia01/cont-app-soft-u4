import { useEffect, useState } from 'react';
import { getStatistics } from '../services/volcanoService';

export const useStatistics = () => {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const fetchStatistics = async () => {
      try {
        const result = await getStatistics();
        if (active) setStatistics(result);
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to load statistics.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchStatistics();

    return () => {
      active = false;
    };
  }, []);

  return { statistics, loading, error };
};
