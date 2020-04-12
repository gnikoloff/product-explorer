import * as THREE from 'three'

import eventEmitter from '../event-emitter'

import {
  EVT_RAF_UPDATE_APP,
  EVT_LOAD_PROGRESS,
  EVT_LOAD_COMPLETE,
} from '../constants'

import vertexShader from './vertex-shader.glsl'
import fragmentShaderBackground from './fragment-shader-background.glsl'
import fragmentShaderLabel from './fragment-shader-label.glsl'

const dpr = devicePixelRatio || 1

let appWidth = innerWidth
let appHeight = innerHeight

export default class Loader {
  static PROGRESS_TIMER_VALUE = 2000

  constructor ({
    parentEl,
  }) {
    this._parentEl = parentEl
    this._scene = new THREE.Scene()
    this._renderer = new THREE.WebGLRenderer()
    this._camera = new THREE.OrthographicCamera(appWidth / - 2, appWidth / 2, appHeight / 2, appHeight / - 2, 1, 1000)
    this._textureCanvas = document.createElement('canvas')
    this._progressTexture = new THREE.CanvasTexture(this._textureCanvas)
    this._dtScale = 1
    this._hasBeenDestroyed = false

    this._loadProgress = 0
    this._loadProgressTarget = this._loadProgress

    this._scene.add(this._camera)
    this._camera.position.set(0, 0, 50)
    this._camera.lookAt(new THREE.Vector3(0, 0, 0))

    this._renderer.setSize(appWidth, appHeight)
    this._renderer.setPixelRatio(dpr)

    this._backgroundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(appWidth, appHeight),
      new THREE.ShaderMaterial({
        uniforms: {
          u_time: { value: 0 },
        },
        vertexShader,
        fragmentShader: fragmentShaderBackground,
      })
    )
    this._scene.add(this._backgroundMesh)

    this._labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(250, 250),
      new THREE.ShaderMaterial({
        uniforms: {
          u_tDiffuse: { value: this._progressTexture },
          u_time: { value: 0 },
        },
        vertexShader,
        fragmentShader: fragmentShaderLabel,
        transparent: true,
      })
    )
    this._labelMesh.position.set(-innerWidth / 2 + 150, 0, 0)
    this._scene.add(this._labelMesh)
    
    parentEl.appendChild(this._renderer.domElement)

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_LOAD_PROGRESS, this._onLoadProgress)
    eventEmitter.on(EVT_LOAD_COMPLETE, this._onLoadProgressComplete)

    this._noiseInterval = setInterval(() => {
      this._backgroundMesh.material.uniforms.u_time.value++
    }, 1000 / 12)

    this._renderProgressTexture()
  }
  _renderProgressTexture = () => {
    this._textureCanvas.width = 512
    this._textureCanvas.height = 512
    const ctx = this._textureCanvas.getContext('2d')
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'bold 200px sans-serif'
    const label = Math.round(this._loadProgress)
    ctx.fillText(`${label}%`, this._textureCanvas.width / 2, this._textureCanvas.height / 2)
    this._progressTexture.needsUpdate = true
  }
  _onLoadProgress = ({ progress }) => {
    const timer = setTimeout(() => {
      this._loadProgressTarget = progress * 100
      clearTimeout(timer)
    }, Loader.PROGRESS_TIMER_VALUE)
  }
  _onLoadProgressComplete = () => {
    this._dtScale = 3
    const timer = setTimeout(() => {
      this._loadProgressTarget = 100
      clearTimeout(timer)
    }, Loader.PROGRESS_TIMER_VALUE)
  }
  _onUpdate = (ts, dt) => {
    this._loadProgress += (this._loadProgressTarget - this._loadProgress) * (dt * this._dtScale)
    this._parentEl.style.transform = `translateX(${this._loadProgress}%)`
    this._renderer.render(this._scene, this._camera)
    this._renderProgressTexture()
    this._labelMesh.material.uniforms.u_time.value = ts
    if (this._loadProgress > 99.5 && !this._hasBeenDestroyed) {
      this._scene.dispose()
      this._renderer.dispose()
      this._progressTexture.dispose()
      this._backgroundMesh.geometry.dispose()
      this._backgroundMesh.material.dispose()
      this._labelMesh.geometry.dispose()
      this._labelMesh.material.dispose()

      eventEmitter.off(EVT_RAF_UPDATE_APP, this._onUpdate)
      eventEmitter.off(EVT_LOAD_PROGRESS, this._onLoadProgress)
      eventEmitter.off(EVT_LOAD_COMPLETE, this._onLoadProgressComplete)
      clearInterval(this._noiseInterval)
      
      this._parentEl.parentNode.removeChild(this._parentEl)
      this._hasBeenDestroyed = true
    }
  }
}
