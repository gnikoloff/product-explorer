import { tween } from 'popmotion'
import styler from 'stylefire'

import eventEmitter from './event-emitter'

import {
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_OPENING_INFO_SECTION,
  EVT_OPEN_REQUEST_INFO_SECTION,
} from './constants'
import { mapNumber } from './helpers'

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
      const tween = mapNumber(tweenFactor, 0, 0.4, 1, 0)
      this.stylers.toggleButton.set('opacity', tween)
    })
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, () => {
      this.stylers.toggleButton.set('pointerEvents', 'none')
    })
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, ({ tweenFactor }) => {
      const tween = mapNumber(tweenFactor, 0.4, 1, 0, 1)
      this.stylers.toggleButton.set('opacity', tween)
    })
    eventEmitter.on(EVT_CLOSE_SINGLE_PROJECT, () => {
      this.stylers.toggleButton.set('pointerEvents', 'auto')
    })

    this.$els.toggleButton.addEventListener('click', this._onOpenRequest, false)
  }
  _onOpenRequest = () => {
    eventEmitter.emit(EVT_OPEN_REQUEST_INFO_SECTION)
    tween().start({
      update: tweenFactor => {
        eventEmitter.emit(EVT_OPENING_INFO_SECTION, { tweenFactor })
        this.stylers.toggleButton.set('opacity', 1 - tweenFactor)
      },
      complete: () => {
        this.stylers.toggleButton.set('pointerEvents', 'none')
      }
    })
  }
}