import * as THREE from 'three'

import eventEmitter from '../event-emitter'

import {
  EVT_RAF_UPDATE_APP,
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_SLIDER_BUTTON_MOUSE_ENTER,
  EVT_SLIDER_BUTTON_MOUSE_LEAVE,
  EVT_ON_SCENE_DRAG_START,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
} from '../constants'

import {
  clampNumber,
  mapNumber,
} from '../helpers'

import vertexShader from './vertexShader.glsl'
import fragmentShader from './fragmentShader.glsl'

export default class PostProcessing extends THREE.Mesh {
  static HIDDEN_CURSOR_SIZE = 0
  static DEFAULT_CURSOR_SIZE = 25 * (devicePixelRatio || 1)
  static HOVER_CURSOR_SIZE = 80 * (devicePixelRatio || 1)
  static DRAG_CURSOR_SIZE = 45 * (devicePixelRatio || 1)

  constructor ({
    width,
    height,
  }) {
    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_tDiffuseClip: { value: null },
        u_tDiffusePhoto: { value: null },
        u_tDiffuseCursor: { value: null },
        u_tDiffuseMask: { value: null },
        u_resolution: { value: new THREE.Vector2(width, height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_cursorSize: { value: PostProcessing.DEFAULT_CURSOR_SIZE },
        u_hoverMixFactor: { value: 1.0 },
        u_cutOffFactor: { value: 0.0 },
      },
      transparent: true,
      vertexShader,
      fragmentShader,
    })
    new THREE.TextureLoader().load('/mask3.png', texture => {
      material.uniforms.u_tDiffuseMask.value = texture
    })
    
    super(geometry, material)

    const setCutOffFactor = tweenFactor => {
      material.uniforms.u_cutOffFactor.value = tweenFactor
    }

    let currCutOffFactor = 0

    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, ({ tweenFactor }) => {
      currCutOffFactor = tweenFactor
      setCutOffFactor(tweenFactor)
    })
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, () => {
      this._preventClick = true
    })
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, ({ tweenFactor }) => {
      const tween = currCutOffFactor - mapNumber(tweenFactor, 0, 1, 0, currCutOffFactor)
      setCutOffFactor(tween)
    })
    
    eventEmitter.on(EVT_ON_SCENE_DRAG_START, this._onDragStart)
    eventEmitter.on(EVT_SLIDER_BUTTON_MOUSE_ENTER, this._hideCursor)
    eventEmitter.on(EVT_SLIDER_BUTTON_MOUSE_LEAVE, this._showCursor)
    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)

    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
    this._cursorScanlineTarget = 0
    this._isHidden = false
    this._preventClick = false
    this._cachedHiddenSize = 0
  }
  _onDragStart () {
    if (this._isHidden || this._preventClick) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DRAG_CURSOR_SIZE
  }
  onDragEnd () {
    if (this._isHidden || this._preventClick) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
  }
  hover () {
    if (this._isHidden) {
      return
    }
    this._cursorSizeTarget = PostProcessing.HOVER_CURSOR_SIZE
    this._cursorScanlineTarget = 1
  }
  unHover () {
    if (this._isHidden) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
    this._cursorScanlineTarget = 0
  }
  _hideCursor = () => {
    this._cachedHiddenSize = this._cursorSizeTarget
    this._cursorSizeTarget = PostProcessing.HIDDEN_CURSOR_SIZE
    this._isHidden = true
  }
  _showCursor = () => {
    this._cursorSizeTarget = this._cachedHiddenSize
    this._isHidden = false
  }
  _onUpdate = (ts, dt) => {
    this.material.uniforms.u_cursorSize.value += (this._cursorSizeTarget - this.material.uniforms.u_cursorSize.value) * (dt * 10)
    this.material.uniforms.u_hoverMixFactor.value += (this._cursorScanlineTarget - this.material.uniforms.u_hoverMixFactor.value) * (dt * 10)
  }
}