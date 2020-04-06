uniform sampler2D u_tDiffuse;
uniform sampler2D u_mask;
uniform float u_maskBlendFactor;

varying vec2 v_uv;

void main () {
  vec4 maskColor = texture2D(u_mask, v_uv);
  vec4 color = texture2D(u_tDiffuse, v_uv);
  if (maskColor.r < u_maskBlendFactor) {
    gl_FragColor = color; 
  } else {
    discard;
  }
}