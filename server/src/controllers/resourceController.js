import { listResources, upsertResourceByName, countResourceAllocations, deleteResource } from '../repositories/resourceRepository.js';

export function getResources(req, res) {
  res.json(listResources());
}

export function postResource(req, res) {
  const { name, region, max_capacity = 1 } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Resource name is required.' });
  if (!['India', 'USA', 'Europe', 'Unknown'].includes(region)) return res.status(400).json({ error: 'Region must be India, USA, Europe, or Unknown.' });
  res.status(201).json(upsertResourceByName({ name, region, max_capacity, updateExisting: true }));
}

export function getResourceDeleteImpact(req, res) {
  res.json({ resource_id: Number(req.params.id), allocation_count: countResourceAllocations(req.params.id) });
}

export function deleteResourceController(req, res) {
  deleteResource(req.params.id, req.body || {});
  res.status(204).send();
}
