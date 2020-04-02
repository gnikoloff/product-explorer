import * as THREE from 'three'

export default class Effect extends THREE.Mesh {
  constructor ({
    width,
    height,
    uniforms,
    vertexShader,
    fragmentShader,
    transparent = true,
  }) {
    const geometry = new THREE.PlaneGeometry(width, height)
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent,
    })
    super(geometry, material)

    this._width = width
    this._height = height
  }
  get uniforms () {
    return this.material.uniforms
  }
  onResize () {
    const scaleDeltaX = innerWidth / this._width
    const scaleDeltaY = innerHeight / this._height
    this.scale.set(scaleDeltaX, scaleDeltaY, 1)
    this.material.uniforms.u_resolution.value.set(innerWidth, innerHeight) 
  }
}
