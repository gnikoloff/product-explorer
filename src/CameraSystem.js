import * as THREE from 'three'
import { calc, tween, easing, chain, delay, mouse } from 'popmotion'

import store from './store'
import {
  setCameraPosition,
  setWorldBoundsTop,
  setWorldBoundsRight,
  setWorldBoundsBottom,
  setWorldBoundsLeft,
} from './store/actions'

import {
  isMobileBrowser, mapNumber,
} from './helpers'

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
  EVT_ON_SCENE_DRAG_END,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
  EVT_LAYOUT_MODE_TRANSITION_REQUEST,
  LAYOUT_MODE_GRID,
  LAYOUT_MODE_OVERVIEW,
  EVT_CAMERA_FORCE_REPOSITION,
  EVT_DRAG_TOP_BORDER,
  EVT_DRAG_RIGHT_BORDER,
  EVT_DRAG_BOTTOM_BORDER,
  EVT_DRAG_LEFT_BORDER,
  PREVIEW_PHOTO_REF_HEIGHT,
} from './constants'
import { Camera } from 'three'

const mobileBrowser = isMobileBrowser() && innerWidth < 800

export default class CameraSystem {
  static MOBILE_CAMERA_ZOOM = 0.5
  static SCENE_DRAG_END_BORDER_INNER_OFFSET = 60
  static SCENE_DRAG_DIFF_FACTOR_SCALE_DESKTOP = 0.1
  static SCENE_DRAG_DIFF_FACTOR_SCALE_MOBILE = 0.5

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

    this._borderDragFactor = 1
    this._isPullingBorderTop = false
    this._isPullingBorderRight = false
    this._isPullingBorderBottom = false
    this._isPullingBorderLeft = false
    this._lastMousePosBorderTouch = new THREE.Vector2()

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
    eventEmitter.on(EVT_ON_SCENE_DRAG_END, this._onSceneDragEnd)
    eventEmitter.on(EVT_CAMERA_ZOOM_OUT_DRAG_START, this._onDragZoomOut)
    eventEmitter.on(EVT_CAMERA_ZOOM_IN_DRAG_END, this._onDragZoomIn)
    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
    eventEmitter.on(EVT_LAYOUT_MODE_TRANSITION_REQUEST, this._onLayoutModeChange)
    eventEmitter.on(EVT_CAMERA_FORCE_REPOSITION, this._onForceRelayout)

