export const SET_CURRENTLY_SCROLLING_OVERVIEW = 'SET_CURRENTLY_SCROLLING_OVERVIEW'
export const setIsCurrentlyScrollingOverview = isCurrentlyScrollingOverview => ({
  type: SET_CURRENTLY_SCROLLING_OVERVIEW,
  isCurrentlyScrollingOverview,
})

export const SET_SCROLL_Y = 'SET_SCROLL_Y'
export const setScrollY = scrollY => ({
  type: SET_SCROLL_Y,
  scrollY,
})

export const SET_IS_MOBILE = 'SET_IS_MOBILE'
export const setIsMobile = isMobile => ({
  type: SET_IS_MOBILE,
  isMobile,
})

export const SET_MOUSE_POSITION = 'SET_MOUSE_POSITION'
export const setMousePosition = ({ x, y }) => ({
  type: SET_MOUSE_POSITION,
  x,
  y,
})

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

export const SET_WORLD_BOUNDS_TOP = 'SET_WORLD_BOUNDS_TOP'
export const setWorldBoundsTop = value => ({
  type: SET_WORLD_BOUNDS_TOP,
  value,
})

export const SET_WORLD_BOUNDS_RIGHT = 'SET_WORLD_BOUNDS_RIGHT'
export const setWorldBoundsRight = value => ({
  type: SET_WORLD_BOUNDS_RIGHT,
  value,
})

export const SET_WORLD_BOUNDS_BOTTOM = 'SET_WORLD_BOUNDS_BOTTOM'
export const setWorldBoundsBottom = value => ({
  type: SET_WORLD_BOUNDS_BOTTOM,
  value,
})

export const SET_WORLD_BOUNDS_LEFT = 'SET_WORLD_BOUNDS_LEFT'
export const setWorldBoundsLeft = value => ({
  type: SET_WORLD_BOUNDS_LEFT,
  value,
})
