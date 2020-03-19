import * as THREE from 'three'

import PhotoPreview from './PhotoPreview'
import Cursor from './Cursor'
import SinglePage from './SinglePage'

import './style.css'

import arrowLeft from './assets/arrow.png'

import { WOLRD_WIDTH, WORLD_HEIGHT } from './constants'
import { tween } from 'popmotion'


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
let cursorSizeTarget = 50
let cursorScanlineTarget = 0
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let cursorVizorOpacityTarget = 1
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

// photoCamera.zoom = 1
photoCamera.updateProjectionMatrix()

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
  cursorSizeTarget = 55
  cursorArrowOffsetTarget = 1
  document.body.classList.add('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragStart())
  mousePos.x = e.pageX
  mousePos.y = e.pageY

  // webglContainer.classList.add('non-interactable')

  if (hoveredElement) {
    const { modelName } = hoveredElement
    const project = projectsData.find(({ modelName: projectModelName }) => projectModelName === modelName)

    // singlePage.open(project)

    const hoveredPreview = photoPreviews.find(preview => preview.modelName === modelName)

    tween({
      from: { x: hoveredPreview.x, y: hoveredPreview.y, z: hoveredPreview.z },
      to: clipCamera.position,
      duration: 1000,
    }).start(v => {
      hoveredPreview.x = v.x
      hoveredPreview.y = v.y
    })

  }

}, false)

