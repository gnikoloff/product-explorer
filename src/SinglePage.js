import styler from 'stylefire'
import { tween, chain, delay, calc } from 'popmotion'

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
  EVT_OPENING_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,  
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
  EVT_LOADED_PROJECTS,
  EVT_CLICK_PREV_PROJECT,
  EVT_CLICK_NEXT_PROJECT,
  EVT_NEXT_PROJECT_TRANSITIONED_IN,
  EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO,
} from './constants'

export default class SinglePage {
  static SCROLL_INDICATOR_THRESHOLD = 200
  static SCROLL_INTRO_AREA_HEIGHT = 1500

  static SIDE_ARROW_RADIUS = 50
  static SIDE_ARROW_PADDING = 50
  static ARROW_INTERACTION_DIST_THRESHOLD = 32

  static pageBackground = '#fcfcfc'

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
      singlePageInfo: wrapper.getElementsByClassName('single-page-info')[0],
      singlePageContainer: wrapper.getElementsByClassName('single-page-container')[0],
      title: wrapper.getElementsByClassName('single-page-title')[0],
      subtitle: wrapper.getElementsByClassName('single-page-subheading')[0],
      pricing: wrapper.getElementsByClassName('single-page-pricing')[0],
      type: wrapper.getElementsByClassName('single-page-type')[0],
      generation: wrapper.getElementsByClassName('single-page-gen')[0],
      style: wrapper.getElementsByClassName('single-page-style')[0],
      description: wrapper.getElementsByClassName('single-page-description')[0],
      descriptionList: wrapper.getElementsByClassName('single-page-features')[0],
      fabricTechnologyList: wrapper.getElementsByClassName('fabric-technology')[0],
      systemsList: wrapper.getElementsByClassName('systems')[0],
      subsystemsList: wrapper.getElementsByClassName('subsystems')[0],
      includesList: wrapper.getElementsByClassName('includes')[0],
      interfaceWithList: wrapper.getElementsByClassName('interface-with')[0],
      sliderButtonPrev: wrapper.getElementsByClassName('slider-btn-prev')[0],
      sliderButtonNext: wrapper.getElementsByClassName('slider-btn-next')[0],
      prevProductButton: wrapper.getElementsByClassName('single-page-prev-button')[0],
      nextProductButton: wrapper.getElementsByClassName('single-page-next-button')[0],
      closeButton: wrapper.getElementsByClassName('close-single-page')[0],
      sizer: wrapper.getElementsByClassName('single-page-slider-sizer')[0],
    }

    this.stylers = {
      wrapper: styler(this.$els.wrapper),
      singlePageInfo: styler(this.$els.singlePageInfo),
      sliderButtonPrev: styler(this.$els.sliderButtonPrev),
      sliderButtonNext: styler(this.$els.sliderButtonNext),
      closeButton: styler(this.$els.closeButton),
      singlePageContainer: styler(this.$els.singlePageContainer),
    }
    
    eventEmitter.on(EVT_LOADED_PROJECTS, this._onProjectsLoaded)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpen)
    eventEmitter.on(EVT_OPENING_SINGLE_PROJECT, this._onOpening)
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, this._onClosing)
    eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_NEXT_PROJECT_TRANSITIONED_IN, this._removeBackgroundColor)
    eventEmitter.on(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, () => {
      this._fadeProjectDescription({ duration: 200, direction: 1, includeButtons: false }).then(() => {
        this.$els.prevProductButton.classList.remove('non-interactable')
        this.$els.nextProductButton.classList.remove('non-interactable')
        this.$els.prevProductButton.classList.remove('clicked')
        this.$els.nextProductButton.classList.remove('clicked')
      })
    })
    // _setContentTexts

    this.$els.prevProductButton.addEventListener('click', () => {
      this._nextModelName = this._currModelName
      this._currModelName = this._prevModelName
      const currNextIdx = this._projectsData.findIndex(item => item.modelName === this._prevModelName)
      this._prevModelName = this._projectsData[currNextIdx - 1] ? this._projectsData[currNextIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName
      eventEmitter.emit(EVT_CLICK_PREV_PROJECT, ({ modelName: this._currModelName }))
      this.stylers.singlePageContainer.set('background-color', SinglePage.pageBackground)
      this.$els.prevProductButton.classList.add('non-interactable')
      this.$els.nextProductButton.classList.add('non-interactable')
      this.$els.prevProductButton.classList.add('clicked')
      this._fadeProjectDescription({ duration: 100, parralel: true, direction: -1, includeButtons: false }).then(() => {
        this._setContentTexts({ modelName: this._currModelName })
      })
    }, false)

    this.$els.nextProductButton.addEventListener('click', () => {
      this._prevModelName = this._currModelName
      this._currModelName = this._nextModelName
      const currNextIdx = this._projectsData.findIndex(item => item.modelName === this._nextModelName)
      this._nextModelName = this._projectsData[currNextIdx + 1] ? this._projectsData[currNextIdx + 1].modelName : this._projectsData[0].modelName
      eventEmitter.emit(EVT_CLICK_NEXT_PROJECT, ({ modelName: this._currModelName }))
      this.stylers.singlePageContainer.set('background-color', SinglePage.pageBackground)
      this.$els.prevProductButton.classList.add('non-interactable')
      this.$els.nextProductButton.classList.add('non-interactable')
      this.$els.nextProductButton.classList.add('clicked')
      this._fadeProjectDescription({ duration: 100, parralel: true, direction: -1, includeButtons: false }).then(() => {
        this._setContentTexts({ modelName: this._currModelName })
      })
    }, false)

    const sizerWidth = PREVIEW_PHOTO_REF_WIDTH * getSiglePagePhotoScale()
    const sizerHeight = PREVIEW_PHOTO_REF_HEIGHT * getSiglePagePhotoScale()
    this.$els.sizer.style.setProperty('width', `${sizerWidth}px`)
    this.$els.sizer.style.setProperty('height', `${Math.min(sizerHeight, innerHeight)}px`)
    this.$els.sizer.style.setProperty('margin', `-${sizerHeight / 2}px 0 0 calc(-${sizerWidth / 2}px - 25vw)`)

    // this._positionButtons()
  }

  _removeBackgroundColor = () => {
    this.stylers.singlePageContainer.set('background-color', 'transparent')
  }

  _positionButtons = () => {
    const { sizer } = this.$els
    

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

  _onProjectsLoaded = ({ projectsData }) => {
    this._projectsData = projectsData
  }

  _checkSliderClick = e => {
    if (this._sliderPrevBtnHovered) {
      eventEmitter.emit(EVT_SLIDER_BUTTON_LEFT_CLICK, { modelName: this._currModelName })
    }
    if (this._sliderNextBtnHovered) {
      eventEmitter.emit(EVT_SLIDER_BUTTON_NEXT_CLICK, { modelName: this._currModelName })
    }
  }

  _onUpdate = (ts, dt) => {
    // const { sliderButtonPrev, sliderButtonNext } = this.$els
    
    // const sliderBtns = [sliderButtonPrev, sliderButtonNext]
    // sliderBtns.forEach((buttonEl, i) => {
    //   const dist = calc.distance({
    //     x: buttonEl.pos.origX,
    //     y: buttonEl.pos.origY,
    //   }, {
    //     x: this._mousePos.x,
    //     y: this._mousePos.y,
    //   })

    //   if (dist < SinglePage.ARROW_INTERACTION_DIST_THRESHOLD) {
    //     buttonEl.pos.vx += (this._mousePos.x - buttonEl.pos.radius / 2 - buttonEl.pos.x) * (dt * 5)
    //     buttonEl.pos.vy += (this._mousePos.y - buttonEl.pos.radius / 2 - buttonEl.pos.y) * (dt * 5)
    //     if (i === 0) {
    //       this._sliderPrevBtnHovered = true
    //       this._sliderNextBtnHovered = false
    //     } else {
    //       this._sliderPrevBtnHovered = false
    //       this._sliderNextBtnHovered = true
    //     }
    //   } else {
    //     buttonEl.pos.vx += (buttonEl.pos.origX - buttonEl.pos.radius / 2 - buttonEl.pos.x) * (dt * 5)
    //     buttonEl.pos.vy += (buttonEl.pos.origY - buttonEl.pos.radius / 2 - buttonEl.pos.y) * (dt * 5)
    //     if (i === 0) {
    //       this._sliderPrevBtnHovered = false
    //     } else {
    //       this._sliderNextBtnHovered = false
    //     }
    //   }
    //   buttonEl.pos.x += buttonEl.pos.vx
    //   buttonEl.pos.y += buttonEl.pos.vy
    //   buttonEl.pos.x *= 0.72
    //   buttonEl.pos.y *= 0.72

    // })
    // this.stylers.sliderButtonPrev.set({
    //   x: sliderButtonPrev.pos.x,
    //   y: sliderButtonPrev.pos.y,
    // })
    // this.stylers.sliderButtonNext.set({
    //   x: sliderButtonNext.pos.x,
    //   y: sliderButtonNext.pos.y,
    // })
  }
  
  _onMouseMove = ({ mouseX, mouseY }) => {
    this._mousePos.x = mouseX
    this._mousePos.y = mouseY
  }

  _setContentTexts = ({ modelName }) => {
    const project = this._projectsData.find(project => project.modelName === modelName)
    this.$els.title.textContent = project.modelName
    this.$els.subtitle.textContent = project.subheading
    this.$els.description.innerHTML = project.description
    this.$els.pricing.textContent = project.pricing
    this.$els.type.innerHTML = `Type  <span class="meta-desc">${project.type}</span>`
    this.$els.generation.innerHTML = `Gen.  <span class="meta-desc">${project.gen}</span>`
    this.$els.style.innerHTML = `Style  <span class="meta-desc">${project.style}</span>`
    
    this._setProjectDescList(this.$els.descriptionList, null)
    this._setProjectDescList(this.$els.fabricTechnologyList, project.fabricTechnologies)
    this._setProjectDescList(this.$els.systemsList, project.systems)
    this._setProjectDescList(this.$els.subsystemsList, project.subsystems)
    this._setProjectDescList(this.$els.includesList, project.includes)
    this._setProjectDescList(this.$els.interfaceWithList, project.interfaceWith)
    
    this.$els.prevProductButton.children[0].textContent = this._prevModelName
    this.$els.nextProductButton.children[0].textContent = this._nextModelName
  }

  _setProjectDescList = (element, list) => {
    const label = element.getElementsByTagName('h2')[0]
    const listWrapper = element.getElementsByTagName('ul')[0]
    listWrapper.innerHTML = ''
    if (!list) {
      element.style.display = 'none'
    } else {
      element.style.display = 'block'
      list.forEach(el => {
        el = el.trim()
        const li = document.createElement('li')
        li.innerHTML = el
        el === '<br/>' && li.style.setProperty('list-style', 'none')
        listWrapper.appendChild(li)
      })
    }
  }

  _fadeProjectDescription = ({ direction = 1, duration = 300, includeButtons = true, parralel = false } = {}) => new Promise(resolve => {
    let fadeInEls = [...this.$els.wrapper.getElementsByClassName('fade-in')]
    if (!includeButtons) {
      const buttonNavWrapper = fadeInEls.find(el => el.classList.contains('single-page-nav'))
      fadeInEls = fadeInEls.filter(el => !el.classList.contains('single-page-nav'))
      const buttonElPrevLabel = buttonNavWrapper.children[0].children[0]
      const buttonElNextLabel = buttonNavWrapper.children[1].children[0]
      const labels = [buttonElPrevLabel, buttonElNextLabel]
      labels.forEach((el, i) => {
        const elStyler = styler(el)
        tween({
          duration,
        }).start({
        update: tweenFactor => {
          if (direction === -1) {
            tweenFactor = 1 - tweenFactor
          }
          elStyler.set('opacity', tweenFactor)
        }})
      })
    }
    fadeInEls.forEach((child, i) => {
      const childStyler = styler(child)
      chain(
        delay(parralel ? 0 : i * 150),
        tween({ duration })
      ).start({
        update: tweenFactor => {
          if (direction === -1) {
            tweenFactor = 1 - tweenFactor
          }
          childStyler.set('opacity', tweenFactor)
        },
        complete: () => {
          if (direction === 1) {
            childStyler.set('pointer-events', 'auto')
            if (i === 0) {
              this.stylers.wrapper.set('user-select', 'auto')
            }
          } else {
            childStyler.set('pointer-events', 'none')
          }
          if (i === fadeInEls.length - 1) {
            resolve()
          }
        }
      })
    })
  })

  _onOpening = ({ tweenFactor }) => {
    const closeButtonTweenY = clampNumber(mapNumber(tweenFactor, 0, 0.75, -100, 0), -100, 0)
    const closeButtonTweenRotate = clampNumber(mapNumber(tweenFactor, 0, 0.75, -480, 0), -480, 0)
    this.stylers.closeButton.set({
      y: closeButtonTweenY,
      rotate: closeButtonTweenRotate,
    })
  }

  _onOpen = ({ modelName }) => {
    this._prevModelName = this._projectsData[projectIdx - 1] ? this._projectsData[projectIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName
    this._currModelName = modelName
    this._nextModelName = this._projectsData[projectIdx + 1] ? this._projectsData[projectIdx + 1].modelName : this._projectsData[0].modelName

    const projectIdx = this._projectsData.findIndex(project => project.modelName === modelName)

    this._setContentTexts({ modelName })

    eventEmitter.on(EVT_MOUSEMOVE_APP, this._onMouseMove)
    document.body.addEventListener('click', this._checkSliderClick, false)
    this.$els.closeButton.addEventListener('click', this._closeButtonClick, false)
    const { sliderButtonPrev, sliderButtonNext } = this.$els
    
    this.stylers.wrapper.set('pointerEvents', 'auto')
    // document.body.style.setProperty('cursor', 'auto')

    this._fadeProjectDescription()

    const sliderBtns = [sliderButtonPrev, sliderButtonNext]
    sliderBtns.forEach((button, i) => {
      const buttonStyler = styler(button)
      chain(
        delay(i * 150),
        tween()
      ).start({
        update: tweenFactor => buttonStyler.set('opacity', tweenFactor),
      })
    })
  }

  _onClosing = ({ tweenFactor }) => {
    const closeButtonTweenY = mapNumber(tweenFactor, 0.75, 0, -100, 0)
    const closeButtonTweenRotate = mapNumber(tweenFactor, 0.75, 0, -480, 0)
    this.stylers.closeButton.set({
      y: closeButtonTweenY,
      rotate: closeButtonTweenRotate,
    })
  }

  _closeButtonClick = () => {
    eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, this._currModelName)

    const { sliderButtonPrev, sliderButtonNext, wrapper } = this.$els
    const fadeInEls = [...wrapper.getElementsByClassName('fade-in')]

    this.stylers.wrapper.set('pointerEvents', 'none')
    this.stylers.wrapper.set('user-select', 'none')
    // document.body.style.setProperty('cursor', 'none')

    this._fadeProjectDescription({ duration: 300, parralel: true, direction: -1 })

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
            eventEmitter.emit(EVT_FADE_OUT_SINGLE_VIEW, this._currModelName)
          }
        },
      })
    })
    
    document.body.removeEventListener('click', this._checkSliderClick)
    this.$els.closeButton.removeEventListener('click', this._closeButtonClick, false)
    
    eventEmitter.off(EVT_MOUSEMOVE_APP, this._onMouseMove)
  }
  

}