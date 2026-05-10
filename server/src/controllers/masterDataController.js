import { importPrograms, importResources } from '../services/masterDataService.js';

export function postResourceImport(req, res) {
  const csvText = req.file?.buffer?.toString('utf8') || req.body.csvText;
  res.status(201).json(importResources(csvText));
}

export function postProgramImport(req, res) {
  const csvText = req.file?.buffer?.toString('utf8') || req.body.csvText;
  res.status(201).json(importPrograms(csvText));
}
