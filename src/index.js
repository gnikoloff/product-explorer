import * as THREE from 'three'
import { tween, chain, delay } from 'popmotion'
import styler from 'stylefire'
import WebFont from 'webfontloader'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import PhotoLabel from './PhotoLabel'
import SinglePage from './SinglePage'
import InfoPanel from './InfoPanel'
import PostProcessing from './PostProcessing'
import CameraSystem from './CameraSystem'
import Cursor from './Cursor'
import LoadManager from './LoadManager'

import {
  getArrowTexture,
  mapNumber,
  isMobileBrowser,
} from './helpers'

import store from './store'
import {
  setMousePosition,
  setLayoutMode,
  setLayoutModeTransitioning,
  setWebglMaxTexturesSupported,
} from './store/actions'

import {
  SERVER_API_ENDPOINT,
  PROJECTS_COUNT,
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
  EVT_OPENING_INFO_SECTION,
  EVT_CLOSE_REQUEST_INFO_SECTION,
  EVT_CLOSING_INFO_SECTION,
  LAYOUT_MODE_GRID,
  LAYOUT_MODE_OVERVIEW,
  EVT_LAYOUT_MODE_TRANSITION_REQUEST,
  EVT_LAYOUT_MODE_TRANSITION,
  EVT_LAYOUT_MODE_TRANSITION_COMPLETE,
  EVT_TEXTURE_LABEL_MASK_ONLOAD,
  EVT_HIDE_CURSOR,
  EVT_SHOW_CURSOR,
  EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT,
  EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT,
} from './constants'

import './style'

const mobileBrowser = isMobileBrowser()

let appWidth = window.innerWidth
let appHeight = window.innerHeight

const singlePage = new SinglePage()
const infoPanel = new InfoPanel()
const cameraSystem = new CameraSystem({
  appWidth,
  appHeight,
  position: new THREE.Vector3(0, 0, 50)
})

let cursor
if (!mobileBrowser) {
  cursor = new Cursor()
}

const webglContainer = document.getElementsByClassName('webgl-scene')[0]
const layoutModeBtnContainer = document.getElementsByClassName('webgl-scene-hint')[0]
const layoutModeBtnStyler = styler(layoutModeBtnContainer)

const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const renderer = new THREE.WebGLRenderer({ alpha: true })
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const postFXBlurScene = new THREE.Scene()
const cursorScene = new THREE.Scene()
const openedProjectScene = new THREE.Scene()
const raycaster = new THREE.Raycaster()
const photoMeshContainer = new THREE.Group()

let photoRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
let postFXRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
let postFXBlurHorizontalTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
let postFXBlurVerticalTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
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

const _gl = renderer.getContext()
store.dispatch(setWebglMaxTexturesSupported(_gl.getParameter(_gl.MAX_TEXTURE_IMAGE_UNITS)))

photoScene.add(cameraSystem.photoCamera)
photoScene.add(photoMeshContainer)
cursorScene.add(cameraSystem.cursorCamera)
postFXScene.add(cameraSystem.postFXCamera)
postFXBlurScene.add(cameraSystem.postFXBlurCamera)
openedProjectScene.add(cameraSystem.openedProjectCamera)

openedProjectScene.add(cursor)

const postFXMesh = new PostProcessing({ width: appWidth, height: appHeight })
postFXScene.add(postFXMesh.mainEffectPlane)
postFXBlurScene.add(postFXMesh.blurEffect)

let cursorArrowLeft
let cursorArrowRight
let cursorArrowTop
let cursorArrowBottom

if (!mobileBrowser) {
  cursorArrowLeft = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(10, 10),
    new THREE.MeshBasicMaterial({
      opacity: 1,
      map: getArrowTexture(),
      transparent: true,
    })
  )
  cursorArrowLeft.rotation.z = Math.PI
  cursorScene.add(cursorArrowLeft)
  cursorArrowRight = cursorArrowLeft.clone()
  cursorArrowRight.rotation.z = 0
  cursorScene.add(cursorArrowRight)
  cursorArrowTop = cursorArrowLeft.clone()
  cursorArrowTop.rotation.z = Math.PI / 2
  cursorScene.add(cursorArrowTop)
  cursorArrowBottom = cursorArrowLeft.clone()
  cursorArrowBottom.rotation.z = -Math.PI / 2
  cursorScene.add(cursorArrowBottom)
}

init()

