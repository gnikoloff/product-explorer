
export const USE_LOADER = false
export const SERVER_API_ENDPOINT = process.env.NODE_ENV === 'development' ? 'http://192.168.0.13:5000' : 'https://product-explorer-backend.now.sh'
// export const SERVER_API_ENDPOINT = 'https://acronym-proto-backend.nikoloffgeorgi.now.sh'

export const PROJECTS_COUNT = 12
export const WOLRD_WIDTH = 2600
export const WORLD_HEIGHT = 1200
export const TOGGLE_SINGLE_PAGE_TRANSITION_DELAY = 75
export const TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_OPEN = 1000
export const TOGGLE_SINGLE_PAGE_TRANSITION_REF_DURATION_CLOSE = 500
// export const BLUR_ITERATIONS_MOBILE = 8
export const BLUR_ITERATIONS_MOBILE = 8
export const BLUR_ITERATIONS_DESKTOP = 10
export const PREVIEW_PHOTO_REF_WIDTH = 300 * 1.15
export const PREVIEW_PHOTO_REF_HEIGHT = 450 * 1.15
export const CAMERA_MIN_VELOCITY_TO_BE_MOVING = 1.25
export const LAYOUT_MODE_GRID = 'grid'
export const LAYOUT_MODE_OVERVIEW = 'overview'

