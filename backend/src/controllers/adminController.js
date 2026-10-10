const {
  getAdminStatistics,
  getSlaBreachesSummary,
  getAgentWorkload: getAgentWorkloadData,
  getUsersForAdmin,
  updateUserForAdmin
} = require('../services/ticketService');
const { successResponse, errorResponse } = require('../utils/response');
const { adminUserSchema } = require('../validators');

async function getStatistics(req, res) {
  try {
    const stats = await getAdminStatistics();
    return successResponse(res, 200, stats);
  } catch (error) {
    console.error('Admin statistics query failed:', error);
    return errorResponse(res, 500, 'Unable to fetch admin statistics.');
  }
}

async function getSlaBreaches(req, res) {
  try {
    const data = await getSlaBreachesSummary();
    return successResponse(res, 200, data);
  } catch (error) {
    console.error('SLA report query failed:', error);
    return errorResponse(res, 500, 'Unable to fetch SLA breaches.');
  }
}

async function getAgentWorkload(req, res) {
  try {
    const workload = await getAgentWorkloadData();
    return successResponse(res, 200, { workload });
  } catch (error) {
    console.error('Agent workload query failed:', error);
    return errorResponse(res, 500, 'Unable to fetch workload.');
  }
}

async function getUsers(req, res) {
  try {
    const users = await getUsersForAdmin();
    return successResponse(res, 200, { users });
  } catch (error) {
    console.error('Admin user query failed:', error);
    return errorResponse(res, 500, 'Unable to fetch users.');
  }
}

async function updateUser(req, res) {
  try {
    const parsed = adminUserSchema.parse(req.body);
    const user = await updateUserForAdmin(req.params.id, parsed, req.user);
    return successResponse(res, 200, { message: 'User updated.', user });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    if (error.statusCode) {
      return errorResponse(res, error.statusCode, error.message);
    }
    console.error('Admin user update failed:', error);
    return errorResponse(res, 500, 'Unable to update user.');
  }
}

module.exports = { getStatistics, getSlaBreaches, getAgentWorkload, getUsers, updateUser };
