const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        level: {
            type: String,
            default: 'Novice'
        }
    },
    {
        timestamps: true
    }
)

module.exports = mongoose.model('User', userSchema)