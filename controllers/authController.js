const User = require('../models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const asyncHandler = require('express-async-handler')


/**
 * @desc    Login
 * @route   POST /auth
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        return res.status(400).json({ message: "all fields are required" })
    }

    const foundUser = await User.findOne({ username }).exec()

    if (!foundUser) {
        return res.status(401).json({ message: "no user found" })
    }

    const match = await bcrypt.compare(password, foundUser.password)
    if (!match) {
        return res.status(401).json({ message: 'incorrect password' })
    }

    // then create access token
    const accessToken = jwt.sign(
        {
            "UserInfo": {
                "username": foundUser.username
            }
        },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
    )

    // console.log(accessToken)
    const refreshToken = jwt.sign(
        { "username": foundUser.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '2h' }
    )

    res.cookie('jwt', refreshToken, {
        httpOnly: true,
        //you really need to set this to true 
        // so the httponly cookie can be set in browser(chrome)
        // but in postman testing, remember to delete secure=true in cookie.
        secure: true,
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 1000 // cookie expiry: 7 days
    })

    res.json({ accessToken, userId: foundUser.id })
})


/**
 * @desc    Refresh expired access token
 * @route   GET /auth/refresh
 * @access  Public  - because access token has expired
 */
const refresh = (req, res) => {
    // in order to get cookies like this 
    // need to use cookie-parser in express
    const cookies = req.cookies

    if (!cookies?.jwt) {
        return res.status(401).json({ message: 'unauthorized' })
    }
    // get the freshToken from cookies 
    // then verify the token
    const refreshToken = cookies.jwt
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,

        asyncHandler(async (err, decoded) => {
            if (err) return res.status(403).json({ message: "forbidden" })

            const foundUser = await User.findOne({ username: decoded.username })
            if (!foundUser) return res.status(401).json({ message: "unauthorized" })
            // if nothing goes wrong, issue a new accessToken
            const accessToken = jwt.sign(
                {
                    "UserInfo": {
                        "username": foundUser.username
                    }
                },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: "30m" }
            )
            res.json({ accessToken })
        })
    )
}


/**
 * @desc    Logout
 * @route   POST /auth/logout
 * @access  Public  - clear cookie if exists
 */
const logout = (req, res) => {
    const cookies = req.cookies
    if (!cookies?.jwt) return res.sendStatus(204) // no content
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true })
    res.json({ message: 'Cookie cleared' })
}


module.exports = {
    login,
    refresh,
    logout
}