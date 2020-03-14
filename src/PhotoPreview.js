import * as THREE from 'three'
import { tween } from 'popmotion'

export default class PhotoPreview extends THREE.Object3D {
  constructor ({
    width,
    height,
  }) {
    super()

    this._diffVector = new THREE.Vector2(0, 0)
    this._diffVectorTarget = new THREE.Vector2(0, 0)

    this._makeClipMesh(width, height)
    this._makePhotoMesh(width, height)
  }
  
  get clipMesh () {
    return this._clipMesh
  }

  get photoMesh () {
    return this._photoMesh
  }

  _makeClipMesh (width, height) {
    const clipGeometryVertCount = 20

    const clipGeometry = new THREE.PlaneGeometry(width, height, clipGeometryVertCount, clipGeometryVertCount)
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
  }

  _makePhotoMesh (width, height) {
    const photoGeometry = new THREE.PlaneGeometry(width + 100, height + 100)
    const photoMaterial = new THREE.MeshBasicMaterial()
    this._photoMesh = new THREE.Mesh(photoGeometry, photoMaterial)
  }

  addPhotoTexture (texture) {
    this._photoMesh.material.map = texture
    this._photoMesh.material.needsUpdate = true
  }

  onSceneDragStart () {
    tween({
      from: 1,
      to: 0.9,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
  }

  onSceneDrag (dragDiffX, dragDiffY) {
    this._diffVectorTarget.x = dragDiffX * -5
    this._diffVectorTarget.y = dragDiffY * -5
  }

  onSceneDragEnd () {
    tween({
      from: 0.9,
      to: 1,
      duration: 250
    })
    .start(v => this._photoMesh.scale.set(v, v, 1))
  }

  onSceneUpdate (ts, dt) {
    this._diffVector.x += (this._diffVectorTarget.x - this._diffVector.x) * dt * 6
    this._diffVector.y += (this._diffVectorTarget.y - this._diffVector.y) * dt * 6
  } 

}