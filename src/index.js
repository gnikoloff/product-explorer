import * as THREE from 'three'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import SinglePage from './SinglePage'
import PostProcessing from './PostProcessing'

import './style'

import arrowLeft from './assets/arrow.png'

import {
  WOLRD_WIDTH,
  WORLD_HEIGHT,
  EVT_RAF_UPDATE_APP,
  EVT_CLICKED_SINGLE_PROJECT,
  EVT_MOUSEMOVE_APP,
  EVT_FADE_IN_SINGLE_VIEW,
  EVT_LOADED_PROJECTS,
} from './constants'
import { tween, chain, mouse } from 'popmotion'


let appWidth = window.innerWidth
let appHeight = window.innerHeight

const webglContainer = document.getElementsByClassName('webgl-scene')[0]

const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const cameraTargetPos = new THREE.Vector2(0, 0)
const cameraVelocity = new THREE.Vector2(0, 0)
const cursorTargetPos = new THREE.Vector2(0, 0)

const renderer = new THREE.WebGLRenderer({ alpha: true })
// const renderer = new THREE.WebGLRenderer()

const clipScene = new THREE.Scene()
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const cursorScene = new THREE.Scene()

const clipCamera = new THREE.OrthographicCamera(
  appWidth / - 2,
  appWidth / 2,
  appHeight / 2,
  appHeight / - 2,
  1,
  1000
)
const photoCamera = clipCamera.clone()
const postFXCamera = clipCamera.clone()
const cursorCamera = clipCamera.clone()

const clipRenderTarget = new THREE.WebGLRenderTarget(
  appWidth * dpr,
  appHeight * dpr
)
const photoRenderTarget = new THREE.WebGLRenderTarget(
  appWidth * dpr,
  appHeight * dpr
)
const cursorRenderTarget = new THREE.WebGLRenderTarget(
  appWidth * dpr,
  appHeight * dpr
)

const raycaster = new THREE.Raycaster()

const originalCameraPos = [0, 0, 50]
const cameraLookAt = new THREE.Vector3(0, 0, 0)

const singlePage = new SinglePage()

let oldTime = 0
let isDragging = false
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let projectsData = []
let hoveredElement = null
let clickedElement = null

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

renderer.setSize(appWidth, appHeight)
renderer.setPixelRatio(dpr)
// renderer.setClearColor(0xe5e5e5)
renderer.setClearAlpha(0)
webglContainer.appendChild(renderer.domElement)

let photoPreviews = []

fetch('/get_data')
  .then(res => res.json())
  .then(res => {
    projectsData = res.projects

    eventEmitter.emit(EVT_LOADED_PROJECTS, projectsData)

    photoPreviews = res.projects.map(info => {
      const photoPreview = new PhotoPreview({
        modelName: info.modelName,
        width: 300,
        height: 450,
        photos: info.sliderPhotos || [],
      })
      photoPreview.x = info.posX
      photoPreview.y = info.posY
      clipScene.add(photoPreview.clipMesh)
      photoScene.add(photoPreview.photoMesh)
      photoPreview.loadPreview()
      // new THREE.TextureLoader().load(info.previewSrc, texture => {
      //   texture.flipY = true
      //   photoPreview.addPreviewTexture(texture)
      // })
      return photoPreview
    })
  })

