import * as THREE from 'three'

import vertexShader from './vertexShader.glsl'
import fragmentShader from './fragmentShader.glsl'

export default class PostProcessing extends THREE.Mesh {
  static DEFAULT_CURSOR_SIZE = 25 * (devicePixelRatio || 1)
  static HOVER_CURSOR_SIZE = 80 * (devicePixelRatio || 1)
  static DRAG_CURSOR_SIZE = 55 * (devicePixelRatio || 1)

  constructor ({
    width,
    height,
  }) {
    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_tDiffuseClip: { value: null },
        u_tDiffusePhoto: { value: null },
        u_tDiffuseCursor: { value: null },
        u_tDiffuseMask: { value: null },
        u_resolution: { value: new THREE.Vector2(width, height) },
        u_mouse: { value: new THREE.Vector2(0, 0) },
        u_cursorSize: { value: PostProcessing.DEFAULT_CURSOR_SIZE },
        u_hoverMixFactor: { value: 1.0 },
        u_cutOffFactor: { value: 1.0 },
      },
      transparent: true,
      vertexShader,
      fragmentShader,
    })
    new THREE.TextureLoader().load('/mask.png', texture => {
      material.uniforms.u_tDiffuseMask.value = texture
    })
    super(geometry, material)

    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
    this._cursorScanlineTarget = 0
  }
  onDragStart () {
    this._cursorSizeTarget = PostProcessing.DRAG_CURSOR_SIZE
  }
  onDragEnd () {
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
  }
  hover () {
    this._cursorSizeTarget = PostProcessing.HOVER_CURSOR_SIZE
    this._cursorScanlineTarget = 1
  }
  unHover () {
    this._cursorSizeTarget = PostProcessing.DEFAULT_CURSOR_SIZE
    this._cursorScanlineTarget = 0
  }
  onUpdate (ts, dt) {
    this.material.uniforms.u_cursorSize.value += (this._cursorSizeTarget - this.material.uniforms.u_cursorSize.value) * (dt * 10)
    this.material.uniforms.u_hoverMixFactor.value += (this._cursorScanlineTarget - this.material.uniforms.u_hoverMixFactor.value) * (dt * 10)
  }
}