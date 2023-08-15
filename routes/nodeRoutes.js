const express = require('express')
const router = express.Router()
const nodesController = require('../controllers/nodesController')
const verifyJWT = require('../middleware/verifyJWT')

// this applied verifyJWT to all routes
router.use(verifyJWT)

// add a new node
router.route('/')
    .post(nodesController.addNewNode) //adding word at the same time
    .get(nodesController.getAllNodes)

router.route('/detail/:id')
    .get(nodesController.getNodeDetail)
    .delete(nodesController.deleteNode)

// update node word and meanings 
router.route('/update')
    .patch(nodesController.updateNode)

router.route('/liked')
    .patch(nodesController.toggleLiked)
router.route('/grasped')
    .patch(nodesController.toggleGrasped)


router.route('/word/search')
    .post(nodesController.searchWord)

router.route('/word/meaning')
    .post(nodesController.addMeaning)
    .delete(nodesController.deleteMeaning)
    .patch(nodesController.updateMeaning)

module.exports = router