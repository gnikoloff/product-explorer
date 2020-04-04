import * as THREE from 'three'
import { tween } from 'popmotion'

import eventEmitter from './event-emitter'
import PhotoPreview from './PhotoPreview'

import {
  mapNumber,
} from './helpers'

import {
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_LOADED_PROJECTS,
  EVT_LAYOUT_MODE_CHANGE,
  SCENE_LAYOUT_GRID,
  SCENE_LAYOUT_OVERVIEW,
} from './constants'

export default class ProductGrid extends THREE.Group {
  constructor () {
    super()

    this._overviewWidth = 4 * PREVIEW_PHOTO_REF_WIDTH
    this._overviewOffsetY = 0

    eventEmitter.on(EVT_LOADED_PROJECTS, this._onProjectsLoaded)
    eventEmitter.on(EVT_LAYOUT_MODE_CHANGE, this._onLayoutModeChanged)
  }
  _onLayoutModeChanged = ({
    layoutMode,
    cameraPositionX,
    cameraPositionY,
  }) => {
    this.children.forEach((mesh, i) => {
      if (layoutMode === SCENE_LAYOUT_GRID) {
        const startX = mesh.position.x
        const startY = mesh.position.y
        const endX = mesh.originalPosition.x
        const endY = mesh.originalPosition.y
        tween().start({
          update: tweenFactor => {
            mesh.position.x = mapNumber(tweenFactor, 0, 1, startX, endX)
            mesh.position.y = mapNumber(tweenFactor, 0, 1, startY, endY)
          },
        })
      } else if (layoutMode === SCENE_LAYOUT_OVERVIEW) {
        const startX = mesh.position.x
        const startY = mesh.position.y
        let endX = mesh.overviewPosition.x
        let endY = mesh.overviewPosition.y
        endX += cameraPositionX
        endY += cameraPositionY
        tween().start({
          update: tweenFactor => {
            mesh.position.x = mapNumber(tweenFactor, 0, 1, startX, endX)
            mesh.position.y = mapNumber(tweenFactor, 0, 1, startY, endY)
          },
        })
      }
    })
  }
  _onProjectsLoaded = ({ projectsData }) => {
    projectsData.map((info, i) => this.add(new PhotoPreview({
        idx: i,
        modelName: info.modelName,
        width: PREVIEW_PHOTO_REF_WIDTH,
        height: PREVIEW_PHOTO_REF_HEIGHT,
        photos: info.sliderPhotos || [],
        gridPosition: new THREE.Vector3(info.posX, info.posY, 0),
      }))
    )
  }
  // _getMeshPositionInLayoutMode (meshIdx) {
  //   const columnGutter = 20
  //   const elementsPerRow = 4
  //   let x = (meshIdx % elementsPerRow) * PREVIEW_PHOTO_REF_WIDTH - this._overviewWidth / 2
  //   let y = this._overviewOffsetY
  //   if (meshIdx % elementsPerRow === 0) {
  //     this._overviewOffsetY -= PREVIEW_PHOTO_REF_HEIGHT + columnGutter
  //   }
  //   console.log(x, y)
  //   return { x, y }
  // }
}
