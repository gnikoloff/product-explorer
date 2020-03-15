import * as THREE from 'three'
import styler from 'stylefire'

import PhotoPreview from './PhotoPreview'

import './style.css'

import arrowLeft from './assets/arrow.png'

import { WOLRD_WIDTH, WORLD_HEIGHT } from './constants'
import { tween, chain, delay } from 'popmotion'

let appWidth = window.innerWidth
let appHeight = window.innerHeight

const webglContainer = document.getElementsByClassName('webgl-scene')[0]
const singlePageWrapper = document.getElementsByClassName('single-page-wrapper')[0]
const singlePage = singlePageWrapper.getElementsByClassName('single-page')[0]
const singlePageScrollIndicator = singlePageWrapper.getElementsByClassName('scroll-indicator')[0]
const singlePageScrollIndicatorStyler = styler(singlePageScrollIndicator)

const dpr = window.devicePixelRatio || 1

const mousePos = new THREE.Vector2(0, 0)
const raycastMouse = new THREE.Vector2(0, 0)
const cameraTargetPos = new THREE.Vector2(0, 0)
const cursorTargetPos = new THREE.Vector2(0, 0)

const renderer = new THREE.WebGLRenderer({ alpha: true })

const clipScene = new THREE.Scene()
const photoScene = new THREE.Scene()
const postFXScene = new THREE.Scene()
const cursorScene = new THREE.Scene()

const aspect = appWidth / appHeight
const clipCamera = new THREE.OrthographicCamera(
  -appWidth / 2,
  appWidth / 2,
  -appHeight / 2,
  appHeight / 2,
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

const originalCameraPos = [0, 0, -50]
const cameraLookAt = new THREE.Vector3(0, 0, 0)

let oldTime = 0
let isDragging = false
let cursorSizeScaleFactorTarget = 0.1
let cursorArrowOffset = 0
let cursorArrowOffsetTarget = 0
let cursorVizorOpacityTarget = 1
let projectsData = []

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
        width: 250,
        height: 400
      })
      photoPreview.position = new THREE.Vector3(info.posX, info.posY)
      clipScene.add(photoPreview.clipMesh)
      photoScene.add(photoPreview.photoMesh)
      new THREE.TextureLoader().load(info.previewSrc, texture => {
        texture.flipY = false
        photoPreview.addPhotoTexture(texture)
      })
      return photoPreview
    })
  })

webglContainer.addEventListener('mousedown', e => {
  isDragging = true
  cursorSizeScaleFactorTarget = 0.09
  cursorArrowOffsetTarget = 1
  document.body.classList.add('dragging')
  photoPreviews.forEach(photoPreview => photoPreview.onSceneDragStart())
  mousePos.x = e.pageX
  mousePos.y = e.pageY

  webglContainer.classList.add('non-interactable')

  
  const singlePageStyler = styler(singlePage)
  
  const singlePageIntroImage = singlePageWrapper.getElementsByClassName('intro-img')[0]
  const singlePageIntroImageStyler = styler(singlePageIntroImage)

  const singlePageIntroTitle = singlePageWrapper.getElementsByClassName('intro-title')[0]
  const singlePageIntroTitleStyler = styler(singlePageIntroTitle)

  const singlePageBigHeadlineWrapper = singlePageWrapper.getElementsByClassName('single-page-big-headline')[0]
  const singlePageBigHeadline = singlePageBigHeadlineWrapper.getElementsByClassName('single-page-big-headline-text')[0]

  const singlePageIntroSubheading = singlePageWrapper.getElementsByClassName('intro-subheading')[0]
  const singlePageIntroSubheadingStyler = styler(singlePageIntroSubheading)

  const singlePageDescription = singlePageWrapper.getElementsByClassName('single-page-desc')[0]
  const singlePageFabricTechnologies = singlePageWrapper.getElementsByClassName('single-page-tech')[0]

  const singlePageSectionLink = singlePageWrapper.getElementsByClassName('single-page-section-link')[0]
  
  singlePageIntroImageStyler.set({ backgroundImage: `url(${projectsData[0].previewSrc})` })
  
  tween({
    from: 0,
    to: 1,
  }).start(v => {
    singlePageIntroImageStyler.set({ opacity: v })
  })
  tween({
    from: 100,
    to: 0,
  }).start(v => {
    singlePageStyler.set({ y: `${v}%` })
  })
  tween({
    from: 0,
    to: 1,
  }).start(v => singlePageIntroTitleStyler.set({ opacity: v }))

  chain(
    delay(1000),
    tween({
      from: 0,
      to: 1,
    })
  ).start(v => singlePageScrollIndicatorStyler.set({ opacity: v }))
  

  singlePageIntroTitle.textContent = projectsData[0].modelName
  
  singlePageBigHeadlineWrapper.setAttribute('viewBox', projectsData[0].bigHeadingViewBox)
  singlePageBigHeadline.setAttribute('y', projectsData[0].bigHeadingTextY)
  singlePageBigHeadline.textContent = projectsData[0].modelName
  singlePageBigHeadline.style.fontSize = projectsData[0].bigHeadingFontSize

  singlePageIntroSubheading.textContent = projectsData[2].subheading
  singlePageDescription.innerHTML = projectsData[0].description

  projectsData[0].fabricTechnologies.forEach(tech => {
    const li = document.createElement('li')
    li.innerText = tech
    singlePageFabricTechnologies.appendChild(li)
  })

  singlePageSectionLink.setAttribute('href', projectsData[0].websiteURL)

}, false)

