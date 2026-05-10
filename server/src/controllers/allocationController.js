import { createValidatedAllocation, getAllocationsWithComputedHours, removeAllocation, updateValidatedAllocation } from '../services/allocationService.js';

export function getAllocations(req, res) {
  res.json(getAllocationsWithComputedHours());
}

export function postAllocation(req, res) {
  res.status(201).json(createValidatedAllocation(req.body));
}

export function putAllocation(req, res) {
  res.json(updateValidatedAllocation(req.params.id, req.body));
}

export function deleteAllocationController(req, res) {
  removeAllocation(req.params.id);
  res.status(204).send();
}
