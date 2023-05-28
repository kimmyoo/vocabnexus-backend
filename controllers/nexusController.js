const Node = require('../models/Node')
const Nexus = require('../models/Nexus')
const User = require('../models/User')
const asyncHandler = require('express-async-handler')
const utility = require('../controllers/utility.js')

// @desc Get all nexus(inbound/outbound) plus words
//       (word)==I.nexus==>current node==O.nexus==>(word)
//       (word)==I.nexus==>            ==O.nexus==>(word)
// @route GET /nexus
// @access Private
const getAllNexusOfNode = asyncHandler(async (req, res) => {
    const { id, userId } = req.params
    if (!id || !userId) {
        return res.status(400).json({ message: "missing required fields" })
    }

    const node = await Node.findById(id).exec()
    if (!node) {
        return res.status(400).json({ message: "node not found" })
    }

    let nexus = { inbound: [], outbound: [] }
    await Promise.all(node.nexus.map(async id => {
        try {
            const nexusPlusNode = await utility._getNexusObject(id)
            if (nexusPlusNode.nodeFrom.toString() === node.id) {
                const word = await utility._getNodeWord(nexusPlusNode.nodeTo)
                // console.log(word)
                nexusPlusNode['word'] = word
                // console.log(nexusPlusNode)
                nexus.outbound.push(nexusPlusNode)
            } else {
                const word = await utility._getNodeWord(nexusPlusNode.nodeFrom)
                // console.log(word)
                nexusPlusNode['word'] = word
                nexus.inbound.push(nexusPlusNode)
            }
        } catch (err) {
            console.error(err.message)
        }

    }))
    res.json(nexus)
})

// imagination or nexus establishment is always outbound
const addOutboundNexus = asyncHandler(async (req, res) => {
    const { id, user, word, nexusType, explanation } = req.body
    if (!id || !user || !word || !nexusType) {
        return res.status(400).json({ message: "missing required fields" })
    }
    // retrieve nodeFrom
    const nodeFrom = await Node.findById(id).exec()
    // console.log(nodeFrom)
    if (!nodeFrom) {
        return res.status(400).json({ message: "cannot find current node" })
    }

    // deal with destination node 
    let nodeTo
    // if the word exists, no need to create a new node.
    const duplicate = await Node.findOne({ word, user }).exec()
    // console.log(duplicate)
    // if node(duplicate) existed already, 
    // must check 1. if the duplicate is the node itself
    //            2. if any nexus exists already inbetween
    // if duplicate doesn't exist, no need to check.
    if (duplicate) {
        // poiting to itself
        if (duplicate.id === id) {
            return res.status(400).json({ message: "cannot establish nexus on its own." })
        }
        // checking if nexus exists between duplicate and current node
        if (await utility._isNexusExisting(id, duplicate.id)) {
            return res.status(400).json({ message: "nexus existed between these two nodes" })
        }
        nodeTo = duplicate
    } else {
        nodeTo = await Node.create({ user, word })
        if (!nodeTo) {
            return res.status(400).json({ message: "invalid data received, new word creation failed" })
        }
    }

    const nexus = await Nexus.create(
        {
            user: user,
            nodeFrom: nodeFrom._id,
            nodeTo: nodeTo._id,
            nexusType, explanation,
        }
    )
    if (!nexus) {
        return res.status(400).json({ message: "nexus creation failed" })
    }
    // async helper function to change user level.
    await utility._monitorUserLevel(user)
    // push nexus to both nodes
    nodeFrom.nexus.push(nexus)
    await nodeFrom.save()
    nodeTo.nexus.push(nexus)
    await nodeTo.save()
    const result = {
        message: `${nodeFrom.word} ==(${nexusType})==> ${nodeTo.word}`,
        nodeToId: nodeTo.id
    }
    res.status(200).json(result)
})

// delete single nexus object from current node
// and remove nexusId from both ends.
const deleteOutboundNexus = asyncHandler(async (req, res) => {
    const { id, user, nexusId } = req.params
    if (!id || !user) {
        return res.status(400).json({ message: "missing required fields" })
    }

    const nexus = await Nexus.findById(nexusId).exec()
    if (nexus) {
        try {
            const nodeTo = await Node.findById(nexus.nodeTo).exec()
            const currentNode = await Node.findById(id).exec()
            if (!currentNode) {
                return res.status(400).json({ message: "current node not found" })
            }
            if (currentNode.user.toString() !== user) {
                return res.status(403).json({ messsage: "unauthorized! this is not your word" })
            }
            // nested try catch block ugly but really needed it so i can know 
            // which part of failed: finding node or deletion of nexus
            try {
                // remove nexusId from both nodes
                currentNode.nexus.pull(nexus.id)
                const updatedCurrentNode = await currentNode.save()
                nodeTo.nexus.pull(nexus.id)
                const updatedNodeTo = await nodeTo.save()
                await nexus.deleteOne()
                await utility._monitorUserLevel(user)
                res.json(
                    {
                        updatedCurrentNode: updatedCurrentNode,
                        message: `nexus: ${updatedCurrentNode.word}=${nexus.nexusType}=>${nodeTo.word} is deleted between ${updatedCurrentNode.word} and ${updatedNodeTo.word}`
                    }
                )
            } catch (err) {
                console.error(err)
                res.status(400).json({ message: "deletion failed" })
            }
        } catch (err) {
            console.error(err.message)
            res.status(400).json({ message: "cannot get node" })
        }
    } else {
        return res.status(400).json({ message: "nexus doesn't exist" })
    }
})

module.exports = {
    getAllNexusOfNode,
    addOutboundNexus,
    deleteOutboundNexus,
}



// findById(id) is almost equivalent to findOne({ _id: id }).
// If you want to query by a document's _id, use findById() instead of findOne().

// Both functions trigger findOne(), the only difference is how they treat undefined.
// If you use findOne(), you'll see that findOne(undefined) and findOne({ _id: undefined })
// are equivalent to findOne({}) and return arbitrary documents.
// However, mongoose translates findById(undefined) into findOne({ _id: null }).