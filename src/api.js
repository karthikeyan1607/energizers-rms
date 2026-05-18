import {
  buildDashboard,
  commitPreviewRows,
  createAllocationRecord,
  createProgramRecord,
  createResourceRecord,
  deleteAllocationRecord,
  importProgramsRows,
  importResourcesRows,
  listSnapshots,
  listPrograms,
  listResources,
  loadSnapshot,
  previewAzureImport,
  readState,
  saveSnapshot,
  updateAllocationRecord,
  updateConfigRecord,
  writeState,
} from './lib/rmsEngine.js';

async function parseCsv(text) {
  const { default: Papa } = await import('papaparse');
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parsed.errors?.length) {
    const firstError = parsed.errors[0];
    throw new Error(firstError.message || 'CSV parsing failed.');
  }

  return parsed.data;
}

async function parseCsvFile(file) {
  const text = await file.text();
  return parseCsv(text);
}

function withState(mutator) {
  const state = readState();
  const result = mutator(state);
  writeState(state);
  return result;
}

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18202F' } };
  row.alignment = { vertical: 'middle' };
}

function applyBorders(sheet) {
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD9DEE8' } },
        left: { style: 'thin', color: { argb: 'FFD9DEE8' } },
        bottom: { style: 'thin', color: { argb: 'FFD9DEE8' } },
        right: { style: 'thin', color: { argb: 'FFD9DEE8' } },
      };
    });
  });
}

function autoWidth(sheet) {
  sheet.columns.forEach((column) => {
    let max = 12;
    column.eachCell({ includeEmpty: true }, (cell) => {
      max = Math.max(max, String(cell.value ?? '').length + 2);
    });
    column.width = Math.min(max, 40);
  });
}

async function exportExcelWorkbook() {
  const { default: ExcelJS } = await import('exceljs');
  const dashboard = buildDashboard(readState());
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const exportMonth = monthNames[Number(dashboard.config?.selected_month) || 0] || monthNames[0];
  const exportYear = Number(dashboard.config?.selected_year) || new Date().getFullYear();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Energizers RMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Resource Plan', { views: [{ state: 'frozen', ySplit: 5 }] });
  sheet.addRows([
    ['Metric', 'Value'],
    ['Total Resource', dashboard.totals.total_resources],
    ['No of Hours/month Per Res', dashboard.totals.monthly_hours],
    ['Total No of hours', dashboard.totals.total_capacity_hours],
    [],
    ['Program Name', 'Tenrox Code', 'India', 'USA', 'Europe', 'No of Resources', '% of Resources', 'Resource Summary'],
  ]);

  styleHeader(sheet.getRow(1));
  styleHeader(sheet.getRow(6));

  dashboard.program_summary.forEach((program) => {
    sheet.addRow([
      program.name,
      program.tenrox_code || 'N/A',
      program.india_resources,
      program.usa_resources,
      program.europe_resources,
      program.no_of_resources,
      program.percent_of_total_resources,
      program.resource_allocation_summary || '',
    ]);
  });

  ['B', 'C', 'D', 'E', 'F'].forEach((column) => {
    sheet.getColumn(column).numFmt = '0.00';
  });
  sheet.getColumn('G').numFmt = '0.00%';
  sheet.getColumn('H').alignment = { wrapText: true, vertical: 'top' };
  sheet.getColumn('H').width = 64;

  applyBorders(sheet);
  autoWidth(sheet);
  sheet.getColumn('H').width = 64;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Energizers RMS ${exportMonth} ${exportYear}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export const api = {
  dashboard: async () => buildDashboard(readState()),
  resources: async () => listResources(readState()),
  programs: async () => listPrograms(readState()),
  planningPeriods: async () => [],
  config: async () => readState().config,
  updateConfig: async (body) => withState((state) => updateConfigRecord(state, body)),
  createResource: async (body) => withState((state) => createResourceRecord(state, body)),
  createProgram: async (body) => withState((state) => createProgramRecord(state, body)),
  createAllocation: async (body) => withState((state) => createAllocationRecord(state, {
    resource_id: body.resource_id,
    program_id: body.program_id,
    story_points: body.story_points,
  })),
  updateAllocation: async (id, body) => withState((state) => updateAllocationRecord(state, id, body)),
  deleteAllocation: async (id) => withState((state) => deleteAllocationRecord(state, id)),
  importResources: async (file) => {
    const rows = await parseCsvFile(file);
    return withState((state) => ({ imported: importResourcesRows(state, rows) }));
  },
  importPrograms: async (file) => {
    const rows = await parseCsvFile(file);
    return withState((state) => ({ imported: importProgramsRows(state, rows) }));
  },
  importCsv: async (file) => {
    const rows = await parseCsvFile(file);
    return withState((state) => previewAzureImport(state, rows));
  },
  preview: async () => readState().previewRows,
  commitImport: async () => withState((state) => commitPreviewRows(state)),
  exportExcel: async () => exportExcelWorkbook(),
  saveSnapshot: async () => withState((state) => ({ key: saveSnapshot(state) })),
  listSnapshots: async () => listSnapshots(),
  loadSnapshot: async (key) => withState((state) => loadSnapshot(state, key)),
};
