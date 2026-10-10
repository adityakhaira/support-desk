const express = require('express');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { getStatistics, getSlaBreaches, getAgentWorkload, getUsers, updateUser } = require('../controllers/adminController');

const router = express.Router();
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/statistics', getStatistics);
router.get('/sla-breaches', getSlaBreaches);
router.get('/agent-workload', getAgentWorkload);
router.get('/users', getUsers);
router.patch('/users/:id', updateUser);

module.exports = router;
