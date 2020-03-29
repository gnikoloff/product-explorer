import * as THREE from 'three'
import {
  tween,
  calc,
} from 'popmotion'

import eventEmitter from '../event-emitter'

import {
  clampNumber,
  mapNumber,
  getSiglePagePhotoScale,
} from '../helpers'

import {
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
  EVT_ON_SCENE_DRAG_START,
  EVT_ON_SCENE_DRAG,
  EVT_ON_SCENE_DRAG_END,
  EVT_RAF_UPDATE_APP,
  EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO,
  EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO,
  EVT_NEXT_PROJECT_TRANSITIONED_IN,
} from '../constants'

import photoVertexShader from './photo-vertexShader.glsl'
import photoFragmentShader from './photo-fragmentShader.glsl'

import clipVertexShader from './clip-vertexShader.glsl'
import clipFragmentShader from './clip-fragmentShader.glsl'
import { EventEmitter } from 'events'

export default class PhotoPreview {clipFragmentShader

  static SCALE_FACTOR_MAX = 1
  static SCALE_FACTOR_MIN = 0.95
  static ARROW_RIGHT_KEY_CODE = 39
  static ARROW_LEFT_KEY_CODE = 37
  static SLIDER_DIRECTION_LEFT = -1
  static SLIDER_DIRECTION_RIGHT = 1

  static loadTexture = texName => new Promise(resolve =>
    new THREE.TextureLoader().load(texName, texture => resolve(texture)
  ))

