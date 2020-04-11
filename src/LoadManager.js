import * as THREE from 'three'

import eventEmitter from './event-emitter'

import {
  EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT,
  EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT,
} from './constants'

export default class LoadManager {
  static loadTexture = url => new Promise(resolve =>
    new THREE.TextureLoader().load(url, texture => resolve(texture)
  ))
  constructor ({
    onLoadComplete
  }) {
    this._initialThingsToLoadCount = 0
    this._currentLoadedThingIdx = 0

    eventEmitter.on(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, this._addToInitialResources)
    eventEmitter.on(EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT, this._incrementLoadedInitialResourcesCount)

    this._onLoadComplete = onLoadComplete
    
  }
  _addToInitialResources = count => {
    this._initialThingsToLoadCount += count
  }
  _incrementLoadedInitialResourcesCount = () => {
    const progress = this._currentLoadedThingIdx / (this._initialThingsToLoadCount - 1)
    if (progress === 1) {
      this._onLoadComplete()
    }
    this._currentLoadedThingIdx++
  }
}