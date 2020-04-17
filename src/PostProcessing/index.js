import * as THREE from 'three'

import LoadManager from '../LoadManager'
import eventEmitter from '../event-emitter'
import Effect from './Effect'

import {
  EVT_RAF_UPDATE_APP,
  EVT_SINGLE_PROJECT_MASK_OPENING,
  EVT_SINGLE_PROJECT_MASK_CLOSING,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_ON_SCENE_DRAG_START,
  EVT_ON_SCENE_DRAG_END,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_RENDER_PHOTO_SCENE_FRAME,
  EVT_RENDER_PHOTO_POSTFX_FRAME,
  EVT_OPENING_INFO_SECTION,
  EVT_CLOSING_INFO_SECTION,
  EVT_APP_RESIZE,
  EVT_HIDE_CURSOR,
  EVT_SHOW_CURSOR,
} from '../constants'

import {
  mapNumber,
  isMobileBrowser,
  getInfoSectionAlphaCutoffMask,
} from '../helpers'

import transitionMaskSource from '../assets/mask7.png'

import store from '../store'

import vertexShader from './vertexShader.glsl'
import fragmentShaderPostFX from './postfx-fragmentShader.glsl'
import fragmentShaderBlur from './postfx-fragmentBlurShader.glsl'

const mobileDetect = isMobileBrowser()

export default class PostProcessing {
  static HIDDEN_CURSOR_SIZE = 0
  static DEFAULT_CURSOR_SIZE = 25 * (devicePixelRatio)
  static HOVER_CURSOR_SIZE = 50 * (devicePixelRatio)
  static DRAG_CURSOR_SIZE = 22 * (devicePixelRatio)