export const EVT_CAMERA_HANDLE_MOVEMENT_WORLD = 'EVT_CAMERA_HANDLE_MOVEMENT_WORLD'
export const EVT_CAMERA_ZOOM_OUT_DRAG_START = 'EVT_CAMERA_ZOOM_OUT_DRAG_START'
export const EVT_CAMERA_ZOOM_IN_DRAG_END = 'EVT_CAMERA_ZOOM_IN_DRAG_END'
export const EVT_SET_INFO_PANEL_CONTENT = 'EVT_SET_INFO_PANEL_CONTENT'
export const EVT_LOADED_PROJECTS = 'EVT_LOADED_PROJECTS'
export const EVT_LOAD_PROGRESS = 'EVT_LOAD_PROGRESS'
export const EVT_LOAD_COMPLETE = 'EVT_LOAD_COMPLETE'
export const EVT_OPEN_REQUEST_SINGLE_PROJECT = 'EVT_OPEN_REQUEST_SINGLE_PROJECT'
export const EVT_SINGLE_PROJECT_MASK_OPENING = 'EVT_SINGLE_PROJECT_MASK_OPENING'
export const EVT_SINGLE_PROJECT_MASK_CLOSING = 'EVT_SINGLE_PROJECT_MASK_CLOSING'
export const EVT_OPENING_SINGLE_PROJECT = 'EVT_OPENING_SINGLE_PROJECT'
export const EVT_OPEN_SINGLE_PROJECT = 'EVT_OPEN_SINGLE_PROJECT'
export const EVT_CLOSE_REQUEST_SINGLE_PROJECT = 'EVT_CLOSE_REQUEST_SINGLE_PROJECT'
export const EVT_CLOSE_SINGLE_PROJECT = 'EVT_CLOSE_SINGLE_PROJECT'
export const EVT_CLOSING_SINGLE_PROJECT = 'EVT_CLOSING_SINGLE_PROJECT'
export const EVT_FADE_OUT_SINGLE_VIEW = 'EVT_FADE_OUT_SINGLE_VIEW'
export const EVT_SLIDER_BUTTON_LEFT_CLICK = 'EVT_SLIDER_BUTTON_LEFT_CLICK'
export const EVT_SLIDER_BUTTON_NEXT_CLICK = 'EVT_SLIDER_BUTTON_NEXT_CLICK'
export const EVT_SLIDER_DRAG = 'EVT_SLIDER_DRAG'
export const EVT_SLIDER_DRAG_CANCEL = 'EVT_SLIDER_DRAG_CANCEL'
export const EVT_SLIDER_REPLACE_TEXTURES = 'EVT_SLIDER_REPLACE_TEXTURES'
export const EVT_RAF_UPDATE_APP = 'EVT_RAF_UPDATE_APP'
export const EVT_ON_SCENE_DRAG_START = 'EVT_ON_SCENE_DRAG_START'
export const EVT_ON_SCENE_DRAG = 'EVT_ON_SCENE_DRAG'
export const EVT_ON_SCENE_DRAG_END = 'EVT_ON_SCENE_DRAG_END'
export const EVT_HOVER_SINGLE_PROJECT_ENTER = 'EVT_HOVER_SINGLE_PROJECT_ENTER'
export const EVT_HOVER_SINGLE_PROJECT_LEAVE = 'EVT_HOVER_SINGLE_PROJECT_LEAVE'
export const EVT_RENDER_PHOTO_SCENE_FRAME = 'EVT_RENDER_PHOTO_SCENE_FRAME'
export const EVT_RENDER_PHOTO_POSTFX_FRAME = 'EVT_RENDER_PHOTO_POSTFX_FRAME'
export const EVT_APP_RESIZE = 'EVT_APP_RESIZE'
export const EVT_CLICK_PREV_PROJECT = 'EVT_CLICK_PREV_PROJECT'
export const EVT_CLICK_NEXT_PROJECT = 'EVT_CLICK_NEXT_PROJECT'
export const EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO = 'EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO'
export const EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO = 'EVT_TRANSITION_IN_CURRENT_PRODUCT_PHOTO'
export const EVT_NEXT_PROJECT_TRANSITIONED_IN = 'EVT_NEXT_PROJECT_TRANSITIONED_IN'
export const EVT_OPEN_REQUEST_INFO_SECTION = 'EVT_OPEN_REQUEST_INFO_SECTION'
export const EVT_OPENING_INFO_SECTION = 'EVT_OPENING_INFO_SECTION'
export const EVT_OPEN_REQUEST_INFO_SECTION_COMPLETE = 'EVT_OPEN_REQUEST_INFO_SECTION_COMPLETE'
export const EVT_CLOSE_REQUEST_INFO_SECTION = 'EVT_CLOSE_REQUEST_INFO_SECTION'
export const EVT_CLOSING_INFO_SECTION = 'EVT_CLOSING_INFO_SECTION'
export const EVT_CLOSE_INFO_SECTION_COMPLETE = 'EVT_CLOSE_INFO_SECTION_COMPLETE'
export const EVT_LAYOUT_MODE_TRANSITION_REQUEST = 'EVT_LAYOUT_MODE_TRANSITION_REQUEST'
export const EVT_LAYOUT_MODE_TRANSITION = 'EVT_LAYOUT_MODE_TRANSITION'
export const EVT_LAYOUT_MODE_TRANSITION_COMPLETE = 'EVT_LAYOUT_MODE_TRANSITION_COMPLETE'
export const EVT_TEXTURE_LABEL_MASK_ONLOAD = 'EVT_TEXTURE_LABEL_MASK_ONLOAD'
export const EVT_PHOTO_PREVIEW_RELAYOUTED = 'EVT_PHOTO_PREVIEW_RELAYOUTED'
export const EVT_HIDE_CURSOR = 'EVT_HIDE_CURSOR'
export const EVT_SHOW_CURSOR = 'EVT_SHOW_CURSOR'
export const EVT_CAMERA_FORCE_REPOSITION = 'EVT_CAMERA_FORCE_REPOSITION'
export const EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT = 'EVT_ADD_TO_INITIAL_RESOURCES_LOAD_COUNT'
export const EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT = 'EVT_INCREMENT_INITIAL_RESOURCES_LOAD_COUNT'
export const EVT_FADE_IN_SCENE = 'EVT_FADE_IN_SCENE'

export const EVT_DRAG_TOP_BORDER = 'EVT_DRAG_TOP_BORDER'
export const EVT_DRAG_RIGHT_BORDER = 'EVT_DRAG_RIGHT_BORDER'
export const EVT_DRAG_BOTTOM_BORDER = 'EVT_DRAG_BOTTOM_BORDER'
export const EVT_DRAG_LEFT_BORDER = 'EVT_DRAG_LEFT_BORDER'