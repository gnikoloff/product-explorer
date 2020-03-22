import * as THREE from 'three'

import eventEmitter from './event-emitter'

import PhotoPreview from './PhotoPreview'
import Cursor from './Cursor'
import SinglePage from './SinglePage'
import PostProcessing from './PostProcessing'

import './style.css'

import arrowLeft from './assets/arrow.png'

import { WOLRD_WIDTH, WORLD_HEIGHT } from './constants'
import { tween, chain } from 'popmotion'


let appWidth = window.innerWidth
let appHeight = window.innerHeight

const webglContainer = document.getElementsByClassName('webgl-scene')[0]

const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const cameraTargetPos = new THREE.Vector2(0, 0)
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

const cursor = new Cursor()
const singlePage = new SinglePage()

let oldTime = 0
let isDragging = false
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let projectsData = []
let hoveredElement = null

clipCamera.position.set(...originalCameraPos)
clipCamera.lookAt(cameraLookAt)
clipScene.add(clipCamera)

// clipCamera.zoom = 0.2
// clipCamera.updateProjectionMatrix()

photoCamera.position.set(...originalCameraPos)
photoCamera.lookAt(cameraLookAt)
photoScene.add(photoCamera)

// photoCamera.zoom = 0.2
// photoCamera.updateProjectionMatrix()

postFXCamera.position.set(...originalCameraPos)
postFXCamera.lookAt(cameraLookAt)
postFXScene.add(postFXCamera)

cursorCamera.position.set(...originalCameraPos)
cursorCamera.lookAt(cameraLookAt)
cursorScene.add(cursorCamera)

// cursorCamera.zoom = 0.2
// cursorCamera.updateProjectionMatrix()

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
    photoPreviews = res.projects.map(info => {
      const photoPreview = new PhotoPreview({
        modelName: info.modelName,
        width: 250,
        height: 400
      })
      photoPreview.x = info.posX
      photoPreview.y = info.posY
      clipScene.add(photoPreview.clipMesh)
      photoScene.add(photoPreview.photoMesh)
      new THREE.TextureLoader().load(info.previewSrc, texture => {
        texture.flipY = true
        photoPreview.addPhotoTexture(texture)
      })
      return photoPreview
    })
  })

