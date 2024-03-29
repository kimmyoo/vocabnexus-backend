const Node = require('../models/Node')
const Nexus = require('../models/Nexus')
// const User = require('../models/User')
const asyncHandler = require('express-async-handler')
const utility = require('../controllers/utility.js')
const { v4: uuidv4 } = require('uuid');
// const expressAsyncHandler = require('express-async-handler')

/**   */
// @DESC:  get all nodes belong to a specific user
// @PATH   /nodes
const getAllNodes = asyncHandler(async (req, res) => {
    // const { userId } = req.params
    const user = req.user
    if (!user) {
        return res.status(400).json({ message: "need user id" })
    }
    const nodes = await Node.find({ user }).lean().sort({ 'word': 1 }) // ascending
    // console.log(nodes)
    if (!nodes?.length) {
        return res.status(400).json({ message: "you have not added a words yet" })
    }
    // group nodes alphabetically
    const groupedNodes = {} // empty holder
    for (const node of nodes) {
        const firstLetter = node.word[0].toLowerCase();
        // if never seen a word beginning with firstLetter
        // initialize an emtpy array
        if (!groupedNodes[firstLetter]) {
            groupedNodes[firstLetter] = [];
        }
        // if seen before, push word with the same beginning letter to the array
        groupedNodes[firstLetter].push(node);
    }
    // res.json(nodes)
    res.json(groupedNodes)
})


const addNewNode = asyncHandler(async (req, res) => {
    const { word } = req.body
    const user = req.user
    // console.log(user)
    if (!user || !word) {
        return res.status(400).json({ message: "user and word entity are required" })
    }
    // checking for duplicate
    const duplicate = await Node.findOne({ word, user }).lean().exec()
    if (duplicate) {
        return res.status(409).json({ message: "duplicate word" })
    }
    const node = await Node.create({ user, word })
    if (node) {
        return res.status(200).json({ nodeId: node._id })
    } else {
        return res.status(400).json({ message: "invalid data received" })
    }
})


const deleteNode = asyncHandler(async (req, res) => {
    const { id } = req.params
    const userId = req.user
    if (!userId || !id) {
        return res.status(400).json({ message: "user and node info is required" })
    }
    const currentNode = await Node.findById(id).exec()
    if (currentNode.user.toString() !== userId) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    // get all connections and prepare for deletion
    const allNexusIdPairs = await utility._getAllNexusIdPairs(currentNode._id)
    try {
        //  delete all inbound 
        // _getAllInboundNodes is async
        // delete inbound nexus from inbound nodes
        if (allNexusIdPairs.inbound.length > 0) {
            //  need to add await here because of Promise.all()
            await Promise.all(
                allNexusIdPairs.inbound.map(async pair => {
                    // console.log(pair.inboundNodeId, pair.nexusId)
                    // console.log("deleting inbound nexus from nodeFrom")
                    await utility._deleteSingleOutboundNexus(pair.inboundNodeId, pair.nexusId)
                })
            )
        }
    } catch (err) {
        console.error(err)
        res.status(400).json({ message: "failed to delete inbound node" })
    }
    // deleting outbound nexus
    try {
        // delete outbound nexus from current node
        if (allNexusIdPairs.outbound.length > 0) {
            await Promise.all(
                allNexusIdPairs.outbound.map(async pair => {
                    // console.log("deleting outbound nexus from current node")
                    await utility._deleteSingleOutboundNexus(pair.outboundNodeId, pair.nexusId)
                })
            )
        }
    } catch (err) {
        console.error(err)
        res.status(400).json({ message: "failed to delete outbound node" })
    }
    // finally delete the node itself
    await Node.deleteOne({ _id: id })
    await utility._monitorUserLevel(userId)
    return res.json({ message: `Nexus node is successfully deleted` })
})


const getNodeDetail = asyncHandler(async (req, res) => {
    const { id } = req.params
    const userId = req.user
    // const { id, user } = req.body
    if (!userId || !id) {
        return res.status(400).json({ message: "user and id are required" })
    }
    const node = await Node.findById(id).exec()
    if (!node) {
        return res.status(400).json({ message: "node not found" })
    }
    if (node.user.toString() !== userId) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    res.status(200).json(node)
})


const updateNode = asyncHandler(async (req, res) => {
    const user = req.user
    const { node } = req.body
    const { word, meanings } = node
    // convert buffer type typeArray to uuid
    // chatGPT's credit
    meanings.forEach(meaning => {
        const byteArray = meaning.meaningId.data
        const stringMeaningId = uuidv4({ random: byteArray })
        meaning.meaningId = stringMeaningId
    })

    if (!user || !word) {
        return res.status(400).json({ message: "missing field!" })
    }
    const originalNode = await Node.findById(node._id).exec()
    if (!originalNode) {
        return res.status(400).json({ message: "node not found" })
    }
    // cannot compare ObjectId to string
    if (originalNode.user.toString() !== user) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    originalNode.word = word
    originalNode.meanings = meanings
    await originalNode.save()
    res.json({ message: "node is updated" })
})


