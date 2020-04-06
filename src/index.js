import * as THREE from 'three'
import { tween, chain, delay } from 'popmotion'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import PhotoLabel from './PhotoLabel'
import SinglePage from './SinglePage'
import InfoPanel from './InfoPanel'
import PostProcessing from './PostProcessing'
import CameraSystem from './CameraSystem'

import { getArrowTexture } from './helpers'
import store from './store'
import {
  setLayoutMode,
} from './store/actions'

import {
  WOLRD_WIDTH,
  WORLD_HEIGHT,
  TOGGLE_SINGLE_PAGE_TRANSITION_DELAY,
  TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION,
  BLUR_ITERATIONS,
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_RAF_UPDATE_APP,
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_MOUSEMOVE_APP,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_LOADED_PROJECTS,
  EVT_CAMERA_HANDLE_MOVEMENT_WORLD,
  EVT_CAMERA_ZOOM_OUT_DRAG_START,
  EVT_CAMERA_ZOOM_IN_DRAG_END,
  EVT_ON_SCENE_DRAG_START,
  EVT_ON_SCENE_DRAG,
  EVT_ON_SCENE_DRAG_END,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_RENDER_PHOTO_SCENE_FRAME,
  EVT_RENDER_PHOTO_POSTFX_FRAME,
  EVT_APP_RESIZE,
  EVT_CLICK_PREV_PROJECT,
  EVT_CLICK_NEXT_PROJECT,
  EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO,
  EVT_OPEN_REQUEST_INFO_SECTION,
  EVT_CLOSE_REQUEST_INFO_SECTION,
  LAYOUT_MODE_GRID,
  LAYOUT_MODE_OVERVIEW,
  EVT_LAYOUT_MODE_TRANSITION_REQUEST,
  EVT_LAYOUT_MODE_TRANSITION,
  EVT_LAYOUT_MODE_TRANSITION_COMPLETE,
  EVT_TEXTURE_LABEL_MASK_ONLOAD,
  EVT_HIDE_CURSOR,
  EVT_SHOW_CURSOR,
} from './constants'

import './style'

let appWidth = window.innerWidth
let appHeight = window.innerHeight

const singlePage = new SinglePage()
const infoPanel = new InfoPanel()
const cameraSystem = new CameraSystem({
  appWidth,
  appHeight,
  position: new THREE.Vector3(0, 0, 50)
})

const webglContainer = document.getElementsByClassName('webgl-scene')[0]
const layoutModeBtnContainer = document.getElementsByClassName('webgl-scene-hint')[0]

const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const renderer = new THREE.WebGLRenderer({ alpha: true })
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const postFXBlurScene = new THREE.Scene()
const cursorScene = new THREE.Scene()
const openedProjectScene = new THREE.Scene()
const photoRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const postFXRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const postFXBlurHorizontalTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const postFXBlurVerticalTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const raycaster = new THREE.Raycaster()
const photoMeshContainer = new THREE.Group()

let oldTime = 0
let lastScrollY = 0
let isDragging = false
let isInfoSectionOpen = false
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let hoveredElement = null
let clickedElement = null
let openModelTween
let closeModelTween
let openModelTweenFactor = 1

photoScene.add(cameraSystem.photoCamera)
photoScene.add(photoMeshContainer)
cursorScene.add(cameraSystem.cursorCamera)
postFXScene.add(cameraSystem.postFXCamera)
postFXBlurScene.add(cameraSystem.postFXBlurCamera)
openedProjectScene.add(cameraSystem.openedProjectCamera)

const postFXMesh = new PostProcessing({ width: appWidth, height: appHeight })
postFXScene.add(postFXMesh.mainEffectPlane)
postFXBlurScene.add(postFXMesh.blurEffect)

const cursorArrowLeft = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({
    opacity: 1,
    map: getArrowTexture(),
    transparent: true,
  })
)
cursorArrowLeft.rotation.z = Math.PI
cursorScene.add(cursorArrowLeft)

const cursorArrowRight = cursorArrowLeft.clone()
cursorArrowRight.rotation.z = 0
cursorScene.add(cursorArrowRight)

const cursorArrowTop = cursorArrowLeft.clone()
cursorArrowTop.rotation.z = Math.PI / 2
cursorScene.add(cursorArrowTop)

const cursorArrowBottom = cursorArrowLeft.clone()
cursorArrowBottom.rotation.z = -Math.PI / 2
cursorScene.add(cursorArrowBottom)

// new THREE.TextureLoader().load(arrowLeft, texture => {
//   cursorArrowLeft.material.map = texture
//   cursorArrowLeft.material.needsUpdate = true
// })

init()

