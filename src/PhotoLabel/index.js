import * as THREE from 'three'
import { tween, easing } from 'popmotion'

import eventEmitter from '../event-emitter'

import {
  getProductLabelTexture,
} from '../helpers'

import {
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_TEXTURE_LABEL_MASK_ONLOAD,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_PHOTO_PREVIEW_RELAYOUTED,
} from '../constants'

import vertexShader from './vertexShader.glsl'
import fragmentShader from './fragmentShader.glsl'

export default class PhotoLabel extends THREE.Mesh {
  constructor ({
    modelName,
    position
  }) {

    const geometry = new THREE.PlaneBufferGeometry(256 / 2.5, 64 / 2.5)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_tDiffuse: { value: getProductLabelTexture(modelName) },
        u_mask: { value: null },
        u_maskBlendFactor: { value: 0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    })

    super(geometry, material)

    this.position.copy(position)

    this._openTween = null
    this._closeTween = null

    this._modelName = modelName

    eventEmitter.on(EVT_TEXTURE_LABEL_MASK_ONLOAD, this._onMaskTextureLoad)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_ENTER, this._onProjectHover)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_LEAVE, this._onProjectUnhover)
    eventEmitter.on(EVT_PHOTO_PREVIEW_RELAYOUTED, this._onRelayout)
  }
  _onMaskTextureLoad = ({ texture }) => {
    this.material.uniforms.u_mask.value = texture
    this.material.needsUpdate = true
  }
  _onProjectHover = ({ modelName }) => {
    if (this._modelName !== modelName) {
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
  _onRelayout = ({ modelName, x, y }) => {
    if (this._modelName !== modelName) {
      return
    }
    const newx = x - PREVIEW_PHOTO_REF_WIDTH * 0.25
    const newy = y - PREVIEW_PHOTO_REF_HEIGHT * 0.5
    this.position.set(newx, newy, 0)
  }
}
