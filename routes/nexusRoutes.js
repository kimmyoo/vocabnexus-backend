const express = require('express')
const router = express.Router()
const nexusController = require('../controllers/nexusController')
const verifyJWT = require('../middleware/verifyJWT')

// this applied verifyJWT to all routes
router.use(verifyJWT)

// :id is nodeId
router.route('/:id')
    .get(nexusController.getAllNexusOfNode)

router.route('/')
    .post(nexusController.addOutboundNexus)

// userId/nodeId/nexusId
router.route('/:id/:nexusId')
    .delete(nexusController.deleteOutboundNexus)
// patch option is not really needed
// since user can always delete nexus and reconnect

module.exports = router