function init () {
  fetch('/get_data').then(res => res.json()).then(onProjectsLoad)

  renderer.setSize(appWidth, appHeight)
  renderer.setPixelRatio(dpr)
  renderer.setClearAlpha(0)
  webglContainer.appendChild(renderer.domElement)

  webglContainer.addEventListener('mousedown', onMouseDown, false)
  webglContainer.addEventListener('mouseup', onMouseUp, false)
  webglContainer.addEventListener('mouseleave', onWebGLSceneMouseLeave)
  webglContainer.addEventListener('mouseenter', onWebGLSceneMouseEnter)

  document.body.addEventListener('mousemove', onMouseMove, false)
  document.body.addEventListener('mouseleave', onPageMouseLeave, false)
  window.addEventListener('resize', onResize)

  layoutModeBtnContainer.addEventListener('click', onLayoutModeSelect, false)
  
  eventEmitter.on(EVT_FADE_OUT_SINGLE_VIEW, onCloseSingleView)
  eventEmitter.on(EVT_CLICK_PREV_PROJECT, onPrevProjectClick)
  eventEmitter.on(EVT_CLICK_NEXT_PROJECT, onNextProjectClick)
  eventEmitter.on(EVT_OPEN_REQUEST_INFO_SECTION, onInfoSectionOpenRequest)
  eventEmitter.on(EVT_CLOSE_REQUEST_INFO_SECTION, onInfoSectionCloseRequest)
  
  requestAnimationFrame(updateFrame)
}

function onLayoutModeSelect (e) {
  if (!e.target.classList.contains('hint')) {
    return
  }
  if (e.target.getAttribute('data-layout-mode') === LAYOUT_MODE_GRID) {
    document.body.classList.add(`layout-mode-grid`)
    document.body.classList.remove(`layout-mode-overview`)
    cursorArrowLeft.visible = true
    cursorArrowRight.visible = true
    store.dispatch(setLayoutMode(LAYOUT_MODE_GRID))
    webglContainer.removeEventListener('mousewheel', onOverviewLayoutMousewheel)
  } else if (e.target.getAttribute('data-layout-mode') === LAYOUT_MODE_OVERVIEW) {
    document.body.classList.remove(`layout-mode-grid`)
    document.body.classList.add(`layout-mode-overview`)
    cursorArrowLeft.visible = false
    cursorArrowRight.visible = false
    store.dispatch(setLayoutMode(LAYOUT_MODE_OVERVIEW))
    webglContainer.addEventListener('mousewheel', onOverviewLayoutMousewheel, false)
  }
  eventEmitter.emit(EVT_LAYOUT_MODE_TRANSITION_REQUEST)
  tween().start({
    update: tweenFactor => {
      eventEmitter.emit(EVT_LAYOUT_MODE_TRANSITION, { tweenFactor })
    },
    complete: () => {
      eventEmitter.emit(EVT_LAYOUT_MODE_TRANSITION_COMPLETE)
    },
  })
}

function onOverviewLayoutMousewheel (e) {
  const scrollY = lastScrollY + e.deltaY
  const diffy = (scrollY - lastScrollY) * -1
  eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx: 0, diffy })
  lastScrollY = scrollY
}

function onInfoSectionOpenRequest () {
  document.body.style.setProperty('cursor', 'default')
  isInfoSectionOpen = true
}

function onInfoSectionCloseRequest () {
  document.body.style.setProperty('cursor', 'none')
  isInfoSectionOpen = false
}

function onPrevProjectClick ({ modelName }) {
  eventEmitter.emit(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, {
    modelName,
    direction: -1,
    targetX: cameraSystem.photoCamera.position.x - appWidth * 0.25,
    targetY: cameraSystem.photoCamera.position.y,
  })
}

function onNextProjectClick ({ modelName }) {
  eventEmitter.emit(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, {
    modelName,
    direction: 1,
    targetX: cameraSystem.photoCamera.position.x - appWidth * 0.25,
    targetY: cameraSystem.photoCamera.position.y,
  })
}

function onProjectsLoad (res) {
  eventEmitter.emit(EVT_LOADED_PROJECTS, { projectsData: res.projects })
  res.projects.forEach((info, i) => {
    const photoPreview = new PhotoPreview({
      idx: i,
      isLast: i === res.projects.length - 1,
      modelName: info.modelName,
      width: PREVIEW_PHOTO_REF_WIDTH,
      height: PREVIEW_PHOTO_REF_HEIGHT,
      photos: info.sliderPhotos || [],
      gridPosition: new THREE.Vector3(info.posX, info.posY, 0),
    })
    const previewLabel = new PhotoLabel({
      modelName: info.modelName,
      position: new THREE.Vector3(info.posX - PREVIEW_PHOTO_REF_WIDTH * 0.25, info.posY - PREVIEW_PHOTO_REF_HEIGHT / 2, 25),
    })
    previewLabel.position.z = 40
    photoMeshContainer.add(photoPreview)
    photoMeshContainer.add(previewLabel)
  })
  new THREE.TextureLoader().load('/mask.png', texture => {
    eventEmitter.emit(EVT_TEXTURE_LABEL_MASK_ONLOAD, { texture })
  })
}

