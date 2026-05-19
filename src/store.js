import { create } from 'zustand';
import { api } from './api.js';

export const useRmsStore = create((set, get) => ({
  dashboard: null,
  resources: [],
  programs: [],
  periods: [],
  config: null,
  previewRows: [],
  loading: true,
  error: '',
  notice: '',
  snapshots: [],

  load: async ({ silent = false } = {}) => {
    set((state) => ({ loading: silent ? state.loading : true, error: '' }));
    try {
      const [dashboard, resources, programs, periods, config, previewRows, snapshots] = await Promise.all([
        api.dashboard(),
        api.resources(),
        api.programs(),
        api.planningPeriods(),
        api.config(),
        api.preview(),
        api.listSnapshots(),
      ]);
      set({ dashboard, resources, programs, periods, config, previewRows, snapshots, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  setNotice: (notice) => set({ notice }),
  clearError: () => set({ error: '' }),
  clearNotice: () => set({ notice: '' }),

  runAction: async (action, { notice } = {}) => {
    try {
      const result = await action();
      if (notice) set({ notice, error: '' });
      return result;
    } catch (error) {
      set({ error: error.message || 'Something went wrong.' });
      throw error;
    }
  },

  updateConfig: async (body) => {
    await get().runAction(() => api.updateConfig(body));
    await get().load({ silent: true });
  },

  createAllocation: async (body) => {
    await get().runAction(() => api.createAllocation(body));
    await get().load({ silent: true });
  },

  updateAllocation: async (id, body) => {
    await get().runAction(() => api.updateAllocation(id, body));
    await get().load({ silent: true });
  },

  deleteAllocation: async (id) => {
    await get().runAction(() => api.deleteAllocation(id));
    await get().load({ silent: true });
  },

  createResource: async (body) => {
    await get().runAction(() => api.createResource(body));
    await get().load({ silent: true });
  },

  createProgram: async (body) => {
    await get().runAction(() => api.createProgram(body));
    await get().load({ silent: true });
  },

  importResources: async (file) => {
    const result = await get().runAction(() => api.importResources(file));
    set({ notice: `${result.imported} resources imported or updated.` });
    await get().load({ silent: true });
  },

  importPrograms: async (file) => {
    const result = await get().runAction(() => api.importPrograms(file));
    set({ notice: `${result.imported} programs imported or updated.` });
    await get().load({ silent: true });
  },

  importFile: async (file) => {
    const previewRows = await get().runAction(() => api.importCsv(file));
    set({ previewRows, notice: `${previewRows.length} imported rows ready for review.` });
  },

  commitImport: async () => {
    const allocations = await get().runAction(() => api.commitImport());
    set({ previewRows: [], notice: `${allocations.length} preview row(s) moved to allocation.` });
    await get().load({ silent: true });
  },

  clearCurrentPlanning: async () => {
    await get().runAction(() => api.clearCurrentPlanning(), { notice: 'Current planning cleared.' });
    await get().load({ silent: true });
  },

  saveSnapshot: async () => {
    const result = await get().runAction(() => api.saveSnapshot());
    set({ notice: `${result.key.replace('snapshot_', '').replace('_', ' ')} snapshot ${result.updated ? 'updated' : 'saved'}.` });
    await get().load({ silent: true });
  },

  loadSnapshot: async (key) => {
    await get().runAction(() => api.loadSnapshot(key), { notice: `${key.replace('snapshot_', '').replace('_', ' ')} snapshot loaded.` });
    await get().load({ silent: true });
  },
}));
