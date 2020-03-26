import styler from 'stylefire'

import eventEmitter from './event-emitter'

import {
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
} from './constants'

export default class InfoPanel {
  constructor () {
    const wrapper = document.getElementsByClassName('info-section')[0]
    this.$els = {
      wrapper,
      toggleButton: wrapper.getElementsByClassName('info-btn')[0],
    }

    this.stylers = {
      toggleButton: styler(this.$els.toggleButton),
    }
  }
  setButtonOpacity (opacity) {
    this.stylers.toggleButton.set('opacity', opacity)
  }
  setPointerEvents (pointerEvents) {
    this.stylers.toggleButton.set('pointerEvents', pointerEvents)
  }
}