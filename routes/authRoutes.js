const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const loginLimiter = require('../middleware/loginLimiter')
const usersController = require('../controllers/usersController')

router.route('/')
    .post(loginLimiter, authController.login)

router.route('/refresh')
    .get(authController.refresh)

router.route('/register')
    .post(usersController.createNewUser)

router.route('/logout')
    .post(authController.logout)



module.exports = router