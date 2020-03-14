import * as THREE from 'three'

import PhotoPreview from './PhotoPreview'

import styles from './style.css'

import ninja from './assets/ninja.jpg'

import {
  WOLRD_WIDTH,
  WORLD_HEIGHT,
} from './constants'

import photoInfo from './photoInfo'

let appWidth = window.innerWidth
let appHeight = window.innerHeight
const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)

const renderer = new THREE.WebGLRenderer({ alpha: true })
const clipScene = new THREE.Scene()
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()

const clipCamera = new THREE.OrthographicCamera(-appWidth / 2, appWidth / 2, -appHeight / 2, appHeight / 2, 1, 1000)
const photoCamera = new THREE.OrthographicCamera(-appWidth / 2, appWidth / 2, -appHeight / 2, appHeight / 2, 1, 1000)
const postFXCamera = new THREE.OrthographicCamera(-appWidth / 2, appWidth / 2, -appHeight / 2, appHeight / 2, 1, 1000)

const clipRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const photoRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)

let oldTime = 0
let isDragging = false

const originalCameraPos = [0, 0, -50]
const cameraLookAt = new THREE.Vector3(0, 0, 0)

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

renderer.setSize(appWidth, appHeight)
renderer.setPixelRatio(dpr)
// renderer.setClearColor(0x17293a)
renderer.setClearAlpha(0)
document.body.appendChild(renderer.domElement)

const photoPreviews = photoInfo.map(info => {
  const photoPreview = new PhotoPreview({
    width: 250,
    height: 400,
  })
  photoPreview.position = new THREE.Vector3(info.x, info.y)
  clipScene.add(photoPreview.clipMesh)
  photoScene.add(photoPreview.photoMesh)
  return photoPreview
})

new THREE.TextureLoader().load(ninja, texture => {
  texture.flipY = false
  photoPreviews.forEach(photoPreview => photoPreview.addPhotoTexture(texture))
})

document.body.addEventListener('mousedown', e => {
  isDragging = true
  document.body.classList.add('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragStart())
  mousePos.x = e.pageX
  mousePos.y = e.pageY
}, false)

document.body.addEventListener('mousemove', e => {
  if (isDragging) {
    const diffx = e.pageX - mousePos.x
    const diffy = e.pageY - mousePos.y
    mousePos.x = e.pageX
    mousePos.y = e.pageY
    photoPreviews.forEach(photoPreview => photoPreview.onSceneDrag(diffx, diffy))
    // TODO: Why????
    clipCamera.position.x += diffx
    clipCamera.position.y += diffy
    photoCamera.position.x += diffx
    photoCamera.position.y += diffy
    if (clipCamera.position.x > WOLRD_WIDTH / 2) {
      clipCamera.position.x = WOLRD_WIDTH / 2
    } else if (clipCamera.position.x < -WOLRD_WIDTH / 2) {
      clipCamera.position.x = -WOLRD_WIDTH / 2
    } else if (clipCamera.position.y > WORLD_HEIGHT / 2) {
      clipCamera.position.y = WORLD_HEIGHT / 2
    } else if (clipCamera.position.y < -WORLD_HEIGHT / 2) {
      clipCamera.position.y = -WORLD_HEIGHT / 2
    }
  }
}, false)

document.body.addEventListener('mouseup', () => {
  isDragging = false
  document.body.classList.remove('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragEnd())
}, false)

document.body.addEventListener('mouseleave', () => {
  photoPreviews.forEach(photoPreview => {
    photoPreview._diffVectorTarget.x = 0
    photoPreview._diffVectorTarget.y = 0
  })
})

const postFXGeometry = new THREE.PlaneGeometry(appWidth , appHeight )
const postFXMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_tDiffuseClip: { texture: clipRenderTarget.texture },
    u_tDiffusePhoto: { texture: photoRenderTarget.texture },
  },
  transparent: true,
  vertexShader: `
    varying vec2 v_uv;

    void main () {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      v_uv = uv;
    }
  `,
  fragmentShader: `
    uniform sampler2D u_tDiffuseClip;
    uniform sampler2D u_tDiffusePhoto;

    varying vec2 v_uv;

    void main () {
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
      vec4 clipColor = texture2D(u_tDiffuseClip, uv);
      vec4 photoColor = texture2D(u_tDiffusePhoto, uv);
      
      gl_FragColor = mix(photoColor, clipColor, 1.0 - clipColor.r);
      // gl_FragColor = photoColor;
    }
  `
})
const postFXMesh = new THREE.Mesh(postFXGeometry, postFXMaterial)
postFXScene.add(postFXMesh)


clipScene.add(
  new THREE.Mesh(
    new THREE.PlaneGeometry(WOLRD_WIDTH * 2, WORLD_HEIGHT * 2),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xFF0000 })
  )
)

updateFrame()

function updateFrame (ts) {
  if (!ts) ts = 0
  ts /= 1000
  ts = Math.max(ts, 1)
  const dt = ts - oldTime
  oldTime = ts

  photoPreviews.forEach(photoPreview => photoPreview.onSceneUpdate(ts, dt))
  
  renderer.autoClear = true
  renderer.setRenderTarget(clipRenderTarget)
  renderer.render(clipScene, clipCamera)
  
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, photoCamera)


  postFXMaterial.uniforms.u_tDiffuseClip.value = clipRenderTarget.texture
  postFXMaterial.uniforms.u_tDiffusePhoto.value = photoRenderTarget.texture

  renderer.autoClear = false
  renderer.setRenderTarget(null)
  renderer.render(postFXScene, postFXCamera)

  window.requestAnimationFrame(updateFrame)
}