function onCloseSingleView (modelName) {
  eventEmitter.emit(EVT_CLOSE_REQUEST_SINGLE_PROJECT, ({ modelName }))

  closeModelTween = chain(
    delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
    tween({ duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor })
  ).start({
    update: tweenFactor => {
      openModelTweenFactor = tweenFactor
      eventEmitter.emit(EVT_CLOSING_SINGLE_PROJECT, { modelName, tweenFactor })
    },
    complete: () => {
      eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, ({ modelName }))
      photoMeshContainer.add(openedProjectScene.children[1])
      closeModelTween = null
      clickedElement = null
    }
  })
}

function onResize () {
  appWidth = window.innerWidth
  appHeight = window.innerHeight

  renderer.setSize(appWidth, appHeight)
  photoRenderTarget.setSize(appWidth * dpr, appHeight * dpr)

  eventEmitter.emit(EVT_APP_RESIZE, { appWidth, appHeight })
}

function onPageMouseLeave () {
  cursorArrowOffsetTarget = 0
  isDragging = false

  eventEmitter.emit(EVT_ON_SCENE_DRAG_END)
  eventEmitter.emit(EVT_CAMERA_ZOOM_IN_DRAG_END)
}

function onWebGLSceneMouseLeave () {
  eventEmitter.emit(EVT_HIDE_CURSOR)
}

function onWebGLSceneMouseEnter () {
  eventEmitter.emit(EVT_SHOW_CURSOR)
}

function onMouseDown (e) {
  isDragging = true
  mousePos.x = e.pageX
  mousePos.y = e.pageY

  if (isInfoSectionOpen) {
    return
  }

  eventEmitter.emit(EVT_ON_SCENE_DRAG_START)

  if (hoveredElement && !clickedElement) {
    if (!cameraSystem.isDragCameraMoving) {
      if (closeModelTween) {
        closeModelTween.stop()
        closeModelTween = null
      }
      const { modelName } = hoveredElement

      openedProjectScene.add(hoveredElement)
      const mesh = photoMeshContainer.children.find(mesh => mesh.modelName === modelName && mesh.isLabel)
      mesh.visible = false

      eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({
        modelName,
        targetX: cameraSystem.photoCamera.position.x - appWidth * 0.25,
        targetY: cameraSystem.photoCamera.position.y,
      }))
      openModelTween = chain(
        delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
        tween({ duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor })
      ).start({
        update: tweenFactor => {
          openModelTweenFactor = tweenFactor
          eventEmitter.emit(EVT_OPENING_SINGLE_PROJECT, { modelName, tweenFactor })
        },
        complete: () => {
          isDragging = false
          clickedElement = hoveredElement
          openModelTween = null

          eventEmitter.emit(EVT_OPEN_SINGLE_PROJECT, ({ modelName }))
        },
      })
    } else {
      eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE)
      cursorArrowOffsetTarget = 1
    }
  } else {
    eventEmitter.emit(EVT_CAMERA_ZOOM_OUT_DRAG_START)
    cursorArrowOffsetTarget = 1
  }
}

function onMouseMove (e) {
  const { layoutMode } = store.getState()
  eventEmitter.emit(EVT_MOUSEMOVE_APP, { mouseX: mousePos.x, mouseY: mousePos.y})

  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  if (isDragging && !openModelTween && !closeModelTween && !clickedElement && !isInfoSectionOpen) {
    const diffx = layoutMode === LAYOUT_MODE_GRID ? e.pageX - mousePos.x : 0
    const diffy = e.pageY - mousePos.y
    eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx, diffy })
  } else {
    // ...
  }
  mousePos.x = e.pageX
  mousePos.y = e.pageY
}

function onMouseUp () {
  if (hoveredElement) {
    if (!clickedElement) {
      if (openModelTween) {
        openModelTween.stop()
        openModelTween = null

        const { modelName } = hoveredElement

        eventEmitter.emit(EVT_CLOSE_REQUEST_SINGLE_PROJECT, ({ modelName }))

        closeModelTween = chain(
          delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
          tween({ duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor })
        ).start({
          update: tweenFactor => {
            openModelTweenFactor = tweenFactor
            eventEmitter.emit(EVT_CLOSING_SINGLE_PROJECT, { modelName, tweenFactor })
          },
          complete: () => {
            photoMeshContainer.add(openedProjectScene.children[1])
            photoMeshContainer.children.filter(mesh => mesh.isLabel).forEach(mesh => {
              mesh.visible = true
            })
            eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, ({ modelName }))
            closeModelTween = null
            clickedElement = null
          }
        })
      }
    }
  }
  isDragging = false
  cursorArrowOffsetTarget = 0
  if (!isInfoSectionOpen) {
    eventEmitter.emit(EVT_CAMERA_ZOOM_IN_DRAG_END)
    eventEmitter.emit(EVT_ON_SCENE_DRAG_END)
  }
}

