import * as THREE from 'three'
import { tween } from 'popmotion'

import eventEmitter from '../event-emitter'

import {
  clampNumber,
} from '../helpers'

import {
  EVT_CLICKED_SINGLE_PROJECT,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
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
  }) {
    this._modelName = modelName
    this._width = width
    this._height = height
    this._photos = photos

    this._diffVector = new THREE.Vector2(0, 0)
    this._diffVectorTarget = new THREE.Vector2(0, 0)

    this._makeClipMesh()
    this._makePhotoMesh()

    this._x = 0
    this._y = 0
    this._z = 0

    this._onUpdate = this._onUpdate.bind(this)

    this._preventDragging = false
    this._allTexturesLoaded = false
    this._sliderIdx = 0
    this._isCurrentlyTransitioning = false

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_CLICKED_SINGLE_PROJECT, modelName => {
      if (this._modelName !== modelName) {
        return
      }

      this._preventDragging = true

      const sliderExtraPhotos = this._photos.filter((a, i) => i !== 0)
      console.log(this._photoMesh.material.uniforms.u_textures)
      Promise
        .all(sliderExtraPhotos.map(photo => this._loadTexture(photo)))
        .then(textures => {
          console.log(textures)
          for (let i = 0; i < textures.length; i++) {
            const texture = textures[i]
            texture.needsUpdate = true
            this._photoMesh.material.uniforms.u_textures.value[i + 1] = texture
          }
          this._photoMesh.material.needsUpdate = true
          // this._photoMesh.material.uniforms.u_textures.value
          //   .map((slot, i) => {
          //     if (i === 0) {
          //       return slot
          //     } else {
          //       const texture = textures[i - 1]
          //       texture.flipY = true
          //       return texture
          //     }
          //   })
            // console.log(this._photoMesh.material.uniforms.u_textures)
        })

      tween({
        from: PhotoPreview.SCALE_FACTOR_MAX,
        to: PhotoPreview.SCALE_FACTOR_MIN,
        duration: 250
      })
      .start(v => this._photoMesh.scale.set(v, v, 1))
    })
    eventEmitter.on(EVT_SLIDER_BUTTON_LEFT_CLICK, () => {
      if (this._isCurrentlyTransitioning) {
        return
      }
      const oldSliderIdx = this._sliderIdx
      this._sliderIdx -= 1
      if (this._sliderIdx < 0) {
        this._sliderIdx = 2
      }
      this._photoMesh.material.uniforms.u_texIdx0.value = oldSliderIdx
      this._photoMesh.material.uniforms.u_texIdx1.value = this._sliderIdx
      this._photoMesh.material.uniforms.u_photoMixFactor.value = 0
      this._photoMesh.material.uniforms.u_horizontalDirection.value = -1.0

      this._isCurrentlyTransitioning = true

      tween({
        from: 0,
        to: 1,
        duration: 800,
      }).start({
        update: v => {
          this._photoMesh.material.uniforms.u_photoMixFactor.value = v
        },
        complete: () => {
          this._isCurrentlyTransitioning = false
        }
      })
    })
    eventEmitter.on(EVT_SLIDER_BUTTON_NEXT_CLICK, () => {
      if (this._isCurrentlyTransitioning) {
        return
      }
      const oldSliderIdx = this._sliderIdx
      this._sliderIdx += 1
      if (this._sliderIdx > 2) {
        this._sliderIdx = 0
      }
      this._photoMesh.material.uniforms.u_texIdx0.value = oldSliderIdx
      this._photoMesh.material.uniforms.u_texIdx1.value = this._sliderIdx
      this._photoMesh.material.uniforms.u_photoMixFactor.value = 0
      this._photoMesh.material.uniforms.u_horizontalDirection.value = 1.0

      this._isCurrentlyTransitioning = true

      tween({
        from: 0,
        to: 1,
        duration: 800,
      }).start({
        update: v => {
          this._photoMesh.material.uniforms.u_photoMixFactor.value = v
        },
        complete: () => {
          this._isCurrentlyTransitioning = false
        }
      })
    })
  }

  get modelName () {
    return this._modelName
  }
  
  get clipMesh () {
    return this._clipMesh
  }

  get photoMesh () {
    return this._photoMesh
  }

  get diffVectorTarget () {
    return this._diffVectorTarget
  }

  get x () { return this._x }

  set x (x) {
    this._x = x
    this._clipMesh.position.x = x
    this._photoMesh.position.x = x
  }

  get y () { return this._y }

  set y (y) {
    this._y = y
    this._clipMesh.position.y = y
    this._photoMesh.position.y = y
  }

  get z () { return this._z }

  set z (z) {
    this._z = z
    this._clipMesh.position.z = z
    this._photoMesh.position.z = z
  }

  set opacity (opacity) {
    this._clipMesh.material.uniforms.u_opacity.value = opacity
    this._photoMesh.material.uniforms.u_opacity.value = opacity
  }

  get diffVector () {
    return this._diffVectorTarget
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
  }

  _loadTexture = texName =>
    new Promise(resolve =>
      new THREE.TextureLoader().load(texName, texture => resolve(texture)
    ))

  loadPreview () {
    this._loadTexture(this._photos[0]).then(texture => {
      texture.flipY = true
      this._photoMesh.material.uniforms.u_textures.value[0] = texture
      this._photoMesh.material.needsUpdate = true
    })
  }

  onSceneDragStart () {
    if (this._preventDragging) {
      return
    }
    tween({
      from: PhotoPreview.SCALE_FACTOR_MAX,
      to: PhotoPreview.SCALE_FACTOR_MIN,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
  }

  onSceneDrag (dragDiffX, dragDiffY) {
    // if (this._preventDragging) {
    //   return
    // }
    this._diffVectorTarget.x = clampNumber(dragDiffX * 5, -25, 25)
    this._diffVectorTarget.y = clampNumber(dragDiffY * 5, -25, 25)
  }

  onSceneDragEnd () {
    if (this._preventDragging) {
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

  _onUpdate (ts, dt) {
    this._diffVector.x += (this._diffVectorTarget.x - this._diffVector.x) * dt * 6
    this._diffVector.y += (this._diffVectorTarget.y - this._diffVector.y) * dt * 6
  } 

}