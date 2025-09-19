import { useState, useEffect, useCallback } from 'react';
import { supabaseDb } from '../utils/supabase';
import { ErrorHandler } from '../utils/errorHandling';

export function useSupabaseQuery(table, query = '*', options = {}, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await supabaseDb.select(table, query, options);
      
      // In demo mode, prioritize data over errors
      if (result.data && result.data.length > 0) {
        setData(result.data);
      } else if (result.error) {
        throw result.error;
      } else {
        setData(result.data || []);
      }
    } catch (err) {
      setError(err);
      // Only show error messages for real failures, not demo mode issues
      if (!err.message?.includes('Failed to fetch')) {
        ErrorHandler.handleDatabaseError(err, `Laden von ${table}`);
      }
    } finally {
      setLoading(false);
    }
  }, [table, query, JSON.stringify(options), ...dependencies]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

export function useSupabaseMutation(table) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const insert = useCallback(async (data) => {
    try {
      setLoading(true);
      setError(null);
      const result = await supabaseDb.insert(table, data);
      if (result.error) {
        throw result.error;
      }
      return result;
    } catch (err) {
      setError(err);
      // Log error for debugging but don't show user toast - let the component handle it
      console.error(`Insert operation failed for ${table}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [table]);

  const update = useCallback(async (data, id) => {
    try {
      setLoading(true);
      setError(null);
      const result = await supabaseDb.update(table, data, id);
      if (result.error) {
        throw result.error;
      }
      return result;
    } catch (err) {
      setError(err);
      // Log error for debugging but don't show user toast - let the component handle it
      console.error(`Update operation failed for ${table}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [table]);

  const remove = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const result = await supabaseDb.delete(table, id);
      if (result.error) {
        throw result.error;
      }
      return result;
    } catch (err) {
      setError(err);
      // Log error for debugging but don't show user toast - let the component handle it
      console.error(`Delete operation failed for ${table}:`, err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [table]);

  return { insert, update, remove, loading, error };
}