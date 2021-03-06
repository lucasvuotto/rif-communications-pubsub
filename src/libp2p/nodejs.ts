import WS from 'libp2p-websockets'
import TCP from 'libp2p-tcp'
import MulticastDNS from 'libp2p-mdns'
import Multiplex from 'libp2p-mplex'
import { NOISE } from 'libp2p-noise'
import SECIO from 'libp2p-secio'
import KadDHT from 'libp2p-kad-dht'
import GossipSub from 'libp2p-gossipsub'
import Bootstrap from 'libp2p-bootstrap'

import { createLibP2P } from '../utils'
import Libp2p from 'libp2p'
import _ from 'lodash'

// Reccommended config as per https://github.com/ipfs/js-ipfs/blob/master/packages/ipfs/src/core/runtime/libp2p-nodejs.js

const config = {
  dialer: {
    maxParallelDials: 150, // 150 total parallel multiaddr dials
    maxDialsPerPeer: 4, // Allow 4 multiaddrs to be dialed per peer in parallel
    dialTimeout: 10e3 // 10 second dial timeout per peer dial
  },
  modules: {
    transport: [
      TCP,
      WS
    ],
    streamMuxer: [Multiplex],
    connEncryption: [
      SECIO,
      NOISE
    ],
    peerDiscovery: [Bootstrap, MulticastDNS],
    dht: KadDHT,
    pubsub: GossipSub
  },
  config: {
    peerDiscovery: {
      autoDial: true,
      [MulticastDNS.tag]: {
        enabled: true
      },
      bootstrap: {
        enabled: true
      }
    },
    dht: { // The DHT options (and defaults) can be found in its documentation
      kBucketSize: 20,
      enabled: true,
      randomWalk: {
        enabled: true, // Allows to disable discovery (enabled by default)
        interval: 300e3,
        timeout: 10e3
      }
    },
    pubsub: {
      enabled: true,
      emitSelf: true
    }
  },
  metrics: {
    enabled: true
  },
  peerStore: {
    persistence: true
  }
}

export default (conf?: any): Promise<Libp2p> => createLibP2P(_.merge(config, conf))
