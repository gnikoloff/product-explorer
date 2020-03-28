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
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
  EVT_ON_SCENE_DRAG,
  EVT_RAF_UPDATE_APP,
} from '../constants'

import photoVertexShader from './photo-vertexShader.glsl'
import photoFragmentShader from './photo-fragmentShader.glsl'

import clipVertexShader from './clip-vertexShader.glsl'
import clipFragmentShader from './clip-fragmentShader.glsl'

export default class PhotoPreview {clipFragmentShader

  static SCALE_FACTOR_MAX = 1
  static SCALE_FACTOR_MIN = 0.95

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

    this._isInteractable = true
    this._scale = 1
    this._sliderIdx = 0
    this._isCurrentlyTransitioning = false
    this._openedPageTargetScale = getSiglePagePhotoScale()

    this._diffVector = new THREE.Vector2(0, 0)
    this._diffVectorTarget = new THREE.Vector2(0, 0)
    this._originalPositionOpenPositionDiff = new THREE.Vector2(0, 0)

    this._makeClipMesh()
    this._makePhotoMesh()
    this._loadPreview()

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, this._onOpen)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpenComplete)
    eventEmitter.on(EVT_SLIDER_BUTTON_LEFT_CLICK, this._onArrowClick.bind(this, -1))
    eventEmitter.on(EVT_SLIDER_BUTTON_NEXT_CLICK, this._onArrowClick.bind(this, 1))
    eventEmitter.on(EVT_ON_SCENE_DRAG, this._onSceneDrag)
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
    this._photoMesh.position.copy(this._position)
    this._clipMesh.position.copy(this._position)
  }

  get y () { return this._position.y }

  set y (y) {
    this._position.y = y
    this._photoMesh.position.copy(this._position)
    this._clipMesh.position.copy(this._position)
  }

  get scale () { return this._scale }

  set scale (scale) {
    this._scale = scale
    this._clipMesh.scale.set(scale, scale, 1)
    this._photoMesh.scale.set(scale, scale, 1)
  }

  set opacity (opacity) {
    this._clipMesh.material.uniforms.u_opacity.value = opacity
    this._photoMesh.material.uniforms.u_opacity.value = opacity
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

  _loadTexture = texName => new Promise(resolve =>
    new THREE.TextureLoader().load(texName, texture => resolve(texture)
  ))

  _loadPreview () {
    this._loadTexture(this._photos[0]).then(texture => {
      texture.flipY = true
      this._photoMesh.material.uniforms.u_textures.value[0] = texture
      this._photoMesh.material.needsUpdate = true
    })
  }

  _onOpen = ({
    modelName,
    tweenFactor,
    targetPosX,
    targetPosY,
  }) => {
    if (this._modelName === modelName) {
      const newX = calc.getValueFromProgress(this.x, targetPosX, tweenFactor * 0.1)
      const newY = calc.getValueFromProgress(this.y, targetPosY, tweenFactor * 0.1)
      const newScale = calc.getValueFromProgress(this.scale, this._openedPageTargetScale, tweenFactor * 0.1)

      this.x = newX
      this.y = newY
      this.scale = newScale

      this._originalPositionOpenPositionDiff.x = newX - this._originalPosition.x
      this._originalPositionOpenPositionDiff.y = newY - this._originalPosition.y
      
      const diffx = (targetPosX - this.x) * -1
      const diffy = (targetPosY - this.y) * -1
      this._onSceneDrag({ diffx, diffy })
    } else {
      this.opacity = 1 - clampNumber(mapNumber(tweenFactor, 0, 0.7, 0, 1), 0, 1)
    }
  }

  _onOpenComplete = ({ modelName }) => {
    if (this._modelName !== modelName) {
      this._isInteractable = false
      return
    }

    const sliderExtraPhotos = this._photos.filter((a, i) => i !== 0)
    Promise
      .all(sliderExtraPhotos.map(this._loadTexture))
      .then(textures => {
        for (let i = 0; i < textures.length; i++) {
          const texture = textures[i]
          texture.needsUpdate = true
          this._photoMesh.material.uniforms.u_textures.value[i + 1] = texture
        }
        this._photoMesh.material.needsUpdate = true
      })

    tween({
      from: PhotoPreview.SCALE_FACTOR_MAX,
      to: PhotoPreview.SCALE_FACTOR_MIN,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))

    tween({
      from: 0,
      to: 1,
    }).start(v => {
      const diffx = calc.getValueFromProgress(this._diffVector.x, 0, v)
      const diffy = calc.getValueFromProgress(this._diffVector.y, 0, v)
      this._onSceneDrag({ diffx, diffy })
    })
  }

  _onArrowClick = direction => {
    if (this._isCurrentlyTransitioning) {
      return
    }
    
    let tweenFrom
    let tweenTo

    if (direction === 1) {
      tweenFrom = 0
      tweenTo = 0
    } else if (direction === -1) {
      tweenFrom = 1
      tweenTo = 0
    }

    const oldSliderIdx = this._sliderIdx
    this._sliderIdx += direction
    if (this._sliderIdx > 2) {
      this._sliderIdx = 0
    }
    this._photoMesh.material.uniforms.u_texIdx0.value = oldSliderIdx
    this._photoMesh.material.uniforms.u_texIdx1.value = this._sliderIdx
    this._photoMesh.material.uniforms.u_photoMixFactor.value = 0
    this._photoMesh.material.uniforms.u_horizontalDirection.value = direction

    this._isCurrentlyTransitioning = true

    tween({
      from: tweenFrom,
      to: tweenTo,
      duration: 800,
    }).start({
      update: v => {
        this._photoMesh.material.uniforms.u_photoMixFactor.value = v
      },
      complete: () => {
        this._isCurrentlyTransitioning = false
      }
    })
  }

  onSceneDragStart () {
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

  onSceneDragEnd () {
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