  constructor ({
    width,
    height,
  }) {
    const dpr = devicePixelRatio
    const cursorSizeTarget = mobileDetect ? PostProcessing.HIDDEN_CURSOR_SIZE : PostProcessing.DEFAULT_CURSOR_SIZE
    this._mainEffect = new Effect({
      width,
      height,
      uniforms: {
        u_time: { value: 0.0 },
        u_tDiffusePhoto: { value: null },
        u_tDiffuseMask: { value: null },
        u_resolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_cursorSize: { value: cursorSizeTarget },
        u_hoverMixFactor: { value: 1.0 },
        u_blurMixFactor: { value: 0.0 },
        u_cutOffFactor: { value: 0.0 },
      },
      vertexShader,
      fragmentShader: fragmentShaderPostFX,
    })
    this._blurEffect = new Effect({
      width,
      height,
      uniforms: {
        u_resolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
        u_tDiffuse: { value: null },
        u_blurMixFactor: { value: 0.0 },
        u_tDiffuseMask: { value: getInfoSectionAlphaCutoffMask() },
        u_direction: { value: new THREE.Vector2() },
      },
      vertexShader,
      fragmentShader: fragmentShaderBlur,
    })

    LoadManager.loadTexture(transitionMaskSource).then(texture => {
      this._mainEffect.uniforms.u_tDiffuseMask.value = texture
      this._mainEffect.needsUpdate = true
    })

    this._cursorSizeTarget = cursorSizeTarget
    this._cursorScanlineTarget = 0
    this._isHidden = false
    this._preventClick = false
    this._cachedHiddenSize = 0
    this._currCutOffFactor = 0

    eventEmitter.on(EVT_CLOSE_SINGLE_PROJECT, this._onCloseSingleProject)
    eventEmitter.on(EVT_SINGLE_PROJECT_MASK_CLOSING, this._onClosingSingleProject)
  eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpenSingleProject)
    eventEmitter.on(EVT_SINGLE_PROJECT_MASK_OPENING, this._onOpeningSingleProject)
    eventEmitter.on(EVT_ON_SCENE_DRAG_START, this._onDragStart)
    eventEmitter.on(EVT_ON_SCENE_DRAG_END, this._onDragEnd)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_ENTER, this._onProjectHoverEnter)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_LEAVE, this._onProjectHoverLeave)
    eventEmitter.on(EVT_HIDE_CURSOR, this._hideCursor)
    eventEmitter.on(EVT_SHOW_CURSOR, this._showCursor)
    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_RENDER_PHOTO_SCENE_FRAME, ({ texture }) => this._updateFrameTexture('u_tDiffusePhoto', '_mainEffect', texture))
    eventEmitter.on(EVT_RENDER_PHOTO_POSTFX_FRAME, ({ texture }) => this._updateFrameTexture('u_tDiffuse', '_blurEffect', texture))
    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
    eventEmitter.on(EVT_OPENING_INFO_SECTION, this._onBlur)
    eventEmitter.on(EVT_CLOSING_INFO_SECTION, this.onUnblur)
  }
  get mainEffectPlane () {
    return this._mainEffect
  }
  get blurEffect () {
    return this._blurEffect
  }
  setBlurDirection = ({ x, y }) => {
    this._blurEffect.uniforms.u_direction.value.set(x, y)
  }
  _onBlur = ({ tweenFactor }) => {
    this._mainEffect.uniforms.u_blurMixFactor.value = tweenFactor
    this._blurEffect.uniforms.u_blurMixFactor.value = tweenFactor
  }
  onUnblur = ({ tweenFactor }) => {
    this._mainEffect.uniforms.u_blurMixFactor.value = 1 - tweenFactor
    this._blurEffect.uniforms.u_blurMixFactor.value = 1 - tweenFactor
  }
  _updateFrameTexture = (uniformName, effectName, texture) => {
    this[effectName].uniforms[uniformName].value = texture
  }
  _onCloseSingleProject = () => {
    this._preventClick = false
  }
  _onClosingSingleProject = ({ tweenFactor }) => {
    const tween = this._currCutOffFactor - mapNumber(tweenFactor, 0, 1, 0, this._currCutOffFactor)
    this._mainEffect.uniforms.u_cutOffFactor.value = tween
  }
  _onOpenSingleProject = () => {
    this._preventClick = true
  }
  _onOpeningSingleProject = ({ tweenFactor }) => {
    this._currCutOffFactor = tweenFactor
    this._mainEffect.uniforms.u_cutOffFactor.value = tweenFactor
  }
  _onDragStart = () => {
    if (this._isHidden || this._preventClick || mobileDetect) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DRAG_CURSOR_SIZE
  }
  _onDragEnd = () => {
    if (this._isHidden || this._preventClick || mobileDetect) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
  }
  _onProjectHoverEnter = () => {
    if (this._isHidden || mobileDetect) {
      return
    }
    this._cursorSizeTarget = PostProcessing.HOVER_CURSOR_SIZE
    this._cursorScanlineTarget = 1
  }
  _onProjectHoverLeave = () => {
    if (this._isHidden || mobileDetect) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
    this._cursorScanlineTarget = 0
  }
  _hideCursor = () => {
    if (mobileDetect) {
      return
    }
    this._cachedHiddenSize = this._cursorSizeTarget
    this._cursorSizeTarget = PostProcessing.HIDDEN_CURSOR_SIZE
    this._isHidden = true
  }
  _showCursor = () => {
    if (mobileDetect) {
      return
    }
    this._cursorSizeTarget = this._cachedHiddenSize
    this._isHidden = false
  }
  _onUpdate = (ts, dt) => {
    const {
      mousePositionX,
      mousePositionY,
    } = store.getState()

    const dpr = devicePixelRatio
    const x = mousePositionX * dpr
    const y = (innerHeight - mousePositionY) * dpr

    if (mobileDetect) {
      // ...
      // this._mainEffect.uniforms.u_mouse.value.x = x
      // this._mainEffect.uniforms.u_mouse.value.y = y
    } else {
      this._mainEffect.uniforms.u_mouse.value.x += (mousePositionX - this._mainEffect.uniforms.u_mouse.value.x) * (dt * 25)
      this._mainEffect.uniforms.u_mouse.value.y += (mousePositionY - this._mainEffect.uniforms.u_mouse.value.y) * (dt * 25)
    }

    this._mainEffect.uniforms.u_time.value = ts
    this._mainEffect.uniforms.u_cursorSize.value += (this._cursorSizeTarget - this._mainEffect.uniforms.u_cursorSize.value) * (dt * 10)
    this._mainEffect.uniforms.u_hoverMixFactor.value += (this._cursorScanlineTarget - this._mainEffect.uniforms.u_hoverMixFactor.value) * (dt * 10)
  }
  _onResize = () => {
    this._mainEffect.onResize()
    // this._blurEffect.onResize({ shouldScale: false })
  }
}