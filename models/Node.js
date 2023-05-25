const mongoose = require('mongoose')
const { randomUUID } = require('crypto')


const nodeSchema = new mongoose.Schema(
    {
        // word must have user
        // since different user can have different use of the app
        // some need to memorize english/spanish/chinese....
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        word: {
            type: String,
            required: true
        },
        meanings: [
            {
                _id: false,
                meaningId: { type: 'UUID', default: () => randomUUID() },
                definition: { type: String, required: true },
                partOfSpeech: { type: String, required: true },
                sentence: String
            }
        ],
        nexus: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Nexus",
            }
        ],
        grasped: {
            type: Boolean,
            default: false
        },
        liked: {
            type: Boolean,
            default: false
        },
    },

    {
        timestamps: true
    }
)

module.exports = mongoose.model('Node', nodeSchema)