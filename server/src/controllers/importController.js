import { commitImport, getImportPreview, previewImport } from '../services/importService.js';

export function postImport(req, res) {
  const csvText = req.file?.buffer?.toString('utf8') || req.body.csvText;
  const rows = req.body.rows;
  res.status(201).json(previewImport({ csvText, rows }));
}

export function getImportPreviewController(req, res) {
  res.json(getImportPreview());
}

export function postImportCommit(req, res) {
  res.status(201).json(commitImport());
}
