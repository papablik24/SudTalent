import { useState, useEffect, useCallback } from 'react';
import { CatalogItem, CatalogType, DEFAULT_CATALOGS } from '../types';

const STORAGE_KEY = 'sud_system_catalogs';

/**
 * Generates seed catalog data with unique IDs and timestamps.
 */
function generateSeedData(): CatalogItem[] {
  const now = new Date().toISOString();
  return DEFAULT_CATALOGS.map((item, i) => ({
    ...item,
    id: `cat_seed_${i}_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Hook for managing system catalogs (CRUD) with localStorage persistence.
 * When the backend is available, it will call the API endpoints.
 * Falls back to localStorage when backend is unreachable.
 */
export function useCatalogData() {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setCatalogs(JSON.parse(stored));
    } else {
      // Seed defaults on first run
      const seed = generateSeedData();
      setCatalogs(seed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    }
    setLoading(false);
  }, []);

  // ── Persist helper ────────────────────────────────────────────────
  const persist = useCallback((items: CatalogItem[]) => {
    setCatalogs(items);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, []);

  // ── Get items by type ─────────────────────────────────────────────
  const getByType = useCallback(
    (type: CatalogType): CatalogItem[] =>
      catalogs.filter(c => c.type === type),
    [catalogs]
  );

  // ── Get active items by type (for use in other modules) ──────────
  const getActiveByType = useCallback(
    (type: CatalogType): string[] =>
      catalogs.filter(c => c.type === type && c.active).map(c => c.name),
    [catalogs]
  );

  // ── Add ───────────────────────────────────────────────────────────
  const addItem = useCallback(
    (type: CatalogType, name: string): { success: boolean; message: string } => {
      const trimmed = name.trim();
      if (!trimmed) return { success: false, message: 'El nombre no puede estar vacío.' };

      // Check for duplicates (case-insensitive within same type)
      const exists = catalogs.some(
        c => c.type === type && c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (exists) return { success: false, message: `"${trimmed}" ya existe en este catálogo.` };

      const now = new Date().toISOString();
      const newItem: CatalogItem = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        name: trimmed,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      persist([...catalogs, newItem]);
      return { success: true, message: `"${trimmed}" agregado exitosamente.` };
    },
    [catalogs, persist]
  );

  // ── Update name ───────────────────────────────────────────────────
  const updateItem = useCallback(
    (id: string, newName: string): { success: boolean; message: string } => {
      const trimmed = newName.trim();
      if (!trimmed) return { success: false, message: 'El nombre no puede estar vacío.' };

      const item = catalogs.find(c => c.id === id);
      if (!item) return { success: false, message: 'Elemento no encontrado.' };

      // Check duplicate (excluding self)
      const duplicate = catalogs.some(
        c => c.id !== id && c.type === item.type && c.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (duplicate) return { success: false, message: `"${trimmed}" ya existe en este catálogo.` };

      persist(
        catalogs.map(c =>
          c.id === id ? { ...c, name: trimmed, updatedAt: new Date().toISOString() } : c
        )
      );
      return { success: true, message: `Actualizado a "${trimmed}".` };
    },
    [catalogs, persist]
  );

  // ── Toggle active ─────────────────────────────────────────────────
  const toggleItem = useCallback(
    (id: string): { success: boolean; message: string } => {
      const item = catalogs.find(c => c.id === id);
      if (!item) return { success: false, message: 'Elemento no encontrado.' };

      persist(
        catalogs.map(c =>
          c.id === id
            ? { ...c, active: !c.active, updatedAt: new Date().toISOString() }
            : c
        )
      );
      return {
        success: true,
        message: `"${item.name}" ${item.active ? 'desactivado' : 'activado'}.`,
      };
    },
    [catalogs, persist]
  );

  // ── Delete ────────────────────────────────────────────────────────
  const deleteItem = useCallback(
    (id: string): { success: boolean; message: string } => {
      const item = catalogs.find(c => c.id === id);
      if (!item) return { success: false, message: 'Elemento no encontrado.' };

      persist(catalogs.filter(c => c.id !== id));
      return { success: true, message: `"${item.name}" eliminado.` };
    },
    [catalogs, persist]
  );

  return {
    catalogs,
    loading,
    getByType,
    getActiveByType,
    addItem,
    updateItem,
    toggleItem,
    deleteItem,
  };
}
