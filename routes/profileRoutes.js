const express = require('express')
const router = express.Router()
const profileController = require('../controllers/profileController')
// const wordsController = require('../controllers/wordsController')
const verifyJWT = require('../middleware/verifyJWT')

// this applied verifyJWT to all routes
router.use(verifyJWT)
router.route('/:id').get(profileController.getUserProfile)

module.exports = router