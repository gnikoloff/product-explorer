import * as THREE from 'three'

import {
  PREVIEW_PHOTO_REF_WIDTH,
} from './helpers'

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

export const getItemsCountPerGridRow = () => {
  let itemsCount = 1
  if (innerWidth > 760 && innerWidth <= 1140) {
    itemsCount = 2
  } else if (innerWidth > 1140 && innerWidth <= 1550) {
    itemsCount = 3
  } else if (innerWidth > 1550) {
    itemsCount = 4
  }
  return itemsCount
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
  // debugCanvas(canvas)
  return new THREE.CanvasTexture(canvas)
}

export const getProductLabelTexture = (label, sizeX = 512, sizeY = 128) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = sizeX
  canvas.height = sizeY
  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = 'normal 58px Helvetica'
  ctx.fillText(label, canvas.width / 2, canvas.height / 2)
  // debugCanvas(canvas)
  const texture = new THREE.CanvasTexture(canvas)
  texture.isFlipped = true
  return texture
}

function debugCanvas (canvas) {
  canvas.style.position = 'fixed'
  canvas.style.zIndex = '999'
  canvas.style.left = canvas.style.bottom = '10px'
  document.body.appendChild(canvas)
}
