uniform sampler2D u_tDiffusePhoto;
uniform sampler2D u_tDiffuseMask;

uniform vec2 u_resolution;
uniform vec2 u_mouse;

uniform float u_time;
uniform float u_cursorSize;
uniform float u_hoverMixFactor;
uniform float u_cutOffFactor;
uniform float u_blurMixFactor;

varying vec2 v_uv;

float random (vec2 p) {
  vec2 K1 = vec2(
    23.14069263277926, // e^pi (Gelfond's constant)
    2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
  );
  return fract( cos( dot(p,K1) ) * 12345.6789 );
}

float circle (vec2 uv, vec2 pos, float rad) {
  float d = length(pos - uv) - rad;
  float t = clamp(d, 0.0, 1.0);
  return 1.0 - t;
}

void main () {
  vec2 uv = v_uv;
  vec4 baseColor = vec4(vec3(0.89), 1.0);
  vec4 photoColor = texture2D(u_tDiffusePhoto, uv);
  vec4 maskColor = texture2D(u_tDiffuseMask, uv);

  // if (uv.x > 0.5 && maskColor.r < u_cutOffFactor) {
  if (maskColor.r < u_cutOffFactor) {
    baseColor = vec4(vec3(0.99), 1.0); 
  }

  vec4 color = photoColor;
  color = mix(baseColor, color, color.a);

  vec2 mouse = vec2(u_mouse.x, u_resolution.y - u_mouse.y);
  float cursorAlpha = circle(gl_FragCoord.xy, mouse, u_cursorSize * (1.0 - u_blurMixFactor));
  // gl_FragColor = vec4(vec3(cursorAlpha), 1.0);

  vec4 cursorCircleColor = color;
  vec2 uvRandom = uv;
  uvRandom.y *= random(vec2(uvRandom.y, u_time));
  cursorCircleColor.rgb += random(uvRandom) * 0.075;

  float fmin = 0.95;
  float fmod = mod(u_time * 0.0025 - gl_FragCoord.y, 1.1);
  float fstep = fmin + (1.0 - fmin) * fmod;

  vec4 hoverColor = cursorCircleColor;
  cursorCircleColor.rgb *= fstep;

  hoverColor = mix(hoverColor, cursorCircleColor, u_hoverMixFactor);

  gl_FragColor = mix(color, hoverColor, cursorAlpha * (1.0 - u_cutOffFactor));
}