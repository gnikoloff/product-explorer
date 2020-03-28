import styler from 'stylefire'

import eventEmitter from './event-emitter'

import {
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
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

    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, ({ tweenFactor }) => {
      this.stylers.toggleButton.set('opacity', 1 - tweenFactor)
    })
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, () => {
      this.stylers.toggleButton.set('pointerEvents', 'none')
    })
    
    eventEmitter.on(EVT_CLOSE_SINGLE_PROJECT, ({ tweenFactor }) => {
      this.stylers.toggleButton.set('opacity', 1 - tweenFactor)
    })
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, ({ tweenFactor }) => {
      this.stylers.toggleButton.set('pointerEvents', 'auto')
    })
  }
}