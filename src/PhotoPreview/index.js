import * as THREE from 'three'
import {
  tween,
  calc,
  easing,
  delay,
  chain,
} from 'popmotion'

import eventEmitter from '../event-emitter'
import LoadManager from '../LoadManager'
import store from '../store'
import {
  setOverviewLayoutWidth,
  setOverviewLayoutHeight,
} from '../store/actions'

import {
  clampNumber,
  mapNumber,
  getSiglePagePhotoScale,
  getItemsCountPerGridRow,
  isMobileBrowser,
} from '../helpers'

import {
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_REQUEST_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
  EVT_SLIDER_DRAG,
  EVT_SLIDER_DRAG_CANCEL,
  EVT_SLIDER_REPLACE_TEXTURES,
  EVT_ON_SCENE_DRAG_START,
  EVT_ON_SCENE_DRAG,
  EVT_ON_SCENE_DRAG_END,
  EVT_RAF_UPDATE_APP,
  EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO,
  EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO,
  EVT_NEXT_PROJECT_TRANSITIONED_IN,
  EVT_APP_RESIZE,
  EVT_LAYOUT_MODE_TRANSITION_REQUEST,
  EVT_LAYOUT_MODE_TRANSITION,
  LAYOUT_MODE_GRID,
  LAYOUT_MODE_OVERVIEW,
  EVT_LAYOUT_MODE_TRANSITION_COMPLETE,
  EVT_PHOTO_PREVIEW_RELAYOUTED,
  EVT_CAMERA_FORCE_REPOSITION,
  EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT,
  EVT_HOVER_SINGLE_PROJECT_ENTER,
  EVT_HOVER_SINGLE_PROJECT_LEAVE,
  EVT_FADE_IN_SCENE,
} from '../constants'

import photoVertexShader from './vertexShader.glsl'
import photoFragmentShader from './fragmentShader.glsl'

let overviewCurrOffsetX = 0
let overviewCurrOffsetY = 0

export default class PhotoPreview extends THREE.Mesh {

  static SCALE_FACTOR_MAX = 1
  static SCALE_FACTOR_MIN = 0.95
  static ARROW_RIGHT_KEY_CODE = 39
  static ARROW_LEFT_KEY_CODE = 37
  static SLIDER_DIRECTION_LEFT = -1
  static SLIDER_DIRECTION_RIGHT = 1
  static OVERVIEW_LAYOUT_COLUMN_GUTTER = 60
  static HOVER_IMAGES_FLIP_COUNT = 2
  static HOVER_FLIP_TIMER = 750

