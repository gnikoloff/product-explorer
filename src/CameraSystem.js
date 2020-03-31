import * as THREE from 'three'
import { calc, tween } from 'popmotion'

import eventEmitter from './event-emitter'

import {
  WOLRD_WIDTH,
  WORLD_HEIGHT,
  CAMERA_MIN_VELOCITY_TO_BE_MOVING,
  EVT_CAMERA_HANDLE_MOVEMENT_WORLD,
  EVT_CAMERA_ZOOM_OUT_DRAG_START,
  EVT_CAMERA_ZOOM_IN_DRAG_END,
  EVT_APP_RESIZE,
  EVT_ON_SCENE_DRAG,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
} from './constants'

export default class CameraSystem {
  static friction = 0.6

  static resizeCamera (camera, appWidth, appHeight) {
    const dpr = devicePixelRatio || 1
    camera.left = -appWidth / 2
    camera.right = appWidth / 2
    camera.top = -appHeight / 2
    camera.bottom = appHeight / 2
    camera.aspect = appWidth / appHeight
    camera.updateProjectionMatrix()
    camera.setSize(appWidth * dpr, appHeight * dpr)
    return camera
  }

  static controlCameraZoom ({ camera, zoom }) {
    camera.zoom = zoom
    camera.updateProjectionMatrix()
    return camera
  }

  constructor ({
    appWidth,
    appHeight,
    position,
  }) {
    this._velocity = new THREE.Vector3(0, 0, 0)
    this._targetPosition = new THREE.Vector3(0, 0, 0)
    this._isDragCameraMoving = false
    this._zoomFactor = 1
    this._isZoomedOut = false
    this._shouldMove = true

    const cameraLookAt = new THREE.Vector3(0, 0, 0)

    this._clipCamera = new THREE.OrthographicCamera(appWidth / - 2, appWidth / 2, appHeight / 2, appHeight / - 2, 1, 1000)
    this._photoCamera = this._clipCamera.clone()
    this._postFXCamera = this._clipCamera.clone()
    this._cursorCamera = this._clipCamera.clone()

    this._clipCamera.position.copy(position)
    this._clipCamera.lookAt(cameraLookAt)

    this._photoCamera.position.copy(position)
    this._photoCamera.lookAt(cameraLookAt)

    this._cursorCamera.position.copy(position)
    this._cursorCamera.lookAt(cameraLookAt)
    
    this._postFXCamera.position.copy(position)
    this._postFXCamera.lookAt(cameraLookAt)

    eventEmitter.on(EVT_OPEN_REQUEST_SINGLE_PROJECT, this._onRequestOpenProject)
    eventEmitter.on(EVT_CLOSE_REQUEST_SINGLE_PROJECT, this._onRequestCloseProject)
    eventEmitter.on(EVT_CAMERA_HANDLE_MOVEMENT_WORLD, this._handleMovement)
    eventEmitter.on(EVT_ON_SCENE_DRAG, this._onSceneDrag)
    eventEmitter.on(EVT_CAMERA_ZOOM_OUT_DRAG_START, this._onDragZoomOut)
    eventEmitter.on(EVT_CAMERA_ZOOM_IN_DRAG_END, this._onDragZoomIn)
    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
  }
  get clipCamera () {
    return this._clipCamera
  }
  get photoCamera () {
    return this._photoCamera
  }
  get postFXCamera () {
    return this._postFXCamera
  }
  get cursorCamera () {
    return this._cursorCamera
  }
  get isDragCameraMoving () {
    return this._isDragCameraMoving
  }
  _onRequestOpenProject = () => {
    this._shouldMove = false
    this._targetPosition.copy(this._clipCamera.position)
  }
  _onRequestCloseProject = () => {
    this._shouldMove = true
  }
  _handleMovement = (ts, dt) => {
    if (!this._shouldMove) {
      return
    }
    let oldCameraVelocityX = this._velocity.x
    let oldCameraVelocityY = this._velocity.y

    this._velocity.x += (this._targetPosition.x - this._clipCamera.position.x) * dt
    this._velocity.y += (this._targetPosition.y - this._clipCamera.position.y) * dt

    const dist = calc.distance({
      x: this._velocity.x,
      y: this._velocity.y
    }, {
      x: oldCameraVelocityX,
      y: oldCameraVelocityY,
    })
    
    this._isDragCameraMoving = dist > CAMERA_MIN_VELOCITY_TO_BE_MOVING

    this._clipCamera.position.x += this._velocity.x
    this._clipCamera.position.y += this._velocity.y
    this._photoCamera.position.x += this._velocity.x
    this._photoCamera.position.y += this._velocity.y

    this._clipCamera.position.x  *= CameraSystem.friction
    this._clipCamera.position.y  *= CameraSystem.friction
    this._photoCamera.position.x *= CameraSystem.friction
    this._photoCamera.position.y *= CameraSystem.friction

    if (this._targetPosition.x > WOLRD_WIDTH / 2) {
      this._targetPosition.x = WOLRD_WIDTH / 2
    } else if (this._targetPosition.x < -WOLRD_WIDTH / 2) {
      this._targetPosition.x = -WOLRD_WIDTH / 2
    } else if (this._targetPosition.y > WORLD_HEIGHT / 2) {
      this._targetPosition.y = WORLD_HEIGHT / 2
    } else if (this._targetPosition.y < -WORLD_HEIGHT / 2) {
      this._targetPosition.y = -WORLD_HEIGHT / 2
    }
  }
  _onSceneDrag = ({ diffx, diffy }) => {
    this._targetPosition.x += diffx * -2 + 1
    this._targetPosition.y += diffy * 2 - 1
  }
  _onDragZoomOut = () => {
    this._isZoomedOut = true
    tween().start(tweenFactor => {
      this._zoomFactor = 1 - tweenFactor * 0.125
      CameraSystem.controlCameraZoom({ camera: this._clipCamera, zoom: this._zoomFactor })
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: this._zoomFactor })
      // CameraSystem.controlCameraZoom({ camera: this._cursorCamera, zoom: this._zoomFactor })
    })
  }
  _onDragZoomIn = () => {
    if (!this._isZoomedOut) {
      return
    }
    this._isZoomedOut = false
    tween().start(tweenFactor => {
      const zoom = this._zoomFactor + tweenFactor * 0.125
      CameraSystem.controlCameraZoom({ camera: this._clipCamera, zoom })
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom })
      // CameraSystem.controlCameraZoom({ camera: this._cursorCamera, zoom })
    })
  }
  _onResize = ({ appWidth, appHeight }) => {
    CameraSystem.resizeCamera({ camera: this._clipCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._photoCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._cursorCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._postFXCamera, appWidth, appHeight })
  }
}
