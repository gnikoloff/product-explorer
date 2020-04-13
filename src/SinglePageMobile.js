import styler from 'stylefire'

import eventEmitter from './event-emitter'

import {
  EVT_LOADED_PROJECTS,
  EVT_OPEN_SINGLE_PROJECT,
  EVT_CLOSING_SINGLE_PROJECT,
} from './constants'

export default class SinglePageMobile {
  constructor () {
    this._projectsData = []

    const wrapper = document.getElementsByClassName('single-page-wrapper')[0]
    this.$els = {
      wrapper,
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
      galleryList: wrapper.getElementsByClassName('gallery-list')[0],
    }

    this.stylers = {
      wrapper: styler(wrapper),
    }

    eventEmitter.on(EVT_LOADED_PROJECTS, this._onProjectsLoaded)
    eventEmitter.on(EVT_OPEN_SINGLE_PROJECT, this._onOpen)

  }
  _onProjectsLoaded = ({ projectsData }) => {
    this._projectsData = projectsData
  }
  _onOpen = ({ modelName }) => {
    this._setContentTexts({ modelName })
    this.stylers.wrapper.set('pointerEvents', 'auto')
  }
  _setContentTexts = ({ modelName }) => {
    console.log(modelName)
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
    
    project.sliderPhotos.forEach(photoSrc => {
      const onSliderImageLoad = () => {
        img.style.setProperty('opacity', '1')
        img.removeEventListener('load', onSliderImageLoad)  
      }
      const li = document.createElement('li')
      li.classList.add('gallery-item')
      const img = document.createElement('img')
      img.addEventListener('load', onSliderImageLoad)
      img.src = photoSrc
      li.appendChild(img)
      this.$els.galleryList.appendChild(li)
    })
    
    // this.$els.prevProductButton.children[0].textContent = this._prevModelName
    // this.$els.nextProductButton.children[0].textContent = this._nextModelName

    // setTimeout(() => {
    //   this.$els.singlePageWrapper.scroll(0, 0)
    // }, 0)
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
