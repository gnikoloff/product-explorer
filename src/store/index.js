import { createStore } from 'redux'

import * as actions from './actions'

const initialState = {
  cameraPositionX: 0,
  cameraPositionY: 0,
  overviewLayoutWidth: 0,
  overviewLayoutHeight: 0,
}

const appState = (state = initialState, action) => {
  switch (action.type) {
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
    default: {
      return state
    }
  }
}

export default createStore(appState)
