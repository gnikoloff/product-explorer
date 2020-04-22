import * as THREE from 'three'

import eventEmitter from '../event-emitter'

import {
  EVT_RAF_UPDATE_APP,
  EVT_LOAD_PROGRESS,
  EVT_LOAD_COMPLETE,
  EVT_FADE_IN_SCENE,
} from '../constants'

import {
  isMobileBrowser,
  isInstagram,
} from '../helpers'

import vertexShader from './vertex-shader.glsl'
import fragmentShaderBackground from './fragment-shader-background.glsl'
import fragmentShaderLabel from './fragment-shader-label.glsl'

const dpr = devicePixelRatio

const mobileBrowser = isMobileBrowser(false) && innerWidth < 800

let appWidth = innerWidth
let appHeight = innerHeight

export default class Loader {
  static PROGRESS_TIMER_VALUE = 2000

  constructor ({
    parentEl,
  }) {
    this._parentEl = parentEl

    const wrapper = document.getElementById('intro-modal')
    this.$els = {
      wrapper,
      appHeader: document.getElementsByClassName('app-header')[0],
      cursor: wrapper.getElementsByClassName('cursor-example')[0],
      cursorIconDefault: wrapper.getElementsByClassName('cursor-icon-default')[0],
      cursorIconGrab: wrapper.getElementsByClassName('cursor-icon-grab')[0],
      closeBtn: wrapper.getElementsByClassName('modal-btn-close')[0],
      splashScreen: document.getElementById('app-splash-screen'),
    }

    this._scene = new THREE.Scene()
    this._renderer = new THREE.WebGLRenderer()
    this._camera = new THREE.OrthographicCamera(appWidth / - 2, appWidth / 2, appHeight / 2, appHeight / - 2, 1, 1000)
    this._textureCanvas = document.createElement('canvas')
    this._progressTexture = new THREE.CanvasTexture(this._textureCanvas)
    this._dtScale = 1
    this._hasBeenDestroyed = false
    this._sceneFaded = false

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

    const planeSize = mobileBrowser ? 125 : 250

    this._labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(planeSize, planeSize),
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
    this._labelMesh.position.set(mobileBrowser ? -innerWidth / 2 + 80 : -innerWidth / 2 + 150, 0, 0)
    this._scene.add(this._labelMesh)
    
    parentEl.appendChild(this._renderer.domElement)

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_LOAD_PROGRESS, this._onLoadProgress)
    eventEmitter.on(EVT_LOAD_COMPLETE, this._onLoadProgressComplete)
    eventEmitter.on(EVT_FADE_IN_SCENE, this._showDialog)

    this.$els.closeBtn.addEventListener('click', this._onDialogClose)

    this._noiseInterval = setInterval(() => {
      this._backgroundMesh.material.uniforms.u_time.value++
    }, 1000 / 12)

    this._renderProgressTexture()
  }
  _onDialogClose = () => {
    const onDialogFadeOut = e => {
      e.stopPropagation()
      e.preventDefault()
      this.$els.wrapper.parentNode.removeChild(this.$els.wrapper)
      this.$els.wrapper.removeEventListener('transitionend', onDialogFadeOut)

      if (isInstagram()) {
        setTimeout(() => {
          const instaMSG = document.getElementById('instagram-browser')
          instaMSG.classList.add('show')
          const closeInstaBtn = instaMSG.getElementsByClassName('instagram-browser-close')[0]
          const onClick = () => {
            instaMSG.parentNode.removeChild(instaMSG)
            closeInstaBtn.removeEventListener('click', onClick)
          }
          closeInstaBtn.addEventListener('click', onClick, false)
          docu
        }, 1000)
      }

    }
    this.$els.wrapper.style.setProperty('opacity', '0')
    this.$els.wrapper.style.setProperty('transition', 'opacity 0.5s cubic-bezier(0.65, 0, 0.35, 1)')
    this.$els.wrapper.addEventListener('transitionend', onDialogFadeOut)
    this.$els.closeBtn.removeEventListener('click', this._onDialogClose)
  }
  _showDialog = () => {
    const onGrabIconFadeIn = e => {
      e.stopPropagation()
      e.preventDefault()
      this.$els.cursor.classList.add('animated')
      this.$els.cursorIconGrab.removeEventListener('transitionend', onGrabIconFadeIn)
    }
    const onWrapperFaded = e => {
      e.stopPropagation()
      e.preventDefault()
      this.$els.cursorIconDefault.style.setProperty('opacity', '0')
      this.$els.cursorIconDefault.style.setProperty('transition', 'opacity 0.125s ease')
      this.$els.cursorIconGrab.style.setProperty('opacity', '1')
      this.$els.cursorIconGrab.style.setProperty('transition', 'opacity 0.125s ease')
      this.$els.cursorIconGrab.addEventListener('transitionend', onGrabIconFadeIn)
      this.$els.wrapper.removeEventListener('transitionend', onWrapperFaded)
    }
    this.$els.wrapper.style.setProperty('opacity', '1')
    this.$els.wrapper.style.setProperty('transition', 'opacity 0.5s cubic-bezier(0.65, 0, 0.35, 1) 1.25s')
    this.$els.wrapper.addEventListener('transitionend', onWrapperFaded)
  }
  _renderProgressTexture = () => {
    this._textureCanvas.width = 512
    this._textureCanvas.height = 512
    const ctx = this._textureCanvas.getContext('2d')
    ctx.fillStyle = '#eee'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = `bold ${mobileBrowser ? 190 : 250}px Helvetica`
    const label = Math.round(this._loadProgress)
    ctx.fillText(`${label}`, this._textureCanvas.width / 2, this._textureCanvas.height / 2)
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
    // if (mobileBrowser) {
      
    // } else {
      this._parentEl.style.transform = `translateX(${this._loadProgress}%)`
    // }
    this._labelMesh.material.uniforms.u_time.value = ts
    this._renderProgressTexture()
    this._renderer.render(this._scene, this._camera)

    const sceneFadeTheshold = mobileBrowser ? 98 : 85

    if (this._loadProgress > sceneFadeTheshold  && !this._sceneFaded) {
      const timeout = setTimeout(() => {
        eventEmitter.emit(EVT_FADE_IN_SCENE)
        this.$els.splashScreen.classList.add('faded')
        this.$els.appHeader.classList.add('faded-in')
        clearTimeout(timeout)
      }, mobileBrowser ? 1000 : 500)
      this._sceneFaded = true
    }

    if (this._loadProgress > 99.5 && !this._hasBeenDestroyed) {
      
      
      // if (!mobileBrowser) {
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
      // } else {
      //   const onTransitionEnd = () => {
      //     this._scene.dispose()
      //     this._renderer.dispose()
      //     this._progressTexture.dispose()
      //     this._backgroundMesh.geometry.dispose()
      //     this._backgroundMesh.material.dispose()
      //     this._labelMesh.geometry.dispose()
      //     this._labelMesh.material.dispose()

      //     eventEmitter.off(EVT_RAF_UPDATE_APP, this._onUpdate)
      //     eventEmitter.off(EVT_LOAD_PROGRESS, this._onLoadProgress)
      //     eventEmitter.off(EVT_LOAD_COMPLETE, this._onLoadProgressComplete)
      //     this._parentEl.removeEventListener('transitionend', onTransitionEnd)
      //   }
      //   this._parentEl.style.setProperty('transition', 'opacity 0.15s ease-out')
      //   this._parentEl.style.setProperty('opacity', '0')
      //   this._parentEl.addEventListener('transitionend', onTransitionEnd)
      // }

      this._hasBeenDestroyed = true
    }
  }
}