webglContainer.addEventListener('mousemove', e => {
  raycastMouse.x = (e.clientX / renderer.domElement.clientWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / renderer.domElement.clientHeight) * 2 + 1

  cursor.onMouseMove(e.pageX, e.pageY)

  cursorTargetPos.x = e.pageX * 2
  cursorTargetPos.y = window.innerHeight * 2 - e.pageY * 2

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
  cursorSizeTarget = 50
  cursorArrowOffsetTarget = 0
  document.body.classList.remove('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragEnd())
}, false)

webglContainer.addEventListener('mouseenter', () => {
  cursorVizorOpacityTarget = 1
})

webglContainer.addEventListener('mouseleave', () => {
  photoPreviews.forEach(photoPreview => {
    photoPreview._diffVectorTarget.x = 0
    photoPreview._diffVectorTarget.y = 0
  })
  cursorVizorOpacityTarget = 0
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

const postFXGeometry = new THREE.PlaneGeometry(appWidth, appHeight)
const postFXMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 0.0 },
    u_tDiffuseClip: { value: clipRenderTarget.texture },
    u_tDiffusePhoto: { value: photoRenderTarget.texture },
    u_tDiffuseCursor: { value: cursorRenderTarget.texture },
    u_tDiffuseMask: { value: null },
    u_resolution: { value: new THREE.Vector2(appWidth, appHeight) },
    u_mouse: { value: mousePos.clone() },
    u_cursorSize: { value: cursorSizeTarget },
    u_hoverMixFactor: { value: cursorScanlineTarget },
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
    uniform float u_time;
    uniform sampler2D u_tDiffuseClip;
    uniform sampler2D u_tDiffusePhoto;
    uniform sampler2D u_tDiffuseCursor;
    uniform sampler2D u_tDiffuseMask;

    uniform vec2 u_resolution;
    uniform vec2 u_mouse;
    uniform float u_cursorSize;
    uniform float u_hoverMixFactor;

    varying vec2 v_uv;

    float random (vec2 p) {
      vec2 K1 = vec2(
        23.14069263277926, // e^pi (Gelfond's constant)
        2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
      );
      return fract( cos( dot(p,K1) ) * 12345.6789 );
    }

    float circle (vec2 uv, vec2 pos, float rad) {
      float d = length(pos - uv) - rad;
      float t = clamp(d, 0.0, 1.0);
      return 1.0 - t;
    }

    vec4 blur9 (sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
      vec4 color = vec4(0.0);
      vec2 off1 = vec2(1.3846153846) * direction;
      vec2 off2 = vec2(3.2307692308) * direction;
      color += texture2D(image, uv) * 0.2270270270;
      color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;
      color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;
      color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;
      color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;
      return color;
    }

    void main () {
      vec2 uv = v_uv;
      vec4 baseColor = vec4(vec3(0.89), 1.0);
      vec4 clipColor = texture2D(u_tDiffuseClip, uv);
      vec4 photoColor = texture2D(u_tDiffusePhoto, uv);
      vec4 cursorColor = texture2D(u_tDiffuseCursor, uv);
      vec4 maskColor = texture2D(u_tDiffuseMask, uv);

      vec4 color = mix(clipColor, photoColor, clipColor.r);
      color = mix(baseColor, color, color.a);

      vec2 mouse = vec2(u_mouse.x, u_resolution.y - u_mouse.y);
      float cursorAlpha = circle(gl_FragCoord.xy, u_mouse, u_cursorSize);

      vec4 cursorCircleColor = color;
      vec2 uvRandom = uv;
      uvRandom.y *= random(vec2(uvRandom.y, u_time));
      cursorCircleColor.rgb += random(uvRandom) * 0.25;

      color = mix(color, cursorColor, cursorColor.a);

      float fmin = 0.8;
      float fmod = mod(u_time * 3.0 + uv.y * 150.0, 1.3);
      float fstep = fmin + (1.0 - fmin) * fmod;

      vec4 hoverColor = cursorCircleColor;
      cursorCircleColor.rgb *= fstep;

      hoverColor = mix(hoverColor, cursorCircleColor, u_hoverMixFactor);

      // gl_FragColor = maskColor;
      if (maskColor.r < 0.5) {
        gl_FragColor = mix(color, hoverColor, cursorAlpha);
      } else {
        gl_FragColor = vec4(1.0);
      }
      
    }
  `
})
new THREE.TextureLoader().load('/mask.png', texture => {
  postFXMaterial.uniforms.u_tDiffuseMask.value = texture
})

const postFXMesh = new THREE.Mesh(postFXGeometry, postFXMaterial)
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

// clipScene.add(
//   new THREE.Mesh(
//     new THREE.PlaneGeometry(WOLRD_WIDTH * 2, WORLD_HEIGHT * 2),
//     new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 })
//   )
// )

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
        // cursor.setText(modelName).show()
        hoveredElement = object
      }
      cursorSizeTarget = 120
      cursorScanlineTarget = 1
    } else {
      cursor.hide()
      hoveredElement = null
      cursorSizeTarget = 50
      cursorScanlineTarget = 0
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
  
  postFXMaterial.uniforms.u_time.value = ts
  postFXMaterial.uniforms.u_tDiffuseClip.value = clipRenderTarget.texture
  postFXMaterial.uniforms.u_tDiffusePhoto.value = photoRenderTarget.texture
  postFXMaterial.uniforms.u_tDiffuseCursor.value = cursorRenderTarget.texture
  postFXMaterial.uniforms.u_mouse.value.x += (cursorTargetPos.x - postFXMaterial.uniforms.u_mouse.value.x) * (dt * 12)
  postFXMaterial.uniforms.u_mouse.value.y += (cursorTargetPos.y - postFXMaterial.uniforms.u_mouse.value.y) * (dt * 12)
  postFXMaterial.uniforms.u_cursorSize.value += (cursorSizeTarget - postFXMaterial.uniforms.u_cursorSize.value) * (dt * 10)
  postFXMaterial.uniforms.u_hoverMixFactor.value += (cursorScanlineTarget - postFXMaterial.uniforms.u_hoverMixFactor.value) * (dt * 10)

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

  renderer.setRenderTarget(cursorRenderTarget)
  renderer.render(cursorScene, cursorCamera)
  
  renderer.setRenderTarget(clipRenderTarget)
  renderer.render(clipScene, clipCamera)
  
  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, photoCamera)

  renderer.setRenderTarget(null)
  renderer.render(postFXScene, postFXCamera)

  cursor.onUpdate(ts, dt)

  window.requestAnimationFrame(updateFrame)
}
