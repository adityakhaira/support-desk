const { getDashboardForUser } = require('../services/ticketService');
const { successResponse, errorResponse } = require('../utils/response');

async function getDashboard(req, res) {
  try {
    const dashboard = await getDashboardForUser(req.user);
    return successResponse(res, 200, dashboard);
  } catch (error) {
    console.error('Dashboard query failed:', error);
    return errorResponse(res, 500, 'Unable to fetch dashboard.');
  }
}

module.exports = { getDashboard };
