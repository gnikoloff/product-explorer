const a = (b = 12) => ({ b })
const { b: c } = a()
console.log(c)