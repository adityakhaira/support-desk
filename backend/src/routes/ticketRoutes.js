const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const {
  listTickets,
  getTicket,
  createTicket,
  updateStatus,
  assignTicketToAgent,
  autoAssign,
  createComment,
  getComments
} = require('../controllers/ticketController');

const router = express.Router();
router.use(authenticate);

router.get('/', listTickets);
router.post('/', authorizeRoles('CUSTOMER', 'ADMIN'), createTicket);
router.get('/:id', getTicket);
router.patch('/:id/status', authorizeRoles('AGENT', 'ADMIN'), updateStatus);
router.patch('/:id/assign', authorizeRoles('ADMIN'), assignTicketToAgent);
router.post('/:id/auto-assign', authorizeRoles('ADMIN'), autoAssign);
router.post('/:id/comments', createComment);
router.get('/:id/comments', getComments);

module.exports = router;
