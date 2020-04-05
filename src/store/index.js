import { createStore } from 'redux'

import * as actions from './actions'

const initialState = {
  cameraPositionX: 0,
  cameraPositionY: 0,
}

const appState = (state = initialState, action) => {
  switch (action.type) {
    case actions.SET_CAMERA_POSITION: {
      return Object.assign(state, {
        cameraPositionX: action.x,
        cameraPositionY: action.y,
      })
    }
    default: {
      return state
    }
  }
}

export default createStore(appState)