  constructor ({
    idx,
    fadeInIdx,
    isLast = false,
    modelName,
    width,
    height,
    photos,
    gridPosition,
    initialOpacity,
  }) {
    const textureCount = Math.min(store.getState().webglMaxTexturesSupported - 1, photos.length - 1)
    const diffVector = new THREE.Vector2(0, 0)
    const photoGeometry = new THREE.PlaneBufferGeometry(width, height, 30, 30)
    const photoMaterial = new THREE.ShaderMaterial({
      defines: {
        INPUT_TEXTURES_COUNT: textureCount,
      },
      uniforms: {
        u_dragOffsetVec: { value: diffVector },
        u_planeSize: { value: new THREE.Vector2(width, height) },
        u_imageSize: { value: new THREE.Vector2(0, 0) },
        u_textures: { value: [ new THREE.Texture(), ...new Array(textureCount).fill(null) ] },
        u_opacity: { value: initialOpacity, },
        u_photoMixFactor: { value: 0.0 },
        u_texIdx0: { value: 0 },
        u_texIdx1: { value: 1 },
        u_horizontalDirection: { value: 0 },
      },
      transparent: true,
      vertexShader: photoVertexShader,
      fragmentShader: photoFragmentShader,
    })

    // setTimeout(() => eventEmitter.emit(EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT), 0)

    super(photoGeometry, photoMaterial)

    this._idx = idx
    this._fadeInIdx = fadeInIdx
    this._isLast = isLast
    this.position.copy(gridPosition)
    this._textureCount = textureCount

    this._modelName = modelName
    this._width = width
    this._height = height
    this._photos = photos
    this._originalGridPosition = gridPosition.clone()
    this._originalOverviewPosition = this._calcOverviewPosition()
    this._targetPosition = new THREE.Vector3()
    this._allTexturesLoaded = false
    this._isInteractable = true
    this._targetScale = 1
    this._sliderIdx = 0
    this._isSliderCurrentlyTransitioning = false
    this._isSingleViewCurrentlyTransitioning = false
    this._isOpenInSingleView = false
    this._openedPageTargetScale = getSiglePagePhotoScale()
    this._loadedPhotosCounter = 0

    this._diffVector = diffVector
    this._diffVectorTarget = new THREE.Vector2(0, 0)
    this._openPositionDiff = new THREE.Vector2(0, 0)

    store.dispatch(setOverviewLayoutWidth(getItemsCountPerGridRow() * (this._width + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER)))

    this._loadPreview()

    eventEmitter.on(EVT_OPEN_REQUEST_SINGLE_PROJECT, this._onOpenRequest)
    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, this._onOpen)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpenComplete)
    eventEmitter.on(EVT_CLOSE_REQUEST_SINGLE_PROJECT, this._onCloseRequest)
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, this._onClose)
    eventEmitter.on(EVT_CLOSE_SINGLE_PROJECT, this._onCloseComplete)
    eventEmitter.on(EVT_ON_SCENE_DRAG_START, this._onSceneDragStart)
    eventEmitter.on(EVT_ON_SCENE_DRAG, this._onSceneDrag)
    eventEmitter.on(EVT_ON_SCENE_DRAG_END, this._onSceneDragEnd)
    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, this._onNavChangeTransitionOut)
    eventEmitter.on(EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO, this._onNavChangeTransitionIn)
    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
    eventEmitter.on(EVT_LAYOUT_MODE_TRANSITION_REQUEST, this._onLayoutModeTransitionRequest)
    eventEmitter.on(EVT_LAYOUT_MODE_TRANSITION, this._onLayoutModeTransition)
    eventEmitter.on(EVT_LAYOUT_MODE_TRANSITION_COMPLETE, this._onLayoutModeTransitionComplete)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_ENTER, this._onHover)
    eventEmitter.on(EVT_HOVER_SINGLE_PROJECT_LEAVE, this._onUnhover)
    eventEmitter.on(EVT_SLIDER_BUTTON_LEFT_CLICK, ({ modelName }) => {
      if (modelName === this._modelName) {
        this._onSlideChange(PhotoPreview.SLIDER_DIRECTION_LEFT)
      }
    })
    eventEmitter.on(EVT_SLIDER_BUTTON_NEXT_CLICK, ({ modelName }) => {
      if (modelName === this._modelName) {
        this._onSlideChange(PhotoPreview.SLIDER_DIRECTION_RIGHT)
      }
    })
    eventEmitter.on(EVT_SLIDER_DRAG, ({ modelName, tweenFactor, direction }) => {
      if (modelName === this._modelName) {
        this.material.uniforms.u_photoMixFactor.value = tweenFactor
        this.material.uniforms.u_horizontalDirection.value = direction
      }
    })
    eventEmitter.on(EVT_SLIDER_REPLACE_TEXTURES, ({ modelName, direction }) => {
      if (modelName === this._modelName) {
        this._replaceTextures(direction)
      }
    })
    eventEmitter.on(EVT_SLIDER_DRAG_CANCEL, ({ modelName }) => {
      if (modelName === this._modelName) {
        this.material.uniforms.u_photoMixFactor.value = Math.round(this.material.uniforms.u_photoMixFactor.value)
      }
    })
    eventEmitter.on(EVT_FADE_IN_SCENE, this._fadeIn)
  }
  get isPhoto () {
    return true
  }
  get x () {
    return this.position.x
  }
  get y () {
    return this.position.y
  }
  get width () {
    return this._width
  }
  get height () {
    return this._height
  }
  get modelName () {
    return this._modelName
  }
  get isInteractable () {
    return this._isInteractable
  }
  set opacity (opacity) {
    this.material.uniforms.u_opacity.value = opacity
  }
  _fadeIn = () => {
    if (this.material.uniforms.u_opacity.value === 1) {
      return
    }
    const { isMobile } = store.getState()
    chain(
      delay(this._fadeInIdx * (isMobile ? 400 : 100)),
      tween({
        ease: easing.easeOut,
        duration: 1000,
      })
    ).start({
      update: tweenFactor => {
        this.material.uniforms.u_opacity.value = tweenFactor
      },
    })
  }
  _onHover = ({ modelName }) => {
    const mobileBrowser = isMobileBrowser()
    if (modelName === this._modelName && !mobileBrowser) {
      if (!this._flipInterval) {
        const previewImageCount = 1
        const flipPreviewMaxCount = previewImageCount + PhotoPreview.HOVER_IMAGES_FLIP_COUNT
        let currentFlipIdx = 0
        this._flipInterval = setInterval(() => {
          this.material.uniforms.u_texIdx0.value = currentFlipIdx
          currentFlipIdx++
          if (currentFlipIdx > flipPreviewMaxCount) {
            currentFlipIdx = 0
          }
        }, PhotoPreview.HOVER_FLIP_TIMER)
        this.material.uniforms.u_texIdx0.value = currentFlipIdx
        currentFlipIdx++
      }
    }
  }
  _onUnhover = ({ modelName }) => {
    const { mobileBrowser } = store.getState()
    if (modelName === this._modelName && !mobileBrowser) {
      if (this._flipInterval) {
        clearInterval(this._flipInterval)
        this._flipInterval = null
      }
      this.material.uniforms.u_texIdx0.value = 0
    }
  }
  _calcOverviewPosition () {
    const { overviewLayoutWidth } = store.getState()
    const itemsPerRowCount = getItemsCountPerGridRow()

    let x = overviewCurrOffsetX - overviewLayoutWidth / 2 + this._width / 2
    const y = overviewCurrOffsetY

    if (this._idx === 0) {
      overviewCurrOffsetX += this._width + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER

      let firstX = null
      if (itemsPerRowCount === 1) {
        firstX = -PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
        overviewCurrOffsetY -= this._height + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER
      } else if (itemsPerRowCount === 2) {
        firstX = -(this._width / 2 + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER)
      } else if (itemsPerRowCount === 3) {
        firstX = -(this._width + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER * 1.5)
      } else if (itemsPerRowCount === 4) {
        firstX = -(this._width * 1.5 + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER * 2)
      }

      return new THREE.Vector3(firstX, 0, 0)
    }

    if (this._idx === 1 && itemsPerRowCount === 1) {
      x = -PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
    }

    const idx = this._idx + 1

    overviewCurrOffsetX += this._width + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER

    if (idx % itemsPerRowCount === 0) {
      overviewCurrOffsetX = 0
      overviewCurrOffsetY -= this._height + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER
    }

    if (this._isLast) {
      console.log(overviewCurrOffsetY + this._height)
      store.dispatch(setOverviewLayoutHeight(overviewCurrOffsetY + this._height))
      overviewCurrOffsetX = 0
      overviewCurrOffsetY = 0
    }
    
    return new THREE.Vector3(x, y, 0)
  }
  _onLayoutModeTransitionRequest = () => {
    this._targetPosition.x = this.position.x
    this._targetPosition.y = this.position.y
  }
  _onLayoutModeTransition = ({ tweenFactor }) => {
    const {
      cameraPositionX,
      cameraPositionY,
      layoutMode,
    } = store.getState()
    const startX = this._targetPosition.x
    const startY = this._targetPosition.y
    let targetX
    let targetY
    if (layoutMode === LAYOUT_MODE_GRID) {
      targetX = this._originalGridPosition.x
      targetY = this._originalGridPosition.y
    } else if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      targetX = this._originalOverviewPosition.x + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
      targetY = this._originalOverviewPosition.y + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
    }
    const newX = calc.getValueFromProgress(startX, targetX, tweenFactor)
    const newY = calc.getValueFromProgress(startY, targetY, tweenFactor)
    
    const diffx = (newX - this.position.x) * -1
    const diffy = (newY - this.position.y) * -1
    this._onSceneDrag({ diffx, diffy })

    this.position.x = newX
    this.position.y = newY
  }
  _onLayoutModeTransitionComplete = () => {
    const {
      cameraPositionX,
      cameraPositionY,
      layoutMode,
    } = store.getState()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      this.position.x -= cameraPositionX
      this.position.y -= cameraPositionY
      this._calcOverviewPosition()
    }
    this._diffVectorTarget.set(0, 0)

    eventEmitter.emit(EVT_PHOTO_PREVIEW_RELAYOUTED, {
      modelName: this._modelName,
      x: this.position.x,
      y: this.position.y,
    })
  }
  _onNavChangeTransitionOut = ({ modelName, direction }) => {
    if (this._isSingleViewCurrentlyTransitioning) {
      return
    }
    const { layoutMode, cameraPositionX, cameraPositionY } = store.getState()
    const targetX = cameraPositionX - innerWidth * 0.25
    const targetY = cameraPositionY
    if (this._isOpenInSingleView) {
      const dpr = devicePixelRatio
      let offsetX
      if (direction === 1) {
        offsetX = -innerWidth * dpr * 0.5
      } else {
        offsetX = innerWidth * dpr * 0.5
      }
      this._transitionOnNavigationChange({
        startX: this.position.x,
        startY: this.position.y,
        targetX: targetX + offsetX,
        targetY,
        onUpdate: tweenFactor => {
          this.material.uniforms.u_opacity.value = 1 - tweenFactor
        }
      }).then(() => {
        if (layoutMode === LAYOUT_MODE_GRID) {
          this.position.x = this._originalGridPosition.x
          this.position.y = this._originalGridPosition.y
        } else if (layoutMode === LAYOUT_MODE_OVERVIEW) {
          this.position.x = this._originalOverviewPosition.x + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
          this.position.y = this._originalOverviewPosition.y + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
        }
        this._diffVectorTarget.set(0, 0)
        this.scale.set(1, 1, 1)
        this._onOpenComplete({ modelName })
        this._isOpenInSingleView = false
        eventEmitter.emit(EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO, { modelName, direction, targetX, targetY })
      })
    }
  }
  _onNavChangeTransitionIn = ({ modelName, direction, targetX, targetY }) => {
    if (this._modelName !== modelName) {
      return
    }
    if (this._isSingleViewCurrentlyTransitioning) {
      return
    }
    const scale = getSiglePagePhotoScale()
    this.scale.set(scale, scale, 1)
    let offsetX
    if (direction === 1) {
      offsetX = innerWidth
    } else {
      offsetX = -innerWidth
    }
    this._transitionOnNavigationChange({
      startX: targetX + offsetX,
      startY: targetY,
      targetX: targetX,
      targetY,
      onUpdate: () => {
        this.material.uniforms.u_opacity.value = 1
      },
    }).then(() => {
      this._isOpenInSingleView = true
      this._onOpenComplete({ modelName, diffDuration: 50 })
      eventEmitter.emit(EVT_NEXT_PROJECT_TRANSITIONED_IN)
    })
  }
  _transitionOnNavigationChange = ({
    startX,
    startY,
    targetX,
    targetY,
    onUpdate = () => {},
  }) => new Promise(resolve => {
    this._isSingleViewCurrentlyTransitioning = true
    this._targetPosition.x = startX
    this._targetPosition.y = startY
    tween().start({
      update: tweenFactor => {
        const { layoutMode } = store.getState()
        const newX = calc.getValueFromProgress(startX, targetX, tweenFactor)
        const newY = calc.getValueFromProgress(startY, targetY, tweenFactor)
        const diffx = (newX - this.position.x) * -1 * 5
        const diffy = (newY - this.position.y) * -1
        this._onSceneDrag({ diffx, diffy })

        this.position.x = newX
        this.position.y = newY
        
        let originalPositionX
        let originalPositionY
        if (layoutMode === LAYOUT_MODE_GRID) {
          originalPositionX = this._originalGridPosition.x
          originalPositionY = this._originalGridPosition.y
        } else if (layoutMode === LAYOUT_MODE_OVERVIEW) {
          originalPositionX = this._originalOverviewPosition.x
          originalPositionY = this._originalOverviewPosition.y
        }
        this._openPositionDiff.x = newX - originalPositionX
        this._openPositionDiff.y = newY - originalPositionY
        1
        onUpdate(tweenFactor)
      },
      complete: () => {
        this._isSingleViewCurrentlyTransitioning = false
        resolve()
      },
    })
  })
  _onKeyDown = e => {
    if (e.keyCode === PhotoPreview.ARROW_RIGHT_KEY_CODE) {
      this._onSlideChange(1)
    } else if (e.keyCode === PhotoPreview.ARROW_LEFT_KEY_CODE) {
      this._onSlideChange(-1)
    }
  }
  _loadPreview () {
    const onTextureLoaded = (texture, setImageSize = false) => {
      if (setImageSize) {
        const {
          image: {
            naturalWidth: imgWidth,
            naturalHeight: imgHeight,
          }
        } = texture
        this.material.uniforms.u_imageSize.value.set(imgWidth, imgHeight)
      }
      texture.flipY = true
      this.material.uniforms.u_textures.value[this._loadedPhotosCounter] = texture
      this.material.needsUpdate = true
      this._loadedPhotosCounter++
    }
    LoadManager.loadTexture(this._photos[this._loadedPhotosCounter]).then(texture => {
      onTextureLoaded(texture, true)
      eventEmitter.emit(EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT)
      if (!isMobileBrowser()) {
        const hoverFlipPhotosToLoad = this._photos.filter((a, i) => i >= this._loadedPhotosCounter && i <= this._loadedPhotosCounter + PhotoPreview.HOVER_IMAGES_FLIP_COUNT)
        Promise.all(hoverFlipPhotosToLoad.map(LoadManager.loadTexture)).then(textures => {
          textures.forEach(texture => onTextureLoaded(texture))
        })
      }
    })
  }
  _onOpenRequest = ({ modelName }) => {
    const {
      cameraPositionX,
      cameraPositionY,
      isMobile,
    } = store.getState()
    this._isInteractable = false
    if (modelName === this._modelName) {
      if (isMobile) {
        const targetX = cameraPositionX
        const targetY = cameraPositionY
        this._targetPosition.set(targetX, targetY, 0)
        this._onUnhover({ modelName })
      } else {
        const targetX = cameraPositionX - innerWidth * 0.25
        const targetY = cameraPositionY
        this._targetPosition.set(targetX, targetY, 0)
        this._targetScale = this.scale.x
        this._onUnhover({ modelName })
      }
    }
  }
  _onOpen = ({ modelName, tweenFactor }) => {
    if (modelName === this._modelName) {
      const {
        isMobile,
        layoutMode,
      } = store.getState()
      const targetPosX = this._targetPosition.x
      const targetPosY = this._targetPosition.y
      const newX = calc.getValueFromProgress(this.position.x, targetPosX, tweenFactor)
      const newY = calc.getValueFromProgress(this.position.y, targetPosY, tweenFactor)
      
      this.position.x = newX
      this.position.y = newY
      
      if (!isMobile) {
        const newScale = calc.getValueFromProgress(this._targetScale, this._openedPageTargetScale, clampNumber(mapNumber(tweenFactor, 0, 0.5, 0, 1), 0, 1))
        this.scale.set(newScale, newScale, 1)
      }

      let originalPositionX
      let originalPositionY

      if (layoutMode === LAYOUT_MODE_GRID) {
        originalPositionX = this._originalGridPosition.x
        originalPositionY = this._originalGridPosition.y
      } else if (layoutMode === LAYOUT_MODE_OVERVIEW) {
        originalPositionX = this._originalOverviewPosition.x
        originalPositionY = this._originalOverviewPosition.y
      }

      this._openPositionDiff.x = newX - originalPositionX
      this._openPositionDiff.y = newY - originalPositionY
      
      const diffx = (targetPosX - this.position.x) * -1
      const diffy = (targetPosY - this.position.y) * -1
      this._onSceneDrag({ diffx, diffy })

      this._isOpenInSingleView = true
    } else {
      this.material.uniforms.u_opacity.value = clampNumber(mapNumber(tweenFactor, 0, 0.4, 1, 0), 0, 1)
    }
  }
  _onOpenComplete = ({ modelName, diffDuration = 300, repositionBack }) => {
    if (modelName !== this._modelName) {
      return
    }

    const { isMobile, layoutMode } = store.getState()

    window.addEventListener('keydown', this._onKeyDown)

    if (!this._allTexturesLoaded) {
      const sliderExtraPhotos = this._photos.filter((a, i) => i >= this._loadedPhotosCounter && i <= this._textureCount)
      Promise
        .all(sliderExtraPhotos.map(LoadManager.loadTexture))
        .then(textures => {
          for (let i = 0; i < textures.length; i++) {
            const texture = textures[i]
            this.material.uniforms.u_textures.value[this._loadedPhotosCounter] = texture
            this._loadedPhotosCounter++
          }
          this.material.needsUpdate = true
          this._allTexturesLoaded = true
        })
    }

    if (repositionBack) {
      let x
      let y
      if (layoutMode === LAYOUT_MODE_GRID) {
        x = this._originalGridPosition.x
        y = this._originalGridPosition.y
      } else if (layoutMode === LAYOUT_MODE_OVERVIEW) {
        x = this._originalOverviewPosition.x + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
        y = this._originalOverviewPosition.y + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
      }
      this.position.x = x
      this.position.y = y
    }

    this._diffVectorTarget.x = 0
    this._diffVectorTarget.y = 0
  }
  _onCloseRequest = ({ modelName, reposition, repositionInOverviewMode }) => {
    this._isInteractable = true
    if (modelName === this._modelName) {
      const { layoutMode } = store.getState()

      if (reposition) {
        const cameraRepositionX = layoutMode === LAYOUT_MODE_GRID ? this._originalGridPosition.x : this._originalOverviewPosition.x
        const cameraRepositionY = layoutMode === LAYOUT_MODE_GRID ? this._originalGridPosition.y : this._originalOverviewPosition.y
        
        const tempx = this.position.x
        const tempy = this.position.y
        setTimeout(() => {
          const {
            worldBoundsRight,
          } = store.getState()
          let x = cameraRepositionX + innerWidth * 0.25
          let y = cameraRepositionY
          if (x > worldBoundsRight) {
            x += worldBoundsRight - x
          }
          eventEmitter.emit(EVT_CAMERA_FORCE_REPOSITION, {
            x: layoutMode === LAYOUT_MODE_GRID ? x : 0,
            y
          })
          if (repositionInOverviewMode) {
            if (layoutMode === LAYOUT_MODE_OVERVIEW) {
              this.position.set(cameraRepositionX + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2, y + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2, 0)
            }
          } else {
            this.position.set(cameraRepositionX, y, 0)
          }
        }, 0)
        this.position.set(tempx, tempy, 0)
        this._targetPosition.set(cameraRepositionX, cameraRepositionY)
      } else {
        this._targetPosition.set(this.position.x, this.position.y)
      }

      this._targetScale = this.scale.x
      window.removeEventListener('keydown', this._onKeyDown)
    }
  }
  _onClose = ({ modelName, tweenFactor }) => {
    if (modelName === this._modelName) {
      const {
        isMobile,
        layoutMode,
      } = store.getState()
      const startX = this._targetPosition.x
      const startY = this._targetPosition.y
      const endX = layoutMode === LAYOUT_MODE_GRID ? this._originalGridPosition.x : (this._originalOverviewPosition.x + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2)
      const endY = layoutMode === LAYOUT_MODE_GRID ? this._originalGridPosition.y : (this._originalOverviewPosition.y + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2)
      const newX = calc.getValueFromProgress(startX, endX, tweenFactor)
      const newY = calc.getValueFromProgress(startY, endY, tweenFactor)

      const diffx = (newX - this.position.x) * -1
      const diffy = (newY - this.position.y) * -1
      this._onSceneDrag({ diffx, diffy })

      this.position.x = newX
      this.position.y = newY

      if (!isMobile) {
        const newScale = calc.getValueFromProgress(this._targetScale, 1, tweenFactor)
        this.scale.set(newScale, newScale, 1)
      }

      this._isOpenInSingleView = false
    } else {
      this.material.uniforms.u_opacity.value = mapNumber(tweenFactor, 0.25, 1, 0, 1)
    }
  }
  _onCloseComplete () {
    this._isInteractable = true
  }
  _replaceTextures = (direction) => {
    const { webglMaxTexturesSupported } = store.getState()
    const oldSliderIdx = this._sliderIdx
    this._sliderIdx += direction
    if (direction === 1) {
      if (this._sliderIdx >= this._textureCount - 1) {
        this._sliderIdx = 0
      }
      this.material.uniforms.u_texIdx0.value = oldSliderIdx
      this.material.uniforms.u_texIdx1.value = this._sliderIdx
    } else if (direction === -1) {
      if (this._sliderIdx < 0) {
        this._sliderIdx = this._textureCount - 2
      }
      this.material.uniforms.u_texIdx0.value = this._sliderIdx
      this.material.uniforms.u_texIdx1.value = oldSliderIdx
    }
    this.material.uniforms.u_photoMixFactor.value = 0
  }
  _onSlideChange = direction => {
    if (this._isSliderCurrentlyTransitioning) {
      return
    }
    
    const tweenFrom = direction === 1 ? 0 : 1
    const tweenTo = direction === 1 ? 1 : 0
    
    this._replaceTextures(direction)
    this.material.uniforms.u_horizontalDirection.value = direction

    this._isSliderCurrentlyTransitioning = true

    tween({
      from: tweenFrom,
      to: tweenTo,
      duration: 800,
    }).start({
      update: v => {
        this.material.uniforms.u_photoMixFactor.value = v
      },
      complete: () => {
        this._isSliderCurrentlyTransitioning = false
      }
    })
  }
  _onSceneDragStart = () => {
    const { layoutMode } = store.getState()
    if (!this._isInteractable || layoutMode === LAYOUT_MODE_OVERVIEW) {
      return
    }
    // tween({
    //   from: PhotoPreview.SCALE_FACTOR_MAX,
    //   to: PhotoPreview.SCALE_FACTOR_MIN,
    //   duration: 250
    // })
    // .start(v => this.scale.set(v, v, 1))
  }
  _onSceneDrag = ({ diffx, diffy }) => {
    const { layoutMode } = store.getState()
    const clampY = layoutMode === LAYOUT_MODE_GRID ? 25 : 35
    this._diffVectorTarget.x = clampNumber(diffx * 5, -25, 25)
    this._diffVectorTarget.y = clampNumber(diffy * 5, -clampY, clampY)
  }
  _onSceneDragEnd = () => {
    // const { layoutMode } = store.getState()
    // if (!this._isInteractable || layoutMode === LAYOUT_MODE_OVERVIEW) {
    //   return
    // }
    // tween({
    //   from: PhotoPreview.SCALE_FACTOR_MIN,
    //   to: PhotoPreview.SCALE_FACTOR_MAX,
    //   duration: 250
    // })
    // .start(v => this.scale.set(v, v, 1))
    this._diffVectorTarget.x = 0
    this._diffVectorTarget.y = 0
  }
  _onUpdate = (ts, dt) => {
    this._diffVector.x += (this._diffVectorTarget.x - this._diffVector.x) * dt * 6
    this._diffVector.y += (this._diffVectorTarget.y - this._diffVector.y) * dt * 6
  }
  _onResize = () => {
    const { cameraPositionX, cameraPositionY, layoutMode } = store.getState()
    if (this._isOpenInSingleView) {
      this.position.x = cameraPositionX - innerWidth * 0.25
      this.position.y = cameraPositionY
      const scale = getSiglePagePhotoScale()
      this.scale.set(scale, scale, 1)
    }
    this._openedPageTargetScale = getSiglePagePhotoScale()
    const overviewLayoutWidth = getItemsCountPerGridRow() * (this._width + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER)
    this._originalOverviewPosition = this._calcOverviewPosition()
    if (layoutMode === LAYOUT_MODE_OVERVIEW) {
      this.position.copy(this._originalOverviewPosition)
      this.position.x += cameraPositionX + PhotoPreview.OVERVIEW_LAYOUT_COLUMN_GUTTER / 2
      eventEmitter.emit(EVT_PHOTO_PREVIEW_RELAYOUTED, {
        modelName: this._modelName,
        x: this.position.x,
        y: this.position.y,
      })
    }
    store.dispatch(setOverviewLayoutWidth(overviewLayoutWidth))
  }
}
