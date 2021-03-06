import chai from 'chai'
import type Libp2p from 'libp2p'

import getLibp2p from '../../src/libp2p/nodejs'
import { Room } from '../../src'

function sleep<T> (ms: number, ...args: T[]): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(...args), ms))
}

const { assert, expect } = chai

const msg =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Maecenas eget lacus lacus. Nullam vehicula est nunc. Integer a finibus odio, non fermentum felis. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Curabitur efficitur sem dolor, et blandit nunc tincidunt vel. Praesent lacinia augue id lorem scelerisque finibus. Ut lobortis dolor ipsum. Integer euismod sollicitudin ligula, ut viverra mauris aliquet id. Etiam faucibus eros nec odio consequat commodo. Duis congue sit amet tortor quis semper. Nulla ac leo sit amet erat tristique pulvinar id quis erat. Morbi venenatis augue vel metus mollis molestie. Donec finibus dapibus purus. Nam volutpat vitae elit nec faucibus. Duis eget bibendum diam. Quisque elementum ac elit et faucibus. Sed sagittis lacus vel scelerisque vestibulum. Proin vehicula lacus luctus, placerat ex et, pulvinar lacus. Nunc ornare commodo lacus, vel molestie mauris dapibus sed. Pellentesque molestie a libero quis facilisis. Ut mi purus, varius in nisi et, interdum eleifend eros. Integer volutpat eros felis, ut euismod nibh tincidunt sit amet. Mauris a est eros. Etiam imperdiet tincidunt ante quis facilisis. Vestibulum id nisl sed diam faucibus placerat. Nullam a interdum erat. Phasellus maximus mauris at dignissim imperdiet. Nunc commodo eu augue ut volutpat. Sed in sagittis nisi. Cras non ante molestie, pharetra dolor sed, interdum ex. Sed cursus ipsum odio, id viverra libero venenatis sed. Suspendisse ipsum dolor, hendrerit a purus sit amet, venenatis vulputate sapien. Pellentesque quis quam non dolor euismod fringilla vel a leo. Orci varius natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Nam ornare tincidunt libero, ac dictum nisl pellentesque vel. Sed congue dui sed nisl faucibus, ut vehicula lorem eleifend. Praesent vulputate ultrices commodo. Ut augue massa, gravida nec sapien quis, tempor viverra justo. Donec eros felis, aliquam quis lectus sit amet, laoreet pulvinar orci. Sed ac lacinia massa. Sed aliquet, orci eget eleifend pretium, mauris lectus dapibus enim, quis efficitur magna orci quis est. Curabitur eros elit, consequat a vulputate nec, euismod et velit. Fusce ac iaculis magna. Proin ut tellus eget sem mattis iaculis. Cras dapibus ipsum vel finibus lacinia.Duis porttitor blandit lacus, vitae lacinia justo pharetra a. Integer nec blandit quam. Maecenas et laoreet odio, et consectetur tortor. Fusce ut sapien ut nisl aliquam gravida eu at quam. Donec id felis arcu. Etiam sit amet eros ut ex sodales sagittis. Suspendisse scelerisque, justo ac dapibus rutrum, leo neque fermentum enim, ut varius leo tortor sed felis. Sed nec orci nec libero bibendum pharetra. Nam interdum nibh in magna sodales ultrices. Nulla sollicitudin nunc nunc. Sed urna mi, iaculis in nisl id, condimentum commodo tortor. Nulla auctor ipsum et imperdiet dignissim. Mauris sit amet ipsum auctor, cursus tortor sed, egestas nunc. Nunc fringilla rhoncus enim vitae eleifend.'

const libp2pconfig = {
  addresses: {
    // TODO: remove
    // add a listen address (localhost) to accept TCP connections on a random port
    listen: ['/ip4/127.0.0.1/tcp/0']
  },
  config: { peerDiscovery: { bootstrap: { enabled: false } } }
}

const libp2pconfigPubsubOff = {
  addresses: {
  // TODO: remove
  // add a listen address (localhost) to accept TCP connections on a random port
    listen: ['/ip4/127.0.0.1/tcp/0']
  },
  config: {
    pubsub: { enabled: false }, peerDiscovery: { bootstrap: { enabled: false } }
  }
}

