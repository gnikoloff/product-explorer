import * as THREE from "three";

import PhotoPreview from "./PhotoPreview";

import styles from "./style.css";

import ninja from "./assets/ninja.jpg";
import arrowLeft from "./assets/arrow.png";

import { WOLRD_WIDTH, WORLD_HEIGHT } from "./constants";

import photoInfo from "../data";

let appWidth = window.innerWidth;
let appHeight = window.innerHeight;
const dpr = window.devicePixelRatio || 1;

const mousePos = new THREE.Vector2(0, 0);
const raycastMouse = new THREE.Vector2(0, 0);
const cameraTargetPos = new THREE.Vector2(0, 0);
const cursorTargetPos = new THREE.Vector2(0, 0);

const renderer = new THREE.WebGLRenderer({ alpha: true });

const clipScene = new THREE.Scene();
const photoScene = new THREE.Scene();
const postFXScene = new THREE.Scene();
const cursorScene = new THREE.Scene();

const aspect = appWidth / appHeight
const clipCamera = new THREE.OrthographicCamera(
  -appWidth / 2,
  appWidth / 2,
  -appHeight / 2,
  appHeight / 2,
  1,
  1000
);
const photoCamera = clipCamera.clone();
const postFXCamera = clipCamera.clone();
const cursorCamera = clipCamera.clone();

const clipRenderTarget = new THREE.WebGLRenderTarget(
  appWidth * dpr,
  appHeight * dpr
);
const photoRenderTarget = new THREE.WebGLRenderTarget(
  appWidth * dpr,
  appHeight * dpr
);
const cursorRenderTarget = new THREE.WebGLRenderTarget(
  appWidth * dpr,
  appHeight * dpr
);

const raycaster = new THREE.Raycaster();

const originalCameraPos = [0, 0, -50];
const cameraLookAt = new THREE.Vector3(0, 0, 0);

let oldTime = 0;
let isDragging = false;
let cursorSizeScaleFactorTarget = 0.1;
let cursorArrowOffset = 0;
let cursorArrowOffsetTarget = 0;

clipCamera.position.set(...originalCameraPos);
clipCamera.lookAt(cameraLookAt);
clipScene.add(clipCamera);

clipCamera.zoom = 0.2
clipCamera.updateProjectionMatrix()

photoCamera.position.set(...originalCameraPos);
photoCamera.lookAt(cameraLookAt);
photoScene.add(photoCamera);

photoCamera.zoom = 0.2
photoCamera.updateProjectionMatrix()

postFXCamera.position.set(...originalCameraPos);
postFXCamera.lookAt(cameraLookAt);
postFXScene.add(postFXCamera);

cursorCamera.position.set(...originalCameraPos);
cursorCamera.lookAt(cameraLookAt);
cursorScene.add(cursorCamera);

// cursorCamera.zoom = 0.2
// cursorCamera.updateProjectionMatrix()

renderer.setSize(appWidth, appHeight);
renderer.setPixelRatio(dpr);
// renderer.setClearColor(0xe5e5e5)
renderer.setClearAlpha(0);
document.body.appendChild(renderer.domElement);

let photoPreviews = []

fetch('/get_data').then(res => res.json()).then(res => {
  console.log(res)
  photoPreviews = res.projects.map(info => {
    const photoPreview = new PhotoPreview({
      width: 250,
      height: 400
    });
    photoPreview.position = new THREE.Vector3(info.posX, info.posY);
    clipScene.add(photoPreview.clipMesh);
    photoScene.add(photoPreview.photoMesh);
    new THREE.TextureLoader().load(info.previewSrc, texture => {
      texture.flipY = false
      photoPreview.addPhotoTexture(texture)
    })
    return photoPreview;
  });
})



document.body.addEventListener(
  "mousedown",
  e => {
    isDragging = true;
    cursorSizeScaleFactorTarget = 0.09;
    cursorArrowOffsetTarget = 1;
    document.body.classList.add("dragging");
    photoPreviews.forEach(photoPreview => photoPreview.onSceneDragStart());
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
  },
  false
);