webglContainer.addEventListener('mousedown', e => {
  isDragging = true
  postFXMesh.onDragStart()
  cursorArrowOffsetTarget = 1
  document.body.classList.add('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragStart())
  mousePos.x = e.pageX
  mousePos.y = e.pageY

  // webglContainer.classList.add('non-interactable')

  if (hoveredElement) {
    const { modelName } = hoveredElement
    const project = projectsData.find(({ modelName: projectModelName }) => projectModelName === modelName)

    singlePage.open(project)
    postFXMesh.hideCursor()

    const hoveredPreview = photoPreviews.find(preview => preview.modelName === modelName)

    // const toPosition = {
    //   x: clipCamera.position.x,
    //   y: clipCamera.position.y,
    //   z: clipCamera.position.y
    // }
    
    tween({
      from: {
        x: hoveredPreview.x,
        y: hoveredPreview.y,
        opacity: 1,
      },
      to: {
        x: photoCamera.position.x,
        y: photoCamera.position.y,
        opacity: 0,
      },
      duration: 500,
    }).start({
      update: v => {
        hoveredPreview.x = v.x
        hoveredPreview.y = v.y
        const unclicked = photoPreviews.filter(project => project.modelName !== modelName)
        unclicked.forEach(item => {
          item.opacity = v.opacity
        })
      },
      complete: () => {
        tween({
          from: 0,
          to: 1,
          duration: 750,
        }).start({
          update: v => {
            postFXMesh.material.uniforms.u_cutOffFactor.value = v
          },
          complete: () => {
            // singlePage.introScrollFactor

            const clicked = photoPreviews.find(project => project.modelName === modelName)

            eventEmitter.on('msg', scrollFactor => {
              clicked.opacity = 1.0 - scrollFactor
            })

          },
        })
      },
    })

    // tween({
    //   from: {
    //     x: hoveredPreview.x,
    //     y: hoveredPreview.y,
    //     z: hoveredPreview.z,
    //     maskCutoff: 1,
    //     opacity: 1,
    //   },
    //   to: {
    //     ...clipCamera.position,
    //     maskCutoff: 0,
    //     opacity: 0,
    //   },
    //   duration: 1000,
    // }).start(v => {
    //   hoveredPreview.x = v.x
    //   hoveredPreview.y = v.y
    //   postFXMesh.material.uniforms.u_cutOffFactor.value = v.maskCutoff
    //   const unclicked = photoPreviews.filter(project => project.modelName !== modelName)
    //   unclicked.forEach(item => {
    //     item.opacity = v.opacity
    //   })
    //   // photoPreview.onSceneDrag(diffx, diffy)
    // })

  }

}, false)

webglContainer.addEventListener('mousemove', e => {
  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  cursor.onMouseMove(e.pageX, e.pageY)

  cursorTargetPos.x = e.pageX
  cursorTargetPos.y = window.innerHeight - e.pageY

  if (isDragging) {
    const diffx = e.pageX - mousePos.x
    const diffy = e.pageY - mousePos.y

    photoPreviews.forEach(photoPreview =>
      photoPreview.onSceneDrag(diffx, diffy)
    )
    cameraTargetPos.x += diffx * 2 * -1
    cameraTargetPos.y += diffy * 2 * 1
  } else {
    
  }

  mousePos.x = e.pageX
  mousePos.y = e.pageY
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

  if (!isDragging) {
    raycaster.setFromCamera(raycastMouse, photoCamera)
    const intersectsTests = photoPreviews.map(({ clipMesh }) => clipMesh)
    const intersects = raycaster.intersectObjects(intersectsTests)

    if (intersects.length > 0) {
      const intersect = intersects[0]
      const { object, object: { modelName } } = intersect
      if (!hoveredElement) {
        // cursor.show()
        hoveredElement = object
      }

      postFXMesh.hover()
    } else {
      cursor.hide()
      hoveredElement = null
      postFXMesh.unHover()
    }
  }

  clipCamera.position.x +=
    (cameraTargetPos.x - clipCamera.position.x) * (dt * 0.92)
  clipCamera.position.y +=
    (cameraTargetPos.y - clipCamera.position.y) * (dt * 0.92)
  photoCamera.position.x += (cameraTargetPos.x - photoCamera.position.x) * dt
  photoCamera.position.y += (cameraTargetPos.y - photoCamera.position.y) * dt

  if (clipCamera.position.x > WOLRD_WIDTH / 2) {
    clipCamera.position.x = WOLRD_WIDTH / 2
    cameraTargetPos.x = WOLRD_WIDTH / 2
    photoCamera.position.x = WOLRD_WIDTH / 2
    photoPreviews.forEach(preview => preview.onSceneDrag(0, 0))
  } else if (clipCamera.position.x < -WOLRD_WIDTH / 2) {
    clipCamera.position.x = -WOLRD_WIDTH / 2
    cameraTargetPos.x = -WOLRD_WIDTH / 2
    photoCamera.position.x = -WOLRD_WIDTH / 2
    photoPreviews.forEach(preview => preview.onSceneDrag(0, 0))
  } else if (clipCamera.position.y > WORLD_HEIGHT / 2) {
    clipCamera.position.y = WORLD_HEIGHT / 2
    cameraTargetPos.y = WORLD_HEIGHT / 2
    photoCamera.position.y = WORLD_HEIGHT / 2
    photoPreviews.forEach(preview => preview.onSceneDrag(0, 0))
  } else if (clipCamera.position.y < -WORLD_HEIGHT / 2) {
    clipCamera.position.y = -WORLD_HEIGHT / 2
    cameraTargetPos.y = -WORLD_HEIGHT / 2
    photoCamera.position.y = -WORLD_HEIGHT / 2
    photoPreviews.forEach(preview => preview.onSceneDrag(0, 0))
  }

  photoPreviews.forEach(photoPreview => photoPreview.onSceneUpdate(ts, dt))
  
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

  cursorArrowLeft.position.x = cursorBasePosX + 30 + cursorArrowOffset
  cursorArrowLeft.position.y = cursorBasePosY

  cursorArrowRight.position.x = cursorBasePosX - 30 - cursorArrowOffset
  cursorArrowRight.position.y = cursorBasePosY

  cursorArrowTop.position.x = cursorBasePosX
  cursorArrowTop.position.y = cursorBasePosY - 30 - cursorArrowOffset

  cursorArrowBottom.position.x = cursorBasePosX
  cursorArrowBottom.position.y = cursorBasePosY + 30 + cursorArrowOffset

  cursor.onUpdate(ts, dt)
  postFXMesh.onUpdate(ts, dt)

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
