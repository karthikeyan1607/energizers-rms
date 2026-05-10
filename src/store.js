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

  load: async ({ silent = false } = {}) => {
    set((state) => ({ loading: silent ? state.loading : true, error: '' }));
    try {
      const [dashboard, resources, programs, periods, config, previewRows] = await Promise.all([
        api.dashboard(),
        api.resources(),
        api.programs(),
        api.planningPeriods(),
        api.config(),
        api.preview(),
      ]);
      set({ dashboard, resources, programs, periods, config, previewRows, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  setNotice: (notice) => set({ notice }),
  clearError: () => set({ error: '' }),

  updateConfig: async (body) => {
    await api.updateConfig(body);
    await get().load({ silent: true });
  },

  createAllocation: async (body) => {
    await api.createAllocation(body);
    await get().load({ silent: true });
  },

  updateAllocation: async (id, body) => {
    await api.updateAllocation(id, body);
    await get().load({ silent: true });
  },

  deleteAllocation: async (id) => {
    await api.deleteAllocation(id);
    await get().load({ silent: true });
  },

  createResource: async (body) => {
    await api.createResource(body);
    await get().load({ silent: true });
  },

  createProgram: async (body) => {
    await api.createProgram(body);
    await get().load({ silent: true });
  },

  importResources: async (file) => {
    const result = await api.importResources(file);
    set({ notice: `${result.imported} resources imported or updated.` });
    await get().load({ silent: true });
  },

  importPrograms: async (file) => {
    const result = await api.importPrograms(file);
    set({ notice: `${result.imported} programs imported or updated.` });
    await get().load({ silent: true });
  },

  importFile: async (file) => {
    const previewRows = await api.importCsv(file);
    set({ previewRows, notice: `${previewRows.length} imported rows ready for review.` });
  },

  commitImport: async () => {
    const allocations = await api.commitImport();
    set({ previewRows: [], notice: `${allocations.length} preview row(s) moved to allocation.` });
    await get().load({ silent: true });
  },
}));
