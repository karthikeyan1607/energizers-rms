import { buildDashboard } from '../services/dashboardService.js';

export function getDashboard(req, res) {
  res.json(buildDashboard());
}