webglContainer.addEventListener('mousedown', e => {
  isDragging = true
  postFXMesh.onDragStart()
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragStart())
  mousePos.x = e.pageX
  mousePos.y = e.pageY

  // webglContainer.classList.add('non-interactable')

  if (hoveredElement) {
    if (clickedElement) {
      return  
    }

    cursorArrowOffsetTarget = 1
    document.body.classList.add('dragging')

    const { modelName } = hoveredElement
    const project = projectsData.find(({ modelName: projectModelName }) => projectModelName === modelName)

    eventEmitter.emit(EVT_CLICKED_SINGLE_PROJECT, modelName)
    clickedElement = hoveredElement

    const hoveredPreview = photoPreviews.find(preview => preview.modelName === modelName)

    photoPreviews.filter(preview => preview.modelName !== modelName).forEach(preview => {
      preview.isInteractable = false
    })

    tween({
      from: {
        x: hoveredPreview.x,
        y: hoveredPreview.y,
        opacity: 1,
      },
      to: {
        x: clipCamera.position.x - appWidth * 0.25,
        y: clipCamera.position.y,
        opacity: 0,
      },
      duration: 500,
    }).start({
      update: v => {
        let diffx = v.x - hoveredPreview.x
        let diffy = v.y - hoveredPreview.y
        hoveredPreview.onSceneDrag(diffx, diffy)
        hoveredPreview.x = v.x
        hoveredPreview.y = v.y
        const unclicked = photoPreviews.filter(project => project.modelName !== modelName)
        unclicked.forEach(item => {
          item.opacity = v.opacity
        })
      },
      complete: () => {
        tween({
          from: { x: hoveredPreview.diffVector.x, y: hoveredPreview.diffVector.y },
          to: { x: 0, y: 0 },
        }).start(v => {
          hoveredPreview.onSceneDrag(v.x, v.y)
        })
        eventEmitter.emit(EVT_FADE_IN_SINGLE_VIEW)
        tween({
          from: 0,
          to: 1,
          duration: 1000,
        }).start({
          update: v => {
            postFXMesh.material.uniforms.u_cutOffFactor.value = v
          },
          complete: () => {
            // singlePage.introScrollFactor

            const clicked = photoPreviews.find(project => project.modelName === modelName)
            // ...
          },
        })
      },
    })

  }
}, false)

document.body.addEventListener('mousemove', e => {
  mousePos.x = e.pageX
  mousePos.y = e.pageY
  eventEmitter.emit(EVT_MOUSEMOVE_APP, mousePos.x, mousePos.y)
})

webglContainer.addEventListener('mousemove', e => {
  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  cursorTargetPos.x = e.pageX
  cursorTargetPos.y = window.innerHeight - e.pageY


  if (isDragging && !clickedElement) {
    const diffx = e.pageX - mousePos.x
    const diffy = e.pageY - mousePos.y

    photoPreviews.forEach(photoPreview =>
      photoPreview.onSceneDrag(diffx, diffy)
    )
    cameraTargetPos.x += diffx * 2 * -1
    cameraTargetPos.y += diffy * 2 * 1
  } else {
    
  }

}, false)

webglContainer.addEventListener('mouseup', () => {
  isDragging = false
  postFXMesh.onDragEnd()
  cursorArrowOffsetTarget = 0
  document.body.classList.remove('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragEnd())
}, false)

webglContainer.addEventListener('mouseenter', () => {
  // ...
})

webglContainer.addEventListener('mouseleave', () => {
  photoPreviews.forEach(photoPreview => {
    photoPreview._diffVectorTarget.x = 0
    photoPreview._diffVectorTarget.y = 0
  })
  cursorArrowOffsetTarget = 0
})

window.addEventListener('resize', () => {
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

})

const postFXMesh = new PostProcessing({
  width: appWidth,
  height: appHeight,
})
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

updateFrame()

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
    // clipCamera.position.x +=
    //   (cameraTargetPos.x - clipCamera.position.x) * dt
    // clipCamera.position.y +=
    //   (cameraTargetPos.y - clipCamera.position.y) * dt
    // photoCamera.position.x += (cameraTargetPos.x - photoCamera.position.x) * dt
    // photoCamera.position.y += (cameraTargetPos.y - photoCamera.position.y) * dt

    cameraVelocity.x += (cameraTargetPos.x - clipCamera.position.x) * dt
    cameraVelocity.y += (cameraTargetPos.y - clipCamera.position.y) * dt

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

  window.requestAnimationFrame(updateFrame)
}
