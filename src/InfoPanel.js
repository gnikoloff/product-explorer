import { tween } from 'popmotion'
import styler from 'stylefire'

import eventEmitter from './event-emitter'


import {
  mapNumber,
} from './helpers'

import {
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_OPENING_INFO_SECTION,
  EVT_OPEN_REQUEST_INFO_SECTION,
  EVT_CLOSE_REQUEST_INFO_SECTION,
} from './constants'

export default class InfoPanel {
  static ESCAPE_KEY_CODE = 27

  constructor () {
    const wrapper = document.getElementsByClassName('info-section')[0]
    this.$els = {
      wrapper,
      toggleButton: wrapper.getElementsByClassName('info-btn')[0],
      closeButton: document.getElementsByClassName('info-btn-close')[0],
      logo: document.getElementsByClassName('app-logo')[0],
    }

    this.stylers = {
      toggleButton: styler(this.$els.toggleButton),
      closeButton: styler(this.$els.closeButton),
      logo: styler(this.$els.logo),
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
    this.$els.closeButton.addEventListener('click', this._onCloseRequest, false)
  }
  _onOpenRequest = () => {
    eventEmitter.emit(EVT_OPEN_REQUEST_INFO_SECTION)
    tween().start({
      update: tweenFactor => {
        eventEmitter.emit(EVT_OPENING_INFO_SECTION, { tweenFactor })
        this.stylers.toggleButton.set('opacity', 1 - tweenFactor)
        this.stylers.logo.set('opacity', 1 - tweenFactor)
        this.stylers.closeButton.set({
          opacity: tweenFactor,
          y: mapNumber(tweenFactor, 0, 1, -100, 0),
        })
      },
      complete: () => {
        this.stylers.toggleButton.set('pointerEvents', 'none')
        window.addEventListener('keydown', this._onKeyDown, false)
      }
    })
  }
  _onCloseRequest = () => {
    eventEmitter.emit(EVT_CLOSE_REQUEST_INFO_SECTION)
    tween().start({
      update: tweenFactor => {
        eventEmitter.emit(EVT_OPENING_INFO_SECTION, { tweenFactor: 1 - tweenFactor })
        this.stylers.toggleButton.set('opacity', tweenFactor)
        this.stylers.logo.set('opacity', tweenFactor)
        this.stylers.closeButton.set({
          opacity: 1 - tweenFactor,
          y: mapNumber(tweenFactor, 0, 1, 0, -100),
        })
      },
      complete: () => {
        this.stylers.toggleButton.set('pointerEvents', 'auto')
        window.removeEventListener('keydown', this._onKeyDown)
      },
    })
  }
  _onKeyDown = ({ keyCode }) => {
    if (keyCode === InfoPanel.ESCAPE_KEY_CODE) {
      this._onCloseRequest()
    }
  }
}