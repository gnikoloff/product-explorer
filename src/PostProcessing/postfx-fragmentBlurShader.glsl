uniform vec2 u_resolution;
uniform sampler2D u_tDiffuse;
uniform sampler2D u_tDiffuseMask;
uniform float u_blurMixFactor;
uniform vec2 u_direction;

varying vec2 v_uv;
  
vec4 blur13(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.411764705882353) * direction;
  vec2 off2 = vec2(3.2941176470588234) * direction;
  vec2 off3 = vec2(5.176470588235294) * direction;
  color += texture2D(image, uv) * 0.1964825501511404;
  color += texture2D(image, uv + (off1 / resolution)) * 0.2969069646728344;
  color += texture2D(image, uv - (off1 / resolution)) * 0.2969069646728344;
  color += texture2D(image, uv + (off2 / resolution)) * 0.09447039785044732;
  color += texture2D(image, uv - (off2 / resolution)) * 0.09447039785044732;
  color += texture2D(image, uv + (off3 / resolution)) * 0.010381362401148057;
  color += texture2D(image, uv - (off3 / resolution)) * 0.010381362401148057;
  return color;
}

void main () {
  vec4 color = texture2D(u_tDiffuse, v_uv);
  vec4 blurColor = blur13(u_tDiffuse, v_uv, u_resolution, u_direction);
  vec4 maskColor = texture2D(u_tDiffuseMask, v_uv);
  gl_FragColor = mix(color, blurColor, step(maskColor.r, u_blurMixFactor));
  gl_FragColor.a = 1.0 - u_blurMixFactor * 0.65;
}