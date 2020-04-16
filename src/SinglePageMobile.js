import styler from 'stylefire'
import { chain, tween, delay } from 'popmotion'

import eventEmitter from './event-emitter'

import {
  EVT_LOADED_PROJECTS,
  EVT_OPEN_REQUEST_SINGLE_PROJECT,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_FADE_OUT_SINGLE_VIEW,
  EVT_SINGLE_PROJECT_MASK_OPENING,
  EVT_SINGLE_PROJECT_MASK_CLOSING,
} from './constants'
import {
  clampNumber,
  mapNumber,
} from './helpers'

export default class SinglePageMobile {
  constructor () {
    this._prevModelName = null
    this._currModelName = null
    this._nextModelName = null
    this._projectsData = []
    this._observeElementsList = []

    const wrapper = document.getElementsByClassName('single-page-wrapper')[0]
    this.$els = {
      wrapper,
      appHeader: document.body.getElementsByClassName('app-header')[0],
      singlePageWrapper: wrapper.getElementsByClassName('single-page-info-wrapper')[0],
      container: wrapper.getElementsByClassName('single-page-container')[0],
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
      galleryWrapper: wrapper.getElementsByClassName('single-page-mobile-gallery')[0],
      galleryList: wrapper.getElementsByClassName('gallery-list')[0],
      closeBtn: wrapper.getElementsByClassName('close-single-page')[0],
      openLinkBtn: wrapper.getElementsByClassName('open-product-page')[1],
      mobileNav: wrapper.getElementsByClassName('mobile-single-page-nav')[0],
      prevProductButton: wrapper.getElementsByClassName('mobile-nav-btn-left')[0],
      nextProductButton: wrapper.getElementsByClassName('mobile-nav-btn-right')[0],
    }

    this.stylers = {
      wrapper: styler(wrapper),
      appHeader: styler(this.$els.appHeader),
      closeBtn: styler(this.$els.closeBtn),
      mobileNav: styler(this.$els.mobileNav),
      openLinkBtn: styler(this.$els.openLinkBtn),
    }

    this.$els.closeBtn.addEventListener('click', this._closeView)
    this.$els.prevProductButton.addEventListener('click', () => {
      this._nextModelName = this._currModelName
      this._currModelName = this._prevModelName
      const currNextIdx = this._projectsData.findIndex(item => item.modelName === this._prevModelName)
      this._prevModelName = this._projectsData[currNextIdx - 1] ? this._projectsData[currNextIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName
      this._setContentTexts({ modelName: this._currModelName })
    })
    this.$els.nextProductButton.addEventListener('click', () => {
      this._prevModelName = this._currModelName
      this._currModelName = this._nextModelName
      const currNextIdx = this._projectsData.findIndex(item => item.modelName === this._nextModelName)
      this._nextModelName = this._projectsData[currNextIdx + 1] ? this._projectsData[currNextIdx + 1].modelName : this._projectsData[0].modelName
      this._setContentTexts({ modelName: this._currModelName })
    })

    eventEmitter.on(EVT_LOADED_PROJECTS, this._onProjectsLoaded)
    eventEmitter.on(EVT_OPEN_REQUEST_SINGLE_PROJECT, this._onOpenRequest)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpen)
    eventEmitter.on(EVT_SINGLE_PROJECT_MASK_OPENING, ({ tweenFactor }) => {
      const opacity = clampNumber(mapNumber(tweenFactor, 0.4, 1, 0, 1), 0, 1)
      this.stylers.closeBtn.set({
        'pointer-events': 'auto',
        'opacity': opacity,
      })
      this.stylers.openLinkBtn.set({
        'pointer-events': 'auto',
      })
      this.stylers.mobileNav.set({
        'pointer-events': 'auto',
        'opacity': opacity,
      })
    })
    eventEmitter.on(EVT_SINGLE_PROJECT_MASK_CLOSING, ({ tweenFactor }) => {
      const opacity = clampNumber(mapNumber(tweenFactor, 0, 0.6, 1, 0), 0, 1)
      this.stylers.closeBtn.set({
        'pointer-events': 'none',
        'opacity': opacity,
      })
      this.stylers.openLinkBtn.set({
        'pointer-events': 'none',
      })
      this.stylers.mobileNav.set({
        'pointer-events': 'none',
        'opacity': opacity,
      })
    })
  }
  _closeView = () => {
    this._fadeProjectDescription({ direction: -1 }).then(() => {
      this.stylers.wrapper.set({
        'pointer-events': 'none',
        'background': 'transparent'
      })
      this.stylers.closeBtn.set('pointer-events', null)
      this.stylers.appHeader.set('pointer-events', null)
      this._observeElementsList.forEach(({ observer, el }) => observer.unobserve(el))
      this._observeElementsList = []
      eventEmitter.emit(EVT_FADE_OUT_SINGLE_VIEW, this._currModelName)
    })
  }
  _onProjectsLoaded = ({ projectsData }) => {
    this._projectsData = projectsData
  }
  _onOpenRequest = ({ modelName }) => {
    const project = this._projectsData.find(project => project.modelName === modelName)
    const projectIdx = this._projectsData.findIndex(project => project.modelName === modelName)
    this._prevModelName = this._projectsData[projectIdx - 1] ? this._projectsData[projectIdx - 1].modelName : this._projectsData[this._projectsData.length - 1].modelName
    this._currModelName = modelName
    this._nextModelName = this._projectsData[projectIdx + 1] ? this._projectsData[projectIdx + 1].modelName : this._projectsData[0].modelName
    this.$els.prevProductButton.textContent = this._prevModelName
    this.$els.nextProductButton.textContent = this._nextModelName
    this.$els.openLinkBtn.setAttribute('href', project.websiteURL)
    this._observeElementsList.forEach(({ observer, el }) => observer.unobserve(el))
    this._observeElementsList = []
  }
  _onOpen = ({ modelName }) => {
    this._setContentTexts({ modelName })
    this.stylers.wrapper.set({
      'pointer-events': 'auto',
      'background': '#fff',
    })
    this.stylers.closeBtn.set('pointer-events', 'auto')
    this.stylers.appHeader.set('pointer-events', 'none')
    this._fadeProjectDescription()
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
  _setContentTexts = ({ modelName }) => {
    this.$els.wrapper.scroll(0, 0)
    this.$els.galleryWrapper.scroll(0, 0)

    const project = this._projectsData.find(project => project.modelName === modelName)
    this.$els.title.innerHTML = project.modelName
    this.$els.subtitle.innerHTML = project.subheading
    this.$els.description.innerHTML = project.description
    this.$els.pricing.innerHTML = project.pricing
    this.$els.type.innerHTML = `Type  <span class="meta-desc">${project.type}</span>`
    this.$els.generation.innerHTML = `Gen.  <span class="meta-desc">${project.gen}</span>`
    this.$els.style.innerHTML = `Style  <span class="meta-desc">${project.style}</span>`
    
    this._setProjectDescList(this.$els.descriptionList, null)
    this._setProjectDescList(this.$els.fabricTechnologyList, project.fabricTechnologies)
    this._setProjectDescList(this.$els.systemsList, project.systems)
    this._setProjectDescList(this.$els.subsystemsList, project.subsystems)
    this._setProjectDescList(this.$els.includesList, project.includes)
    this._setProjectDescList(this.$els.interfaceWithList, project.interfaceWith)

    this.$els.prevProductButton.textContent = this._prevModelName
    this.$els.nextProductButton.textContent = this._nextModelName
    
    this.$els.galleryList.innerHTML = ''
    project.sliderPhotos.forEach(photoSrc => {
      const li = document.createElement('li')
      li.classList.add('gallery-item')
      this.$els.galleryList.appendChild(li)

      const observer = new IntersectionObserver((changes) => {
        if (!changes[0].isIntersecting) {
          return
        }
        const onSliderImageLoad = () => {
          img.style.setProperty('opacity', '1')
          img.removeEventListener('load', onSliderImageLoad)  
        }
        const img = document.createElement('img')
        img.addEventListener('load', onSliderImageLoad)
        img.src = photoSrc
        li.appendChild(img)

        console.log(`${img.src} entered viewport`)

        observer.unobserve(li)
      }, { threshold: 0.2 })
      observer.observe(li)
      this._observeElementsList.push({ observer, el: li })
    })
    
    // this.$els.prevProductButton.children[0].textContent = this._prevModelName
    // this.$els.nextProductButton.children[0].textContent = this._nextModelName
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
}
