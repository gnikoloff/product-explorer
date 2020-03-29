import * as THREE from 'three'
import { tween, chain, delay } from 'popmotion'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import SinglePage from './SinglePage'
import InfoPanel from './InfoPanel'
import PostProcessing from './PostProcessing'
import CameraSystem from './CameraSystem'

import {
  WOLRD_WIDTH,
  WORLD_HEIGHT,
  TOGGLE_SINGLE_PAGE_TRANSITION_DELAY,
  TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION,
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
  EVT_ON_SCENE_DRAG_START,
  EVT_ON_SCENE_DRAG,
  EVT_ON_SCENE_DRAG_END,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_APP_RESIZE,
} from './constants'

import './style'

import arrowLeft from './assets/arrow.png'

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
const dpr = window.devicePixelRatio || 1
const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const cursorTargetPos = new THREE.Vector2(0, 0)

const renderer = new THREE.WebGLRenderer({ alpha: true })

const clipScene = new THREE.Scene()
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const cursorScene = new THREE.Scene()

const clipRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const photoRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const cursorRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)

const raycaster = new THREE.Raycaster()

let oldTime = 0
let photoPreviews = []
let isDragging = false
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let projectsData = []
let hoveredElement = null
let clickedElement = null
let openModelTween
let closeModelTween
let openModelTweenFactor = 1

clipScene.add(cameraSystem.clipCamera)
photoScene.add(cameraSystem.photoCamera)
cursorScene.add(cameraSystem.cursorCamera)
postFXScene.add(cameraSystem.postFXCamera)

const postFXMesh = new PostProcessing({ width: appWidth, height: appHeight })
postFXMesh.mousePos = mousePos
postFXScene.add(postFXMesh)

const cursorArrowLeft = new THREE.Mesh(
  new THREE.PlaneGeometry(15, 15),
  new THREE.MeshBasicMaterial({ opacity: 1 })
)
cursorArrowLeft.rotation.z = Math.PI
cursorScene.add(cursorArrowLeft)

cursorScene.add(new THREE.Mesh(
  new THREE.PlaneGeometry(WOLRD_WIDTH * 2, WORLD_HEIGHT * 2),
  new THREE.MeshBasicMaterial({ wireframe: true })
))

const cursorArrowRight = cursorArrowLeft.clone()
cursorArrowRight.rotation.z = 0
cursorScene.add(cursorArrowRight)

const cursorArrowTop = cursorArrowLeft.clone()
cursorArrowTop.rotation.z = Math.PI / 2
cursorScene.add(cursorArrowTop)

const cursorArrowBottom = cursorArrowLeft.clone()
cursorArrowBottom.rotation.z = -Math.PI / 2
cursorScene.add(cursorArrowBottom)

new THREE.TextureLoader().load(arrowLeft, texture => {
  cursorArrowLeft.material.map = texture
  cursorArrowLeft.material.needsUpdate = true
})

init()

function init () {
  fetch('/get_data').then(res => res.json()).then(onProjectsLoad)

  renderer.setSize(appWidth, appHeight)
  renderer.setPixelRatio(dpr)
  renderer.setClearAlpha(0)
  webglContainer.appendChild(renderer.domElement)

  webglContainer.addEventListener('mousedown', onMouseDown, false)
  document.body.addEventListener('mousemove', onMouseMove, false)
  webglContainer.addEventListener('mouseup', onMouseUp, false)
  webglContainer.addEventListener('mouseleave', onMouseLeave, false)
  window.addEventListener('resize', onResize)
  
  eventEmitter.on(EVT_FADE_OUT_SINGLE_VIEW, onCloseSingleView)
  
  requestAnimationFrame(updateFrame)
}

function onProjectsLoad (res) {
  projectsData = res.projects

  eventEmitter.emit(EVT_LOADED_PROJECTS, projectsData)

  photoPreviews = res.projects.map(info => {
    const photoPreview = new PhotoPreview({
      modelName: info.modelName,
      width: PREVIEW_PHOTO_REF_WIDTH,
      height: PREVIEW_PHOTO_REF_HEIGHT,
      photos: info.sliderPhotos || [],
      position: new THREE.Vector3(info.posX, info.posY, 0)
    })
    clipScene.add(photoPreview.clipMesh)
    photoScene.add(photoPreview.photoMesh)
    return photoPreview
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
      closeModelTween = null
      clickedElement = null
    }
  })
}

function onResize () {
  appWidth = window.innerWidth
  appHeight = window.innerHeight
  renderer.setSize(appWidth, appHeight)
  eventEmitter.emit(EVT_APP_RESIZE, { appWidth, appHeight })
}

function onMouseLeave () {
  cursorArrowOffsetTarget = 0
  isDragging = false

  eventEmitter.emit(EVT_ON_SCENE_DRAG_END)

  tween({
    from: 1,
    to: 0,
  }).start(tweenFactor => {
    // console.log(clipCamera.zoom)
    // clipCamera.zoom = 1 - tweenFactor * 0.2
    // clipCamera.updateProjectionMatrix()
    // photoCamera.zoom = 1 - tweenFactor * 0.2
    // photoCamera.updateProjectionMatrix()
    // cursorCamera.zoom = 1 - tweenFactor * 0.2
    // cursorCamera.updateProjectionMatrix()
  })
}

