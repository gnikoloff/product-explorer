import * as THREE from 'three'

export const clampNumber = (num, min, max) => Math.min(Math.max(num, min), max)

export const mapNumber = (num, inMin, inMax, outMin, outMax) => (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin

export const getSiglePagePhotoScale = () => {
  const width = innerWidth * devicePixelRatio
  let scaleFactor = 1
  if (width > 1100 && width < 1300) {
    scaleFactor = 1.25
  } else if (width >= 1300 && width < 1500) {
    scaleFactor = 1.6
  } else if (width >= 1500) {
    scaleFactor = 1.75
  }
  return scaleFactor
}

export const getArrowTexture = () => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 128
  canvas.height = 128
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.lineWidth = 20
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#111'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(40, 40)
  ctx.stroke()
  ctx.moveTo(0, 0)
  ctx.lineTo(40, -40)
  ctx.stroke()
  // canvas.style.position = 'fixed'
  // canvas.style.zIndex = '999'
  // canvas.style.left = canvas.style.bottom = '10px'
  // document.body.appendChild(canvas)
  return new THREE.CanvasTexture(canvas)
}
