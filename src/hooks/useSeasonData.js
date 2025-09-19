/**
 * Custom React Hook for Season-Aware Data Operations
 * Provides data management functions that automatically use the current season context
 */

import { useState, useEffect, useCallback } from 'react';
import { getCurrentSeason, getSeasonStorageKey, SEASONS } from '../utils/seasonManager.js';

// Hook for managing season-aware data
export const useSeasonData = (dataType, defaultValue = []) => {
  const [currentSeason, setCurrentSeason] = useState(getCurrentSeason());
  const [data, setData] = useState(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data for current season
  const loadData = useCallback(async (season = null) => {
    try {
      setLoading(true);
      setError(null);
      
      const activeSeason = season || currentSeason;
      const storageKey = getSeasonStorageKey(dataType, activeSeason);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(Array.isArray(parsed) ? parsed : defaultValue);
      } else {
        setData(defaultValue);
      }
      
      console.log(`Loaded ${dataType} data for season ${activeSeason}:`, stored ? JSON.parse(stored) : defaultValue);
    } catch (error) {
      console.error(`Error loading ${dataType} data:`, error);
      setError(error);
      setData(defaultValue);
    } finally {
      setLoading(false);
    }
  }, [dataType, defaultValue, currentSeason]);

  // Save data for current season
  const saveData = useCallback(async (newData, season = null) => {
    try {
      const activeSeason = season || currentSeason;
      const storageKey = getSeasonStorageKey(dataType, activeSeason);
      
      localStorage.setItem(storageKey, JSON.stringify(newData));
      setData(newData);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent(`${dataType}DataChanged`, {
        detail: { data: newData, season: activeSeason }
      }));
      
      console.log(`Saved ${dataType} data for season ${activeSeason}:`, newData);
      return true;
    } catch (error) {
      console.error(`Error saving ${dataType} data:`, error);
      setError(error);
      return false;
    }
  }, [dataType, currentSeason]);

  // Add item to data array
  const addItem = useCallback(async (item) => {
    const newData = [...data, { ...item, id: Date.now() + Math.random(), created_at: new Date().toISOString() }];
    return await saveData(newData);
  }, [data, saveData]);

  // Update item in data array
  const updateItem = useCallback(async (id, updates) => {
    const newData = data.map(item => 
      item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
    );
    return await saveData(newData);
  }, [data, saveData]);

  // Delete item from data array
  const deleteItem = useCallback(async (id) => {
    const newData = data.filter(item => item.id !== id);
    return await saveData(newData);
  }, [data, saveData]);

  // Listen for season changes and reload data
  useEffect(() => {
    const handleSeasonChange = (event) => {
      const newSeason = event.detail.newSeason;
      setCurrentSeason(newSeason);
      loadData(newSeason);
    };

    window.addEventListener('seasonChanged', handleSeasonChange);
    return () => window.removeEventListener('seasonChanged', handleSeasonChange);
  }, [loadData]);

  // Load data on mount or when season changes
  useEffect(() => {
    loadData();
  }, [loadData, currentSeason]);

  return {
    data,
    loading,
    error,
    currentSeason,
    loadData,
    saveData,
    addItem,
    updateItem,
    deleteItem
  };
};