describe('PubSub messaging', function () {
  this.timeout(5000)
  const roomName = '0x0'
  const roomName2 = '0x1'
  let l1: Libp2p
  let l2: Libp2p
  let l3: Libp2p
  let provider: Room
  let consumer1: Room
  let consumer2: Room
  let consumer3: Room

  before(async function () {
    this.timeout(10000)

    l1 = await getLibp2p(libp2pconfig)
    l2 = await getLibp2p(libp2pconfig)
    l3 = await getLibp2p(libp2pconfig)
    provider = new Room(l1, roomName, { pollInterval: 100 })
    consumer1 = new Room(l2, roomName, { pollInterval: 100 })
    consumer2 = new Room(l2, roomName2, { pollInterval: 100 })
    consumer3 = new Room(l3, roomName2, { pollInterval: 100, ignoreSelfMessages: true })
    await sleep(1000)
  })

  it('should have correct room peers', () => {
    expect(provider.peers).to.have.members([consumer1.peerId])
    expect(consumer2.peers).to.have.members([consumer3.peerId])
  })

  it('should identify correct peers in room', () => {
    expect(provider.hasPeer(consumer1.peerId)).to.equal(true)
    expect(provider.hasPeer(consumer2.peerId)).to.equal(true)
    expect(provider.hasPeer(consumer3.peerId)).to.equal(false)
  })

  it('consumer in a room should receive messages provider broadcasts', async () => {
    const promise = consumer1.once('message')
    provider.broadcast(msg)
    const message = await promise

    expect(message).to.have.property('from', provider.peerId)
    expect(message)
      .to.have.property('data')
      .to.eql(msg)
    expect(message).to.have.property('seqno')
    expect(message)
      .to.have.property('topicIDs')
      .to.eql([roomName])
  })

  it('consumer not in a room should not receive messages provider broadcasts', async () => {
    const promise = consumer2.once('message')
    provider.broadcast('message')
    const out = await Promise.race([promise, sleep(1000, false)])

    expect(out).to.equal(false)
  })

  it('peer joined and peer left events in a room', async () => {
    const l3 = await getLibp2p(libp2pconfig)
    let promise = provider.once('peer:joined')
    const tmpCons = new Room(l3, roomName)
    expect(await promise).to.equal(tmpCons.peerId)

    promise = provider.once('peer:left')
    tmpCons.leave()
    expect(await promise).to.equal(tmpCons.peerId)
  })

  it('peer joined and peer left should not be observed in second room', async () => {
    const l3 = await getLibp2p(libp2pconfig)
    let promise = provider.once('peer:joined')
    const tmpCons = new Room(l3, roomName2)
    let out = await Promise.race([promise, sleep(800, false)])
    expect(out).to.equal(false)

    promise = provider.once('peer:left')
    tmpCons.leave()
    out = await Promise.race([promise, sleep(800, false)])
    expect(out).to.equal(false)
  })

  it('should throw on non JSON message', async () => {
    const promise = consumer1.once('error')
    await l1.pubsub.publish(roomName, Buffer.from('{hello'))

    const err = await promise

    expect(err).to.be.instanceof(Error)
  })

  it('should receive self broadcasted message', async () => {
    const promise = provider.once('message')
    provider.broadcast(msg)
    const message = await promise

    expect(message).to.have.property('from', provider.peerId)
    expect(message)
      .to.have.property('data')
      .to.eql(msg)
    expect(message).to.have.property('seqno')
    expect(message)
      .to.have.property('topicIDs')
      .to.eql([roomName])
  })

  it('should not receive self broadcasted message', async () => {
    const promise = consumer3.once('message')
    consumer3.broadcast(msg)
    const res = await Promise.race([promise, sleep(1000, false)])
    expect(res).to.equal(false)
  })

  // This needs to be last test otherwise it can negatively affect other tests
  it('should throw on libp2p without pubsub', async () => {
    const l4 = await getLibp2p(libp2pconfigPubsubOff)
    assert.throws(() => new Room(l4, 'any'), Error)
  })
})
