import * as THREE from 'three'
import {
  tween,
  calc,
} from 'popmotion'

import eventEmitter from '../event-emitter'
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

  static loadTexture = texName => new Promise(resolve =>
    new THREE.TextureLoader().load(texName, texture => resolve(texture)
  ))

  constructor ({
    idx,
    isLast = false,
    modelName,
    width,
    height,
    photos,
    gridPosition,
  }) {
    const textureCount = Math.min(store.getState().webglMaxTexturesSupported - 1, photos.length)
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
        u_opacity: { value: 1.0 },
        u_photoMixFactor: { value: 0.0 },
        u_texIdx0: { value: 0 },
        u_texIdx1: { value: 1 },
        u_horizontalDirection: { value: 0 },
      },
      transparent: true,
      vertexShader: photoVertexShader,
      fragmentShader: photoFragmentShader,
    })
    super(photoGeometry, photoMaterial)

    this._idx = idx
    this._isLast = isLast
    this.position.copy(gridPosition)

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
  }
  get modelName () {
    return this._modelName
  }
  get isInteractable () {
    return this._isInteractable
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
      targetX = this._originalOverviewPosition.x + cameraPositionX
      targetY = this._originalOverviewPosition.y + cameraPositionY
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
    this._diffVectorTarget.x = 0
    this._diffVectorTarget.y = 0

    eventEmitter.emit(EVT_PHOTO_PREVIEW_RELAYOUTED, {
      modelName: this._modelName,
      x: this.position.x,
      y: this.position.y,
    })
  }
  _onNavChangeTransitionOut = ({ modelName, direction, targetX, targetY }) => {
    if (this._isSingleViewCurrentlyTransitioning) {
      return
    }
    const { layoutMode } = store.getState()
    if (this._isOpenInSingleView) {
      const dpr = devicePixelRatio || 1
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
          this.position.x = this._originalOverviewPosition.x
          this.position.y = this._originalOverviewPosition.y
        }
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
    const dpr = devicePixelRatio || 1
    let offsetX
    if (direction === 1) {
      offsetX = innerWidth + dpr * 0.5
    } else {
      offsetX = -innerWidth + dpr * 0.5
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
    PhotoPreview.loadTexture(this._photos[0]).then(texture => {
      const {
        image: {
          naturalWidth: imgWidth,
          naturalHeight: imgHeight,
        }
      } = texture
      this.material.uniforms.u_imageSize.value.set(imgWidth, imgHeight)

      texture.flipY = true
      this.material.uniforms.u_textures.value[0] = texture
      this.material.needsUpdate = true
    })
  }
  _onOpenRequest = ({ modelName, targetX, targetY }) => {
    this._isInteractable = false
    if (modelName === this._modelName) {
      this._targetPosition.set(targetX, targetY, 1)
      this._targetScale = this.scale.x
    }
  }
  _onOpen = ({ modelName, tweenFactor }) => {
    if (modelName === this._modelName) {
      const { layoutMode } = store.getState()
      const targetPosX = this._targetPosition.x
      const targetPosY = this._targetPosition.y
      const newX = calc.getValueFromProgress(this.position.x, targetPosX, tweenFactor * 0.1)
      const newY = calc.getValueFromProgress(this.position.y, targetPosY, tweenFactor * 0.1)
      const newScale = calc.getValueFromProgress(this._targetScale, this._openedPageTargetScale, tweenFactor)
      
      this.position.x = newX
      this.position.y = newY
      this.scale.set(newScale, newScale, 1)

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
      this.material.uniforms.u_opacity.value = mapNumber(tweenFactor, 0, 0.75, 1, 0)
    }
  }
  _onOpenComplete = ({ modelName, diffDuration = 300 }) => {
    if (modelName !== this._modelName) {
      return
    }

    window.addEventListener('keydown', this._onKeyDown)

    const { webglMaxTexturesSupported } = store.getState()
    const textureCount = Math.min(webglMaxTexturesSupported, this._photos.length)

    if (!this._allTexturesLoaded) {
      const sliderExtraPhotos = this._photos.filter((a, i) => i !== 0 && i < textureCount)
      Promise
        .all(sliderExtraPhotos.map(PhotoPreview.loadTexture))
        .then(textures => {
          for (let i = 1; i < textures.length; i++) {
            const texture = textures[i]
            texture.needsUpdate = true
            this.material.uniforms.u_textures.value[i] = texture
            document.body.appendChild(texture.image)
          }
          this.material.needsUpdate = true
          this._allTexturesLoaded = true
        })
    }

    this._diffVectorTarget.x = 0
    this._diffVectorTarget.y = 0
  }
  _onCloseRequest = ({ modelName }) => {
    if (modelName === this._modelName) {
      const { layoutMode } = store.getState()
      const cameraRepositionX = layoutMode === LAYOUT_MODE_GRID ? this._originalGridPosition.x : 0
      const cameraRepositionY = layoutMode === LAYOUT_MODE_GRID ?  this._originalGridPosition.y : this._originalOverviewPosition.y

      const meshRepositionX = layoutMode === LAYOUT_MODE_GRID ? this._originalGridPosition.x : this._originalOverviewPosition.x
      const meshRepositionY = cameraRepositionY
      
      eventEmitter.emit(EVT_CAMERA_FORCE_REPOSITION, { x: cameraRepositionX, y: cameraRepositionY })
      this._targetPosition.set(meshRepositionX - innerWidth * 0.25, meshRepositionY)
      this._targetScale = this.scale.x
      window.removeEventListener('keydown', this._onKeyDown)
    }
  }
  _onClose = ({ modelName, tweenFactor }) => {
    this._isInteractable = true
    if (modelName === this._modelName) {
      const startX = this._targetPosition.x
      const startY = this._targetPosition.y
      const endX = startX + innerWidth * 0.25
      const endY = startY
      const newX = calc.getValueFromProgress(startX, endX, tweenFactor)
      const newY = calc.getValueFromProgress(startY, endY, tweenFactor)
      const newScale = calc.getValueFromProgress(this._targetScale, 1, tweenFactor)

      const diffx = (newX - this.position.x) * -1
      const diffy = (newY - this.position.y) * -1
      this._onSceneDrag({ diffx, diffy })

      this.position.x = newX
      this.position.y = newY
      this.scale.set(newScale, newScale, 1)

      this._isOpenInSingleView = false
    } else {
      this.material.uniforms.u_opacity.value = mapNumber(tweenFactor, 0.25, 1, 0, 1)
    }
  }
  _onCloseComplete () {
    this._isInteractable = true
  }
  _onSlideChange = direction => {
    if (this._isSliderCurrentlyTransitioning) {
      return
    }
    
    let tweenFrom
    let tweenTo

    const oldSliderIdx = this._sliderIdx
    this._sliderIdx += direction


    const { webglMaxTexturesSupported } = store.getState()
    const textureCount = Math.min(this._photos.length, webglMaxTexturesSupported)

    if (direction === 1) {
      tweenFrom = 0
      tweenTo = 1
      if (this._sliderIdx >= textureCount - 1) {
        this._sliderIdx = 0
      }
      this.material.uniforms.u_texIdx0.value = oldSliderIdx
      this.material.uniforms.u_texIdx1.value = this._sliderIdx
    } else if (direction === -1) {
      tweenFrom = 1
      tweenTo = 0
      if (this._sliderIdx < 0) {
        this._sliderIdx = textureCount - 2
      }
      this.material.uniforms.u_texIdx0.value = this._sliderIdx
      this.material.uniforms.u_texIdx1.value = oldSliderIdx
    }
    this.material.uniforms.u_photoMixFactor.value = 0
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
      this.position.x += cameraPositionX
      eventEmitter.emit(EVT_PHOTO_PREVIEW_RELAYOUTED, {
        modelName: this._modelName,
        x: this.position.x,
        y: this.position.y,
      })
    }
    store.dispatch(setOverviewLayoutWidth(overviewLayoutWidth))
  }
}