// Hook for managing season-aware Supabase operations
export const useSeasonSupabase = (table, supabaseClient) => {
  const [currentSeason, setCurrentSeason] = useState(getCurrentSeason());
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modified Supabase operations that fall back to local storage for offline/demo mode
  const select = useCallback(async (query = '*', options = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Try Supabase first
      if (supabaseClient) {
        try {
          let queryBuilder = supabaseClient.from(table).select(query);
          
          if (options.eq) {
            Object.entries(options.eq).forEach(([key, value]) => {
              queryBuilder = queryBuilder.eq(key, value);
            });
          }
          
          if (options.order) {
            queryBuilder = queryBuilder.order(options.order.column, { 
              ascending: options.order.ascending !== false 
            });
          }
          
          const result = await queryBuilder;
          
          if (result.data && !result.error) {
            setData(result.data);
            
            // Also cache to local storage for current season
            const storageKey = getSeasonStorageKey(table, currentSeason);
            localStorage.setItem(storageKey, JSON.stringify(result.data));
            
            return result;
          }
        } catch (supabaseError) {
          console.warn(`Supabase query failed for ${table}, falling back to local storage:`, supabaseError);
        }
      }

      // Fallback to local storage
      const storageKey = getSeasonStorageKey(table, currentSeason);
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        let filteredData = Array.isArray(parsed) ? parsed : [];
        
        // Apply basic filtering
        if (options.eq) {
          Object.entries(options.eq).forEach(([key, value]) => {
            filteredData = filteredData.filter(item => item[key] === value);
          });
        }
        
        if (options.order) {
          filteredData.sort((a, b) => {
            const aVal = a[options.order.column];
            const bVal = b[options.order.column];
            if (options.order.ascending === false) {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }
        
        setData(filteredData);
        return { data: filteredData, error: null };
      }
      
      setData([]);
      return { data: [], error: null };
      
    } catch (error) {
      console.error(`Error in select operation for ${table}:`, error);
      setError(error);
      return { data: [], error };
    } finally {
      setLoading(false);
    }
  }, [table, supabaseClient, currentSeason]);

  const insert = useCallback(async (newData) => {
    try {
      // Try Supabase first
      if (supabaseClient) {
        try {
          const result = await supabaseClient.from(table).insert(newData).select().single();
          if (result.data && !result.error) {
            setData(prev => [...prev, result.data]);
            return result;
          }
        } catch (supabaseError) {
          console.warn(`Supabase insert failed for ${table}, falling back to local storage:`, supabaseError);
        }
      }

      // Fallback to local storage
      const item = { ...newData, id: Date.now() + Math.random(), created_at: new Date().toISOString() };
      const storageKey = getSeasonStorageKey(table, currentSeason);
      const stored = localStorage.getItem(storageKey);
      const currentData = stored ? JSON.parse(stored) : [];
      
      const updatedData = [...currentData, item];
      localStorage.setItem(storageKey, JSON.stringify(updatedData));
      setData(updatedData);
      
      return { data: item, error: null };
      
    } catch (error) {
      console.error(`Error in insert operation for ${table}:`, error);
      return { data: null, error };
    }
  }, [table, supabaseClient, currentSeason]);

  const update = useCallback(async (id, updates) => {
    try {
      // Try Supabase first
      if (supabaseClient) {
        try {
          const result = await supabaseClient.from(table).update(updates).eq('id', id).select().single();
          if (result.data && !result.error) {
            setData(prev => prev.map(item => item.id === id ? result.data : item));
            return result;
          }
        } catch (supabaseError) {
          console.warn(`Supabase update failed for ${table}, falling back to local storage:`, supabaseError);
        }
      }

      // Fallback to local storage
      const storageKey = getSeasonStorageKey(table, currentSeason);
      const stored = localStorage.getItem(storageKey);
      const currentData = stored ? JSON.parse(stored) : [];
      
      const updatedData = currentData.map(item => 
        item.id === id ? { ...item, ...updates, updated_at: new Date().toISOString() } : item
      );
      
      localStorage.setItem(storageKey, JSON.stringify(updatedData));
      setData(updatedData);
      
      const updatedItem = updatedData.find(item => item.id === id);
      return { data: updatedItem, error: null };
      
    } catch (error) {
      console.error(`Error in update operation for ${table}:`, error);
      return { data: null, error };
    }
  }, [table, supabaseClient, currentSeason]);

  const deleteRecord = useCallback(async (id) => {
    try {
      // Try Supabase first
      if (supabaseClient) {
        try {
          const result = await supabaseClient.from(table).delete().eq('id', id);
          if (!result.error) {
            setData(prev => prev.filter(item => item.id !== id));
            return result;
          }
        } catch (supabaseError) {
          console.warn(`Supabase delete failed for ${table}, falling back to local storage:`, supabaseError);
        }
      }

      // Fallback to local storage
      const storageKey = getSeasonStorageKey(table, currentSeason);
      const stored = localStorage.getItem(storageKey);
      const currentData = stored ? JSON.parse(stored) : [];
      
      const updatedData = currentData.filter(item => item.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updatedData));
      setData(updatedData);
      
      return { data: null, error: null };
      
    } catch (error) {
      console.error(`Error in delete operation for ${table}:`, error);
      return { data: null, error };
    }
  }, [table, supabaseClient, currentSeason]);

  // Listen for season changes
  useEffect(() => {
    const handleSeasonChange = (event) => {
      setCurrentSeason(event.detail.newSeason);
    };

    window.addEventListener('seasonChanged', handleSeasonChange);
    return () => window.removeEventListener('seasonChanged', handleSeasonChange);
  }, []);

  // Reload data when season changes
  useEffect(() => {
    select();
  }, [currentSeason, select]);

  return {
    data,
    loading,
    error,
    currentSeason,
    select,
    insert,
    update,
    delete: deleteRecord
  };
};

// Hook for season context and utilities
export const useSeason = () => {
  const [currentSeason, setCurrentSeason] = useState(getCurrentSeason());

  useEffect(() => {
    const handleSeasonChange = (event) => {
      setCurrentSeason(event.detail.newSeason);
    };

    window.addEventListener('seasonChanged', handleSeasonChange);
    return () => window.removeEventListener('seasonChanged', handleSeasonChange);
  }, []);

  return {
    currentSeason,
    isLegacy: currentSeason === SEASONS.LEGACY,
    isFC26: currentSeason === SEASONS.FC26
  };
};