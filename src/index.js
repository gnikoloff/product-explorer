import * as THREE from 'three'
import { tween, chain, delay, easing } from 'popmotion'
import styler from 'stylefire'
import WebFont from 'webfontloader'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import PhotoLabel from './PhotoLabel'
import SinglePage from './SinglePage'
import SinglePageMobile from './SinglePageMobile'
import InfoPanel from './InfoPanel'
import PostProcessing from './PostProcessing'
import CameraSystem from './CameraSystem'
import Cursor from './Cursor'
import LoadManager from './LoadManager'
import Loader from './Loader'
import BorderCurves from './BorderCurves'

import {
  getArrowTexture,
  mapNumber,
  isMobileBrowser,
} from './helpers'

import store from './store'
import {
  setIsMobile,
  setMousePosition,
  setLayoutMode,
  setLayoutModeTransitioning,
  setWebglMaxTexturesSupported,
} from './store/actions'

import {
  SERVER_API_ENDPOINT,
  PROJECTS_COUNT,
  TOGGLE_SINGLE_PAGE_TRANSITION_DELAY,
  TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN,
  TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_CLOSE,
  BLUR_ITERATIONS_MOBILE,
  BLUR_ITERATIONS_DESKTOP,
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_RAF_UPDATE_APP,
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
  EVT_SINGLE_PROJECT_MASK_OPENING,
  EVT_SINGLE_PROJECT_MASK_CLOSING,
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_SET_INFO_PANEL_CONTENT,
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
  EVT_CLOSE_INFO_SECTION_COMPLETE,
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

import labelMaskSource from './assets/mask.png'

const mobileBrowser = isMobileBrowser()
const isMobile = isMobileBrowser() && innerWidth < 800
store.dispatch(setIsMobile(isMobile))

let appWidth = window.innerWidth
let appHeight = window.innerHeight

const singlePage = isMobile ? new SinglePageMobile() : new SinglePage()
const infoPanel = new InfoPanel()
const cameraSystem = new CameraSystem({
  appWidth,
  appHeight,
  position: new THREE.Vector3(0, 0, 50)
})
const borderCurves = new BorderCurves()

let cursor
if (!mobileBrowser) {
  cursor = new Cursor()
}

const webglContainer = document.getElementsByClassName('webgl-scene')[0]
const layoutModeBtnContainer = document.getElementsByClassName('webgl-scene-hint')[0]
const layoutModeBtnStyler = styler(layoutModeBtnContainer)

const dpr = window.devicePixelRatio

const mousePos = new THREE.Vector2(appWidth / 2, appHeight / 2)
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
let rAf
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
let isToggleModelTweenRunning = false
let blueEnabled = false

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

cursorScene.add(borderCurves)

init()

function init () {

  // new Loader({
  //   parentEl: document.getElementById('app-loader'),
  // })
  new LoadManager()

  const fontsToLoadCount = 1
  const fetchJSONToLoadCount = 1
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, fontsToLoadCount)
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, fetchJSONToLoadCount)
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, PROJECTS_COUNT)
  eventEmitter.emit(EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT, 1)
  LoadManager.loadTexture(labelMaskSource).then(texture => {
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

  webglContainer.addEventListener('mousemove', onWebGLSceneMouseMove, false)
  webglContainer.addEventListener('mousedown', onWebGLSceneMouseDown, false)
  webglContainer.addEventListener('mouseup', onWebGLSceneMouseUp, false)
  if (mobileBrowser) {
    webglContainer.addEventListener('click', onWebGLSceneMouseClick, false)
  }
  webglContainer.addEventListener('mouseleave', onWebGLSceneMouseLeave, false)
  webglContainer.addEventListener('mouseenter', onWebGLSceneMouseEnter, false)

  document.body.addEventListener('mouseleave', onPageMouseLeave, false)
  window.addEventListener('resize', onResize)

  webglContainer.addEventListener('touchstart', e => {
    e.stopPropagation()
    if (isInfoSectionOpen) {
      return
    }
    const touch = e.changedTouches[0]
    if (!clickedElement) {
      store.dispatch(setMousePosition({ x: touch.pageX, y: touch.pageY }))
      eventEmitter.emit(EVT_CAMERA_ZOOM_OUT_DRAG_START)
    }
  }, { passive: true })

  webglContainer.addEventListener('touchmove', e => {
    e.stopPropagation()
    const { layoutMode, mousePositionX, mousePositionY } = store.getState()
    const touch = e.changedTouches[0]

    raycastMouse.x = (touch.clientX / renderer.domElement.clientWidth) * 2 - 1
    raycastMouse.y = -(touch.clientY / renderer.domElement.clientHeight) * 2 + 1

    // triangleGeo.attributes['position'].array[6] = raycastMouse.x
    // triangleGeo.attributes['position'].array[7] = raycastMouse.y
    // triangleGeo.attributes['position'].needsUpdate = true
    
    if (!openModelTween && !closeModelTween && !clickedElement && !isInfoSectionOpen) {
      const diffx = layoutMode === LAYOUT_MODE_GRID ? (touch.pageX - mousePositionX) : 0
      const diffy = (touch.pageY - mousePositionY)
      eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx, diffy, isTouch: true })
    }

    store.dispatch(setMousePosition({ x: touch.pageX, y: touch.pageY }))
  }, { passive: true })

  webglContainer.addEventListener('touchend', e => {
    e.stopPropagation()
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
  eventEmitter.on(EVT_CLOSE_INFO_SECTION_COMPLETE, onInfoSectionCloseComplete)
  eventEmitter.on(EVT_CLOSE_REQUEST_INFO_SECTION, onInfoSectionCloseRequest)
  
  rAf = requestAnimationFrame(updateFrame)
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
  tween({
    duration: 1200,
    ease: easing.anticipate,
  }).start({
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
  blueEnabled = true
  isInfoSectionOpen = true
  eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE, { modelName: hoveredElement && hoveredElement.modelName })
  hoveredElement = null
}

function onInfoSectionOpening ({ tweenFactor }) {
  const opacity = mapNumber(1 - tweenFactor, 1, 0.6, 1, 0)
  layoutModeBtnStyler.set({
    opacity,
    pointerEvents: 'none',
  })
}

function onInfoSectionCloseRequest () {
  isInfoSectionOpen = false
}

function onInfoSectionClosing ({ tweenFactor }) {
  const opacity = mapNumber(tweenFactor, 0.6, 1, 0, 1)
  layoutModeBtnStyler.set({
    opacity,
    pointerEvents: 'auto',
  })
}

function onInfoSectionCloseComplete () {
  blueEnabled = false
}

function onPrevProjectClick ({ modelName }) {
  eventEmitter.emit(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, { modelName, direction: -1 })
}

function onNextProjectClick ({ modelName }) {
  eventEmitter.emit(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, { modelName, direction: 1 })
}

function onProjectsLoad (res) {

  eventEmitter.emit(EVT_SET_INFO_PANEL_CONTENT, {
    date: res.date,
    madeBy: res.madeBy,
    madeFor: res.madeFor,
    copyright: res.copyright,
    text: res.text,
  })
  eventEmitter.emit(EVT_LOADED_PROJECTS, { projectsData: res.projects })

  res.projects.forEach((info, i) => {
    const isVisible = getIsPreviewMeshVisible(info.posX, info.posY, PREVIEW_PHOTO_REF_WIDTH, PREVIEW_PHOTO_REF_HEIGHT)
    const photoPreview = new PhotoPreview({
      idx: i,
      isLast: i === res.projects.length - 1,
      modelName: info.modelName,
      width: PREVIEW_PHOTO_REF_WIDTH,
      height: PREVIEW_PHOTO_REF_HEIGHT,
      photos: info.sliderPhotos || [],
      gridPosition: new THREE.Vector3(info.posX, info.posY, 0),
      // initialOpacity: isVisible ? 0 : 1,
      initialOpacity: 1,
    })
    const labelPosX = info.posX - PREVIEW_PHOTO_REF_WIDTH * (isMobile ? 0 : 0.25)
    const labelPosY = info.posY - PREVIEW_PHOTO_REF_HEIGHT / 2
    const previewLabel = new PhotoLabel({
      modelName: info.modelName,
      position: new THREE.Vector3(labelPosX, labelPosY, 25),
      // initialOpacity: isVisible ? 0 : 1,
      initialOpacity: 1,
    })
    previewLabel.position.z = 40
    photoMeshContainer.add(photoPreview)
    photoMeshContainer.add(previewLabel)
  })
}

function onCloseSingleView ({ modelName, reposition = false, duration }) {
  eventEmitter.emit(EVT_CLOSE_REQUEST_SINGLE_PROJECT, ({ modelName, reposition }))

  eventEmitter.emit(EVT_SHOW_CURSOR)

  rAf = requestAnimationFrame(updateFrame)

  isToggleModelTweenRunning = true

  if (isMobile) {
    const visibleMeshes = photoMeshContainer.children.filter(mesh => {
      return getIsPreviewMeshVisible(mesh.x, mesh.y, mesh.width, mesh.height)
    })
    const visiblePhotos = visibleMeshes.filter(mesh => mesh.isPhoto)
    const visibleLabels = photoMeshContainer.children.filter(mesh => mesh.isLabel)
    visibleLabels.forEach(label => {
      label.visible = true
    })
    eventEmitter.emit(EVT_CLOSE_REQUEST_SINGLE_PROJECT, { modelName })
    tween({
      duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN,
      ease: easing.easeIn,
    }).start({
      update: tweenFactor => {
        visiblePhotos.forEach(mesh => {
          mesh.opacity = tweenFactor
        })
        const opacity = mapNumber(tweenFactor, 0.6, 1, 0, 1)
        layoutModeBtnStyler.set('opacity', opacity)
        eventEmitter.emit(EVT_SINGLE_PROJECT_MASK_CLOSING, { tweenFactor, duration: 1000 })
      },
      complete: () => {
        // if (rAf) {
        //   cancelAnimationFrame(rAf)
        //   rAf = null
        // }

        eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT)

        clickedElement = null
        layoutModeBtnStyler.set('pointer-events', 'auto')
      },
    })
    return
  }

  closeModelTween = chain(
    delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
    tween({
      duration: (duration || TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_CLOSE) * openModelTweenFactor,
      ease: easing.easeInOut,
    })
  ).start({
    update: tweenFactor => {
      openModelTweenFactor = tweenFactor
      eventEmitter.emit(EVT_CLOSING_SINGLE_PROJECT, { modelName, tweenFactor, reposition })
      eventEmitter.emit(EVT_SINGLE_PROJECT_MASK_CLOSING, { tweenFactor, duration: 1000 })
      const opacity = mapNumber(tweenFactor, 0.6, 1, 0, 1)
      layoutModeBtnStyler.set('opacity', opacity)
    },
    complete: () => {
      eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, ({ modelName }))
      const photoPreviewMesh = mobileBrowser ? openedProjectScene.children[1] : openedProjectScene.children[2]
      photoMeshContainer.add(photoPreviewMesh)
      // label.visible = true
      closeModelTween = null
      clickedElement = null
      layoutModeBtnStyler.set('pointer-events', 'auto')

      photoMeshContainer.children
        .filter(mesh => mesh.isLabel)
        .forEach(mesh => {
          mesh.visible = true
        })

      isToggleModelTweenRunning = false
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
  eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE, { modelName: hoveredElement && hoveredElement.modelName })
  hoveredElement = null
}

function onWebGLSceneMouseEnter () {
  eventEmitter.emit(EVT_SHOW_CURSOR)
}

function onWebGLSceneMouseDown (e) {
  if (isInfoSectionOpen) {
    return
  }
  if (mobileBrowser) {
    e.preventDefault()
    return
  }

  isDragging = true

  store.dispatch(setMousePosition({ x: e.pageX, y: e.pageY }))

  eventEmitter.emit(EVT_ON_SCENE_DRAG_START)

  if (hoveredElement && !clickedElement) {
    if (!cameraSystem.isDragCameraMoving) {
      if (isToggleModelTweenRunning) {
        return
      }
      if (closeModelTween) {
        closeModelTween.stop()
        closeModelTween = null
      }
      
      const { modelName } = hoveredElement

      openedProjectScene.add(hoveredElement)
      photoMeshContainer.children.filter(mesh => mesh.isLabel).forEach(mesh => {
        mesh.visible = false
      })
 
      eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({ modelName }))
      eventEmitter.emit(EVT_HIDE_CURSOR)

      isToggleModelTweenRunning = true
      
      openModelTween = chain(
        delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
        tween({
          duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN * openModelTweenFactor,
          ease: easing.easeIn,
        })
      ).start({
        update: tweenFactor => {
          openModelTweenFactor = tweenFactor
          eventEmitter.emit(EVT_OPENING_SINGLE_PROJECT, { modelName, tweenFactor })
          eventEmitter.emit(EVT_SINGLE_PROJECT_MASK_OPENING, { tweenFactor })
          const opacity = mapNumber(1 - tweenFactor, 1, 0.6, 1, 0)
          layoutModeBtnStyler.set('opacity', opacity)
        },
        complete: () => {
          isDragging = false
          clickedElement = hoveredElement
          openModelTween = null

          eventEmitter.emit(EVT_OPEN_SINGLE_PROJECT, ({ modelName }))
          layoutModeBtnStyler.set('pointer-events', 'none')
          isToggleModelTweenRunning = false
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

  webglContainer.removeEventListener('click', onWebGLSceneMouseClick, false)
}

function onWebGLSceneMouseMove (e) {
  if (mobileBrowser) {
    e.preventDefault()
    return
  }
  const { layoutMode, mousePositionX, mousePositionY } = store.getState()

  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  if (isDragging && !openModelTween && !closeModelTween && !clickedElement && !isInfoSectionOpen) {
    const diffx = layoutMode === LAYOUT_MODE_GRID ? e.pageX - mousePositionX : 0
    const diffy = e.pageY - mousePositionY
    eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx, diffy })
  } else {
    // intersects mouse login begin
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
          hoveredElement = object
          eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_ENTER, { modelName })
        }
      } else {
        eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE, { modelName: hoveredElement && hoveredElement.modelName })
        hoveredElement = null
      }
    }
    // intersects mouse login end
  }

  store.dispatch(setMousePosition({ x: e.pageX, y: e.pageY }))
}

