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
  EVT_CLICKED_SINGLE_PROJECT,
  EVT_FADE_IN_SINGLE_VIEW,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
  EVT_SLIDER_BUTTON_MOUSE_LEAVE,
  EVT_SLIDER_BUTTON_MOUSE_ENTER,
  EVT_LOADED_PROJECTS,
} from './constants'

export default class SinglePage {
  static SCROLL_INDICATOR_THRESHOLD = 200
  static SCROLL_INTRO_AREA_HEIGHT = 1500

  static SIDE_ARROW_RADIUS = 50
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
      prevProductButton: wrapper.getElementsByClassName('single-page-prev-button')[0],
      nextProductButton: wrapper.getElementsByClassName('single-page-next-button')[0],
    }

    this.stylers = {
      wrapper: styler(this.$els.wrapper),
      sliderButtonPrev: styler(this.$els.sliderButtonPrev),
      sliderButtonNext: styler(this.$els.sliderButtonNext),
    }

    this._prevModelName = null
    this._nextModelName = null
    this._sliderPrevBtnHovered = false
    this._sliderNextBtnHovered = false

    this._onUpdate = this._onUpdate.bind(this)
    this._onMouseMove = this._onMouseMove.bind(this)
    this._open = this._open.bind(this)
    this._fadeIn = this._fadeIn.bind(this)
    
    eventEmitter.on(EVT_LOADED_PROJECTS, projectsData => {
      this._projectsData = projectsData
    })
    eventEmitter.on(EVT_CLICKED_SINGLE_PROJECT, this._open)
    eventEmitter.on(EVT_FADE_IN_SINGLE_VIEW, this._fadeIn)

    document.body.addEventListener('click', e => {
      if (this._sliderPrevBtnHovered) {
        eventEmitter.emit(EVT_SLIDER_BUTTON_LEFT_CLICK)
      }
      if (this._sliderNextBtnHovered) {
        eventEmitter.emit(EVT_SLIDER_BUTTON_NEXT_CLICK)
      }
    }, false)

    // this.$els.prevProductButton.addEventListener('click', e => {
    //   e.preventDefault()
    //   e.stopPropagation()
    //   eventEmitter.emit(EVT_CLICKED_SINGLE_PROJECT, this._prevModelName)
    // })
    // this.$els.nextProductButton.addEventListener('click', e => {
    //   e.preventDefault()
    //   e.stopPropagation()
    //   eventEmitter.emit(EVT_CLICKED_SINGLE_PROJECT, this._nextModelName)
    // })

    // this.$els.sliderButtonPrev.addEventListener('click', () => {
    //   eventEmitter.emit(EVT_SLIDER_BUTTON_LEFT_CLICK)
    // }, false)
    // this.$els.sliderButtonNext.addEventListener('click', () => {
    //   eventEmitter.emit(EVT_SLIDER_BUTTON_NEXT_CLICK)
    // }, false)
    // this.$els.sliderButtonPrev.addEventListener('mouseenter', () => {
    //   eventEmitter.emit(EVT_SLIDER_BUTTON_MOUSE_ENTER)
    // })
    // this.$els.sliderButtonNext.addEventListener('mouseenter', () => {
    //   eventEmitter.emit(EVT_SLIDER_BUTTON_MOUSE_ENTER)
    // })
    // this.$els.sliderButtonPrev.addEventListener('mouseleave', () => {
    //   eventEmitter.emit(EVT_SLIDER_BUTTON_MOUSE_LEAVE)
    // })
    // this.$els.sliderButtonNext.addEventListener('mouseleave', () => {
    //   eventEmitter.emit(EVT_SLIDER_BUTTON_MOUSE_LEAVE)
    // })

    const sizer = wrapper.getElementsByClassName('single-page-slider-sizer')[0]
    const sizerDimensions = sizer.getBoundingClientRect()

    this.$els.sliderButtonPrev.pos = {
      radius: SinglePage.SIDE_ARROW_RADIUS,
      x: sizerDimensions.left - SinglePage.SIDE_ARROW_PADDING,
      y: sizerDimensions.top + sizerDimensions.height / 2,
      origX: sizerDimensions.left - SinglePage.SIDE_ARROW_PADDING,
      origY: sizerDimensions.top + sizerDimensions.height / 2,
      vx: 0, vy: 0,
    }
    this.$els.sliderButtonNext.pos = {
      radius: SinglePage.SIDE_ARROW_RADIUS,
      x: sizerDimensions.left + sizerDimensions.width + SinglePage.SIDE_ARROW_PADDING,
      y: sizerDimensions.top + sizerDimensions.height / 2,
      origX: sizerDimensions.left + sizerDimensions.width + SinglePage.SIDE_ARROW_PADDING,
      origY: sizerDimensions.top + sizerDimensions.height / 2,
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
    sliderBtns.forEach((buttonEl, i) => {
      const dx = buttonEl.pos.origX - this._mousePos.x
      const dy = buttonEl.pos.origY - this._mousePos.y
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < SinglePage.ARROW_INTERACTION_DIST_THRESHOLD) {
        buttonEl.pos.vx += (this._mousePos.x - buttonEl.pos.radius / 2 - buttonEl.pos.x) * (dt * 5)
        buttonEl.pos.vy += (this._mousePos.y - buttonEl.pos.radius / 2 - buttonEl.pos.y) * (dt * 5)
        if (i === 0) {
          this._sliderPrevBtnHovered = true
          this._sliderNextBtnHovered = false
        } else {
          this._sliderPrevBtnHovered = false
          this._sliderNextBtnHovered = true
        }
      } else {
        buttonEl.pos.vx += (buttonEl.pos.origX - buttonEl.pos.radius / 2 - buttonEl.pos.x) * (dt * 5)
        buttonEl.pos.vy += (buttonEl.pos.origY - buttonEl.pos.radius / 2 - buttonEl.pos.y) * (dt * 5)
      }
      buttonEl.pos.x += buttonEl.pos.vx
      buttonEl.pos.y += buttonEl.pos.vy
      buttonEl.pos.x *= 0.72
      buttonEl.pos.y *= 0.72

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

  _open (modelName) {
    const projectIdx = this._projectsData.findIndex(project => project.modelName === modelName)
    const project = this._projectsData.find(project => project.modelName === modelName)
    this.$els.title.textContent = project.modelName
    this.$els.subtitle.textContent = project.subheading
    this.$els.description.innerHTML = project.description
    project.fabricTechnologies.forEach(desc => {
      const li = document.createElement('li')
      li.textContent = desc
      this.$els.descriptionList.appendChild(li)
    })

    this._prevModelName = this._projectsData[projectIdx - 1] ? this._projectsData[projectIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName
    this._nextModelName = this._projectsData[projectIdx + 1] ? this._projectsData[projectIdx + 1].modelName : this._projectsData[0].modelName
    this.$els.prevProductButton.textContent = this._prevModelName
    this.$els.nextProductButton.textContent = this._nextModelName

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_MOUSEMOVE_APP, this._onMouseMove)
  }

  _fadeIn () {
    const {
      sliderButtonPrev,
      sliderButtonNext,
    } = this.$els
    
    // this.stylers.wrapper.set('pointerEvents', 'auto')

    const fadeInEls = [...this.$els.wrapper.getElementsByClassName('fade-in')]
    fadeInEls.forEach((child, i) => {
      const childStyler = styler(child)
      chain(
        delay(i * 150),
        tween({
          from: 0,
          to: 1,
        })
      ).start({
        update: v => childStyler.set('opacity', v),
        complete: () => childStyler.set('pointer-events', 'auto')
      })
    })

    const sliderBtns = [sliderButtonPrev, sliderButtonNext]
    sliderBtns.forEach((button, i) => {
      const buttonStyler = styler(button)
      chain(
        delay(i * 150),
        tween({
          from: {
            opacity: 0,
          },
          to: {
            opacity: 1,
          },
        })
      ).start({
        update: buttonStyler.set,
      })
    })

  }
  

}