webglContainer.addEventListener('mousemove', e => {
  raycastMouse.x = (e.clientX / window.innerWidth) * 2 - 1
  raycastMouse.y = -(e.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(raycastMouse, photoCamera)
  const intersectsTests = photoPreviews.map(({ photoMesh }) => photoMesh)
  const intersects = raycaster.intersectObjects(photoScene.children)

  console.log(intersects.length)

  cursorTargetPos.x = e.pageX * 2
  cursorTargetPos.y = window.innerHeight * 2 - e.pageY * 2

  if (isDragging) {
    const diffx = e.pageX - mousePos.x
    const diffy = e.pageY - mousePos.y

    photoPreviews.forEach(photoPreview =>
      photoPreview.onSceneDrag(diffx, diffy)
    )
    // TODO: Why????
    cameraTargetPos.x += diffx * 0.5 * -1
    cameraTargetPos.y += diffy * 0.5 * -1
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
  mousePos.x = e.pageX
  mousePos.y = e.pageY
}, false)

webglContainer.addEventListener('mouseup', () => {
  isDragging = false
  cursorSizeScaleFactorTarget = 0.1
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

let scrollIndicatorFadedScroll = false
let scrollIndicatorFadedScrollTransition = false

singlePage.addEventListener('scroll', () => {
  if (singlePage.scrollTop > 20) {
    if (scrollIndicatorFadedScroll || scrollIndicatorFadedScrollTransition) {
      return
    }
    scrollIndicatorFadedScrollTransition = true
    tween({ from: 1, to: 0, duration: 250 })
      .start({
        update: v => singlePageScrollIndicatorStyler.set({ opacity: v }),
        complete: () => {
          scrollIndicatorFadedScroll = true
          scrollIndicatorFadedScrollTransition = false
        },
      })
  } else {
    if (!scrollIndicatorFadedScroll || scrollIndicatorFadedScrollTransition) {
      return
    }
    scrollIndicatorFadedScrollTransition = true
    tween({ from: 0, to: 1, duration: 250 })
      .start({
        update: v => singlePageScrollIndicatorStyler.set({ opacity: v }),
        complete: () => {
          scrollIndicatorFadedScroll = false
          scrollIndicatorFadedScrollTransition = false
        },
      })
  }
})

const postFXGeometry = new THREE.PlaneGeometry(appWidth, appHeight)
const postFXMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 0.0 },
    u_tDiffuseClip: { texture: clipRenderTarget.texture },
    u_tDiffusePhoto: { texture: photoRenderTarget.texture },
    u_tDiffuseCursor: { texture: cursorRenderTarget.texture }
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

    varying vec2 v_uv;

    float random (vec2 p) {
      vec2 K1 = vec2(
        23.14069263277926, // e^pi (Gelfond's constant)
        2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
      );
      return fract( cos( dot(p,K1) ) * 12345.6789 );
    }

    float circle (in vec2 _st, in float _radius) {
      vec2 dist = _st;
      return 1.0 - smoothstep(_radius - (_radius * 0.01), _radius + (_radius * 0.01), dot(dist, dist) * 4.0);
    }

    void main () {
      vec2 uv = vec2(v_uv.x, 1.0 - v_uv.y);
      vec4 baseColor = vec4(vec3(0.89), 1.0);
      vec4 clipColor = texture2D(u_tDiffuseClip, uv);
      vec4 photoColor = texture2D(u_tDiffusePhoto, uv);
      vec4 cursorColor = texture2D(u_tDiffuseCursor, vec2(1.0 - uv.x, uv.y));

      vec4 color = mix(clipColor, photoColor, clipColor.r);

      // vec4 vizorFillColor = vec4(color.rgb, cursorColor.r);
      vec4 vizorFillColor = cursorColor;
      // vizorFillColor = mix(baseColor, vizorFillColor, color.a);
      // vec2 uvRandom = uv;
      // uvRandom.y *= random(vec2(uvRandom.y, u_time));
      // vizorFillColor.rgb += random(uvRandom) * 0.25;

      // vec4 vizorStrokeColor = vec4(color.rgb, cursorColor.b);
      // vizorStrokeColor.rgb += random(uvRandom) * 2.0;
      
      color = mix(baseColor, color, color.a);
      color = mix(color, vizorFillColor, cursorColor.a);
      // color = mix(color, vizorStrokeColor, cursorColor.b);
      // vec4 color = vizorFillColor;
      gl_FragColor = color;
    }
  `
})
const postFXMesh = new THREE.Mesh(postFXGeometry, postFXMaterial)
postFXScene.add(postFXMesh)

const cursorArrowLeft = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
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

const cursorVizor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshBasicMaterial({
    map: makeVizorTexture(),
    transparent: true,
    opacity: cursorVizorOpacityTarget,
  })
)
cursorScene.add(cursorVizor)

new THREE.TextureLoader().load(arrowLeft, texture => {
  cursorArrowLeft.material.map = texture
  cursorArrowLeft.material.needsUpdate = true
})

clipScene.add(
  new THREE.Mesh(
    new THREE.PlaneGeometry(WOLRD_WIDTH * 2, WORLD_HEIGHT * 2),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 })
  )
)

updateFrame()

function updateFrame(ts) {
  if (!ts) {
    ts = 0
  }
  ts /= 1000
  ts = Math.max(ts, 1)
  const dt = ts - oldTime
  oldTime = ts

  clipCamera.position.x +=
    (cameraTargetPos.x - clipCamera.position.x) * (dt * 0.92)
  clipCamera.position.y +=
    (cameraTargetPos.y - clipCamera.position.y) * (dt * 0.92)
  photoCamera.position.x += (cameraTargetPos.x - photoCamera.position.x) * dt
  photoCamera.position.y += (cameraTargetPos.y - photoCamera.position.y) * dt

  photoPreviews.forEach(photoPreview => photoPreview.onSceneUpdate(ts, dt))

  // photoCamera.lookAt(cameraLookAt)
  // photoCamera.updateMatrixWorld()

  

  // intersects.forEach(intersect => {
  //   // debugger
  // })

  renderer.autoClear = true

  renderer.setRenderTarget(cursorRenderTarget)
  renderer.render(cursorScene, cursorCamera)

  renderer.setRenderTarget(clipRenderTarget)
  renderer.render(clipScene, clipCamera)

  renderer.setRenderTarget(photoRenderTarget)
  renderer.render(photoScene, photoCamera)

  postFXMaterial.uniforms.u_time.value = ts
  postFXMaterial.uniforms.u_tDiffuseClip.value = clipRenderTarget.texture
  postFXMaterial.uniforms.u_tDiffusePhoto.value = photoRenderTarget.texture
  postFXMaterial.uniforms.u_tDiffuseCursor.value = cursorRenderTarget.texture
  // // postFXMaterial.uniforms.u_mousePos.value.x += (cursorTargetPos.x - postFXMaterial.uniforms.u_mousePos.value.x) * (dt * 20)
  // // postFXMaterial.uniforms.u_mousePos.value.y += (cursorTargetPos.y - postFXMaterial.uniforms.u_mousePos.value.y) * (dt * 20)
  // // postFXMaterial.uniforms.u_cursorSizeScaleFactor.value += (cursorSizeScaleFactorTarget - postFXMaterial.uniforms.u_cursorSizeScaleFactor.value) * (dt * 10)

  const cursorBasePosX = (raycastMouse.x * -appWidth) / 2
  const cursorBasePosY = (raycastMouse.y * -appHeight) / 2

  cursorArrowOffset +=
    (cursorArrowOffsetTarget * 5 - cursorArrowOffset) * (dt * 5)
  cursorArrowLeft.material.opacity +=
    (cursorArrowOffsetTarget * 0.5 - cursorArrowLeft.material.opacity) *
    (dt * 10)

  cursorArrowLeft.position.x = cursorBasePosX + 30 + cursorArrowOffset
  cursorArrowLeft.position.y = cursorBasePosY

  cursorArrowRight.position.x = cursorBasePosX - 30 - cursorArrowOffset
  cursorArrowRight.position.y = cursorBasePosY

  cursorArrowTop.position.x = cursorBasePosX
  cursorArrowTop.position.y = cursorBasePosY - 30 - cursorArrowOffset

  cursorArrowBottom.position.x = cursorBasePosX
  cursorArrowBottom.position.y = cursorBasePosY + 30 + cursorArrowOffset

  cursorVizor.position.x = cursorBasePosX
  cursorVizor.position.y = cursorBasePosY

  cursorVizor.material.opacity += (cursorVizorOpacityTarget - cursorVizor.material.opacity) * (dt * 15)

  // // console.log(cursorArrowLeft.position.x, cursorArrowLeft.position.y)

  renderer.autoClear = false
  renderer.setRenderTarget(null)
  renderer.render(postFXScene, postFXCamera)

  window.requestAnimationFrame(updateFrame)
}

function makeVizorTexture () {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = canvas.height = 128
  ctx.fillStyle = 'red'
  ctx.strokeStyle = 'blue'
  ctx.lineWidth = 2
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.beginPath()
  ctx.arc(0, 0, canvas.width / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(0, 0, canvas.width / 2 - ctx.lineWidth / 2, 0, Math.PI * 2)
  ctx.stroke()
  // document.body.appendChild(canvas)
  // canvas.style.position = 'fixed'
  // canvas.style.zIndex = '999'
  // canvas.style.top = '0px'
  // canvas.style.left = '0px'
  const texture = new THREE.CanvasTexture(canvas)
  texture.flipY = true
  return texture
}
