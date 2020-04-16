import * as THREE from 'three'
import { tween, easing, chain, delay } from 'popmotion'

import eventEmitter from '../event-emitter'

import {
  getProductLabelTexture,
  isMobileBrowser,
} from '../helpers'

import store from '../store'

import {
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_TEXTURE_LABEL_MASK_ONLOAD,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_LAYOUT_MODE_TRANSITION_REQUEST,
  EVT_PHOTO_PREVIEW_RELAYOUTED,
  LAYOUT_MODE_OVERVIEW,
  LAYOUT_MODE_GRID,
  EVT_FADE_IN_SCENE,
} from '../constants'

import vertexShader from './vertexShader.glsl'
import fragmentShader from './fragmentShader.glsl'

const mobileBrowserDetected = isMobileBrowser()

export default class PhotoLabel extends THREE.Mesh {
  constructor ({
    modelName,
    position,
    initialOpacity,
  }) {
    const isMobile = store.getState()
    const width = isMobile ? 384 / 2.5 : 256 / 2.5
    const height = isMobile ? 96 / 2.5 : 64 / 2.5
    const geometry = new THREE.PlaneBufferGeometry(width, height)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_tDiffuse: { value: null },
        u_mask: { value: null },
        u_maskBlendFactor: { value: mobileBrowserDetected ? initialOpacity : 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    })

    getProductLabelTexture(modelName).then(texture => {
      material.uniforms.u_tDiffuse.value = texture
      material.needsUpdate = true
    })

    super(geometry, material)

    this._width = width
    this._height = height

    this.position.copy(position)

    this._openTween = null
    this._closeTween = null

    this._modelName = modelName
    this._isLabel = true

    eventEmitter.on(EVT_TEXTURE_LABEL_MASK_ONLOAD, this._onMaskTextureLoad)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_ENTER, this._onProjectHover)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_LEAVE, this._onProjectUnhover)
    eventEmitter.on(EVT_LAYOUT_MODE_TRANSITION_REQUEST, this._onRelayoutRequest)
    eventEmitter.on(EVT_PHOTO_PREVIEW_RELAYOUTED, this._onRelayout)
    eventEmitter.on(EVT_FADE_IN_SCENE, this._fadeIn)
  }
  get modelName () {
    return this._modelName
  }
  get isLabel () {
    return this._isLabel
  }
  get x () {
    return this.position.x
  }
  get y () {
    return this.position.y
  }
  get width () {
    return this._width
  }
  get height () {
    return this._height
  }
  set opacity (opacity) {
    this.material.uniforms.u_maskBlendFactor.value = opacity
  }
  _fadeIn = () => {
    if (!mobileBrowserDetected) {
      return
    }
    chain(
      delay(200),
      tween({
        duration: 250,
        easing: easing.circIn,
      })
    ).start({
      update: tweenFactor => {
        this.material.uniforms.u_maskBlendFactor.value = tweenFactor
      },
      complete: () => {
        // this._revealTween = null
      },
    })
  }
  _onMaskTextureLoad = ({ texture }) => {
    this.material.uniforms.u_mask.value = texture
    this.material.needsUpdate = true
  }
  _onProjectHover = ({ modelName }) => {
    if (mobileBrowserDetected) {
      return
    }
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      return
    }
    if (this._modelName !== modelName) {
      this._onProjectUnhover()
      return
    }
    if (this._openTween) {
      return
    }
    if (this._closeTween) {
      this._closeTween.stop()
      this._closeTween = null
    }
    this._isOpened = true
    this._openTween = tween({
      duration: 250,
      easing: easing.circIn,
    }).start({
      update: tweenFactor => {
        this.material.uniforms.u_maskBlendFactor.value = tweenFactor
      },
      complete: () => {
        // this._revealTween = null
      },
    })
  }
  _onProjectUnhover = () => {
    if (mobileBrowserDetected) {
      return
    }
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      return
    }
    if (!this._isOpened) {
      return
    }
    if (this._closeTween) {
      return
    }
    if (this._openTween) {
      this._openTween.stop()
      this._openTween = null
    }
    this._closeTween = tween({
      duration: 250,
      easing: easing.circOut,
    }).start({
      update: tweenFactor => {
        this.material.uniforms.u_maskBlendFactor.value = 1 - tweenFactor
      },
      complete: () => {
        // this._revealTween = null
      },
    })
  }
  _onRelayoutRequest = () => {
    if (mobileBrowserDetected) {
      this.material.uniforms.u_maskBlendFactor.value = 0
      return
    }
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_GRID) {
      this.material.uniforms.u_maskBlendFactor.value = 0
    }
  }
  _onRelayout = ({ modelName, x, y }) => {
    if (this._modelName !== modelName) {
      return
    }
    const { isMobile, layoutMode } = store.getState()
    if (mobileBrowserDetected) {
      tween().start(tweenFactor => {
        this.material.uniforms.u_maskBlendFactor.value = tweenFactor
      })
    } else {
      if (layoutMode === LAYOUT_MODE_OVERVIEW) {
        tween().start(tweenFactor => {
          this.material.uniforms.u_maskBlendFactor.value = tweenFactor
        })
      }
    }
    const newx = x - PREVIEW_PHOTO_REF_WIDTH * (isMobile ? 0 : 0.25)
    const newy = y - PREVIEW_PHOTO_REF_HEIGHT * 0.5
    this.position.set(newx, newy, 0)
  }
}
