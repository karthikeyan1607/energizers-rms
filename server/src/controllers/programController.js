import { listPrograms, upsertProgramByName } from '../repositories/programRepository.js';

export function getPrograms(req, res) {
  res.json(listPrograms());
}

export function postProgram(req, res) {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Program name is required.' });
  res.status(201).json(upsertProgramByName({ name, tenrox_code: req.body.tenrox_code || 'N/A', updateExisting: true }));
}
