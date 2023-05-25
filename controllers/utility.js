const Node = require('../models/Node')
const Nexus = require('../models/Nexus')
const User = require('../models/User')



/**
 * async helper function to retrieve a
 * plain javascript Nexus object
 * @param  {String} id      Node object id
 * @return {Nexus}          nexus object
 */
const _getNexusObject = async (id) => {
    try {
        // adding lean() is telling Mongoose
        // I need a plain javascript object not a query object
        const nexusObject = await Nexus.findById(id).lean().exec()
        return nexusObject
    } catch (err) {
        console.error(err.message)
    }
}


/**
 * async helper function to retrieve a Node object
 * @param  {String} id     Node object id
 * @return {Node}          Node object
 */
const _getNode = async (id) => {
    try {
        const nodeObject = await Node.findById(id).exec()
        return nodeObject
    } catch (err) {
        console.error(err.message)
    }
}

// helper function to get node.word for adding to combine with nexus object
const _getNodeWord = async (id) => {
    try {
        const nodeObject = await Node.findById(id).lean().exec()
        return nodeObject.word
    } catch (err) {
        console.error(err.message)
    }
}

// helper function to get both inbound and outbound nodeId + nexusID pairs
// for deletion of nexus between two nodes ( O====>O )
const _getAllNexusIdPairs = async (id) => {
    const node = await Node.findById(id).exec()
    let allNexusIdPairs = { inbound: [], outbound: [] }
    if (node) {
        // console.log(node)
        await Promise.all(node.nexus.map(async id => {
            try {
                const nexus = await _getNexusObject(id)
                // if the nexus.nodeTo equals the current node
                // then this is a inbound nexus
                //  O=====>Current Node(nodeTo)
                if (nexus.nodeTo.toString() === node.id) {
                    const inboundNode = await _getNode(nexus.nodeFrom)
                    // inboundIdPair is: inboundNodeId + nexusId
                    const inboundIdPair = { inboundNodeId: inboundNode._id, nexusId: id }
                    allNexusIdPairs.inbound.push(inboundIdPair)
                } else { //    current node(nodeFrom) ====> O
                    const outboundNode = await _getNode(nexus.nodeTo)
                    // outboundIdPair is: outboundNodeId + nexusId
                    const outboundIdPair = { outboundNodeId: outboundNode._id, nexusId: id }
                    allNexusIdPairs.outbound.push(outboundIdPair)
                }
            } catch (err) {
                console.error(err.message)
            }
        }
        ))
    }
    return allNexusIdPairs
}

// helper function to delete single outbound
// nexus and desination note from current node
const _deleteSingleOutboundNexus = async (id, nexusId) => {
    const nexus = await Nexus.findById(nexusId).exec()
    if (nexus) {
        try {
            // console.log(nodeTo)
            const currentNode = await Node.findById(id).exec()
            if (!currentNode) {
                return
            }
            try {
                const nodeTo = await Node.findById(nexus.nodeTo).exec()
                // console.log(currentNode, nodeTo)
                // remove nexusId from both nodes
                currentNode.nexus.pull(nexus.id)
                await currentNode.save()
                nodeTo.nexus.pull(nexus.id)
                await nodeTo.save()
                await nexus.deleteOne()
            } catch (err) {
                console.error(err)
            }
        } catch (err) {
            console.error(err.message)
        }
    } else {
        return
    }
}



const _monitorUserLevel = async (user) => {
    const currentUser = await User.findOne({ _id: user }).select('-password').exec()
    // If no users 
    if (currentUser) {
        const numOfNexus = await Nexus.countDocuments({ user: currentUser._id })

        if (numOfNexus >= 50 && numOfNexus < 100) {
            currentUser.level = "Advanced Beginner"
        } else if (numOfNexus >= 100 && numOfNexus < 500) {
            currentUser.level = "Competent"
        } else if (numOfNexus >= 500 && numOfNexus < 1000) {
            currentUser.level = "Proficient"
        } else if (numOfNexus >= 1000) {
            currentUser.level = "Expert"
        } else if (numOfNexus < 50) {
            currentUser.level = "Novice"
        } else
            await currentUser.save()
    }
}


const _getAllOutboundNodes = async (id) => {
    const node = await Node.findById(id).exec()
    let outboundNodesIds = []
    if (node) {
        // console.log(node)
        await Promise.all(node.nexus.map(async id => {
            try {
                const nexus = await _getNexusObject(id)
                // if the nexus.nodeTo equals the current node
                // then this is a inbound nexus
                //  O=====>Current Node(nodeTo)
                if (nexus.nodeFrom.toString() === node.id) {
                    //    current node(nodeFrom) ====> O
                    const outboundNode = await _getNode(nexus.nodeTo)
                    outboundNodesIds.push(outboundNode.id)
                }
            } catch (err) {
                console.error(err.message)
            }
        }
        ))
    }
    return outboundNodesIds
}


//  this helper function is to check 
//  if there is any nexus existing between two nodes
//  so the minimal number of cycle is 3 nodes
//  takes string represented ids 
const _isNexusExisting = async (nodeFrom, nodeTo) => {
    let existing = false
    const outboundNodesOfCurNode = await _getAllOutboundNodes(nodeFrom)
    // console.log(outboundNodesOfCurNode)

    if (outboundNodesOfCurNode.length) {
        existing = outboundNodesOfCurNode.some(id => id === nodeTo.toString())
    }

    const outboundNodesOfDestNode = await _getAllOutboundNodes(nodeTo)
    if (outboundNodesOfDestNode.length) {
        existing = outboundNodesOfDestNode.some(id => id === nodeFrom.toString())
    }

    return existing
}

module.exports = {
    _getNexusObject,
    _getNode,
    _getNodeWord,
    _getAllNexusIdPairs,
    _deleteSingleOutboundNexus,
    _monitorUserLevel,
    _isNexusExisting
}