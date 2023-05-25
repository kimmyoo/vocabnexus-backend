const mongoose = require('mongoose')

const nexusSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    nodeFrom: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Node"
    },

    nodeTo: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: "Node"
    },

    // antonym synonym spelling prefix...etymology
    nexusType: {
        type: String,
        required: true
    },

    explanation: String, // explain more here 

});

module.exports = mongoose.model('Nexus', nexusSchema)