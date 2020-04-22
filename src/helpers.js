import * as THREE from 'three'

import {
  PREVIEW_PHOTO_REF_WIDTH, PREVIEW_PHOTO_REF_HEIGHT,
} from './constants'

import patternSrc from './assets/pattern.jpg'

export const clampNumber = (num, min, max) => Math.min(Math.max(num, min), max)

export const mapNumber = (num, inMin, inMax, outMin, outMax) => (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin

export const getSiglePagePhotoScale = () => {
  const dpr = devicePixelRatio
  const width = innerWidth * dpr
  const height = innerHeight * dpr
  let scaleFactor = 1
  if (width > 1100 && width < 1300) {
    scaleFactor = 1.25
  } else if (width >= 1300 && width < 1500) {
    scaleFactor = 1.6
  } else if (width >= 1500) {
    scaleFactor = 1.5
  }
  if (PREVIEW_PHOTO_REF_WIDTH * scaleFactor * dpr > width / 2) {
    const newWidth = PREVIEW_PHOTO_REF_WIDTH * scaleFactor * dpr
    const maxWidth = width / 2 - 220
    const widthDelta = newWidth - maxWidth
    scaleFactor -= widthDelta / maxWidth
  }
  if (PREVIEW_PHOTO_REF_HEIGHT * scaleFactor * dpr > height) {
    const newHeight = PREVIEW_PHOTO_REF_HEIGHT * scaleFactor * dpr
    const maxHeight = height - 160
    const heightDelta = newHeight - maxHeight
    scaleFactor -= heightDelta / maxHeight
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
  ctx.lineWidth = 12
  ctx.lineCap = 'round'
  ctx.strokeStyle = '#555'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(40, 40)
  ctx.stroke()
  ctx.moveTo(0, 0)
  ctx.lineTo(40, -40)
  ctx.stroke()
  return new THREE.CanvasTexture(canvas)
}

export const getProductLabelTexture = (label, sizeX = 512, sizeY = 128) => new Promise((resolve, reject) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = sizeX
  canvas.height = sizeY
  const patternImg = document.createElement('img')
  const onLoad = () => {
    const pattern = ctx.createPattern(patternImg, 'repeat')
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = 'normal 58px Helvetica'
    ctx.fillText(label, canvas.width / 2, canvas.height / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.isFlipped = true
    resolve(texture)
    patternImg.removeEventListener('load', onLoad)  
  }
  patternImg.addEventListener('load', onLoad)
  patternImg.addEventListener('error', reject)
  patternImg.src = patternSrc
})

export const getHoverLabel = () => new Promise((resolve, reject) => {
  const canvas = document.createElement('canvas')
  canvas.width = 114 * 5
  canvas.height = 24 * 5
  const ctx = canvas.getContext('2d')
  const patternImg = document.createElement('img')
  const onLoad = () => {
    const pattern = ctx.createPattern(patternImg, 'repeat')
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#fff'
    ctx.textBaseline = 'middle'
    ctx.font = 'normal 64px Helvetica'
    ctx.fillText('Hold to see more', 30, canvas.height / 2)
    const texture = new THREE.CanvasTexture(canvas)
    texture.isFlipped = true
    resolve(texture)
    patternImg.removeEventListener('load', onLoad)  
  }
  patternImg.addEventListener('load', onLoad)
  patternImg.addEventListener('error', reject)
  patternImg.src = patternSrc
})

export const getInfoSectionAlphaCutoffMask = (size = 64) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = size
  canvas.height = size
  const gradient = ctx.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#eee')
  gradient.addColorStop(1, '#fff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  // canvas.setAttribute('style', `
  //   position: fixed;
  //   bottom: 1rem;
  //   right: 1rem;
  //   z-index: 11111;
  // `)
  // document.body.appendChild(canvas)
  const texture = new THREE.CanvasTexture(canvas)
  return texture

}

export const isIPadOS = () => {
  const ua = window.navigator.userAgent
  if (ua.indexOf('iPad') > -1) {
      return true
  }
  if (ua.indexOf('Macintosh') > -1) {
      try {
          document.createEvent('TouchEvent')
          return true
      } catch (e) {
        // ...
      }
  }
  return false
}

export const isMobileBrowser = () => {
  return (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
      return true
    }
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream) {
      return true
    }
    return false
  })(navigator.userAgent || navigator.vendor || window.opera)
}

// export const isInstagram = () => {
//   const ua = navigator.userAgent || navigator.vendor || window.opera
//   return ua.indexOf('Instagram') > -1
// }
