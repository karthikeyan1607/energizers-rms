import { buildExportWorkbook } from '../services/exportService.js';

export async function postExport(req, res) {
  const workbook = await buildExportWorkbook();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rms-capacity-plan.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
}
