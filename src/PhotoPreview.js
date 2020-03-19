import * as THREE from 'three'
import { tween } from 'popmotion'

import {
  clampNumber,
} from './helpers'

export default class PhotoPreview {

  static SCALE_FACTOR_MAX = 1
  static SCALE_FACTOR_MIN = 0.9

  constructor ({
    modelName,
    width,
    height,
  }) {
    this._modelName = modelName
    this._width = width
    this._height = height

    this._diffVector = new THREE.Vector2(0, 0)
    this._diffVectorTarget = new THREE.Vector2(0, 0)

    this._makeClipMesh()
    this._makePhotoMesh()

    this._x = 0
    this._y = 0
    this._z = 0
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

  _makeClipMesh () {
    const clipGeometryVertCount = 20

    const clipGeometry = new THREE.PlaneGeometry(this._width, this._height, clipGeometryVertCount, clipGeometryVertCount)
    const clipMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_dragOffsetVec: { value: this._diffVector },
      },
      vertexShader: `
        uniform vec2 u_dragOffsetVec;

        void main () {
          vec3 newPosition = position;

          float distFromCenter = distance(newPosition, vec3(0.0));
          newPosition.xy += u_dragOffsetVec * distFromCenter * 0.002;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
      `,
      fragmentShader: `
        void main () {
          gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
        }
      `
    })

    this._clipMesh = new THREE.Mesh(clipGeometry, clipMaterial)
    this._clipMesh.modelName = this._modelName
  }

  _makePhotoMesh (width, height) {
    const photoGeometry = new THREE.PlaneGeometry(this._width + 100, this._height + 100)
    const photoMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_planeSize: { value: new THREE.Vector2(this._width + 100, this._height + 100) },
        u_imageSize: { value: new THREE.Vector2(960, 1440) },
        u_diffuse: { value: null },
      },
      vertexShader: `
        varying vec2 v_uv;

        void main () {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          v_uv = uv;
        }
      `,
      fragmentShader: `
        uniform vec2 u_planeSize;
        uniform vec2 u_imageSize;
        uniform sampler2D u_diffuse;

        varying vec2 v_uv;
        
        void main () {
          vec2 s = u_planeSize; // Screen
          vec2 i = u_imageSize; // Image

          float rs = s.x / s.y;
          float ri = i.x / i.y;
          vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
          vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
          vec2 uv = v_uv * s / new + offset;
          gl_FragColor = texture2D(u_diffuse, uv);
        }
      `
    })
    this._photoMesh = new THREE.Mesh(photoGeometry, photoMaterial)
  }

  addPhotoTexture (texture) {
    this._photoMesh.material.uniforms.u_diffuse.value = texture
    this._photoMesh.material.needsUpdate = true
  }

  onSceneDragStart () {
    tween({
      from: PhotoPreview.SCALE_FACTOR_MAX,
      to: PhotoPreview.SCALE_FACTOR_MIN,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
  }

  onSceneDrag (dragDiffX, dragDiffY) {
    this._diffVectorTarget.x = clampNumber(dragDiffX * 5, -25, 25)
    this._diffVectorTarget.y = clampNumber(dragDiffY * 5, -25, 25)
  }

  onSceneDragEnd () {
    tween({
      from: PhotoPreview.SCALE_FACTOR_MIN,
      to: PhotoPreview.SCALE_FACTOR_MAX,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
    this._diffVectorTarget.x = 0
    this._diffVectorTarget.y = 0
  }

  onSceneUpdate (ts, dt) {
    this._diffVector.x += (this._diffVectorTarget.x - this._diffVector.x) * dt * 6
    this._diffVector.y += (this._diffVectorTarget.y - this._diffVector.y) * dt * 6
  } 

}