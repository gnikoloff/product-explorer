uniform float u_time;
uniform sampler2D u_tDiffuse;

varying vec2 v_uv;

void main () {
  vec4 color = texture2D(u_tDiffuse, v_uv);
  float fmin = 0.85;
  float fmod = mod(u_time * 0.0015 - gl_FragCoord.y, 1.05);
  float fstep = fmin + (1.0 - fmin) * fmod;
  color.rgb *= fstep;
  gl_FragColor = color;
}