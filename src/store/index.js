import { createStore } from 'redux'

import * as actions from './actions'

import {
  LAYOUT_MODE_GRID,
} from '../constants'

const initialState = {
  mousePositionX: 0,
  mousePositionY: 0,
  cameraPositionX: 0,
  cameraPositionY: 0,
  overviewLayoutWidth: 0,
  overviewLayoutHeight: 0,
  worldBoundsTop: 0,
  worldBoundsRight: 0,
  worldBoundsBottom: 0,
  worldBoundsLeft: 0,
  layoutMode: LAYOUT_MODE_GRID,
  isLayoutTransitioning: false,
  webglMaxTexturesSupported: null,
}

const appState = (state = initialState, action) => {
  switch (action.type) {
    case actions.SET_MOUSE_POSITION: {
      return Object.assign(state, {
        mousePositionX: action.x,
        mousePositionY: action.y,
      })
    }
    case actions.SET_CAMERA_POSITION: {
      return Object.assign(state, {
        cameraPositionX: action.x,
        cameraPositionY: action.y,
      })
    }
    case actions.SET_OVERVIEW_LAYOUT_WIDTH: {
      return Object.assign(state, {
        overviewLayoutWidth: action.width,
      })
    }
    case actions.SET_OVERVIEW_LAYOUT_HEIGHT: {
      return Object.assign(state, {
        overviewLayoutHeight: action.height,
      })
    }
    case actions.SET_WORLD_BOUNDS_TOP: {
      return Object.assign(state, {
        worldBoundsTop: action.value,
      })
    }
    case actions.SET_WORLD_BOUNDS_RIGHT: {
      return Object.assign(state, {
        worldBoundsRight: action.value,
      })
    }
    case actions.SET_WORLD_BOUNDS_BOTTOM: {
      return Object.assign(state, {
        worldBoundsBottom: action.value,
      })
    }
    case actions.SET_WORLD_BOUNDS_LEFT: {
      return Object.assign(state, {
        worldBoundsLeft: action.value,
      })
    }
    case actions.SET_LAYOUT_MODE: {
      return Object.assign(state, {
        layoutMode: action.layoutMode,
      })
    }
    case actions.SET_LAYOUT_MODE_TRANSITIONING: {
      return Object.assign(state, {
        isLayoutTransitioning: action.isLayoutTransitioning,
      })
    }
    case actions.SET_WEBGL_MAX_TEXUTRES_SUPPORTED: {
      return Object.assign(state, {
        webglMaxTexturesSupported: action.webglMaxTexturesSupported,
      })
    }
    default: {
      return state
    }
  }
}

export default createStore(appState)
