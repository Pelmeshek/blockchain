const crypto = require('crypto')
const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port')
const readline = require('readline')

/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */
const peersAB = {}
const peersDA = {}
// Counter for connections, used for identify connections
let connSeq = 0

// Peer Identity, a random hash for identify your peer
const myId = crypto.randomBytes(32)
console.log('Your identity: ' + myId.toString('hex'))

// reference to redline interface
let rl
/**
 * Function for safely Fcall console.log with readline interface active
 */
function log () {
  if (rl) {
    rl.clearLine()    
    rl.close()
    rl = undefined
  }
  for (let i = 0, len = arguments.length; i < len; i++) {
    console.log(arguments[i])
  }
  askUser()
}

/*
* Function to get text input from user and send it to other peers
* Like a chat :)
*/
const askUser = async () => {
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.question('Send message: ', message => {
    // Broadcast to peers
    for (let id in peersAB) {
      peersAB[id].conn.write(message)
    }
    for (let id in peersDA) {
      peersDA[id].conn.write(message)
    }
    rl.close()
    rl = undefined
    askUser()
  });
}

/** 
 * Default DNS and DHT servers
 * This servers are used for peer discovery and establishing connection
 */
const config = defaults({
  // peer-id
  id: myId,
})

/**
 * discovery-swarm library establishes a TCP p2p connection and uses
 * discovery-channel library for peer discovery
 */
const swAB = Swarm(config)


;(async () => {

  // Choose a random unused port for listening TCP peer connections
  const port = await getPort()

  swAB.listen(port)
  console.log('Listening to port: ' + port)

  /**
   * The channel we are connecting to.
   * Peers should discover other peers in this channel
   */
  //sw.join('channelBC')
  swAB.join('channelAB')

  swAB.on('connection', (conn, info) => {
    // Connection id
    const seq = connSeq

    const peerId = info.id.toString('hex')
    log(`Connected #${seq} to peer: ${peerId}`)

    // Keep alive TCP connection with peer
    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600)
      } catch (exception) {
        log('exception', exception)
      }
    }

    conn.on('data', data => {
      // Here we handle incomming messages
      log(
        'Received Message from peer ' + peerId,
        '----> ' + data.toString()
      )
    })

    conn.on('close', () => {
      // Here we handle peer disconnection
      log(`Connection ${seq} closed, peer id: ${peerId}`)
      // If the closing connection is the last connection with the peer, removes the peer
      if (peersAB[peerId].seq === seq) {
        delete peersAB[peerId]
      }
    })

    // Save the connection
    if (!peersAB[peerId]) {
      peersAB[peerId] = {}
    }
    peersAB[peerId].conn = conn
    peersAB[peerId].seq = seq
    connSeq++

  })

  // Read user message from command line
  askUser()  

})()

const swAD = Swarm(config)


;(async () => {

  // Choose a random unused port for listening TCP peer connections
  const port = await getPort()

  swAD.listen(port)
  console.log('Listening to port: ' + port)

  /**
   * The channel we are connecting to.
   * Peers should discover other peers in this channel
   */
  //sw.join('channelBC')
  swAD.join('channelDA')

  swAD.on('connection', (conn, info) => {
    // Connection id
    const seq = connSeq

    const peerId = info.id.toString('hex')
    log(`Connected #${seq} to peer: ${peerId}`)

    // Keep alive TCP connection with peer
    if (info.initiator) {
      try {
        conn.setKeepAlive(true, 600)
      } catch (exception) {
        log('exception', exception)
      }
    }

    conn.on('data', data => {
      // Here we handle incomming messages
      log(
        'Received Message from peer ' + peerId,
        '----> ' + data.toString()
      )
            // Broadcast to peers
    	for (let id in peersAB) {
    		if(id != peerId){
      		peersAB[id].conn.write(data.toString())
      	}
    	}
    })

    conn.on('close', () => {
      // Here we handle peer disconnection
      log(`Connection ${seq} closed, peer id: ${peerId}`)
      // If the closing connection is the last connection with the peer, removes the peer
      if (peersDA[peerId].seq === seq) {
        delete peersDA[peerId]
      }
    })

    // Save the connection
    if (!peersDA[peerId]) {
      peersDA[peerId] = {}
    }
    peersDA[peerId].conn = conn
    peersDA[peerId].seq = seq
    connSeq++

  })

  // Read user message from command line
  askUser()  

})()
