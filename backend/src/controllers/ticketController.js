const {
  listTicketsForUser,
  getTicketDetail,
  createTicketForCustomer,
  updateTicketStatus,
  assignTicket,
  autoAssignTicket,
  addCommentToTicket,
  getCommentsForTicket,
  getTicketHistoryForTicket
} = require('../services/ticketService');
const { ticketSchema, statusSchema, assignSchema, commentSchema, ticketQuerySchema } = require('../validators');
const { successResponse, errorResponse } = require('../utils/response');

function handleServiceError(res, error, message) {
  if (error.statusCode) {
    return errorResponse(res, error.statusCode, error.message);
  }
  console.error(`${message}:`, error);
  return errorResponse(res, 500, message);
}

async function listTickets(req, res) {
  try {
    const query = ticketQuerySchema.parse(req.query);
    const result = await listTicketsForUser(req.user, query);
    return successResponse(res, 200, result);
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Invalid ticket query parameters.', error.errors);
    }
    return handleServiceError(res, error, 'Unable to fetch tickets.');
  }
}

async function getTicket(req, res) {
  try {
    const ticket = await getTicketDetail(req.params.id, req.user);
    const history = await getTicketHistoryForTicket(req.params.id, req.user);
    return successResponse(res, 200, { ticket, history });
  } catch (error) {
    return handleServiceError(res, error, 'Unable to fetch ticket.');
  }
}

async function createTicket(req, res) {
  try {
    const parsed = ticketSchema.parse(req.body);
    if (req.user.role !== 'CUSTOMER' && req.user.role !== 'ADMIN') {
      return errorResponse(res, 403, 'Only customers and admins can create tickets.');
    }
    const ticket = await createTicketForCustomer(req.user.role === 'ADMIN' ? req.body.customerId || req.user.id : req.user.id, parsed);
    return successResponse(res, 201, { message: 'Ticket created successfully.', ticket });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    return handleServiceError(res, error, 'Unable to create ticket.');
  }
}

async function updateStatus(req, res) {
  try {
    const parsed = statusSchema.parse(req.body);
    const ticket = await updateTicketStatus(req.params.id, parsed.status, req.user);
    return successResponse(res, 200, { message: 'Ticket status updated.', ticket });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    return handleServiceError(res, error, 'Unable to update ticket status.');
  }
}

async function assignTicketToAgent(req, res) {
  try {
    const parsed = assignSchema.parse(req.body);
    const ticket = await assignTicket(req.params.id, parsed.assignedAgentId, req.user);
    return successResponse(res, 200, { message: 'Ticket assignment updated.', ticket });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    return handleServiceError(res, error, 'Unable to assign ticket.');
  }
}

async function autoAssign(req, res) {
  try {
    const ticket = await autoAssignTicket(req.params.id, req.user);
    return successResponse(res, 200, { message: 'Ticket auto-assigned.', ticket });
  } catch (error) {
    return handleServiceError(res, error, 'Unable to auto-assign ticket.');
  }
}

async function createComment(req, res) {
  try {
    const parsed = commentSchema.parse(req.body);
    const comment = await addCommentToTicket(req.params.id, req.user, parsed.comment);
    return successResponse(res, 201, { message: 'Comment added.', comment });
  } catch (error) {
    if (error.name === 'ZodError') {
      return errorResponse(res, 400, 'Validation failed.', error.errors);
    }
    return handleServiceError(res, error, 'Unable to add comment.');
  }
}

async function getComments(req, res) {
  try {
    const comments = await getCommentsForTicket(req.params.id, req.user);
    return successResponse(res, 200, { comments });
  } catch (error) {
    return handleServiceError(res, error, 'Unable to fetch comments.');
  }
}

module.exports = {
  listTickets,
  getTicket,
  createTicket,
  updateStatus,
  assignTicketToAgent,
  autoAssign,
  createComment,
  getComments
};
