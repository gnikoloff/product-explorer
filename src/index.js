import * as THREE from 'three'
import { tween, chain, delay } from 'popmotion'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import SinglePage from './SinglePage'
import InfoPanel from './InfoPanel'
import PostProcessing from './PostProcessing'

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
  EVT_FADE_IN_SINGLE_VIEW,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_LOADED_PROJECTS,
  CAMERA_MIN_VELOCITY_TO_BE_MOVING,
  EVT_ON_SCENE_DRAG,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
} from './constants'

import {
  mapNumber,
  clampNumber,
  getSiglePagePhotoScale,
} from './helpers'

import './style'

import arrowLeft from './assets/arrow.png'

let appWidth = window.innerWidth
let appHeight = window.innerHeight

const singlePage = new SinglePage()
const infoPanel = new InfoPanel()

const webglContainer = document.getElementsByClassName('webgl-scene')[0]
const dpr = window.devicePixelRatio || 1
const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const cameraTargetPos = new THREE.Vector2(0, 0)
const cameraVelocity = new THREE.Vector2(0, 0)
const cursorTargetPos = new THREE.Vector2(0, 0)

const renderer = new THREE.WebGLRenderer({ alpha: true })

const clipScene = new THREE.Scene()
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const cursorScene = new THREE.Scene()

const clipCamera = new THREE.OrthographicCamera(appWidth / - 2, appWidth / 2, appHeight / 2, appHeight / - 2, 1, 1000)
const photoCamera = clipCamera.clone()
const postFXCamera = clipCamera.clone()
const cursorCamera = clipCamera.clone()

const clipRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const photoRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const cursorRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)

const raycaster = new THREE.Raycaster()

const originalCameraPos = [0, 0, 50]
const cameraLookAt = new THREE.Vector3(0, 0, 0)

let oldTime = 0
let photoPreviews = []
let isDragging = false
let isDragCameraMoving = false
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let projectsData = []
let hoveredElement = null
let clickedElement = null
let openModelTween
let closeModelTween
let openModelTweenFactor = 1

const IS_ZOOMED = false

clipCamera.position.set(...originalCameraPos)
clipCamera.lookAt(cameraLookAt)
clipScene.add(clipCamera)

if (IS_ZOOMED) {
  clipCamera.zoom = 0.2
  clipCamera.updateProjectionMatrix()
}

photoCamera.position.set(...originalCameraPos)
photoCamera.lookAt(cameraLookAt)
photoScene.add(photoCamera)

if (IS_ZOOMED) {
  photoCamera.zoom = 0.2
  photoCamera.updateProjectionMatrix()
}

postFXCamera.position.set(...originalCameraPos)
postFXCamera.lookAt(cameraLookAt)
postFXScene.add(postFXCamera)

cursorCamera.position.set(...originalCameraPos)
cursorCamera.lookAt(cameraLookAt)
cursorScene.add(cursorCamera)

if (IS_ZOOMED) {
  cursorCamera.zoom = 0.2
  cursorCamera.updateProjectionMatrix()
}

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
  // const openedPreview = photoPreviews.find(preview => preview.modelName === modelName)
  // const targetX = openedPreview.x - openedPreview.diffX
  // const targetY = openedPreview.y - openedPreview.diffY
  // closeModelTween = tween({
  //   from: {
  //     cutOffFactor: 1,
  //     opacity: 0,
  //     x: openedPreview.x,
  //     y: openedPreview.y,
  //     scale: openedPreview.scale,
  //   },
  //   to: {
  //     cutOffFactor: 0,
  //     opacity: 1,
  //     x: targetX,
  //     y: targetY,
  //     scale: 1,
  //   },
  //   duration: 700,
  // }).start({
  //   update: v => {
  //     openModelTweenFactor = v.cutOffFactor
  //     postFXMesh.material.uniforms.u_cutOffFactor.value = v.cutOffFactor
  //     const unclicked = photoPreviews.filter(project => project.modelName !== modelName)
  //     unclicked.forEach(item => {
  //       item.opacity = v.opacity
  //     })
  //     openedPreview.x = v.x
  //     openedPreview.y = v.y
  //     openedPreview.scale = v.scale
  //     infoPanel.setButtonOpacity(v.opacity)
  //     eventEmitter.emit(EVT_CLOSING_SINGLE_PROJECT, {
  //       tweenFactor: v.cutOffFactor,
  //     })
  //   },
  //   complete: () => {
  //     clickedElement = null
  //     photoPreviews
  //       // .filter(preview => preview.modelName !== modelName)
  //       .forEach(preview => {
  //       preview.isInteractable = true
  //     })
  //     infoPanel.setPointerEvents('auto')
  //   },
  // })
}

function onResize () {
  appWidth = window.innerWidth
  appHeight = window.innerHeight

  renderer.setSize(appWidth, appHeight)
  clipRenderTarget.setSize(appWidth * dpr, appHeight * dpr)
  photoRenderTarget.setSize(appWidth * dpr, appHeight * dpr)
  cursorRenderTarget.setSize(appWidth * dpr, appHeight * dpr)

  const resizeCamera = camera => {
    camera.left = -appWidth / 2
    camera.right = appWidth / 2
    camera.top = -appHeight / 2
    camera.bottom = appHeight / 2
    camera.aspect = appWidth / appHeight
    camera.updateProjectionMatrix()
  }

  resizeCamera(clipCamera)
  resizeCamera(photoCamera)
  resizeCamera(cursorCamera)
  // resizeCamera(postFXCamera)

}

