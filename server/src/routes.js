import express from 'express';
import multer from 'multer';
import { getDashboard } from './controllers/dashboardController.js';
import { deleteResourceController, getResourceDeleteImpact, getResources, postResource } from './controllers/resourceController.js';
import { getPrograms, postProgram } from './controllers/programController.js';
import { deleteAllocationController, getAllocations, postAllocation, putAllocation } from './controllers/allocationController.js';
import { getImportPreviewController, postImport, postImportCommit } from './controllers/importController.js';
import { postExport } from './controllers/exportController.js';
import { getPlanningPeriods, getSystemConfig, postPlanningPeriod, putSystemConfig } from './controllers/systemController.js';
import { postProgramImport, postResourceImport } from './controllers/masterDataController.js';

const upload = multer({ storage: multer.memoryStorage() });
export const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));
router.get('/dashboard', getDashboard);

router.get('/planning-periods', getPlanningPeriods);
router.post('/planning-periods', postPlanningPeriod);
router.get('/config', getSystemConfig);
router.put('/config', putSystemConfig);

router.get('/resources', getResources);
router.post('/resources', postResource);
router.get('/resources/:id/delete-impact', getResourceDeleteImpact);
router.delete('/resources/:id', express.json(), deleteResourceController);

router.get('/programs', getPrograms);
router.post('/programs', postProgram);

router.get('/allocations', getAllocations);
router.post('/allocations', postAllocation);
router.put('/allocations/:id', putAllocation);
router.delete('/allocations/:id', deleteAllocationController);
router.delete('/allocation/:id', deleteAllocationController);

router.post('/import', upload.single('file'), postImport);
router.post('/import/resources', upload.single('file'), postResourceImport);
router.post('/import/programs', upload.single('file'), postProgramImport);
router.post('/import/azure', upload.single('file'), postImport);
router.get('/import/preview', getImportPreviewController);
router.post('/import/commit', postImportCommit);
router.post('/accept-import', postImportCommit);

router.post('/export', postExport);
router.get('/program-summary', getDashboard);
