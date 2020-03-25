import { scale } from "style-value-types"

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
