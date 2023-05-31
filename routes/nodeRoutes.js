const express = require('express')
const router = express.Router()
const nodesController = require('../controllers/nodesController')
const verifyJWT = require('../middleware/verifyJWT')

// this applied verifyJWT to all routes
router.use(verifyJWT)


router.route('/')
    .post(nodesController.addNewNode) //adding word at the same time

router.route('/:userId')
    .get(nodesController.getAllNodes)

router.route('/detail/:userId/:id')
    .get(nodesController.getNodeDetail)
    .delete(nodesController.deleteNode)

router.route('/update')
    .patch(nodesController.updateNode)

router.route('/word/liked')
    .patch(nodesController.toggleLiked)

router.route('/word/grasped')
    .patch(nodesController.toggleGrasped)

router.route('/word/search')
    .post(nodesController.searchWord)

router.route('/word/meaning')
    .post(nodesController.addMeaning)
    .delete(nodesController.deleteMeaning)
    .patch(nodesController.updateMeaning)

module.exports = router