function onWebGLSceneMouseClick (e) {
  e.preventDefault()

  if (isInfoSectionOpen) {
    return
  }

  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  raycaster.setFromCamera(raycastMouse, cameraSystem.photoCamera)
  const intersectsTests = photoMeshContainer.children.filter(a => a.isInteractable)
  const intersects = raycaster.intersectObjects(intersectsTests)
  
  if (intersects.length > 0) {
    if (cameraSystem.isDragCameraMoving) {
      // TODO: is this still relevant? not really sure
      // eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE)
    } else {
      const intersect = intersects[0]
      const { object, object: { modelName } } = intersect

      if (isMobile) {
        const visibleMeshes = photoMeshContainer.children.filter(mesh => {
          return getIsPreviewMeshVisible(mesh.x, mesh.y, mesh.width, mesh.height)
        })
        const visiblePhotos = visibleMeshes.filter(mesh => mesh.isPhoto)
        const visibleLabels = photoMeshContainer.children.filter(mesh => mesh.isLabel)
        visibleLabels.forEach(mesh => {
          mesh.visible = false
        })
        eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({ modelName }))
        tween({
          duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN,
          ease: easing.easeIn,
        }).start({
          update: tweenFactor => {
            visiblePhotos.forEach(mesh => {
              mesh.opacity = 1 - tweenFactor
            })
            const opacity = mapNumber(1 - tweenFactor, 1, 0.6, 1, 0)
            layoutModeBtnStyler.set('opacity', opacity)
            eventEmitter.emit(EVT_SINGLE_PROJECT_MASK_OPENING, { tweenFactor })
          },
          complete: () => {
            if (rAf) {
              cancelAnimationFrame(rAf)
              rAf = null
            }

            clickedElement = object
            eventEmitter.emit(EVT_OPEN_SINGLE_PROJECT, ({ modelName }))
            layoutModeBtnStyler.set('pointer-events', 'none')
          },
        })
        return
      }
      
      openedProjectScene.add(object)
      photoMeshContainer.children.filter(mesh => mesh.isLabel).forEach(mesh => {
        mesh.visible = false
      })

      eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({ modelName }))
      openModelTween = chain(
        delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
        tween({
          duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN * openModelTweenFactor,
          ease: easing.easeIn,
        })
      ).start({
        update: tweenFactor => {
          openModelTweenFactor = tweenFactor
          eventEmitter.emit(EVT_OPENING_SINGLE_PROJECT, { modelName, tweenFactor })
          const opacity = mapNumber(1 - tweenFactor, 1, 0.6, 1, 0)
          layoutModeBtnStyler.set('opacity', opacity)
        },
        complete: () => {
          clickedElement = object
          openModelTween = null

          eventEmitter.emit(EVT_OPEN_SINGLE_PROJECT, ({ modelName }))
          layoutModeBtnStyler.set('pointer-events', 'none')
        },
      })

    }
  }
}