function onMouseLeave () {
  cursorArrowOffsetTarget = 0
  isDragging = false
  postFXMesh.onDragEnd()
  document.body.classList.remove('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragEnd())
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

  if (hoveredElement && !clickedElement && !isDragCameraMoving) {
    if (closeModelTween) {
      closeModelTween.stop()
      closeModelTween = null
    }
    const { modelName } = hoveredElement
    eventEmitter.emit(EVT_OPEN_REQUEST_SINGLE_PROJECT, ({
      modelName,
      targetX: clipCamera.position.x - appWidth * 0.25,
      targetY: clipCamera.position.y,
    }))
    openModelTween = chain(
      delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
      tween({
        duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor,
      })
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

    cameraTargetPos.x += diffx * 2 * -1
    cameraTargetPos.y += diffy * 2 * 1
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
    }

    const { modelName } = hoveredElement

    eventEmitter.emit(EVT_CLOSE_REQUEST_SINGLE_PROJECT, ({ modelName }))

    closeModelTween = chain(
      delay(TOGGLE_SINGLE_PAGE_TRANSITION_DELAY),
      tween({
        duration: TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION * openModelTweenFactor,
      })
    ).start({
      update: tweenFactor => {
        openModelTweenFactor = tweenFactor
        eventEmitter.emit(EVT_CLOSING_SINGLE_PROJECT, {
          modelName,
          tweenFactor,
        })
      },
      complete: () => {
        eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, ({ modelName }))
        closeModelTween = null
      }
    })

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
  postFXMesh.onDragEnd()
  cursorArrowOffsetTarget = 0
  document.body.classList.remove('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragEnd())
}

function updateFrame(ts) {
  if (!ts) {
    ts = 0
  }
  ts /= 1000
  ts = Math.max(ts, 1)
  const dt = ts - oldTime
  oldTime = ts

  eventEmitter.emit(EVT_RAF_UPDATE_APP, ts, dt)

  if (!isDragging) {
    raycaster.setFromCamera(raycastMouse, photoCamera)
    const intersectsTests = photoPreviews
      .filter(a => a.isInteractable)
      .map(({ clipMesh }) => clipMesh)
    const intersects = raycaster.intersectObjects(intersectsTests)
    if (intersects.length > 0) {
      const intersect = intersects[0]
      const { object, object: { modelName } } = intersect
      if (!hoveredElement) {
        hoveredElement = object
      }
      postFXMesh.hover()
    } else {
      hoveredElement = null
      postFXMesh.unHover()
    }
  }

  if (!clickedElement) {

    clipCamera.position.x +=
      (cameraTargetPos.x - clipCamera.position.x) * dt
    clipCamera.position.y +=
      (cameraTargetPos.y - clipCamera.position.y) * dt
    photoCamera.position.x += (cameraTargetPos.x - photoCamera.position.x) * dt
    photoCamera.position.y += (cameraTargetPos.y - photoCamera.position.y) * dt
    
    let oldCameraVelocityX = cameraVelocity.x
    let oldCameraVelocityY = cameraVelocity.y

    cameraVelocity.x += (cameraTargetPos.x - clipCamera.position.x) * dt
    cameraVelocity.y += (cameraTargetPos.y - clipCamera.position.y) * dt

    const dx = cameraVelocity.x - oldCameraVelocityX
    const dy = cameraVelocity.y - oldCameraVelocityY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    isDragCameraMoving = dist > CAMERA_MIN_VELOCITY_TO_BE_MOVING

    clipCamera.position.x += cameraVelocity.x
    clipCamera.position.y += cameraVelocity.y
    photoCamera.position.x += cameraVelocity.x
    photoCamera.position.y += cameraVelocity.y

    const friction = 0.6

    clipCamera.position.x  *= friction
    clipCamera.position.y  *= friction
    photoCamera.position.x *= friction
    photoCamera.position.y *= friction
    
    const bounceOffFactor = -0.05

    if (cameraTargetPos.x > WOLRD_WIDTH / 2) {
      // cameraTargetPos.x *= -1
      cameraTargetPos.x = WOLRD_WIDTH / 2
    } else if (cameraTargetPos.x < -WOLRD_WIDTH / 2) {
      // cameraTargetPos.x *= -1
      cameraTargetPos.x = -WOLRD_WIDTH / 2
    } else if (cameraTargetPos.y > WORLD_HEIGHT / 2) {
      // cameraTargetPos.y *= -1
      cameraTargetPos.y = WORLD_HEIGHT / 2
    } else if (cameraTargetPos.y < -WORLD_HEIGHT / 2) {
      // cameraTargetPos.y *= -1
      cameraTargetPos.y = -WORLD_HEIGHT / 2
    }
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
  renderer.render(cursorScene, cursorCamera)
  
  renderer.setRenderTarget(clipRenderTarget)
  renderer.render(clipScene, clipCamera)
  
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, photoCamera)

  renderer.setRenderTarget(null)
  renderer.render(postFXScene, postFXCamera)

  requestAnimationFrame(updateFrame)
}
