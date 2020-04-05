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
  EVT_LAYOUT_MODE_TRANSITION_REQUEST,
  LAYOUT_MODE_GRID,
  LAYOUT_MODE_OVERVIEW,
} from './constants'

export default class CameraSystem {
  static friction = 0.6

  static resizeCamera ({ camera, appWidth, appHeight }) {
    camera.left = -appWidth / 2
    camera.right = appWidth / 2
    camera.top = appHeight / 2
    camera.bottom = -appHeight / 2
    camera.aspect = appWidth / appHeight
    camera.updateProjectionMatrix()
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
    this._layoutMode = null

    const cameraLookAt = new THREE.Vector3(0, 0, 0)

    this._photoCamera = new THREE.OrthographicCamera(appWidth / - 2, appWidth / 2, appHeight / 2, appHeight / - 2, 1, 1000)
    this._postFXCamera = this._photoCamera.clone()
    this._postFXBlurCamera = this._photoCamera.clone()
    this._cursorCamera = this._photoCamera.clone()

    this._photoCamera.position.copy(position)
    this._photoCamera.lookAt(cameraLookAt)

    this._cursorCamera.position.copy(position)
    this._cursorCamera.lookAt(cameraLookAt)
    
    this._postFXCamera.position.copy(position)
    this._postFXCamera.lookAt(cameraLookAt)

    this._postFXBlurCamera.position.copy(position)
    this._postFXBlurCamera.lookAt(cameraLookAt)

    eventEmitter.on(EVT_OPEN_REQUEST_SINGLE_PROJECT, this._onRequestOpenProject)
    eventEmitter.on(EVT_CLOSE_REQUEST_SINGLE_PROJECT, this._onRequestCloseProject)
    eventEmitter.on(EVT_CAMERA_HANDLE_MOVEMENT_WORLD, this._handleMovement)
    eventEmitter.on(EVT_ON_SCENE_DRAG, this._onSceneDrag)
    eventEmitter.on(EVT_CAMERA_ZOOM_OUT_DRAG_START, this._onDragZoomOut)
    eventEmitter.on(EVT_CAMERA_ZOOM_IN_DRAG_END, this._onDragZoomIn)
    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
    eventEmitter.on(EVT_LAYOUT_MODE_TRANSITION_REQUEST, this._onLayoutModeChange)
  }
  get photoCamera () {
    return this._photoCamera
  }
  get postFXCamera () {
    return this._postFXCamera
  }
  get postFXBlurCamera () {
    return this._postFXBlurCamera
  }
  get cursorCamera () {
    return this._cursorCamera
  }
  get isDragCameraMoving () {
    return this._isDragCameraMoving
  }
  _onLayoutModeChange = ({ layoutMode }) => {
    this._layoutMode = layoutMode
  }
  _onRequestOpenProject = () => {
    this._shouldMove = false
    this._targetPosition.copy(this._photoCamera.position)
  }
  _onRequestCloseProject = () => {
    this._shouldMove = true
  }
  _handleMovement = (ts, dt) => {
    if (!this._shouldMove) {
      return
    }

    const lockHorizontalMovement = this._layoutMode === LAYOUT_MODE_OVERVIEW

    let oldCameraVelocityX = this._velocity.x
    let oldCameraVelocityY = this._velocity.y

    if (!lockHorizontalMovement) {
      this._velocity.x += (this._targetPosition.x - this._photoCamera.position.x) * dt
    }
    this._velocity.y += (this._targetPosition.y - this._photoCamera.position.y) * dt

    const dist = calc.distance({
      x: this._velocity.x,
      y: this._velocity.y
    }, {
      x: oldCameraVelocityX,
      y: oldCameraVelocityY,
    })
    
    this._isDragCameraMoving = dist > CAMERA_MIN_VELOCITY_TO_BE_MOVING
    
    if (!lockHorizontalMovement) {
      this._photoCamera.position.x += this._velocity.x
    }
    this._photoCamera.position.y += this._velocity.y

    if (!lockHorizontalMovement) {
      this._photoCamera.position.x  *= CameraSystem.friction
    }
    this._photoCamera.position.y  *= CameraSystem.friction

    const screenPaddingX = 1300 - innerWidth
    const screenPaddingY = 1100 - innerHeight

    const rightBound  = WOLRD_WIDTH / 2 + screenPaddingX / 2
    const leftBound   = -WOLRD_WIDTH / 2 - screenPaddingX / 2
    const bottomBound = WORLD_HEIGHT / 2 + screenPaddingY / 2
    const topBound    = -WORLD_HEIGHT / 2 - screenPaddingY / 2

    if (this._targetPosition.x > rightBound) {
      if (!lockHorizontalMovement) {
        this._targetPosition.x = rightBound
      }
    } else if (this._targetPosition.x < leftBound) {
      if (!lockHorizontalMovement) {
        this._targetPosition.x = leftBound
      }
    } else if (this._targetPosition.y > bottomBound) {
      this._targetPosition.y = bottomBound
    } else if (this._targetPosition.y < topBound) {
      this._targetPosition.y = topBound
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
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: this._zoomFactor })
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
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom })
      // CameraSystem.controlCameraZoom({ camera: this._cursorCamera, zoom })
    })
  }
  _onResize = ({ appWidth, appHeight }) => {
    CameraSystem.resizeCamera({ camera: this._photoCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._cursorCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._postFXCamera, appWidth, appHeight })
  }
}
