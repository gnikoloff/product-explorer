import { tween, easing, chain, delay } from 'popmotion'
import styler from 'stylefire'

import eventEmitter from './event-emitter'

import store from './store'

import {
  mapNumber,
} from './helpers'

import {
  EVT_SINGLE_PROJECT_MASK_OPENING,
  EVT_SINGLE_PROJECT_MASK_CLOSING,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_OPENING_INFO_SECTION,
  EVT_OPEN_REQUEST_INFO_SECTION,
  EVT_OPEN_REQUEST_INFO_SECTION_COMPLETE,
  EVT_CLOSE_REQUEST_INFO_SECTION,
  EVT_CLOSING_INFO_SECTION,
  EVT_CLOSE_INFO_SECTION_COMPLETE,
  EVT_SET_INFO_PANEL_CONTENT,
} from './constants'

export default class InfoPanel {
  static ESCAPE_KEY_CODE = 27

  constructor () {
    const wrapper = document.getElementsByClassName('info-section')[0]
    this.$els = {
      wrapper,
      toggleButton: document.body.getElementsByClassName('info-btn')[0],
      closeButton: document.getElementsByClassName('info-btn-close')[0],
      logo: document.getElementsByClassName('app-logo')[0],
      infoDate: wrapper.getElementsByClassName('info-date')[0],
      infoMadeBy: wrapper.getElementsByClassName('info-made-by')[0],
      infoMadeFor: wrapper.getElementsByClassName('info-made-for')[0],
      infoCopyright: wrapper.getElementsByClassName('info-copyright')[0],
      infoMain: wrapper.getElementsByClassName('info-main')[0],
    }

    this.stylers = {
      wrapper: styler(wrapper),
      toggleButton: styler(this.$els.toggleButton),
      closeButton: styler(this.$els.closeButton),
      logo: styler(this.$els.logo),
    }

    eventEmitter.on(EVT_SINGLE_PROJECT_MASK_OPENING, ({ tweenFactor }) => {
      const tween = mapNumber(tweenFactor, 0, 0.4, 1, 0)
      this.stylers.toggleButton.set('opacity', tween)
    })
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, () => {
      this.stylers.toggleButton.set('pointerEvents', 'none')
    })
    eventEmitter.on(EVT_SINGLE_PROJECT_MASK_CLOSING, ({ tweenFactor }) => {
      const tween = mapNumber(tweenFactor, 0.4, 1, 0, 1)
      this.stylers.toggleButton.set('opacity', tween)
    })
    eventEmitter.on(EVT_CLOSE_SINGLE_PROJECT, () => {
      this.stylers.toggleButton.set('pointerEvents', 'auto')
    })
    eventEmitter.on(EVT_SET_INFO_PANEL_CONTENT, ({ date, madeBy, madeFor, copyright, text }) => {
      this.$els.infoDate.innerHTML = date
      this.$els.infoMadeBy.innerHTML = madeBy
      this.$els.infoMadeFor.innerHTML = madeFor
      this.$els.infoCopyright.innerHTML = copyright
      this.$els.infoMain.innerHTML = text
    })

    this.$els.toggleButton.addEventListener('click', this._onOpenRequest, false)
    this.$els.closeButton.addEventListener('click', this._onCloseRequest, false)
  }
  _onOpenRequest = () => {
    eventEmitter.emit(EVT_OPEN_REQUEST_INFO_SECTION)
    this.stylers.closeButton.set('pointer-events', 'none')
    tween({
      ease: easing.easeIn,
      // duration: 1000,
    }).start({
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
        // const timeout = setTimeout(() => {
        //   eventEmitter.emit(EVT_OPEN_REQUEST_INFO_SECTION_COMPLETE)
        //   clearTimeout(timeout)
        // }, 1500)

        this.stylers.toggleButton.set('pointerEvents', 'none')
        this.stylers.closeButton.set('pointer-events', 'auto')
        this.stylers.wrapper.set('pointer-events', 'auto')
        
        window.addEventListener('keydown', this._onKeyDown, false)

        const sidebar = this.$els.wrapper.getElementsByClassName('info-sidebar')[0]
        const main = this.$els.wrapper.getElementsByClassName('info-main')[0]
        const fadeInsSidebar = [...sidebar.getElementsByClassName('fade-in')]
        const fadeInsMain = [...main.getElementsByClassName('fade-in')]

        // if (store.getState().isMobile) {
          const allFadeIns = [...fadeInsMain, ...fadeInsSidebar]
          allFadeIns.forEach(el => {
            const elStyler = styler(el)
            elStyler.set({
              'opacity': 1,
              'pointer-events': 'auto',
            })
          })
        // } else {
        //   const fadeInEl = (el, i) => {
        //     const elStyler = styler(el)
        //     // const offsetY = 6
        //     // elStyler.set('y', offsetY)
        //     elStyler.set('scale', '0.9')
        //     chain(
        //       delay(i * 125),
        //       tween({
        //         duration: 400,
        //         ease: easing.easeIn,
        //       })
        //     ).start({
        //       update: tweenFactor => elStyler.set({
        //         opacity: tweenFactor,
        //         scale: mapNumber(0, 1, 0.9, 1),
        //         // y: mapNumber(tweenFactor, 0, 1, offsetY, 0),
        //       }),
        //       complete: () => elStyler.set('pointer-events', 'auto')
        //     })
        //   }
        //   fadeInsSidebar.forEach(fadeInEl)
        //   fadeInsMain.forEach(fadeInEl)
        // }
      }
    })
    
  }
  _onCloseRequest = () => {
    eventEmitter.emit(EVT_CLOSE_REQUEST_INFO_SECTION)
    const fadeIns = [...this.$els.wrapper.getElementsByClassName('fade-in')]
    fadeIns.forEach(el => {
      const elStyler = styler(el)
      tween().start({
        update: tweenFactor => elStyler.set({ opacity: 1 - tweenFactor }),
        complete: () => elStyler.set('pointer-events', 'none')
      })
    })
    tween().start({
      update: tweenFactor => {
        eventEmitter.emit(EVT_CLOSING_INFO_SECTION, { tweenFactor })
        this.stylers.toggleButton.set('opacity', tweenFactor)
        this.stylers.logo.set('opacity', tweenFactor)
        this.stylers.closeButton.set({
          opacity: tweenFactor,
          y: mapNumber(tweenFactor, 0, 1, 0, -100),
        })
      },
      complete: () => {
        this.stylers.toggleButton.set('pointerEvents', 'auto')
        this.stylers.wrapper.set('pointer-events', 'none')
        window.removeEventListener('keydown', this._onKeyDown)
        eventEmitter.emit(EVT_CLOSE_INFO_SECTION_COMPLETE)
      },
    })
  }
  _onKeyDown = ({ keyCode }) => {
    if (keyCode === InfoPanel.ESCAPE_KEY_CODE) {
      this._onCloseRequest()
    }
  }
}