  constructor ({
    modelName,
    width,
    height,
    photos,
    position,
  }) {
    this._modelName = modelName
    this._width = width
    this._height = height
    this._photos = photos
    this._position = position.clone()
    this._originalPosition = position.clone()
    this._targetPosition = new THREE.Vector3()
    this._allTexturesLoaded = false
    this._isInteractable = true
    this._targetScale = 1
    this._scale = this._targetScale
    this._sliderIdx = 0
    this._isSliderCurrentlyTransitioning = false
    this._isSingleViewCurrentlyTransitioning = false
    this._isOpenInSingleView = false
    this._openedPageTargetScale = getSiglePagePhotoScale()

    this._diffVector = new THREE.Vector2(0, 0)
    this._diffVectorTarget = new THREE.Vector2(0, 0)
    this._originalPositionOpenPositionDiff = new THREE.Vector2(0, 0)

    this._makeClipMesh()
    this._makePhotoMesh()
    this._loadPreview()

    eventEmitter.on(EVT_OPEN_REQUEST_SINGLE_PROJECT, this._onOpenRequest)
    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, this._onOpen)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpenComplete)
    eventEmitter.on(EVT_CLOSE_REQUEST_SINGLE_PROJECT, this._onCloseRequest)
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, this._onClose)
    eventEmitter.on(EVT_CLOSE_SINGLE_PROJECT, this._onCloseComplete)
    eventEmitter.on(EVT_ON_SCENE_DRAG_START, this._onSceneDragStart)
    eventEmitter.on(EVT_ON_SCENE_DRAG, this._onSceneDrag)
    eventEmitter.on(EVT_ON_SCENE_DRAG_END, this._onSceneDragEnd)
    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, this._onNavChangeTransitionOut)
    eventEmitter.on(EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO, this._onNavChangeTransitionIn)
    eventEmitter.on(EVT_SLIDER_BUTTON_LEFT_CLICK, ({ modelName }) => {
      if (modelName === this._modelName) {
        this._onSlideChange(PhotoPreview.SLIDER_DIRECTION_LEFT)
      }
    })
    eventEmitter.on(EVT_SLIDER_BUTTON_NEXT_CLICK, ({ modelName }) => {
      if (modelName === this._modelName) {
        this._onSlideChange(PhotoPreview.SLIDER_DIRECTION_RIGHT)
      }
    })
  }
  get modelName () {
    return this._modelName
  }
  get isInteractable () {
    return this._isInteractable
  }
  get clipMesh () {
    return this._clipMesh
  }
  get photoMesh () {
    return this._photoMesh
  }
  get x () { return this._position.x }
  set x (x) {
    this._position.x = x
    this._photoMesh.position.x = x
    this._clipMesh.position.x = x
  }
  get y () { return this._position.y }
  set y (y) {
    this._position.y = y
    this._photoMesh.position.y = y
    this._clipMesh.position.y = y
  }
  get scale () { return this._scale }
  set scale (scale) {
    this._scale = scale
    this._clipMesh.scale.x = this._clipMesh.scale.y = scale
    this._photoMesh.scale.x = this._photoMesh.scale.y = scale
  }
  set opacity (opacity) {
    this._clipMesh.material.uniforms.u_opacity.value = opacity
    this._photoMesh.material.uniforms.u_opacity.value = opacity
  }
  _onNavChangeTransitionOut = ({ modelName, direction, targetX, targetY }) => {
    if (this._isSingleViewCurrentlyTransitioning) {
      return
    }
    if (this._isOpenInSingleView) {
      const dpr = devicePixelRatio || 1
      let offsetX
      if (direction === 1) {
        offsetX = -innerWidth * dpr * 0.5
      } else {
        offsetX = innerWidth * dpr * 0.5
      }
      this._transitionOnNavigationChange({
        startX: this.x,
        startY: this.y,
        targetX: targetX + offsetX,
        targetY,
        onUpdate: tweenFactor => {
          this.opacity = 1 - tweenFactor
        }
      }).then(() => {
        this._onOpenComplete({ modelName })
        eventEmitter.emit(EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO, { modelName, direction, targetX, targetY })
        this._isOpenInSingleView = false
        this.x = this._originalPosition.x
        this.y = this._originalPosition.y
        this.scale = 1
      })
    }
  }
  _onNavChangeTransitionIn = ({ modelName, direction, targetX, targetY }) => {
    if (this._modelName !== modelName) {
      return
    }
    if (this._isSingleViewCurrentlyTransitioning) {
      return
    }
    this.opacity = 1
    const dpr = devicePixelRatio || 1
    let offsetX
    if (direction === 1) {
      offsetX = innerWidth + dpr * 0.5
    } else {
      offsetX = -innerWidth + dpr * 0.5
    }
    this._transitionOnNavigationChange({
      startX: targetX + offsetX,
      startY: targetY,
      targetX: targetX,
      targetY,
    }).then(() => {
      this._isOpenInSingleView = true
      this._onOpenComplete({ modelName, diffDuration: 50 })
      eventEmitter.emit(EVT_NEXT_PROJECT_TRANSITIONED_IN)
    })
  }
  _transitionOnNavigationChange = ({
    startX,
    startY,
    targetX,
    targetY,
    onUpdate = () => {},
  }) => new Promise(resolve => {
    this._isSingleViewCurrentlyTransitioning = true
    this._targetPosition.x = startX
    this._targetPosition.y = startY
    tween().start({
      update: tweenFactor => {
        const newX = calc.getValueFromProgress(startX, targetX, tweenFactor)
        const newY = calc.getValueFromProgress(startY, targetY, tweenFactor)
        const diffx = (newX - this.x) * -1 * 5
        const diffy = (newY - this.y) * -1
        this._onSceneDrag({ diffx, diffy })

        this.x = newX
        this.y = newY

        this._originalPositionOpenPositionDiff.x = newX - this._originalPosition.x
        this._originalPositionOpenPositionDiff.y = newY - this._originalPosition.y
        
        onUpdate(tweenFactor)
      },
      complete: () => {
        this._isSingleViewCurrentlyTransitioning = false
        resolve()
      },
    })
  })
  _onKeyDown = e => {
    if (e.keyCode === PhotoPreview.ARROW_RIGHT_KEY_CODE) {
      this._onSlideChange(1)
    } else if (e.keyCode === PhotoPreview.ARROW_LEFT_KEY_CODE) {
      this._onSlideChange(-1)
    }
  }
  _makeClipMesh () {
    const clipGeometryVertCount = 20

    const clipGeometry = new THREE.PlaneGeometry(this._width, this._height, clipGeometryVertCount, clipGeometryVertCount)
    const clipMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_dragOffsetVec: { value: this._diffVector },
        u_opacity: { value: 1 },
      },
      transparent: true,
      vertexShader: clipVertexShader,
      fragmentShader: clipFragmentShader,
    })

    this._clipMesh = new THREE.Mesh(clipGeometry, clipMaterial)
    this._clipMesh.position.copy(this._position)
    this._clipMesh.modelName = this._modelName
  }
  _makePhotoMesh () {
    const photoGeometry = new THREE.PlaneGeometry(this._width + 100, this._height + 100)
    const photoMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_planeSize: { value: new THREE.Vector2(this._width + 100, this._height + 100) },
        u_imageSize: { value: new THREE.Vector2(750, 1200) },
        u_textures: { value: [ new THREE.Texture(), ...new Array(3).fill(null) ] },
        u_opacity: { value: 1.0 },
        u_photoMixFactor: { value: 0.0 },
        u_texIdx0: { value: 0 },
        u_texIdx1: { value: 1 },
        u_horizontalDirection: { value: 0 },
      },
      transparent: true,
      vertexShader: photoVertexShader,
      fragmentShader: photoFragmentShader,
    })
    this._photoMesh = new THREE.Mesh(photoGeometry, photoMaterial)
    this._photoMesh.position.copy(this._position)
  }
  _loadPreview () {
    PhotoPreview.loadTexture(this._photos[0]).then(texture => {
      texture.flipY = true
      this._photoMesh.material.uniforms.u_textures.value[0] = texture
      this._photoMesh.material.needsUpdate = true
    })
  }
  _onOpenRequest = ({ modelName, targetX, targetY }) => {
    this._isInteractable = false
    if (modelName === this._modelName) {
      this._targetPosition.set(targetX, targetY, 1)
      this._targetScale = this._scale
    }
  }
  _onOpen = ({ modelName, tweenFactor }) => {
    if (modelName === this._modelName) {
      const targetPosX = this._targetPosition.x
      const targetPosY = this._targetPosition.y
      const newX = calc.getValueFromProgress(this.x, targetPosX, tweenFactor * 0.1)
      const newY = calc.getValueFromProgress(this.y, targetPosY, tweenFactor * 0.1)
      const newScale = calc.getValueFromProgress(this._targetScale, this._openedPageTargetScale, tweenFactor)
      
      this.x = newX
      this.y = newY
      this.scale = newScale

      this._originalPositionOpenPositionDiff.x = newX - this._originalPosition.x
      this._originalPositionOpenPositionDiff.y = newY - this._originalPosition.y
      
      const diffx = (targetPosX - this.x) * -1
      const diffy = (targetPosY - this.y) * -1
      this._onSceneDrag({ diffx, diffy })

      this._isOpenInSingleView = true
    } else {
      this.opacity = mapNumber(tweenFactor, 0, 0.75, 1, 0)
      // this.opacity = 1 - clampNumber(mapNumber(tweenFactor, 0, 0.7, 0, 1), 0, 1)
    }
  }
  _onOpenComplete = ({ modelName, diffDuration = 300 }) => {
    if (modelName !== this._modelName) {
      return
    }

    window.addEventListener('keydown', this._onKeyDown)

    if (!this._allTexturesLoaded) {
      const sliderExtraPhotos = this._photos.filter((a, i) => i !== 0)
      Promise
        .all(sliderExtraPhotos.map(PhotoPreview.loadTexture))
        .then(textures => {
          for (let i = 0; i < textures.length; i++) {
            const texture = textures[i]
            texture.needsUpdate = true
            this._photoMesh.material.uniforms.u_textures.value[i + 1] = texture
          }
          this._photoMesh.material.needsUpdate = true
          this._allTexturesLoaded = true
        })
    }

    tween({
      from: this._photoMesh.scale.x,
      to: PhotoPreview.SCALE_FACTOR_MIN,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))

    tween({
      duration: diffDuration,
    }).start(v => {
      const diffx = calc.getValueFromProgress(this._diffVector.x, 0, v)
      const diffy = calc.getValueFromProgress(this._diffVector.y, 0, v)
      this._onSceneDrag({ diffx, diffy })
    })
  }
  _onCloseRequest = ({ modelName }) => {
    if (modelName === this._modelName) {
      this._targetPosition.set(this.x, this.y, 1)
      this._targetScale = this._scale
      window.removeEventListener('keydown', this._onKeyDown)
    }
  }
  _onClose = ({ modelName, tweenFactor }) => {
    this._isInteractable = true
    if (modelName === this._modelName) {
      const startX = this._targetPosition.x
      const startY = this._targetPosition.y
      const endX = this._targetPosition.x - this._originalPositionOpenPositionDiff.x
      const endY = this._targetPosition.y - this._originalPositionOpenPositionDiff.y
      const newX = calc.getValueFromProgress(startX, endX, tweenFactor)
      const newY = calc.getValueFromProgress(startY, endY, tweenFactor)
      const newScale = calc.getValueFromProgress(this._targetScale, 1, tweenFactor)

      const diffx = (newX - this.x) * -1
      const diffy = (newY - this.y) * -1
      this._onSceneDrag({ diffx, diffy })

      this.x = newX
      this.y = newY
      this.scale = newScale

      this._isOpenInSingleView = false
    } else {
      this.opacity = mapNumber(tweenFactor, 0.25, 1, 0, 1)
    }
  }
  _onCloseComplete () {
    this._isInteractable = true
  }
  _onSlideChange = direction => {
    if (this._isSliderCurrentlyTransitioning) {
      return
    }
    
    let tweenFrom
    let tweenTo

    const oldSliderIdx = this._sliderIdx
    this._sliderIdx += direction

    if (direction === 1) {
      tweenFrom = 0
      tweenTo = 1
      if (this._sliderIdx > 2) {
        this._sliderIdx = 0
      }
      this._photoMesh.material.uniforms.u_texIdx0.value = oldSliderIdx
      this._photoMesh.material.uniforms.u_texIdx1.value = this._sliderIdx
    } else if (direction === -1) {
      tweenFrom = 1
      tweenTo = 0
      if (this._sliderIdx < 0) {
        this._sliderIdx = 2
      }
      this._photoMesh.material.uniforms.u_texIdx0.value = this._sliderIdx
      this._photoMesh.material.uniforms.u_texIdx1.value = oldSliderIdx
    }
    this._photoMesh.material.uniforms.u_photoMixFactor.value = 0
    this._photoMesh.material.uniforms.u_horizontalDirection.value = direction

    this._isSliderCurrentlyTransitioning = true

    tween({
      from: tweenFrom,
      to: tweenTo,
      duration: 800,
    }).start({
      update: v => {
        this._photoMesh.material.uniforms.u_photoMixFactor.value = v
      },
      complete: () => {
        this._isSliderCurrentlyTransitioning = false
      }
    })
  }
  _onSceneDragStart = () => {
    if (!this._isInteractable) {
      return
    }
    tween({
      from: PhotoPreview.SCALE_FACTOR_MAX,
      to: PhotoPreview.SCALE_FACTOR_MIN,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
  }
  _onSceneDrag = ({ diffx, diffy }) => {
    // if (!this._isInteractable) {
    //   return
    // }
    this._diffVectorTarget.x = clampNumber(diffx * 5, -25, 25)
    this._diffVectorTarget.y = clampNumber(diffy * 5, -25, 25)
  }
  _onSceneDragEnd = () => {
    if (!this._isInteractable) {
      return
    }
    tween({
      from: PhotoPreview.SCALE_FACTOR_MIN,
      to: PhotoPreview.SCALE_FACTOR_MAX,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
    this._diffVectorTarget.x = 0
    this._diffVectorTarget.y = 0
  }
  _onUpdate = (ts, dt) => {
    this._diffVector.x += (this._diffVectorTarget.x - this._diffVector.x) * dt * 6
    this._diffVector.y += (this._diffVectorTarget.y - this._diffVector.y) * dt * 6
  } 
}
