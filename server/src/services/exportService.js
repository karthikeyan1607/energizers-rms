import ExcelJS from 'exceljs';
import { buildDashboard } from './dashboardService.js';

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
    column.width = Math.min(max, 36);
  });
}

export async function buildExportWorkbook() {
  const dashboard = buildDashboard();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Enterprise RMS';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Resource Plan', { views: [{ state: 'frozen', ySplit: 5 }] });
  sheet.addRows([
    ['Metric', 'Value'],
    ['Total Resource', dashboard.totals.total_resources],
    ['No of Hours/month Per Res', dashboard.planning_period.total_hours],
    ['Total No of hours', dashboard.totals.total_capacity_hours],
    [],
    ['Program Name', 'Tenrox Code', 'India', 'USA', 'Europe', '% of Resources', 'Resource Summary'],
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
      program.percent_of_total_resources,
      program.resource_allocation_summary || '',
    ]);
  });

  sheet.getColumn('B').numFmt = '0.00';
  ['C', 'D', 'E'].forEach((column) => {
    sheet.getColumn(column).numFmt = '0.00';
  });
  sheet.getColumn('F').numFmt = '0.00%';
  sheet.getColumn('G').width = 64;
  sheet.getColumn('G').alignment = { wrapText: true, vertical: 'top' };
  applyBorders(sheet);
  autoWidth(sheet);
  sheet.getColumn('G').width = 64;

  return workbook;
}
