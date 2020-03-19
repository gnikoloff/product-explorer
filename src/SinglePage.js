import styler from 'stylefire'
import { tween, chain, delay } from 'popmotion'

export default class SinglePage {
  constructor () {
    this._singlePageWrapper = document.getElementsByClassName('single-page-wrapper')[0]
    this._singlePage = this._singlePageWrapper.getElementsByClassName('single-page')[0]
    this._singlePageStyler = styler(this._singlePage)

    this._singlePageScrollIndicator = this._singlePageWrapper.getElementsByClassName('scroll-indicator')[0]
    this._singlePageScrollIndicatorStyler = styler(this._singlePageScrollIndicator)

    this._singlePageIntroImage = this._singlePageWrapper.getElementsByClassName('intro-img')[0]
    this._singlePageIntroImageStyler = styler(this._singlePageIntroImage)

    this._singlePageIntroTitle = this._singlePageWrapper.getElementsByClassName('intro-title')[0]
    this._singlePageIntroTitleStyler = styler(this._singlePageIntroTitle)

    this._singlePageBigHeadlineWrapper = this._singlePageWrapper.getElementsByClassName('single-page-big-headline')[0]
    this._singlePageBigHeadline = this._singlePageBigHeadlineWrapper.getElementsByClassName('single-page-big-headline-text')[0]

    this._singlePageIntroSubheading = this._singlePageWrapper.getElementsByClassName('intro-subheading')[0]
    this._singlePageIntroSubheadingStyler = styler(this._singlePageIntroSubheading)

    this._singlePageDescription = this._singlePageWrapper.getElementsByClassName('single-page-desc')[0]
    this._singlePageFabricTechnologies = this._singlePageWrapper.getElementsByClassName('single-page-tech')[0]

    this._singlePageSectionLink = this._singlePageWrapper.getElementsByClassName('single-page-section-link')[0]

    this._scrollIndicatorFadedScroll = false
    this._scrollIndicatorFadedScrollTransition = false

    this.onScroll = this.onScroll.bind(this)
  }

  onScroll () {
    if (this._singlePage.scrollTop > 20) {
      if (this._scrollIndicatorFadedScroll || this._scrollIndicatorFadedScrollTransition) {
        return
      }
      this._scrollIndicatorFadedScrollTransition = true
      tween({ from: 1, to: 0, duration: 250 })
        .start({
          update: v => this._singlePageScrollIndicatorStyler.set({ opacity: v }),
          complete: () => {
            this._scrollIndicatorFadedScroll = true
            this._scrollIndicatorFadedScrollTransition = false
          },
        })
    } else {
      if (!this._scrollIndicatorFadedScroll || this._scrollIndicatorFadedScrollTransition) {
        return
      }
      this._scrollIndicatorFadedScrollTransition = true
      tween({ from: 0, to: 1, duration: 250 })
        .start({
          update: v => this._singlePageScrollIndicatorStyler.set({ opacity: v }),
          complete: () => {
            this._scrollIndicatorFadedScroll = false
            this._scrollIndicatorFadedScrollTransition = false
          },
        })
    }
  }

  open (project) {
    this._singlePage.addEventListener('scroll', this.onScroll, false)
    
    this._singlePageIntroImageStyler.set({ backgroundImage: `url(${project.previewSrc})` })
    tween({
      from: 0,
      to: 1,
    }).start(v => {
      this._singlePageIntroImageStyler.set({ opacity: v })
    })
    tween({
      from: 100,
      to: 0,
    }).start(v => {
      this._singlePageStyler.set({ y: `${v}%` })
    })
    tween({
      from: 0,
      to: 1,
    }).start(v => this._singlePageIntroTitleStyler.set({ opacity: v }))

    chain(
      delay(1000),
      tween({
        from: 0,
        to: 1,
      })
    ).start(v => this._singlePageScrollIndicatorStyler.set({ opacity: v }))
    

    this._singlePageIntroTitle.textContent = project.modelName
    
    this._singlePageBigHeadlineWrapper.setAttribute('viewBox', project.bigHeadingViewBox)
    this._singlePageBigHeadline.setAttribute('y', project.bigHeadingTextY)
    this._singlePageBigHeadline.textContent = project.modelName
    this._singlePageBigHeadline.style.fontSize = project.bigHeadingFontSize

    this._singlePageIntroSubheading.textContent = project.subheading
    this._singlePageDescription.innerHTML = project.description

    project.fabricTechnologies.forEach(tech => {
      const li = document.createElement('li')
      li.innerText = tech
      this._singlePageFabricTechnologies.appendChild(li)
    })

    this._singlePageSectionLink.setAttribute('href', project.websiteURL)
  }
}