// meaning: add, delete, edit
const addMeaning = asyncHandler(async (req, res) => {
    const user = req.user
    const { id, meaning } = req.body
    if (!id || !user || !meaning) {
        return res.status(400).json({ message: "missing field!" })
    }
    const { definition, partOfSpeech } = meaning
    if (!definition || !partOfSpeech) {
        return res.status(400).json({ message: "specify definition and part of speech" })
    }
    // get the node
    const node = await Node.findById(id).exec()
    if (!node) {
        return res.status(400).json({ message: "node not found" })
    }
    if (node.user.toString() !== user) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    node.meanings.push(meaning)
    await node.save()
    res.json(`new meaning added to ${node.word}`)

})

const updateMeaning = asyncHandler(async (req, res) => {
    const { id, user, meaning } = req.body
    if (!id || !user || !meaning) {
        return res.status(400).json({ message: "missing field!" })
    }

    const { definition, partOfSpeech, meaningId, sentence } = meaning

    if (!definition || !partOfSpeech) {
        return res.status(400).json({ message: "specify definition and part of speech" })
    }
    // get the node
    const node = await Node.findById(id).exec()
    if (!node) {
        return res.status(400).json({ message: "node not found" })
    }
    if (node.user.toString() !== user) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    try {
        await Node.updateOne(
            // first obj is filter
            { _id: id, 'meanings.meaningId': meaningId },
            {
                $set: {
                    'meanings.$.definition': definition,
                    'meanings.$.partOfSpeech': partOfSpeech,
                    'meanings.$.sentence': sentence,
                }
            }
        )
        res.json(`meaning updated for ${node.word}`)
    } catch (err) {
        console.error(err.message)
        res.status(400).json({ message: "update failed" })
    }
})


const deleteMeaning = asyncHandler(async (req, res) => {
    const { id, user, meaningId } = req.body
    if (!id || !user || !meaningId) {
        return res.status(400).json({ message: "missing field!" })
    }
    // get the node
    const node = await Node.findById(id).exec()
    if (!node) {
        return res.status(400).json({ message: "node not found" })
    }
    if (node.user.toString() !== user) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    try {
        // pull is to remove
        node.meanings.pull({ meaningId: meaningId })
        const updatedNode = await node.save()
        res.json(` selected meaning deleted from ${updatedNode.word}`)
    } catch (err) {
        console.error(err.message)
        res.status(400).json({ message: "deletion failed" })
    }
})

const toggleGrasped = asyncHandler(async (req, res) => {
    const user = req.user
    const { id, grasped } = req.body
    if (!user || !id || (typeof grasped === "undefined")) {
        return res.status(400).json({ message: "user, node id, and liked value are required" })
    }
    const node = await Node.findById(id).exec()
    if (node.user.toString() !== user) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    try {
        node.grasped = grasped
        await node.save()
        res.status(200).json({ message: "toggled grasped" })
    } catch (err) {
        console.error(err.message)
    }

})

const toggleLiked = asyncHandler(async (req, res) => {
    const user = req.user
    const { id, liked } = req.body
    // console.log(id, user, liked)
    if (!user || !id || (typeof liked === "undefined")) {
        return res.status(400).json({ message: "user, node id, and liked value are required" })
    }
    const node = await Node.findById(id).exec()
    if (node.user.toString() !== user) {
        return res.status(403).json({ messsage: "unauthorized, this is not your word" })
    }
    try {
        node.liked = liked
        await node.save()
        res.status(200).json({ message: "toggled liked" })
    } catch (err) {
        console.error(err.message)
    }
})


const searchWord = asyncHandler(async (req, res) => {
    const user = req.user
    const searchQuery = req.query.q
    // 'i' case insensitive
    const searchRegex = new RegExp(searchQuery, 'i')
    // console.log(searchQuery, user)
    if (!user || !searchQuery) {
        return res.status(400).json({ message: "missing required info" })
    } else {
        try {
            const results = await Node.find({ word: searchRegex, user })
            res.status(200).json(results);
        } catch (err) {
            console.error(err.message)
            res.status(500).json({ error: "error occured while searching" })
        }
    }
})



module.exports = {
    getAllNodes,
    addNewNode,
    deleteNode,
    getNodeDetail,
    updateNode,
    addMeaning,
    updateMeaning,
    deleteMeaning,
    toggleGrasped,
    toggleLiked,
    searchWord,
}