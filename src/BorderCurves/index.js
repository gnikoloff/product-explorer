import * as THREE from 'three'

import eventEmitter from '../event-emitter'
import store from '../store'

import {
  mapNumber,
  clampNumber,
} from '../helpers'

import {
  EVT_ON_SCENE_DRAG_END,
  EVT_RAF_UPDATE_APP,
  EVT_DRAG_TOP_BORDER,
  EVT_DRAG_RIGHT_BORDER,
  EVT_DRAG_BOTTOM_BORDER,
  EVT_DRAG_LEFT_BORDER,
  EVT_APP_RESIZE,
} from '../constants'

import vertexShader from './vertex-shader.glsl'
import fragmentShader from './fragment-shader.glsl'

export default class BorderCurves extends THREE.Group {
  static getTriangleOffset () {
    let offset
    if (innerWidth > innerHeight) {
      offset = innerWidth * 0.5 + 100
    } else if (innerHeight > innerWidth) {
      offset = innerHeight * 0.5 + 100
    } else {
      offset = innerWidth * 0.5 + 100
    }
    return offset
  }
  constructor () {
    super()

    const appWidth = innerWidth
    const appHeight = innerHeight

    const geometryBottom = new THREE.BufferGeometry()
    // interleave attributes here
    // const offset = BorderCurves.getTriangleOffset()
    const positionsTopBottom = new Float32Array([
      -appWidth * 0.5 - 100, -appHeight * 0.5, 0,
      appWidth * 0.5 + 100, -appHeight * 0.5, 0,
      0, -appHeight * 0.5, 0
    ])
    const posiitonsLeftRight = new Float32Array([
      appWidth * 0.5, -appHeight * 0.5, 0,
      appWidth * 0.5, appHeight * 0.5, 0,
      appWidth * 0.5, 0, 0
    ])
    const uvs = new Float32Array([
      0, 0,
      1, 1,
      0.5, 0
    ])
    geometryBottom.setAttribute('position', new THREE.BufferAttribute(positionsTopBottom, 3))
    geometryBottom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    const geometryTop = geometryBottom.clone()

    const geometryRight = new THREE.BufferGeometry()
    geometryRight.addAttribute('position', new THREE.BufferAttribute(posiitonsLeftRight, 3))
    geometryRight.addAttribute('uv', new THREE.BufferAttribute(uvs, 2))

    const geometryLeft = geometryRight.clone()
    geometryLeft.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI))

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader,
      fragmentShader,
      transparent: true,
    })

    geometryTop.applyMatrix4(new THREE.Matrix4().makeRotationZ(Math.PI))

    const triangleTopMesh = new THREE.Mesh(geometryTop, material)
    const triangleBottomMesh = new THREE.Mesh(geometryBottom, material)
    const triangleRightMesh = new THREE.Mesh(geometryRight, material)
    const triangleLefttMesh = new THREE.Mesh(geometryLeft, material)

    this.add(triangleTopMesh)
    this.add(triangleBottomMesh)
    this.add(triangleRightMesh)
    this.add(triangleLefttMesh)

    this._topCurveTargetY = appHeight * 0.5
    this._rightCurveTargetX = appWidth * 0.5
    this._bottomCurveTargetY = -appHeight * 0.5
    this._leftCurveTargetX = -appWidth * 0.5
    this._timeFactor = 3

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_ON_SCENE_DRAG_END, this._onDragEnd)
    eventEmitter.on(EVT_DRAG_TOP_BORDER, this._onDragBorderTop)
    eventEmitter.on(EVT_DRAG_RIGHT_BORDER, this._onDragBorderRight)
    eventEmitter.on(EVT_DRAG_BOTTOM_BORDER, this._onDragBorderBottom)
    eventEmitter.on(EVT_DRAG_LEFT_BORDER, this._onDragBorderLeft)
    // eventEmitter.on(EVT_APP_RESIZE, this._onResize)
  }
  _onResize = () => {
    const triangleTopMesh = this.children[0]
    const triangleBottomMesh = this.children[1]
    const triangleRightMesh = this.children[2]
    const triangleLeftMesh = this.children[3]
    triangleTopMesh.geometry.attributes.position.array[0] = -innerWidth * 0.5 - 100
    triangleTopMesh.geometry.attributes.position.array[3] = innerWidth * 0.5 + 100
    triangleBottomMesh.geometry.attributes.position.array[0] = -innerWidth * 0.5 - 100
    triangleBottomMesh.geometry.attributes.position.array[3] = innerWidth * 0.5 + 100
    triangleRightMesh.geometry.attributes.position.array[1] = -innerHeight * 0.5
    triangleRightMesh.geometry.attributes.position.array[4] = innerHeight * 0.5
    triangleLeftMesh.geometry.attributes.position.array[1] = -innerHeight * 0.5
    triangleLeftMesh.geometry.attributes.position.array[4] = innerHeight * 0.5
    // const positionsTopBottom = new Float32Array([
    //   -appWidth * 0.5 - 100, -appHeight * 0.5, 0,
    //   appWidth * 0.5 + 100, -appHeight * 0.5, 0,
    //   0, -appHeight * 0.5, 0
    // ])
    // const posiitonsLeftRight = new Float32Array([
    //   appWidth * 0.5, -appHeight * 0.5, 0,
    //   appWidth * 0.5, appHeight * 0.5, 0,
    //   appW
  }
  _onDragBorderTop = ({ offsetY }) => {
    this._topCurveTargetY = innerHeight * 0.5 - clampNumber(mapNumber(offsetY, 0, 300, 0, 150), 0, 150)
    this._timeFactor = 3
  }
  _onDragBorderRight = ({ offsetX }) => {
    this._rightCurveTargetX = innerWidth * 0.5 - clampNumber(mapNumber(offsetX, 0, 300, 0, 150), 0, 150)
    this._timeFactor = 3
  }
  _onDragBorderBottom = ({ offsetY }) => {
    this._bottomCurveTargetY = -innerHeight * 0.5 + clampNumber(mapNumber(offsetY, 0, 300, 0, 150), 0, 150)
    this._timeFactor = 3
  }
  _onDragBorderLeft = ({ offsetX }) => {
    this._leftCurveTargetX = -innerWidth * 0.5 + clampNumber(mapNumber(offsetX, 0, 300, 0, 150), 0, 150)
    this._timeFactor = 3
  }
  _onDragEnd = () => {
    this._topCurveTargetY = innerHeight * 0.5
    this._rightCurveTargetX = innerWidth * 0.5
    this._bottomCurveTargetY = -innerHeight * 0.5
    this._leftCurveTargetX = -innerWidth * 0.5
    this._timeFactor = 5
  }
  _onUpdate = (ts, dt) => {
    const { mousePositionX, mousePositionY } = store.getState()
    const triangleTopMesh = this.children[0]
    const triangleBottomMesh = this.children[1]
    const triangleRightMesh = this.children[2]
    const triangleLeftMesh = this.children[3]
    
    const topCurveControlPointY = triangleTopMesh.geometry.attributes.position.array[7]
    const rightCurveControlPointX = triangleRightMesh.geometry.attributes.position.array[6]
    const bottomCurveControlPointY = triangleBottomMesh.geometry.attributes.position.array[7]
    const leftCurveControlPointX = triangleLeftMesh.geometry.attributes.position.array[6]

    triangleTopMesh.geometry.attributes.position.array[6] = mousePositionX - innerWidth / 2
    triangleRightMesh.geometry.attributes.position.array[7] = innerHeight - mousePositionY - innerHeight / 2
    triangleBottomMesh.geometry.attributes.position.array[6] = mousePositionX - innerWidth / 2
    triangleLeftMesh.geometry.attributes.position.array[7] = innerHeight - mousePositionY - innerHeight / 2

    triangleTopMesh.geometry.attributes.position.array[7] += (this._topCurveTargetY - topCurveControlPointY) * (dt * this._timeFactor)
    triangleRightMesh.geometry.attributes.position.array[6] += (this._rightCurveTargetX - rightCurveControlPointX) * (dt * this._timeFactor)
    triangleBottomMesh.geometry.attributes.position.array[7] += (this._bottomCurveTargetY - bottomCurveControlPointY) * (dt * this._timeFactor)
    triangleLeftMesh.geometry.attributes.position.array[6] += (this._leftCurveTargetX - leftCurveControlPointX) * (dt * this._timeFactor)

    triangleTopMesh.geometry.attributes.position.needsUpdate = true
    triangleRightMesh.geometry.attributes.position.needsUpdate = true
    triangleBottomMesh.geometry.attributes.position.needsUpdate = true
    triangleLeftMesh.geometry.attributes.position.needsUpdate = true
  }
}
