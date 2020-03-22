import styler from 'stylefire'
import { tween, chain, delay } from 'popmotion'

import eventEmitter from './event-emitter'

import {
  clampNumber,
  mapNumber,
} from './helpers'

import {
  EVT_MOUSEMOVE_APP,
  EVT_RAF_UPDATE_APP,
} from './constants'

export default class SinglePage {
  static SCROLL_INDICATOR_THRESHOLD = 200
  static SCROLL_INTRO_AREA_HEIGHT = 1500

  static SIDE_ARROW_PADDING = 50
  static ARROW_INTERACTION_DIST_THRESHOLD = 50

  constructor () {
    this._mousePos = { x: 0, y: 0 }

    const wrapper = document.getElementsByClassName('single-page-wrapper')[0]
    this.$els = {
      wrapper,
      title: wrapper.getElementsByClassName('single-page-title')[0],
      subtitle: wrapper.getElementsByClassName('single-page-subheading')[0],
      description: wrapper.getElementsByClassName('single-page-description')[0],
      descriptionList: wrapper.getElementsByClassName('single-page-features')[0],
      sliderButtonPrev: wrapper.getElementsByClassName('slider-btn-prev')[0],
      sliderButtonNext: wrapper.getElementsByClassName('slider-btn-next')[0],
    }

    this.stylers = {
      wrapper: styler(this.$els.wrapper),
      sliderButtonPrev: styler(this.$els.sliderButtonPrev),
      sliderButtonNext: styler(this.$els.sliderButtonNext),
    }

    this._onUpdate = this._onUpdate.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)

    this.$els.sliderButtonPrev.addEventListener('click', () => {
      eventEmitter.emit(EVT_SLIDER_BUTTON_LEFT_CLICK)
    }, false)
    this.$els.sliderButtonPrev.addEventListener('click', () => {
      eventEmitter.emit(EVT_SLIDER_BUTTON_NEXT_CLICK)
    }, false)

    const sizer = wrapper.getElementsByClassName('single-page-slider-sizer')[0]
    const sizerDimensions = sizer.getBoundingClientRect()

    this.$els.sliderButtonPrev.pos = {
      radius: 60,
      x: sizerDimensions.left - SinglePage.SIDE_ARROW_PADDING,
      y: sizerDimensions.top + 200,
      origX: sizerDimensions.left - SinglePage.SIDE_ARROW_PADDING,
      origY: sizerDimensions.top + 200,
      vx: 0, vy: 0,
    }
    this.$els.sliderButtonNext.pos = {
      radius: 60,
      x: sizerDimensions.left + sizerDimensions.width + SinglePage.SIDE_ARROW_PADDING,
      y: sizerDimensions.top + 200,
      origX: sizerDimensions.left + sizerDimensions.width + SinglePage.SIDE_ARROW_PADDING,
      origY: sizerDimensions.top + 200,
      vx: 0, vy: 0,
    }

    this.stylers.sliderButtonPrev.set({
      x: this.$els.sliderButtonPrev.pos.origX - this.$els.sliderButtonPrev.pos.radius / 2,
      y: this.$els.sliderButtonPrev.pos.origY - this.$els.sliderButtonPrev.pos.radius / 2,
    })
    this.stylers.sliderButtonNext.set({
      x: this.$els.sliderButtonNext.pos.origX - this.$els.sliderButtonNext.pos.radius / 2,
      y: this.$els.sliderButtonNext.pos.origY - this.$els.sliderButtonNext.pos.radius / 2,
    })

  }

  _onUpdate (ts, dt) {
    const {
      sliderButtonPrev,
      sliderButtonNext,
    } = this.$els

    const sliderBtns = [sliderButtonPrev, sliderButtonNext]
    sliderBtns.forEach(buttonEl => {
      const dx = buttonEl.pos.origX - this._mousePos.x
      const dy = buttonEl.pos.origY - this._mousePos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < SinglePage.ARROW_INTERACTION_DIST_THRESHOLD) {
        buttonEl.pos.vx += (this._mousePos.x - buttonEl.pos.radius / 2 - buttonEl.pos.x) * (dt * 5)
        buttonEl.pos.vy += (this._mousePos.y - buttonEl.pos.radius / 2 - buttonEl.pos.y) * (dt * 5)
      } else {
        buttonEl.pos.vx += (buttonEl.pos.origX - buttonEl.pos.radius / 2 - buttonEl.pos.x) * (dt * 5)
        buttonEl.pos.vy += (buttonEl.pos.origY - buttonEl.pos.radius / 2 - buttonEl.pos.y) * (dt * 5)
      }
      buttonEl.pos.x += buttonEl.pos.vx
      buttonEl.pos.y += buttonEl.pos.vy
      buttonEl.pos.x *= 0.82
      buttonEl.pos.y *= 0.82

    })
    this.stylers.sliderButtonPrev.set({
      x: sliderButtonPrev.pos.x,
      y: sliderButtonPrev.pos.y,
    })
    this.stylers.sliderButtonNext.set({
      x: sliderButtonNext.pos.x,
      y: sliderButtonNext.pos.y,
    })
  }
  
  _onMouseMove (mouseX, mouseY) {
    this._mousePos.x = mouseX
    this._mousePos.y = mouseY
  }

  open (project) {
    this.stylers.wrapper.set('pointerEvents', 'auto')
    this.$els.title.textContent = project.modelName
    this.$els.subtitle.textContent = project.subheading
    this.$els.description.innerHTML = project.description
    project.fabricTechnologies.forEach(desc => {
      const li = document.createElement('li')
      li.textContent = desc
      this.$els.descriptionList.appendChild(li)
    })

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_MOUSEMOVE_APP, this._onMouseMove)
  }

  

}