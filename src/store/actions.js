export const SET_MOUSE_POSITION = 'SET_MOUSE_POSITION'
export const setMousePosition = ({ x, y }) => ({
  type: SET_MOUSE_POSITION,
  x,
  y,
})

export const SET_CAMERA_POSITION = 'SET_CAMERA_POSITION'
export const setCameraPosition = ({ x, y, origin }) => ({
  type: SET_CAMERA_POSITION,
  x,
  y,
  origin,
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

export const SET_LAYOUT_MODE_TRANSITIONING = 'SET_LAYOUT_MODE_TRANSITIONING'
export const setLayoutModeTransitioning = isLayoutTransitioning => ({
  type: SET_LAYOUT_MODE_TRANSITIONING,
  isLayoutTransitioning,
})

export const SET_WEBGL_MAX_TEXUTRES_SUPPORTED = 'SET_WEBGL_MAX_TEXUTRES_SUPPORTED'
export const setWebglMaxTexturesSupported = webglMaxTexturesSupported => ({
  type: SET_WEBGL_MAX_TEXUTRES_SUPPORTED,
  webglMaxTexturesSupported,
})
