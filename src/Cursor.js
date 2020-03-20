
import * as THREE from 'three'
import styler from 'stylefire'

import { tween, chain, delay } from 'popmotion'

export default class Cursor {
  constructor () {
    this._position = new THREE.Vector2(0, 0)
    this._mousePos = new THREE.Vector2(0, 0)
    this._isCursorTransitioning = false
    this._isVisible = false
    this._domEl = document.getElementsByClassName('hover-cursor')[0]
    this._domElStyler = styler(this._domEl)
    this._tweens = []
  }
  get position () {
    return this._position
  }
  onMouseMove (pageX, pageY) {
    this._mousePos.set(pageX, pageY)
  }
  setText (text) {
    this._domEl.innerHTML = null
    this._spans = text.split('').map(char => {
      const span = document.createElement('span')
      span.textContent = char
      span.styler = styler(span)
      this._domEl.appendChild(span)
      return span
    })
    return this
  }
  show () {
    this._position.copy(this._mousePos)
    if (this._isVisible || this._isCursorTransitioning) {
      return
    }
    this._tweens.forEach(tween => tween.stop())
    this._isCursorTransitioning = true
    this._tweens = this._spans.map((child, i) => {
      return chain(
        delay(i * 100),
        tween({
          from: 0,
          to: { opacity: 1, x: 0, y: 0, scale: 1 },
        })
      ).start({
        update: child.styler.set,
        complete: () => {
          if (i === this._spans.length - 1) {
            this._isCursorTransitioning = false
            this._isVisible = true
          }
        }
      })
    })
    return this
  }
  hide () {
    if (!this._isVisible || this._isCursorTransitioning) {
      return
    }
    this._tweens.forEach(tween => tween.stop())
    this._isCursorTransitioning = true
    this._tweens = this._spans.reverse().map((child, i) => {
      return chain(
        delay(i * 100),
        tween({
          from: 1,
          to: { opacity: 0, x: -5, y: -5, scale: 0.5 },
          duration: 100,
        })
      ).start({
        update: child.styler.set,
        complete: () => {
          if (i === this._spans.length - 1) {
            this._isCursorTransitioning = false
            this._isVisible = false
          }
        }
      })
    })
    return this
  }
  onUpdate (ts, dt) {
    this._position.x += (this._mousePos.x - this._position.x) * (dt * 15)
    this._position.y += (this._mousePos.y - this._position.y) * (dt * 15)
    this._domElStyler.set({ x: this._position.x, y: this._position.y })
    return this
  }
}