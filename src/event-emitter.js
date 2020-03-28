import EventEmitter from 'events'

const eventEmitter = new EventEmitter()

eventEmitter.setMaxListeners(15)

export default eventEmitter
