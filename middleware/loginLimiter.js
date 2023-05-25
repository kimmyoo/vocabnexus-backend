const rateLimit = require('express-rate-limit')


const loginLimiter = rateLimit({
    windowMs: 60 * 1000, // 1min 
    max: 5,
    message: { message: "too many attempts from this IP. Try again after 1 minute." },
    handler: (req, res, next, options) => {
        res.status(options.statusCode).send(options.message)
    },
    standardHeader: true,
    legacyHeader: false,
})

module.exports = loginLimiter