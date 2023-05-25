const User = require('../models/User')
const Node = require('../models/Node')
const Nexus = require('../models/Nexus')
const asyncHandler = require('express-async-handler')

// @desc Get user by id
// @route GET /user
// @access Private
const getUserProfile = asyncHandler(async (req, res) => {
    const id = req.params.id
    const userProfileData = {
        user: null,
        numOfNodes: null,
        numOfNexus: null,
        likedList: null,
        unGraspedList: null,
    }
    try {
        const user = await User.findOne({ _id: id }).select('-password').lean().exec()
        // If no users 
        if (!user) {
            return res.status(400).json({ message: 'No user found' })
        }

        userProfileData.user = user
        // getting num of nodes/nexus/likedList/ungraspedList
        const numOfNodes = await Node.countDocuments({ user: user._id })
        userProfileData.numOfNodes = numOfNodes

        const numOfNexus = await Nexus.countDocuments({ user: user._id })
        userProfileData.numOfNexus = numOfNexus

        const likedList = await Node.find({ user: user._id, liked: true }).sort({ 'createdAt': -1 }).limit(8)
        userProfileData.likedList = likedList

        const unGraspedList = await Node.find({ user: user._id, grasped: false }).sort({ 'createdAt': 1 }).limit(8)
        userProfileData.unGraspedList = unGraspedList

        const unconnctedList = await Node.find({ nexus: { $size: 0 } }).limit(8)
        userProfileData.unconnctedList = unconnctedList

        res.json(userProfileData)
    } catch (err) {
        console.error(err.message)
    }
})






module.exports = {
    getUserProfile
}