    if (mobileBrowser) {
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: CameraSystem.MOBILE_CAMERA_ZOOM })
    }
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
    const { layoutMode } = store.getState()
    const startX = this._photoCamera.position.x
    const startY = this._photoCamera.position.y
    this._shouldMove = false
    tween({
      ease: easing.easeIn,
    }).start({
      update: tweenFactor => {
        this._photoCamera.position.x = calc.getValueFromProgress(startX, 0, tweenFactor)
        this._photoCamera.position.y = calc.getValueFromProgress(startY, 0, tweenFactor)
        this._targetPosition.copy(this._photoCamera.position)
      },
      complete: () => {
        // ...
        this._shouldMove = true
      }
    })
    if (mobileBrowser) {
      chain(
        delay(300),
        tween({
          ease: easing.anticipate,
        }).start(tweenFactor => {
          if (layoutMode === LAYOUT_MODE_OVERVIEW) {
            const start = CameraSystem.MOBILE_CAMERA_ZOOM
            this._zoomFactor = start + tweenFactor * 0.25
            CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: this._zoomFactor })
          } else if (layoutMode === LAYOUT_MODE_GRID) {
            const zoom = mapNumber(tweenFactor, 0, 1, this._zoomFactor, CameraSystem.MOBILE_CAMERA_ZOOM)
            CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom })
          }
        })
      )
    }
    this._velocity.set(0, 0)
  }
  _onRequestOpenProject = () => {
    this._shouldMove = false
    this._targetPosition.copy(this._photoCamera.position)
  }
  _onForceRelayout = ({ x, y }) => {
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
      isCurrentlyScrollingOverview,
      scrollY,
      isMobile,
      mousePositionX,
      mousePositionY,
      worldBoundsTop,
      worldBoundsRight,
      worldBoundsBottom,
      worldBoundsLeft,
      layoutMode
    } = store.getState()

    let newCameraPositionX = this._photoCamera.position.x
    let newCameraPositionY = this._photoCamera.position.y

    const lockHorizontalMovement = layoutMode === LAYOUT_MODE_OVERVIEW

    const vx = (this._targetPosition.x - newCameraPositionX) * (dt * 4)
    const vy = (this._targetPosition.y - newCameraPositionY) * (dt * 4)

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
      this._borderDragFactor = isMobile ? CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_MOBILE : CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_DESKTOP
      if (!lockHorizontalMovement) {
        // this._targetPosition.x = worldBoundsRight
        if (!this._isPullingBorderTop && !this._isPullingBorderRight && !this._isPullingBorderBottom && !this._isPullingBorderLeft) {
        // if (!this._isPullingBorderRight) {
          const x = mousePositionX
          const y = isCurrentlyScrollingOverview ? scrollY : mousePositionY
          this._lastMousePosBorderTouch.set(x, y)
          this._isPullingBorderRight = true
        }
      }
    } else {
      this._isPullingBorderRight = false
      if (!this._isPullingBorderTop && !this._isPullingBorderBottom && !this._isPullingBorderLeft) {
        this._borderDragFactor = 1
      }
    }
    if (this._targetPosition.x < worldBoundsLeft) {
      this._borderDragFactor = isMobile ? CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_MOBILE : CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_DESKTOP
      if (!lockHorizontalMovement) {
        // this._targetPosition.x = worldBoundsLeft
        // if (!this._isPullingBorderTop && !this._isPullingBorderRight && !this._isPullingBorderBottom && !this._isPullingBorderLeft) {
        if (!this._isPullingBorderLeft) {
          this._isPullingBorderLeft = true
          const x = mousePositionX
          const y = isCurrentlyScrollingOverview ? scrollY : mousePositionY
          this._lastMousePosBorderTouch.set(x, y)
        }
      }
    } else {
      this._isPullingBorderLeft = false
      if (!this._isPullingBorderTop && !this._isPullingBorderRight && !this._isPullingBorderBottom) {
        this._borderDragFactor = 1
      }
    }
    if (this._targetPosition.y > worldBoundsTop) {
      this._borderDragFactor = isMobile ? CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_MOBILE : CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_DESKTOP
      // this._targetPosition.y = worldBoundsTop
      // if (!this._isPullingBorderTop && !this._isPullingBorderRight && !this._isPullingBorderBottom && !this._isPullingBorderLeft) {
      if (!this._isPullingBorderTop) {
        this._isPullingBorderTop = true
        const x = mousePositionX
        const y = isCurrentlyScrollingOverview ? scrollY : mousePositionY
        this._lastMousePosBorderTouch.set(x, y)
      }
    } else {
      this._isPullingBorderTop = false
      if (!this._isPullingBorderRight && !this._isPullingBorderBottom && !this._isPullingBorderLeft) {
        this._borderDragFactor = 1
      }
    }
    if (this._targetPosition.y < worldBoundsBottom) {
      this._borderDragFactor = isMobile ? CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_MOBILE : CameraSystem.SCENE_DRAG_DIFF_FACTOR_SCALE_DESKTOP
      // this._targetPosition.y = worldBoundsBottom
      // if (!this._isPullingBorderTop && !this._isPullingBorderRight && !this._isPullingBorderBottom && !this._isPullingBorderLeft) {
      if (!this._isPullingBorderBottom) {
        this._isPullingBorderBottom = true
        const x = mousePositionX
        const y = isCurrentlyScrollingOverview ? scrollY : mousePositionY
        this._lastMousePosBorderTouch.set(x, y)
      }
    } else {
      this._isPullingBorderBottom = false
      if (!this._isPullingBorderTop && !this._isPullingBorderRight && !this._isPullingBorderLeft) {
        this._borderDragFactor = 1
      }
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
    const {
      isMobile,
      layoutMode,
      overviewLayoutHeight
    } = store.getState()

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
      topBound   = isMobile ? PREVIEW_PHOTO_REF_HEIGHT / 2 : PREVIEW_PHOTO_REF_HEIGHT / 3.25
      bottomBound = overviewLayoutHeight
    }

    store.dispatch(setWorldBoundsTop(topBound))
    store.dispatch(setWorldBoundsRight(rightBound))
    store.dispatch(setWorldBoundsBottom(bottomBound))
    store.dispatch(setWorldBoundsLeft(leftBound))
  }
  _onSceneDrag = ({ diffx, diffy, isTouch }) => {
    const {
      mousePositionX,
      mousePositionY,
      layoutMode
    } = store.getState()
    const lockHorizontalMovement = layoutMode === LAYOUT_MODE_OVERVIEW
    let diffScale = isTouch ? 2.65 : 1.5
    diffScale *= this._borderDragFactor
    if (!lockHorizontalMovement) {
      this._targetPosition.x += diffx * -diffScale + 1
    }
    this._targetPosition.y += diffy * diffScale - 1

    if (this._isPullingBorderTop) {
      const dragTopBorderDiff = mousePositionY - this._lastMousePosBorderTouch.y
      eventEmitter.emit(EVT_DRAG_TOP_BORDER, { offsetY: Math.abs(dragTopBorderDiff) })
    } else if (this._isPullingBorderRight) {
      const dragRightBorderDiff = mousePositionX - this._lastMousePosBorderTouch.x
      eventEmitter.emit(EVT_DRAG_RIGHT_BORDER, { offsetX: Math.abs(dragRightBorderDiff) })
    } else if (this._isPullingBorderBottom) {
      const dragBottomBorderDiff = mousePositionY - this._lastMousePosBorderTouch.y
      eventEmitter.emit(EVT_DRAG_BOTTOM_BORDER, { offsetY: Math.abs(dragBottomBorderDiff) })
    } else if (this._isPullingBorderLeft) {
      const dragLeftBorderDiff = mousePositionX - this._lastMousePosBorderTouch.x
      eventEmitter.emit(EVT_DRAG_LEFT_BORDER, { offsetX: Math.abs(dragLeftBorderDiff) })
    }
  }
  _onSceneDragEnd = () => {
    const {
      worldBoundsTop,
      worldBoundsRight,
      worldBoundsBottom,
      worldBoundsLeft,
    } = store.getState()
    if (this._isPullingBorderTop) {
      this._targetPosition.y = worldBoundsTop - CameraSystem.SCENE_DRAG_END_BORDER_INNER_OFFSET
    }
    if (this._isPullingBorderRight) {
      this._targetPosition.x = worldBoundsRight - CameraSystem.SCENE_DRAG_END_BORDER_INNER_OFFSET
    }
    if (this._isPullingBorderBottom) {
      this._targetPosition.y = worldBoundsBottom + CameraSystem.SCENE_DRAG_END_BORDER_INNER_OFFSET
    }
    if (this._isPullingBorderLeft) {
      this._targetPosition.x = worldBoundsLeft + CameraSystem.SCENE_DRAG_END_BORDER_INNER_OFFSET
    }
    this._borderDragFactor = 1
    this._isPullingBorderTop = false
    this._isPullingBorderRight = false
    this._isPullingBorderBottom = false
    this._isPullingBorderLeft = false
    this._lastMousePosBorderTouch.set(0, 0)
  }
  _onDragZoomOut = () => {
    const { layoutMode } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      return
    }
    this._isZoomedOut = true
    tween().start(tweenFactor => {
      const start = mobileBrowser ? CameraSystem.MOBILE_CAMERA_ZOOM : 1
      this._zoomFactor = start - tweenFactor * 0.125
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom: this._zoomFactor })
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
      const zoom = mobileBrowser
        ? mapNumber(tweenFactor, 0, 1, this._zoomFactor, CameraSystem.MOBILE_CAMERA_ZOOM)
        : this._zoomFactor + tweenFactor * 0.125
      CameraSystem.controlCameraZoom({ camera: this._photoCamera, zoom })
    })
  }
  _onResize = ({ appWidth, appHeight }) => {
    CameraSystem.resizeCamera({ camera: this._photoCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._cursorCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._postFXCamera, appWidth, appHeight })
    CameraSystem.resizeCamera({ camera: this._openedProjectCamera, appWidth, appHeight })
  }
}