function onMouseDown (e) {
  isDragging = true
  mousePos.x = e.pageX
  mousePos.y = e.pageY

  eventEmitter.emit(EVT_ON_SCENE_DRAG_START)

  if (hoveredElement && !clickedElement && !cameraSystem.isDragCameraMoving) {
    if (closeModelTween) {
      closeModelTween.stop()
      closeModelTween = null
    }
    const { modelName } = hoveredElement
    eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({
      modelName,
      targetX: cameraSystem.clipCamera.position.x - appWidth * 0.25,
      targetY: cameraSystem.clipCamera.position.y,
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
    // tween({
    //   from: 0,
    //   to: 1,
    // }).start(tweenFactor => {
    //   // todo: prevent spamming it
    //   // clipCamera.zoom = 1 - tweenFactor * 0.2
    //   // clipCamera.updateProjectionMatrix()
    //   // photoCamera.zoom = 1 - tweenFactor * 0.2
    //   // photoCamera.updateProjectionMatrix()
    //   // cursorCamera.zoom = 1 - tweenFactor * 0.2
    //   // cursorCamera.updateProjectionMatrix()
    // })
  }
}

function onMouseMove (e) {
  eventEmitter.emit(EVT_MOUSEMOVE_APP, { mouseX: mousePos.x, mouseY: mousePos.y})

  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  cursorTargetPos.x = e.pageX
  cursorTargetPos.y = window.innerHeight - e.pageY

  if (isDragging && !openModelTween && !closeModelTween && !clickedElement) {
    const diffx = e.pageX - mousePos.x
    const diffy = e.pageY - mousePos.y
    eventEmitter.emit(EVT_ON_SCENE_DRAG, { diffx, diffy })
  } else {
    
  }
  mousePos.x = e.pageX
  mousePos.y = e.pageY
}

function onMouseUp () {
  if (hoveredElement && !clickedElement) {
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
          eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, ({ modelName }))
          closeModelTween = null
        }
      })
    }
  } else {
    // tween({
    //   from: 1,
    //   to: 0,
    // }).start(tweenFactor => {
    //   // console.log(clipCamera.zoom)
    //   // clipCamera.zoom = 1 - tweenFactor * 0.2
    //   // clipCamera.updateProjectionMatrix()
    //   // photoCamera.zoom = 1 - tweenFactor * 0.2
    //   // photoCamera.updateProjectionMatrix()
    //   // cursorCamera.zoom = 1 - tweenFactor * 0.2
    //   // cursorCamera.updateProjectionMatrix()
    // })
  }
  isDragging = false
  cursorArrowOffsetTarget = 0

  eventEmitter.emit(EVT_ON_SCENE_DRAG_END)
}

function updateFrame(ts) {
  if (!ts) {
    ts = 0
  }
  ts = Math.max(ts, 1)
  ts /= 1000
  const dt = ts - oldTime
  oldTime = ts

  eventEmitter.emit(EVT_RAF_UPDATE_APP, ts, dt)

  if (!isDragging) {
    raycaster.setFromCamera(raycastMouse, cameraSystem.photoCamera)
    const intersectsTests = photoPreviews.filter(a => a.isInteractable).map(({ clipMesh }) => clipMesh)
    const intersects = raycaster.intersectObjects(intersectsTests)
    if (intersects.length > 0) {
      const intersect = intersects[0]
      const { object, object: { modelName } } = intersect
      if (!hoveredElement) {
        hoveredElement = object
      }
      eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_ENTER, { modelName })
    } else {
      hoveredElement = null
      eventEmitter.emit(EVT_HOVER_SINGLE_PROJECT_LEAVE)
    }
  }

  if (!clickedElement) {
    eventEmitter.emit(EVT_CAMERA_HANDLE_MOVEMENT_WORLD, ts, dt)
  }
  
  postFXMesh.material.uniforms.u_time.value = ts
  postFXMesh.material.uniforms.u_tDiffuseClip.value = clipRenderTarget.texture
  postFXMesh.material.uniforms.u_tDiffusePhoto.value = photoRenderTarget.texture
  postFXMesh.material.uniforms.u_tDiffuseCursor.value = cursorRenderTarget.texture
  postFXMesh.material.uniforms.u_mouse.value.x += (cursorTargetPos.x - postFXMesh.material.uniforms.u_mouse.value.x) * (dt * 12)
  postFXMesh.material.uniforms.u_mouse.value.y += (cursorTargetPos.y - postFXMesh.material.uniforms.u_mouse.value.y) * (dt * 12)

  const cursorBasePosX = (raycastMouse.x * appWidth) / 2
  const cursorBasePosY = (raycastMouse.y * appHeight) / 2

  cursorArrowOffset += (cursorArrowOffsetTarget * 12 - cursorArrowOffset) * (dt * 5)
  cursorArrowLeft.material.opacity += (cursorArrowOffsetTarget * 0.5 - cursorArrowLeft.material.opacity) * (dt * 10)

  cursorArrowLeft.position.x = cursorBasePosX + 50 + cursorArrowOffset
  cursorArrowLeft.position.y = cursorBasePosY

  cursorArrowRight.position.x = cursorBasePosX - 50 - cursorArrowOffset
  cursorArrowRight.position.y = cursorBasePosY

  cursorArrowTop.position.x = cursorBasePosX
  cursorArrowTop.position.y = cursorBasePosY - 50 - cursorArrowOffset

  cursorArrowBottom.position.x = cursorBasePosX
  cursorArrowBottom.position.y = cursorBasePosY + 50 + cursorArrowOffset

  renderer.setRenderTarget(cursorRenderTarget)
  renderer.render(cursorScene, cameraSystem.cursorCamera)
  
  renderer.setRenderTarget(clipRenderTarget)
  renderer.render(clipScene, cameraSystem.clipCamera)
  
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, cameraSystem.photoCamera)

  renderer.setRenderTarget(null)
  renderer.render(postFXScene, cameraSystem.postFXCamera)

  requestAnimationFrame(updateFrame)
}