function updateFrame(ts) {
  if (!ts) { ts = 0 }
  const dt = Math.min((ts - oldTime) / 1000, 1)
  oldTime = ts

  eventEmitter.emit(EVT_RAF_UPDATE_APP, ts, dt)

  if (!isDragging && !isInfoSectionOpen) {
    raycaster.setFromCamera(raycastMouse, cameraSystem.photoCamera)
    const intersectsTests = photoMeshContainer.children.filter(a => a.isInteractable)
    const intersects = raycaster.intersectObjects(intersectsTests)
    if (intersects.length > 0) {
      if (cameraSystem.isDragCameraMoving) {
        eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE)
      } else {
        const intersect = intersects[0]
        const { object, object: { modelName } } = intersect
        if (!hoveredElement) {
          hoveredElement = object
        }
        eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_ENTER, { modelName })
      }
    } else {
      hoveredElement = null
      eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE)
    }
  }

  if (!clickedElement) {
    eventEmitter.emit(EVT_CAMERA_HANDLE_MOVEMENT_WORLD, ts, dt)
  }

  const cursorBasePosX = (raycastMouse.x * appWidth) / 2
  const cursorBasePosY = (raycastMouse.y * appHeight) / 2

  const arrowIndicatorFactor = dt * 25

  cursorArrowOffset += (cursorArrowOffsetTarget * 12 - cursorArrowOffset) * arrowIndicatorFactor
  cursorArrowLeft.material.opacity += (cursorArrowOffsetTarget * 0.5 - cursorArrowLeft.material.opacity) * arrowIndicatorFactor

  cursorArrowLeft.position.x += (cursorBasePosX + 33 + cursorArrowOffset - cursorArrowLeft.position.x) * arrowIndicatorFactor
  cursorArrowLeft.position.y += (cursorBasePosY - cursorArrowLeft.position.y) * arrowIndicatorFactor

  cursorArrowRight.position.x += (cursorBasePosX - 33 - cursorArrowOffset - cursorArrowRight.position.x) * arrowIndicatorFactor
  cursorArrowRight.position.y += (cursorBasePosY - cursorArrowRight.position.y) * arrowIndicatorFactor

  cursorArrowTop.position.x += (cursorBasePosX - cursorArrowTop.position.x) * arrowIndicatorFactor
  cursorArrowTop.position.y += (cursorBasePosY - 33 - cursorArrowOffset - cursorArrowTop.position.y) * arrowIndicatorFactor

  cursorArrowBottom.position.x += (cursorBasePosX - cursorArrowBottom.position.x) * arrowIndicatorFactor
  cursorArrowBottom.position.y += (cursorBasePosY + 33 + cursorArrowOffset - cursorArrowBottom.position.y) * arrowIndicatorFactor
  
  renderer.autoClear = true
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, cameraSystem.photoCamera)
  eventEmitter.emit(EVT_RENDER_PHOTO_SCENE_FRAME, { texture: photoRenderTarget.texture })
  
  renderer.autoClear = false

  renderer.setRenderTarget(postFXRenderTarget)
  renderer.render(postFXScene, cameraSystem.postFXCamera)
  
  let writeBuffer = postFXBlurHorizontalTarget
  let readBuffer = postFXBlurVerticalTarget

  for (let i = 0; i < BLUR_ITERATIONS; i++) {
    renderer.setRenderTarget(writeBuffer)

    const radius = (BLUR_ITERATIONS - i - 1)

    if (i === 0) {
      eventEmitter.emit(EVT_RENDER_PHOTO_POSTFX_FRAME, { texture: postFXRenderTarget.texture })
    } else {
      eventEmitter.emit(EVT_RENDER_PHOTO_POSTFX_FRAME, { texture: readBuffer.texture })
    }

    postFXMesh.setBlurDirection(i % 2 === 0 ? { x: radius, y: 0} : { x: 0, y: radius })

    renderer.render(postFXBlurScene, cameraSystem.postFXBlurCamera)

    let t = writeBuffer
    writeBuffer = readBuffer
    readBuffer = t
  }

  renderer.setRenderTarget(null)
  renderer.render(postFXBlurScene, cameraSystem.postFXBlurCamera)

  renderer.render(cursorScene, cameraSystem.cursorCamera)

  renderer.render(openedProjectScene, cameraSystem.openedProjectCamera)

  requestAnimationFrame(updateFrame)
}
