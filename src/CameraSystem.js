import * as THREE from 'three'
import { calc, tween } from 'popmotion'

import store from './store'
import {
  setCameraPosition,
  setWorldBoundsTop,
  setWorldBoundsRight,
  setWorldBoundsBottom,
  setWorldBoundsLeft,
} from './store/actions'

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
  EVT_CAMERA_FORCE_REPOSITION,
} from './constants'

export default class CameraSystem {
  static friction = 0.875

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

    const cameraLookAt = new THREE.Vector3(0, 0, 0)

    this._photoCamera = new THREE.OrthographicCamera(appWidth / - 2, appWidth / 2, appHeight / 2, appHeight / - 2, 1, 1000)
    this._postFXCamera = this._photoCamera.clone()
    this._postFXBlurCamera = this._photoCamera.clone()
    this._cursorCamera = this._photoCamera.clone()
    this._openedProjectCamera = this._photoCamera.clone()

    this._photoCamera.position.copy(position)
    this._photoCamera.lookAt(cameraLookAt)

    this._cursorCamera.position.copy(position)
    this._cursorCamera.lookAt(cameraLookAt)

    this._openedProjectCamera.position.copy(position)
    this._openedProjectCamera.lookAt(cameraLookAt)
    
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
    eventEmitter.on(EVT_CAMERA_FORCE_REPOSITION, this._onForceRelayout)
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
  get openedProjectCamera () {
    return this._openedProjectCamera
  }
  get isDragCameraMoving () {
    return this._isDragCameraMoving
  }
  _onLayoutModeChange = () => {
    this._photoCamera.position.x = 0
    this._photoCamera.position.y = 0
    this._targetPosition.copy(this._photoCamera.position)
    this._velocity.set(0, 0)
  }
  _onRequestOpenProject = () => {
    this._shouldMove = false
    this._targetPosition.copy(this._photoCamera.position)
  }
  _onForceRelayout = ({ x, y }) => {
    // } else if (x < worldBoundsLeft) {
    //   x = worldBoundsLeft
    // }
    // if (y > worldBoundsTop) {
    //   y = worldBoundsTop
    // } else if (y < worldBoundsBottom) {
    //   y = worldBoundsBottom
    // }
    this._targetPosition.x = x
    this._targetPosition.y = y
    this._photoCamera.position.x = x
    this._photoCamera.position.y = y
    this._openedProjectCamera.position.x = x
    this._openedProjectCamera.position.y = y
    setCameraPosition({ x, y })
    
  }
  _onRequestCloseProject = () => {
    this._shouldMove = true
  }
  _handleMovement = (ts, dt) => {
    if (!this._shouldMove) {
      return
    }

    const {
      cameraPositionX,
      cameraPositionY,
      worldBoundsTop,
      worldBoundsRight,
      worldBoundsBottom,
      worldBoundsLeft,
      layoutMode
    } = store.getState()

    let newCameraPositionX = this._photoCamera.position.x
    let newCameraPositionY = this._photoCamera.position.y

    const lockHorizontalMovement = layoutMode === LAYOUT_MODE_OVERVIEW

    const vx = (this._targetPosition.x - newCameraPositionX) * dt
    const vy = (this._targetPosition.y - newCameraPositionY) * dt

    if (!lockHorizontalMovement) {
      newCameraPositionX += vx
    }
    newCameraPositionY += vy

    // const dist = calc.distance({
    //   x: newCameraPositionX,
    //   y: newCameraPositionX
    // }, {
    //   x: this._photoCamera.position.x,
    //   y: this._photoCamera.position.y,
    // })
    
    // this._isDragCameraMoving = dist > CAMERA_MIN_VELOCITY_TO_BE_MOVING

    if (this._targetPosition.x > worldBoundsRight) {
      if (!lockHorizontalMovement) {
        this._targetPosition.x = worldBoundsRight
      }
    }
    if (this._targetPosition.x < worldBoundsLeft) {
      if (!lockHorizontalMovement) {
        this._targetPosition.x = worldBoundsLeft
      }
    }
    if (this._targetPosition.y > worldBoundsTop) {
      this._targetPosition.y = worldBoundsTop
    }
    if (this._targetPosition.y < worldBoundsBottom) {
      this._targetPosition.y = worldBoundsBottom
    }

    this._photoCamera.position.x = newCameraPositionX
    this._photoCamera.position.y = newCameraPositionY
    this._openedProjectCamera.position.x = this._photoCamera.position.x
    this._openedProjectCamera.position.y = this._photoCamera.position.y
    store.dispatch(setCameraPosition({
      x: newCameraPositionX,
      y: newCameraPositionY,
    }))
    this._getWolrdBounds()
  }
  _getWolrdBounds = () => {
    const { layoutMode, overviewLayoutHeight } = store.getState()

    let rightBound
    let leftBound
    let topBound
    let bottomBound

    if (layoutMode === LAYOUT_MODE_GRID) {
      rightBound  =  WOLRD_WIDTH / 2
      leftBound   = -WOLRD_WIDTH / 2
      topBound    =  WORLD_HEIGHT / 2
      bottomBound = -WORLD_HEIGHT / 2
    } else if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      rightBound = 0
      leftBound  = 0
      topBound   = 0
      bottomBound = overviewLayoutHeight
    }

    store.dispatch(setWorldBoundsTop(topBound))
    store.dispatch(setWorldBoundsRight(rightBound))
    store.dispatch(setWorldBoundsBottom(bottomBound))
    store.dispatch(setWorldBoundsLeft(leftBound))
  }
  _onSceneDrag = ({ diffx, diffy }) => {
    const { layoutMode } = store.getState()
    const lockHorizontalMovement = layoutMode === LAYOUT_MODE_OVERVIEW
    if (!lockHorizontalMovement) {
      this._targetPosition.x += diffx * -2 + 1
    }
    this._targetPosition.y += diffy * 2 - 1
  }
  _onDragZoomOut = () => {
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      return
    }
    this._isZoomedOut = true
    tween().start(tweenFactor => {
      this._zoomFactor = 1 - tweenFactor * 0.125
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: this._zoomFactor })
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: this._zoomFactor })
      // CameraSystem.controlCameraZoom({ camera: this._cursorCamera, zoom: this._zoomFactor })
    })
  }
  _onDragZoomIn = () => {
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      return
    }
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
    CameraSystem.resizeCamera({ camera: this._openedProjectCamera, appWidth, appHeight })
  }
}