document.body.addEventListener(
  "mousemove",
  e => {
    raycastMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    raycastMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(raycastMouse, photoCamera);
    const intersectsTests = photoPreviews.map(({ photoMesh }) => photoMesh);
    const intersects = raycaster.intersectObjects(photoScene.children);

    console.log(intersects.length)

    cursorTargetPos.x = e.pageX * 2;
    cursorTargetPos.y = window.innerHeight * 2 - e.pageY * 2;

    if (isDragging) {
      const diffx = e.pageX - mousePos.x;
      const diffy = e.pageY - mousePos.y;

      photoPreviews.forEach(photoPreview =>
        photoPreview.onSceneDrag(diffx, diffy)
      );
      // TODO: Why????
      cameraTargetPos.x += diffx * 0.5 * -1;
      cameraTargetPos.y += diffy * 0.5 * -1;
      if (clipCamera.position.x > WOLRD_WIDTH / 2) {
        clipCamera.position.x = WOLRD_WIDTH / 2;
      } else if (clipCamera.position.x < -WOLRD_WIDTH / 2) {
        clipCamera.position.x = -WOLRD_WIDTH / 2;
      } else if (clipCamera.position.y > WORLD_HEIGHT / 2) {
        clipCamera.position.y = WORLD_HEIGHT / 2;
      } else if (clipCamera.position.y < -WORLD_HEIGHT / 2) {
        clipCamera.position.y = -WORLD_HEIGHT / 2;
      }
    }
    mousePos.x = e.pageX;
    mousePos.y = e.pageY;
  },
  false
);

document.body.addEventListener(
  "mouseup",
  () => {
    isDragging = false;
    cursorSizeScaleFactorTarget = 0.1;
    cursorArrowOffsetTarget = 0;
    document.body.classList.remove("dragging");
    photoPreviews.forEach(photoPreview => photoPreview.onSceneDragEnd());
  },
  false
);

document.body.addEventListener("mouseleave", () => {
  photoPreviews.forEach(photoPreview => {
    photoPreview._diffVectorTarget.x = 0;
    photoPreview._diffVectorTarget.y = 0;
  });
});

const postFXGeometry = new THREE.PlaneGeometry(appWidth, appHeight);
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
});
const postFXMesh = new THREE.Mesh(postFXGeometry, postFXMaterial);
postFXScene.add(postFXMesh);

const cursorArrowLeft = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshBasicMaterial({ opacity: 1 })
);
cursorArrowLeft.rotation.z = Math.PI;
cursorScene.add(cursorArrowLeft);

const cursorArrowRight = cursorArrowLeft.clone();
cursorArrowRight.rotation.z = 0;
cursorScene.add(cursorArrowRight);

const cursorArrowTop = cursorArrowLeft.clone();
cursorArrowTop.rotation.z = Math.PI / 2;
cursorScene.add(cursorArrowTop);

const cursorArrowBottom = cursorArrowLeft.clone();
cursorArrowBottom.rotation.z = -Math.PI / 2;
cursorScene.add(cursorArrowBottom);

const cursorVizor = new THREE.Mesh(
  new THREE.PlaneGeometry(50, 50),
  new THREE.MeshBasicMaterial({ map: makeVizorTexture() })
)
cursorScene.add(cursorVizor)

new THREE.TextureLoader().load(arrowLeft, texture => {
  cursorArrowLeft.material.map = texture;
  cursorArrowLeft.material.needsUpdate = true;
});

clipScene.add(
  new THREE.Mesh(
    new THREE.PlaneGeometry(WOLRD_WIDTH * 2, WORLD_HEIGHT * 2),
    new THREE.MeshBasicMaterial({ wireframe: true, color: 0xff0000 })
  )
);

updateFrame();

function updateFrame(ts) {
  if (!ts) {
    ts = 0;
  }
  ts /= 1000;
  ts = Math.max(ts, 1);
  const dt = ts - oldTime;
  oldTime = ts;

  clipCamera.position.x +=
    (cameraTargetPos.x - clipCamera.position.x) * (dt * 0.92);
  clipCamera.position.y +=
    (cameraTargetPos.y - clipCamera.position.y) * (dt * 0.92);
  photoCamera.position.x += (cameraTargetPos.x - photoCamera.position.x) * dt;
  photoCamera.position.y += (cameraTargetPos.y - photoCamera.position.y) * dt;

  photoPreviews.forEach(photoPreview => photoPreview.onSceneUpdate(ts, dt));

  // photoCamera.lookAt(cameraLookAt)
  // photoCamera.updateMatrixWorld()

  

  // intersects.forEach(intersect => {
  //   // debugger
  // })

  renderer.autoClear = true;

  renderer.setRenderTarget(cursorRenderTarget)
  renderer.render(cursorScene, cursorCamera);

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

  // // console.log(cursorArrowLeft.position.x, cursorArrowLeft.position.y)

  renderer.autoClear = false
  renderer.setRenderTarget(null)
  renderer.render(postFXScene, postFXCamera)

  window.requestAnimationFrame(updateFrame);
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
