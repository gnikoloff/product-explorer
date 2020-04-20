import styler from 'stylefire'
import { tween, chain, delay, calc } from 'popmotion'

import eventEmitter from './event-emitter'

import {
  getSiglePagePhotoScale,
  clampNumber,
  mapNumber,
  isIPadOS,
} from './helpers'

import {
  PREVIEW_PHOTO_REF_WIDTH,
  PREVIEW_PHOTO_REF_HEIGHT,
  EVT_APP_RESIZE,
  EVT_OPEN_SINGLE_PROJECT,  
  EVT_CLOSING_SINGLE_PROJECT,
  EVT_CLOSE_SINGLE_PROJECT,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_SLIDER_BUTTON_LEFT_CLICK,
  EVT_SLIDER_BUTTON_NEXT_CLICK,
  EVT_SLIDER_DRAG,
  EVT_SLIDER_DRAG_CANCEL,
  EVT_SLIDER_REPLACE_TEXTURES,
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
    this._prevModelName = null
    this._currModelName = null
    this._nextModelName = null
    this._alreadyReplacedTextures = false
    this._sizerMouseDown = false
    this._startMouseDownX = 0
    this._isNavigatingToOtherProduct = false

    const wrapper = document.getElementsByClassName('single-page-wrapper')[0]
    this.$els = {
      wrapper,
      singlePageInfo: wrapper.getElementsByClassName('single-page-info')[0],
      singlePageContainer: wrapper.getElementsByClassName('single-page-container')[0],
      singlePageWrapper: wrapper.getElementsByClassName('single-page-info-wrapper')[0],
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
      singlePageNav: wrapper.getElementsByClassName('single-page-nav')[0],
      sliderHint: wrapper.getElementsByClassName('slider-hint')[0],
      sliderHintActionType: document.getElementById('slider-hint-action-type'),
      prevProductButton: wrapper.getElementsByClassName('single-page-prev-button')[0],
      nextProductButton: wrapper.getElementsByClassName('single-page-next-button')[0],
      closeButton: wrapper.getElementsByClassName('close-single-page')[0],
      openExternalLink: wrapper.getElementsByClassName('open-product-page')[0],
      sizer: wrapper.getElementsByClassName('single-page-slider-sizer')[0],
      appLogo: document.body.getElementsByClassName('app-logo')[0],
    }

    this.$els.sliderHintActionType.textContent = isIPadOS() ? 'swipe' : 'drag'

    this.stylers = {
      wrapper: styler(this.$els.wrapper),
      singlePageInfo: styler(this.$els.singlePageInfo),
      sliderButtonPrev: styler(this.$els.sliderButtonPrev),
      sliderButtonNext: styler(this.$els.sliderButtonNext),
      closeButton: styler(this.$els.closeButton),
      openExternalLink: styler(this.$els.openExternalLink),
      singlePageContainer: styler(this.$els.singlePageContainer),
    }
    
    eventEmitter.on(EVT_LOADED_PROJECTS, this._onProjectsLoaded)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpen)
    eventEmitter.on(EVT_CLOSING_SINGLE_PROJECT, this._onClosing)
    // eventEmitter.on(EVT_RAF_UPDATE_APP, this._onUpdate)
    eventEmitter.on(EVT_NEXT_PROJECT_TRANSITIONED_IN, this._removeBackgroundColor)
    eventEmitter.on(EVT_TRANSITION_OUT_CURRENT_PRODUCT_PHOTO, () => {
      this._fadeProjectDescription({ duration: 200, direction: 1 }).then(() => {
        this.$els.singlePageWrapper.classList.remove('non-scrollable')
        // this.$els.prevProductButton.classList.remove('non-interactable')
        // this.$els.nextProductButton.classList.remove('non-interactable')
        // this.$els.prevProductButton.classList.remove('clicked')
        // this.$els.nextProductButton.classList.remove('clicked')
        this._isNavigatingToOtherProduct = false
      })
    })

    this.$els.prevProductButton.addEventListener('click', () => {
      if (this._isNavigatingToOtherProduct) {
        return
      }
      this._nextModelName = this._currModelName
      this._currModelName = this._prevModelName
      const currNextIdx = this._projectsData.findIndex(item => item.modelName === this._prevModelName)
      this._prevModelName = this._projectsData[currNextIdx - 1] ? this._projectsData[currNextIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName

      eventEmitter.emit(EVT_CLICK_PREV_PROJECT, ({ modelName: this._currModelName }))
      this.stylers.singlePageContainer.set('background-color', SinglePage.pageBackground)
      this.$els.singlePageWrapper.classList.add('non-scrollable')
      // this.$els.prevProductButton.classList.add('non-interactable')
      // this.$els.nextProductButton.classList.add('non-interactable')
      // this.$els.prevProductButton.classList.add('clicked')
      this._isNavigatingToOtherProduct = true

      this._fadeProjectDescription({ duration: 100, parralel: true, direction: -1 }).then(() => {
        this._setContentTexts({ modelName: this._currModelName })
      })
    }, false)

    this.$els.nextProductButton.addEventListener('click', () => {
      if (this._isNavigatingToOtherProduct) {
        return
      }
      this._prevModelName = this._currModelName
      this._currModelName = this._nextModelName
      const currNextIdx = this._projectsData.findIndex(item => item.modelName === this._nextModelName)
      this._nextModelName = this._projectsData[currNextIdx + 1] ? this._projectsData[currNextIdx + 1].modelName : this._projectsData[0].modelName

      eventEmitter.emit(EVT_CLICK_NEXT_PROJECT, ({ modelName: this._currModelName }))
      this.stylers.singlePageContainer.set('background-color', SinglePage.pageBackground)
      this.$els.singlePageWrapper.classList.add('non-scrollable')
      // this.$els.prevProductButton.classList.add('non-interactable')
      // this.$els.nextProductButton.classList.add('non-interactable')
      // this.$els.nextProductButton.classList.add('clicked')
      this._isNavigatingToOtherProduct = true
      this._fadeProjectDescription({ duration: 100, parralel: true, direction: -1 }).then(() => {
        this._setContentTexts({ modelName: this._currModelName })
      })
    }, false)

    eventEmitter.on(EVT_APP_RESIZE, this._onResize)
    this._onResize()

    this.$els.sizer.addEventListener('mousedown', this._onSliderMouseDown, false)
    this.$els.sizer.addEventListener('mousemove', this._onSliderMouseMove)
    this.$els.sizer.addEventListener('mouseup', this._onSliderMouseUp, false)
    this.$els.sizer.addEventListener('mouseleave', this._onSliderMouseLeave, false)

    this.$els.sizer.addEventListener('touchstart', this._onSliderMouseDown, false)
    this.$els.sizer.addEventListener('touchmove', this._onSliderMouseMove)
    this.$els.sizer.addEventListener('touchend', this._onSliderMouseUp, false)
    // this.$els.sizer.addEventListener('touchcancel', this._onSliderMouseLeave, false)
  }

  _onResize = () => {
    const sizerWidth = PREVIEW_PHOTO_REF_WIDTH * getSiglePagePhotoScale()
    const sizerHeight = PREVIEW_PHOTO_REF_HEIGHT * getSiglePagePhotoScale()
    this.$els.sizer.style.setProperty('width', `${sizerWidth}px`)
    this.$els.sizer.style.setProperty('height', `${Math.min(sizerHeight, innerHeight)}px`)
    this.$els.sizer.style.setProperty('margin', `-${sizerHeight / 2}px 0 0 calc(-${sizerWidth / 2}px - 25vw)`)
  }

  _onSliderMouseLeave = e => {
    this.$els.sizer.classList.remove('grabbing')
    this._sizerMouseDown = false
    this._alreadyReplacedTextures = false
    eventEmitter.emit(EVT_SLIDER_DRAG_CANCEL, { modelName: this._currModelName })
  }

  _onSliderMouseDown = e => {
    this.$els.sizer.classList.add('grabbing')
    this._startMouseDownX = e.changedTouches ? e.changedTouches[0].pageX : e.pageX
    this._sizerMouseDown = true
  }

  _onSliderMouseMove = e => {
    if (!this._sizerMouseDown) {
      return
    }
    console.log('move')
    const pointerX = e.changedTouches ? e.changedTouches[0].pageX : e.pageX
    const modelName = this._currModelName
    const diffx = pointerX - this._startMouseDownX
    if (Math.abs(diffx) < 50) {
      return
    }
    let tweenFactor = 0
    if (diffx < 0) {
      if (!this._alreadyReplacedTextures) {
        eventEmitter.emit(EVT_SLIDER_REPLACE_TEXTURES, { modelName, direction: -1 })
        this._alreadyReplacedTextures = true
      }
      tweenFactor = clampNumber(mapNumber(diffx, 0, -250, 1, 0), 0, 1)
      eventEmitter.emit(EVT_SLIDER_DRAG, {
        tweenFactor,
        modelName,
        direction: -1,
      })
    } else if (diffx > 0) {
      tweenFactor = clampNumber(mapNumber(diffx, 0, 250, 0, 1), 0, 1)
      eventEmitter.emit(EVT_SLIDER_DRAG, {
        tweenFactor,
        modelName,
        direction: 1,
      })
      if (!this._alreadyReplacedTextures) {
        eventEmitter.emit(EVT_SLIDER_REPLACE_TEXTURES, { modelName, direction: 1 })
        this._alreadyReplacedTextures = true
      }
    }
    
  }

  _onSliderMouseUp = e => {
    this.$els.sizer.classList.remove('grabbing')
    this._sizerMouseDown = false
    this._alreadyReplacedTextures = false
    eventEmitter.emit(EVT_SLIDER_DRAG_CANCEL, { modelName: this._currModelName })
  }

  _removeBackgroundColor = () => {
    this.stylers.singlePageContainer.set('background-color', 'transparent')
  }

  _onProjectsLoaded = ({ projectsData }) => {
    this._projectsData = projectsData
  }

  _checkSliderClick = e => {
    if (e.target.classList.contains('slider-btn-prev')) {
      eventEmitter.emit(EVT_SLIDER_BUTTON_NEXT_CLICK, { modelName: this._currModelName })
    }
    if (e.target.classList.contains('slider-btn-next')) {
      eventEmitter.emit(EVT_SLIDER_BUTTON_LEFT_CLICK, { modelName: this._currModelName })
    }
  }

  _setContentTexts = ({ modelName }) => {
    const project = this._projectsData.find(project => project.modelName === modelName)
    this.$els.title.innerHTML = project.modelName
    this.$els.subtitle.innerHTML = project.subheading
    this.$els.description.innerHTML = project.description
    this.$els.pricing.innerHTML = project.pricing
    this.$els.type.innerHTML = `Type  <span class="meta-desc">${project.type}</span>`
    this.$els.generation.innerHTML = `Gen.  <span class="meta-desc">${project.gen}</span>`
    this.$els.style.innerHTML = `Style  <span class="meta-desc">${project.style}</span>`

    this.$els.openExternalLink.setAttribute('href', project.websiteURL)
    console.log(project.websiteURL)
    
    this._setProjectDescList(this.$els.descriptionList, null)
    this._setProjectDescList(this.$els.fabricTechnologyList, project.fabricTechnologies)
    this._setProjectDescList(this.$els.systemsList, project.systems)
    this._setProjectDescList(this.$els.subsystemsList, project.subsystems)
    this._setProjectDescList(this.$els.includesList, project.includes)
    this._setProjectDescList(this.$els.interfaceWithList, project.interfaceWith)
    
    this.$els.prevProductButton.children[0].textContent = this._prevModelName
    this.$els.nextProductButton.children[0].textContent = this._nextModelName

    setTimeout(() => {
      this.$els.singlePageWrapper.scroll(0, 0)
    }, 0)
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

  _fadeProjectDescription = ({ direction = 1, duration = 300, parralel = false } = {}) => new Promise(resolve => {
    const animatedEls = [...this.$els.wrapper.getElementsByClassName('fade-in')]
    const fadeInEls = animatedEls
      .map(item => {
        item.y = item.getBoundingClientRect().top
        return item
      })
      .filter(item => item.y < innerHeight)
    const belowTheFoldEls = animatedEls.filter(item => item.y > innerHeight)
    belowTheFoldEls.forEach(el => {
      const stylerEl = styler(el)
      stylerEl.set('opacity', direction === -1 ? 0 : 1)
    })
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

  _onOpen = ({ modelName }) => {
    const projectIdx = this._projectsData.findIndex(project => project.modelName === modelName)
    this._prevModelName = this._projectsData[projectIdx - 1] ? this._projectsData[projectIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName
    this._currModelName = modelName
    this._nextModelName = this._projectsData[projectIdx + 1] ? this._projectsData[projectIdx + 1].modelName : this._projectsData[0].modelName

    const project = this._projectsData.find(project => project.modelName === modelName)

    this._setContentTexts({ modelName })

    this.$els.sliderButtonPrev.addEventListener('click', this._checkSliderClick, false)
    this.$els.sliderButtonNext.addEventListener('click', this._checkSliderClick, false)
    this.$els.closeButton.addEventListener('click', this._closeButtonClick, false)
    this.$els.appLogo.classList.add('interactable')
    this.$els.appLogo.addEventListener('click', this._closeButtonClick, false)

    const { sliderButtonPrev, sliderButtonNext } = this.$els
    
    this.stylers.wrapper.set('pointerEvents', 'auto')
    // document.body.style.setProperty('cursor', 'auto')

    
    this.$els.singlePageNav.classList.add('faded')
    this.$els.sliderHint.classList.add('faded')
    this._fadeProjectDescription().then(() => {
      this.stylers.closeButton.set({
        opacity: 1,
        pointerEvents: 'auto',
      })
      this.stylers.openExternalLink.set({
        opacity: 1,
        pointerEvents: 'auto',
      })
    })

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
    // ...
  }

  _closeButtonClick = () => {
    eventEmitter.emit(EVT_CLOSE_SINGLE_PROJECT, this._currModelName)
    const { sliderButtonPrev, sliderButtonNext, wrapper } = this.$els

    this.stylers.wrapper.set('pointerEvents', 'none')
    this.stylers.wrapper.set('user-select', 'none')
    // document.body.style.setProperty('cursor', 'none')

    this.stylers.closeButton.set({
      opacity: 0,
      pointerEvents: 'none',
    })
    this.stylers.openExternalLink.set({
      opacity: 0,
      pointerEvents: 'none',
    })
    this.$els.singlePageNav.classList.remove('faded')
    this.$els.sliderHint.classList.remove('faded')

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
    this.$els.appLogo.classList.remove('interactable')
    this.$els.appLogo.removeEventListener('click', this._closeButtonClick)
  }
  

}