const express = require('express')
const router = express.Router()
const nodesController = require('../controllers/nodesController')
const verifyJWT = require('../middleware/verifyJWT')

// this applied verifyJWT to all routes
router.use(verifyJWT)


router.route('/')
    .get(nodesController.getAllNodes)
    .post(nodesController.addNewNode) //adding word at the same time
    .delete(nodesController.deleteNode)

router.route('/detail/:userId/:id')
    .get(nodesController.getNodeDetail)

router.route('/word')
    // patch is partially update
    .patch(nodesController.updateWordOnly)

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
// .get()
// .edit()

module.exports = router