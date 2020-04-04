import * as THREE from 'three'

import eventEmitter from '../event-emitter'
import Effect from './Effect'

import {
  EVT_RAF_UPDATE_APP,
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_SLIDER_BUTTON_MOUSE_ENTER,
  EVT_SLIDER_BUTTON_MOUSE_LEAVE,
  EVT_ON_SCENE_DRAG_START,
  EVT_ON_SCENE_DRAG_END,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_MOUSEMOVE_APP,
  EVT_RENDER_PHOTO_SCENE_FRAME,
  EVT_RENDER_PHOTO_POSTFX_FRAME,
  EVT_OPENING_INFO_SECTION,
  EVT_APP_RESIZE,
} from '../constants'

import {
  mapNumber,
} from '../helpers'

import vertexShader from './vertexShader.glsl'
import fragmentShaderPostFX from './postfx-fragmentShader.glsl'
import fragmentShaderBlur from './postfx-fragmentBlurShader.glsl'

export default class PostProcessing {
  static HIDDEN_CURSOR_SIZE = 0
  static DEFAULT_CURSOR_SIZE = 25 * (devicePixelRatio || 1)
  static HOVER_CURSOR_SIZE = 80 * (devicePixelRatio || 1)
  static DRAG_CURSOR_SIZE = 33 * (devicePixelRatio || 1)

  constructor ({
    width,
    height,
  }) {
    const dpr = devicePixelRatio || 1
    this._mainEffect = new Effect({
      width,
      height,
      uniforms: {
        u_time: { value: 0.0 },
        u_tDiffusePhoto: { value: null },
        u_tDiffuseMask: { value: null },
        u_resolution: { value: new THREE.Vector2(width * dpr, height * dpr) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_cursorSize: { value: PostProcessing.DEFAULT_CURSOR_SIZE },
        u_hoverMixFactor: { value: 1.0 },
        u_blurMixFactor: { value: 0.0 },
        u_cutOffFactor: { value: 0.0 },
      },
      transparent: true,
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
        u_direction: { value: new THREE.Vector2() },
      },
      vertexShader,
      fragmentShader: fragmentShaderBlur,
    })

    new THREE.TextureLoader().load('/mask3.png', texture => {
      this._mainEffect.uniforms.u_tDiffuseMask.value = texture
    })

    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
    this._cursorTargetPosition = new THREE.Vector2(0, 0)
    this._cursorScanlineTarget = 0
    this._isHidden = false
    this._preventClick = false
    this._cachedHiddenSize = 0
    this._currCutOffFactor = 0

    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, this._onClosingSingleProject)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpenSingleProject)
    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, this._onOpeningSingleProject)
    eventEmitter.on(EVT_ON_SCENE_DRAG_START, this._onDragStart)
    eventEmitter.on(EVT_ON_SCENE_DRAG_END, this._onDragEnd)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_ENTER, this._onProjectHoverEnter)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_LEAVE, this._onProjectHoverLeave)
    eventEmitter.on(EVT_SLIDER_BUTTON_MOUSE_ENTER, this._hideCursor)
    eventEmitter.on(EVT_SLIDER_BUTTON_MOUSE_LEAVE, this._showCursor)
    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_MOUSEMOVE_APP, this._onMouseMove)
    eventEmitter.on(EVT_RENDER_PHOTO_SCENE_FRAME, ({ texture }) => this._updateFrameTexture('u_tDiffusePhoto', '_mainEffect', texture))
    eventEmitter.on(EVT_RENDER_PHOTO_POSTFX_FRAME, ({ texture }) => this._updateFrameTexture('u_tDiffuse', '_blurEffect', texture))
    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
    eventEmitter.on(EVT_OPENING_INFO_SECTION, this._onBlur)
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
  _updateFrameTexture = (uniformName, effectName, texture) => {
    this[effectName].uniforms[uniformName].value = texture
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
    if (this._isHidden || this._preventClick) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DRAG_CURSOR_SIZE
  }
  _onDragEnd = () => {
    if (this._isHidden || this._preventClick) {
      return
    }
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
  }
  _onMouseMove = ({ mouseX, mouseY }) => {
    const dpr = devicePixelRatio || 1
    this._cursorTargetPosition.x = mouseX * dpr
    this._cursorTargetPosition.y = (innerHeight - mouseY) * dpr
  }
  _onProjectHoverEnter = () => {
    if (this._isHidden) {
      return
    }
    this._cursorSizeTarget = PostProcessing.HOVER_CURSOR_SIZE
    this._cursorScanlineTarget = 1
  }
  _onProjectHoverLeave = () => {
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
    this._mainEffect.uniforms.u_time.value = ts
    this._mainEffect.uniforms.u_cursorSize.value += (this._cursorSizeTarget - this._mainEffect.uniforms.u_cursorSize.value) * (dt * 10)
    this._mainEffect.uniforms.u_hoverMixFactor.value += (this._cursorScanlineTarget - this._mainEffect.uniforms.u_hoverMixFactor.value) * (dt * 10)
    this._mainEffect.uniforms.u_mouse.value.x += (this._cursorTargetPosition.x - this._mainEffect.uniforms.u_mouse.value.x) * (dt * 12)
    this._mainEffect.uniforms.u_mouse.value.y += (this._cursorTargetPosition.y - this._mainEffect.uniforms.u_mouse.value.y) * (dt * 12)
  }
  _onResize = () => {
    this.this._mainEffect.onResize()
  }
}