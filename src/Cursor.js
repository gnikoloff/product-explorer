import * as THREE from 'THREE'

import eventEmitter from './event-emitter'

import store from './store'

import {
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_RAF_UPDATE_APP,
  LAYOUT_MODE_OVERVIEW,
  LAYOUT_MODE_GRID,
} from './constants'

import {
  getHoverLabel,
} from './helpers'
import { compose } from 'redux'

export default class Cursor extends THREE.Mesh {
  static HOVER_OFFSET = 15

  constructor ({
    width = 114,
    height = 24,
  } = {}) {
    const geometry = new THREE.PlaneBufferGeometry(width, height)
    const material = new THREE.MeshBasicMaterial({
      map: getHoverLabel(),
      opacity: 1,
      transparent: true,
    })
    geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(width / 2, 0, 0))
    super(geometry, material)

    this.rotation.set(0, 0, 0)

    this._width = width
    this._height = height
    this._isHover = false

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_ENTER, this._onProjectHover)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_LEAVE, this._onProjectLeave)
  }
  _onProjectHover = () => {
    this._isHover = true
  }
  _onProjectLeave = () => {
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      if (this._unhoverTimeout) {
        return
      }
      this._unhoverTimeout = setTimeout(() => {
        this._isHover = false
        clearTimeout(this._unhoverTimeout)
        this._unhoverTimeout = null
      }, 200)
    } else if (layoutMode === LAYOUT_MODE_GRID) {
      this._isHover = false
    }
  }
  _onUpdate = (ts, dt) => {
    const {
      mousePositionX,
      mousePositionY,
      cameraPositionX,
      cameraPositionY,
    } = store.getState()

    const targetRotate = this._isHover ? 0 : -0.05
    const targetYOffset = this._isHover ? 0 : 10
    const targetOpacity = this._isHover ? 1 : 0
    this.rotation.z += (targetRotate - this.rotation.z) * (dt * 12.5)

    const x = mousePositionX - innerWidth / 2 + cameraPositionX + Cursor.HOVER_OFFSET
    const y = innerHeight - mousePositionY - innerHeight / 2 + cameraPositionY - this._height / 2 - Cursor.HOVER_OFFSET - targetYOffset
    
    this.position.x += (x - this.position.x) * (dt * 8)
    this.position.y += (y - this.position.y) * (dt * 8)

    // this.position.y += (- - this.position.y) * (dt * 15)
    this.material.opacity += (targetOpacity - this.material.opacity) * (dt * 15)
  }
}
