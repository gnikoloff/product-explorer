import styler from 'stylefire'
import { tween, chain, delay } from 'popmotion'

import eventEmitter from './event-emitter'

import {
  clampNumber,
  mapNumber,
  getSiglePagePhotoScale,
} from './helpers'

import {
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_MOUSEMOVE_APP,
  EVT_RAF_UPDATE_APP,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_FADE_IN_SINGLE_VIEW,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
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

    this._prevModelName = null
    this._currModelName = null
    this._nextModelName = null
    this._sliderPrevBtnHovered = false
    this._sliderNextBtnHovered = false

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
      closeButton: wrapper.getElementsByClassName('close-single-page')[0],
    }

    this.stylers = {
      wrapper: styler(this.$els.wrapper),
      sliderButtonPrev: styler(this.$els.sliderButtonPrev),
      sliderButtonNext: styler(this.$els.sliderButtonNext),
    }

    
    eventEmitter.on(EVT_LOADED_PROJECTS, projectsData => {
      this._projectsData = projectsData
    })
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._open)
    eventEmitter.on(EVT_FADE_IN_SINGLE_VIEW, this._fadeIn)

    const sizer = wrapper.getElementsByClassName('single-page-slider-sizer')[0]
    const sizerWidth = PREVIEW_PHOTO_REF_WIDTH * getSiglePagePhotoScale()
    const sizerHeight = PREVIEW_PHOTO_REF_HEIGHT * getSiglePagePhotoScale()
    sizer.style.setProperty('width', `${sizerWidth}px`)
    sizer.style.setProperty('height', `${sizerHeight}px`)
    sizer.style.setProperty('margin', `-${sizerHeight / 2}px 0 0 calc(-${sizerWidth / 2}px - 25vw)`)
    
    requestAnimationFrame(() => {
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
    })

  }

  _checkSliderClick = e => {
    if (this._sliderPrevBtnHovered) {
      eventEmitter.emit(EVT_SLIDER_BUTTON_LEFT_CLICK)
    }
    if (this._sliderNextBtnHovered) {
      eventEmitter.emit(EVT_SLIDER_BUTTON_NEXT_CLICK)
    }
  }

  _onUpdate = (ts, dt) => {
    const { sliderButtonPrev, sliderButtonNext } = this.$els
    
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
        if (i === 0) {
          this._sliderPrevBtnHovered = false
        } else {
          this._sliderNextBtnHovered = false
        }
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
  
  _onMouseMove = (mouseX, mouseY) => {
    this._mousePos.x = mouseX
    this._mousePos.y = mouseY
  }

  _open = (modelName) => {
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
    this._currModelName = modelName
    this._nextModelName = this._projectsData[projectIdx + 1] ? this._projectsData[projectIdx + 1].modelName : this._projectsData[0].modelName

    this.$els.prevProductButton.textContent = this._prevModelName
    this.$els.nextProductButton.textContent = this._nextModelName

    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_MOUSEMOVE_APP, this._onMouseMove)
    document.body.addEventListener('click', this._checkSliderClick, false)
    this.$els.closeButton.addEventListener('click', this._closeButtonClick, false)
  }

  _closeButtonClick = () => {
    console.log(this._currModelName)
    eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, this._currModelName)

    const { sliderButtonPrev, sliderButtonNext, wrapper } = this.$els
    const fadeInEls = [...wrapper.getElementsByClassName('fade-in')]

    fadeInEls.forEach((child, i) => {
      const childStyler = styler(child)
      tween({
        from: { opacity: 1 },
        to: { opacity: 0 },
      }).start({
        update: childStyler.set,
        complete: () => {
          childStyler.set('pointer-events', 'none')
        }
      })
    })

    const sliderBtns = [sliderButtonPrev, sliderButtonNext]
    sliderBtns.forEach((button, i) => {
      const buttonStyler = styler(button)
      tween({
        from: { opacity: 1 },
        to: { opacity: 0 },
      }).start({
        update: buttonStyler.set,
        complete: () => {
          if (i === 0) {
            this.$els.descriptionList.innerHTML = ''
            eventEmitter.emit(EVT_FADE_OUT_SINGLE_VIEW, this._currModelName)
          }
        },
      })
    })
    
    document.body.removeEventListener('click', this._checkSliderClick)
    this.$els.closeButton.removeEventListener('click', this._closeButtonClick, false)
    eventEmitter.off(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.off(EVT_MOUSEMOVE_APP, this._onMouseMove)
  }

  _fadeIn = () => {
    const { sliderButtonPrev, sliderButtonNext, wrapper } = this.$els
    
    // this.stylers.wrapper.set('pointerEvents', 'auto')

    const fadeInEls = [...wrapper.getElementsByClassName('fade-in')]
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