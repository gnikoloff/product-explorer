export const clampNumber = (num, min, max) => Math.min(Math.max(num, min), max)

export const mapNumber = (num, inMin, inMax, outMin, outMax) => (num - inMin) * (outMax - outMin) / (inMax - inMin) + outMin
