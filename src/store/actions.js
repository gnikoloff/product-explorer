export const SET_CAMERA_POSITION = 'SET_CAMERA_POSITION'
export const setCameraPosition = ({ x, y }) => ({
  type: SET_CAMERA_POSITION,
  x,
  y,
})

export const SET_OVERVIEW_LAYOUT_WIDTH = 'SET_OVERVIEW_LAYOUT_WIDTH'
export const setOverviewLayoutWidth = width => ({
  type: SET_OVERVIEW_LAYOUT_WIDTH,
  width,
})

export const SET_OVERVIEW_LAYOUT_HEIGHT = 'SET_OVERVIEW_LAYOUT_HEIGHT'
export const setOverviewLayoutHeight = height => ({
  type: SET_OVERVIEW_LAYOUT_HEIGHT,
  height,
})

export const SET_LAYOUT_MODE = 'SET_LAYOUT_MODE'
export const setLayoutMode = layoutMode => ({
  type: SET_LAYOUT_MODE,
  layoutMode,
})
