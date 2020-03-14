import * as THREE from 'three'

import PhotoPreview from './PhotoPreview'

import styles from './style.css'

import ninja from './assets/ninja.jpg'

let appWidth = window.innerWidth
let appHeight = window.innerHeight
const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)

const renderer = new THREE.WebGLRenderer()
const clipScene = new THREE.Scene()
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const camera = new THREE.OrthographicCamera(-appWidth / 2, appWidth / 2, -appHeight / 2, appHeight / 2, 1, 1000)

const clipRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)
const photoRenderTarget = new THREE.WebGLRenderTarget(appWidth * dpr, appHeight * dpr)

let oldTime = 0

camera.position.set(0, 0, -20)
camera.lookAt(new THREE.Vector3(0, 0, 0))
clipScene.add(camera)

renderer.setSize(appWidth, appHeight)
renderer.setPixelRatio(dpr)
renderer.setClearColor(0x17293a)
document.body.appendChild(renderer.domElement)

const photoPreview = new PhotoPreview({
  width: 250,
  height: 400,
})
clipScene.add(photoPreview.clipMesh)
photoScene.add(photoPreview.photoMesh)

new THREE.TextureLoader().load(ninja, texture => {
  texture.flipY = false
  photoPreview.addPhotoTexture(texture)
})

document.body.addEventListener('mousedown', () => {
  document.body.classList.add('dragging')
  photoPreview.onSceneDragStart()
}, false)

document.body.addEventListener('mousemove', e => {
  const diffx = e.pageX - mousePos.x
  const diffy = e.pageY - mousePos.y
  mousePos.x = e.pageX
  mousePos.y = e.pageY
  photoPreview.onSceneDrag(diffx, diffy)
}, false)

document.body.addEventListener('mouseup', () => {
  document.body.classList.remove('dragging')
  photoPreview.onSceneDragEnd()
}, false)

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
      vec4 clipColor = texture2D(u_tDiffuseClip, v_uv);
      vec4 photoColor = texture2D(u_tDiffusePhoto, uv);
      
      gl_FragColor = mix(photoColor, vec4(0.0), 1.0 - clipColor.r);
      // gl_FragColor = photoColor;
    }
  `
})
const postFXMesh = new THREE.Mesh(postFXGeometry, postFXMaterial)
postFXScene.add(postFXMesh)

updateFrame()

function updateFrame (ts) {
  if (!ts) ts = 0
  ts /= 1000
  ts = Math.max(ts, 1)
  const dt = ts - oldTime
  oldTime = ts

  photoPreview.onSceneUpdate(ts, dt)
  
  // renderer.autoClear = true
  renderer.setRenderTarget(clipRenderTarget)
  renderer.render(clipScene, camera)
  
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, camera)


  postFXMaterial.uniforms.u_tDiffuseClip.value = clipRenderTarget.texture
  postFXMaterial.uniforms.u_tDiffusePhoto.value = photoRenderTarget.texture

  // renderer.autoClear = false
  renderer.setRenderTarget(null)
  renderer.render(postFXScene, camera)

  window.requestAnimationFrame(updateFrame)
}