function onWebGLSceneMouseUp (e) {
  if (mobileBrowser) {
    e.preventDefault()
    return
  }
  if (hoveredElement) {
    if (!clickedElement) {
      if (openModelTween) {
        openModelTween.stop()
        openModelTween = null

        const { modelName } = hoveredElement
        onCloseSingleView({ modelName, reposition: false, duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN })
      }
    }
  }
  isDragging = false
  cursorArrowOffsetTarget = 0
  if (!isInfoSectionOpen) {
    eventEmitter.emit(EVT_CAMERA_ZOOM_IN_DRAG_END)
    eventEmitter.emit(EVT_ON_SCENE_DRAG_END)
  }

  setTimeout(() => {
    webglContainer.addEventListener('click', onWebGLSceneMouseClick, false)
  }, 0)
}

// console.log(triangleGeo)

function updateFrame(ts) {
  if (!ts) { ts = 0 }
  const dt = Math.min((ts - oldTime) / 1000, 1)
  oldTime = ts

  eventEmitter.emit(EVT_RAF_UPDATE_APP, ts, dt)

  if (!clickedElement) {
    eventEmitter.emit(EVT_CAMERA_HANDLE_MOVEMENT_WORLD, ts, dt)
  }

  const cursorBasePosX = (raycastMouse.x * appWidth) / 2
  const cursorBasePosY = (raycastMouse.y * appHeight) / 2


  // triangleGeo.attributes['position'].array[6] = cursorBasePosX
  // triangleGeo.attributes['position'].array[7] = -appHeight / 2 + 20
  // triangleGeo.attributes['position'].needsUpdate = true


  if (!mobileBrowser) {
    const arrowIndicatorFactor = dt * 25
    cursorArrowOffset += (cursorArrowOffsetTarget * 5 - cursorArrowOffset) * arrowIndicatorFactor
    cursorArrowLeft.material.opacity += (cursorArrowOffsetTarget * 0.5 - cursorArrowLeft.material.opacity) * arrowIndicatorFactor

    const initialOffset = 28

    cursorArrowLeft.position.x += (cursorBasePosX + initialOffset + cursorArrowOffset - cursorArrowLeft.position.x) * arrowIndicatorFactor
    cursorArrowLeft.position.y += (cursorBasePosY - cursorArrowLeft.position.y) * arrowIndicatorFactor

    cursorArrowRight.position.x += (cursorBasePosX - initialOffset - cursorArrowOffset - cursorArrowRight.position.x) * arrowIndicatorFactor
    cursorArrowRight.position.y += (cursorBasePosY - cursorArrowRight.position.y) * arrowIndicatorFactor

    cursorArrowTop.position.x += (cursorBasePosX - cursorArrowTop.position.x) * arrowIndicatorFactor
    cursorArrowTop.position.y += (cursorBasePosY - initialOffset - cursorArrowOffset - cursorArrowTop.position.y) * arrowIndicatorFactor

    cursorArrowBottom.position.x += (cursorBasePosX - cursorArrowBottom.position.x) * arrowIndicatorFactor
    cursorArrowBottom.position.y += (cursorBasePosY + initialOffset + cursorArrowOffset - cursorArrowBottom.position.y) * arrowIndicatorFactor
  }
  
  renderer.autoClear = true
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, cameraSystem.photoCamera)
  eventEmitter.emit(EVT_RENDER_PHOTO_SCENE_FRAME, { texture: photoRenderTarget.texture })
  
  renderer.autoClear = false

  if (blueEnabled) {
    renderer.setRenderTarget(postFXRenderTarget)
  } else {
    renderer.setRenderTarget(null)
  }
  renderer.render(postFXScene, cameraSystem.postFXCamera)
  
  if (blueEnabled) {
    let writeBuffer = postFXBlurHorizontalTarget
    let readBuffer = postFXBlurVerticalTarget

    const blurIterations = isMobile ? BLUR_ITERATIONS_MOBILE : BLUR_ITERATIONS_DESKTOP
    for (let i = 0; i < blurIterations; i++) {
      renderer.setRenderTarget(writeBuffer)

      const radius = (blurIterations - i - 1) * 1.25

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
  }

  renderer.render(cursorScene, cameraSystem.cursorCamera)

  renderer.render(openedProjectScene, cameraSystem.openedProjectCamera)

  rAf = requestAnimationFrame(updateFrame)
}

function getIsPreviewMeshVisible (x, y, width, height) {
  const { cameraPositionX, cameraPositionY } = store.getState()
  const bboxLeft = x - width + appWidth / 2 - cameraPositionX
  const bboxRight = x + width + appWidth / 2 - cameraPositionX
  const bboxTop = y - height + appHeight / 2 - cameraPositionY
  const bboxBottom = y + height + appHeight / 2 - cameraPositionY
  return (
    (bboxRight > 0) &&
    (bboxLeft < appWidth) &&
    (bboxBottom > 0) &&
    (bboxTop < appHeight)
  )
}