function init () {
  new LoadManager({
    onLoadComplete: () => {
      console.log('load has been completed')
    }
  })

  const fontsToLoadCount = 1
  const fetchJSONToLoadCount = 1
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, fontsToLoadCount)
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, fetchJSONToLoadCount)
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, PROJECTS_COUNT)
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, 1)
  LoadManager.loadTexture(`${SERVER_API_ENDPOINT}/mask.png`).then(texture => {
    eventEmitter.emit(EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT, 1)
    eventEmitter.emit(EVT_TEXTURE_LABEL_MASK_ONLOAD, { texture })
  }) 
  fetch(`${SERVER_API_ENDPOINT}/get_data`).then(res => res.json()).then(projects => {
    eventEmitter.emit(EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT)
    onProjectsLoad(projects)
  })
  WebFont.load({
    google: { families: ['Inter:wght@400;500&display=swap&subset'] },
    active: () => eventEmitter.emit(EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT)
  })

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

  document.body.addEventListener('touchstart', e => {
    const touch = e.changedTouches[0]
    store.dispatch(setMousePosition({ x: touch.pageX, y: touch.pageY }))
    eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE)
    eventEmitter.emit(EVT_CAMERA_ZOOM_OUT_DRAG_START)
    cursorArrowOffsetTarget = 1
  }, { passive: true })

  document.body.addEventListener('touchmove', e => {
    const { layoutMode, mousePositionX, mousePositionY } = store.getState()
    const touch = e.changedTouches[0]
    
    const diffx = layoutMode === LAYOUT_MODE_GRID ? touch.pageX - mousePositionX : 0
    const diffy = touch.pageY - mousePositionY
    eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx, diffy })

    raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
    raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

    store.dispatch(setMousePosition({ x: touch.pageX, y: touch.pageY }))
  }, { passive: true })

  document.body.addEventListener('touchend', e => {
    isDragging = false
    cursorArrowOffsetTarget = 0
    if (!isInfoSectionOpen) {
      eventEmitter.emit(EVT_CAMERA_ZOOM_IN_DRAG_END)
      eventEmitter.emit(EVT_ON_SCENE_DRAG_END)
    }
  })

  layoutModeBtnContainer.addEventListener('click', onLayoutModeSelect, false)
  
  eventEmitter.on(EVT_FADE_OUT_SINGLE_VIEW, modelName => onCloseSingleView({ modelName, reposition: true }))
  eventEmitter.on(EVT_CLICK_PREV_PROJECT, onPrevProjectClick)
  eventEmitter.on(EVT_CLICK_NEXT_PROJECT, onNextProjectClick)
  eventEmitter.on(EVT_OPEN_REQUEST_INFO_SECTION, onInfoSectionOpenRequest)
  eventEmitter.on(EVT_OPENING_INFO_SECTION, onInfoSectionOpening)
  eventEmitter.on(EVT_CLOSING_INFO_SECTION, onInfoSectionClosing)
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
    if (!mobileBrowser) {
      cursorArrowLeft.visible = true
      cursorArrowRight.visible = true
    }
    store.dispatch(setLayoutMode(LAYOUT_MODE_GRID))
    webglContainer.removeEventListener('mousewheel', onOverviewLayoutMousewheel)
  } else if (e.target.getAttribute('data-layout-mode') === LAYOUT_MODE_OVERVIEW) {
    document.body.classList.remove(`layout-mode-grid`)
    document.body.classList.add(`layout-mode-overview`)
    if (!mobileBrowser) {
      cursorArrowLeft.visible = false
      cursorArrowRight.visible = false
    }
    store.dispatch(setLayoutMode(LAYOUT_MODE_OVERVIEW))
    webglContainer.addEventListener('mousewheel', onOverviewLayoutMousewheel, false)
  }
  eventEmitter.emit(EVT_LAYOUT_MODE_TRANSITION_REQUEST)
  store.dispatch(setLayoutModeTransitioning(true))
  tween().start({
    update: tweenFactor => {
      eventEmitter.emit(EVT_LAYOUT_MODE_TRANSITION, { tweenFactor })
    },
    complete: () => {
      eventEmitter.emit(EVT_LAYOUT_MODE_TRANSITION_COMPLETE)
      store.dispatch(setLayoutModeTransitioning(false))
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

function onInfoSectionOpening ({ tweenFactor }) {
  const opacity = mapNumber(1 - tweenFactor, 1, 0.6, 1, 0)
  layoutModeBtnStyler.set({
    opacity,
    pointerEvents: 'none',
  })
}

function onInfoSectionCloseRequest () {
  document.body.style.setProperty('cursor', 'none')
  isInfoSectionOpen = false
}

function onInfoSectionClosing ({ tweenFactor }) {
  const opacity = mapNumber(tweenFactor, 0.6, 1, 0, 1)
  layoutModeBtnStyler.set({
    opacity,
    pointerEvents: 'auto',
  })
}

function onPrevProjectClick ({ modelName }) {
  eventEmitter.emit(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, { modelName, direction: -1 })
}

function onNextProjectClick ({ modelName }) {
  eventEmitter.emit(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, { modelName, direction: 1 })
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
}

function onCloseSingleView ({ modelName, reposition = false }) {
  eventEmitter.emit(EVT_CLOSE_REQUEST_SINGLE_PROJECT, ({ modelName, reposition }))

  closeModelTween = chain(
    delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
    tween({ duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor })
  ).start({
    update: tweenFactor => {
      openModelTweenFactor = tweenFactor
      eventEmitter.emit(EVT_CLOSING_SINGLE_PROJECT, { modelName, tweenFactor, reposition })
      const opacity = mapNumber(tweenFactor, 0.6, 1, 0, 1)
      layoutModeBtnStyler.set('opacity', opacity)
    },
    complete: () => {
      eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, ({ modelName }))
      const photoPreviewMesh = openedProjectScene.children[2]
      photoMeshContainer.add(photoPreviewMesh)
      // label.visible = true
      closeModelTween = null
      clickedElement = null
      layoutModeBtnStyler.set('pointer-events', 'auto')

      const mesh = photoMeshContainer.children
        .filter(mesh => mesh.isLabel)
        .forEach(mesh => {
          mesh.visible = true
        })
    }
  })
}

function onResize () {
  appWidth = window.innerWidth
  appHeight = window.innerHeight

  renderer.setSize(appWidth, appHeight)

  eventEmitter.emit(EVT_APP_RESIZE, { appWidth, appHeight })

  const photoRenderTargetCopy = photoRenderTarget.clone()
  const postFXRenderTargetCopy = postFXRenderTarget.clone()
  const postFXBlurHorizontalTargetCopy = postFXBlurHorizontalTarget.clone()
  const postFXBlurVerticalTargetCopy = postFXBlurVerticalTarget.clone()
  
  photoRenderTargetCopy.setSize(appWidth * dpr, appHeight * dpr)
  postFXRenderTargetCopy.setSize(appWidth * dpr, appHeight * dpr)
  postFXBlurHorizontalTargetCopy.setSize(appWidth * dpr, appHeight * dpr)
  postFXBlurVerticalTargetCopy.setSize(appWidth * dpr, appHeight * dpr)

  photoRenderTarget.dispose()
  postFXRenderTarget.dispose()
  postFXBlurHorizontalTarget.dispose()
  postFXBlurVerticalTarget.dispose()

  photoRenderTarget = photoRenderTargetCopy
  postFXRenderTarget = postFXRenderTargetCopy
  postFXBlurHorizontalTarget = postFXBlurHorizontalTargetCopy
  postFXBlurVerticalTarget = postFXBlurVerticalTargetCopy
}

function onPageMouseLeave () {
  // ...
}

function onWebGLSceneMouseLeave () {
  cursorArrowOffsetTarget = 0
  isDragging = false
  eventEmitter.emit(EVT_ON_SCENE_DRAG_END)
  eventEmitter.emit(EVT_CAMERA_ZOOM_IN_DRAG_END)
  eventEmitter.emit(EVT_HIDE_CURSOR)
}

function onWebGLSceneMouseEnter () {
  eventEmitter.emit(EVT_SHOW_CURSOR)
}

function onMouseDown (e) {
  isDragging = true

  store.dispatch(setMousePosition({ x: e.pageX, y: e.pageY }))

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
      const mesh = photoMeshContainer.children
        .filter(mesh => mesh.isLabel)
        .forEach(mesh => {
          mesh.visible = false
        })

      eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({ modelName }))
      eventEmitter.emit(EVT_HIDE_CURSOR)
      
      openModelTween = chain(
        delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
        tween({ duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor })
      ).start({
        update: tweenFactor => {
          openModelTweenFactor = tweenFactor
          eventEmitter.emit(EVT_OPENING_SINGLE_PROJECT, { modelName, tweenFactor })
          const opacity = mapNumber(1 - tweenFactor, 1, 0.6, 1, 0)
          layoutModeBtnStyler.set('opacity', opacity)
        },
        complete: () => {
          isDragging = false
          clickedElement = hoveredElement
          openModelTween = null

          eventEmitter.emit(EVT_OPEN_SINGLE_PROJECT, ({ modelName }))
          layoutModeBtnStyler.set('pointer-events', 'none')
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
  const { layoutMode, mousePositionX, mousePositionY } = store.getState()

  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  if (isDragging && !openModelTween && !closeModelTween && !clickedElement && !isInfoSectionOpen) {
    const diffx = layoutMode === LAYOUT_MODE_GRID ? e.pageX - mousePositionX : 0
    const diffy = e.pageY - mousePositionY
    eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx, diffy })
  } else {
    // ...
  }

  store.dispatch(setMousePosition({ x: e.pageX, y: e.pageY }))
}

function onMouseUp () {
  if (hoveredElement) {
    if (!clickedElement) {
      if (openModelTween) {
        openModelTween.stop()
        openModelTween = null

        const { modelName } = hoveredElement
        onCloseSingleView({ modelName, reposition: false })
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

  if (!isDragging && !isInfoSectionOpen && !store.getState().isLayoutTransitioning) {
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

  if (!mobileBrowser) {
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
  }
  
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

    const radius = BLUR_ITERATIONS - i - 1

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
