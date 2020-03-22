uniform sampler2D u_tDiffuseClip;
uniform sampler2D u_tDiffusePhoto;
uniform sampler2D u_tDiffuseCursor;
uniform sampler2D u_tDiffuseMask;

uniform vec2 u_resolution;
uniform vec2 u_mouse;

uniform float u_time;
uniform float u_cursorSize;
uniform float u_hoverMixFactor;
uniform float u_cutOffFactor;

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

vec4 blur9 (sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 color = vec4(0.0);
  vec2 off1 = vec2(1.3846153846) * direction;
  vec2 off2 = vec2(3.2307692308) * direction;
  color += texture2D(image, uv) * 0.2270270270;
  color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;
  color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;
  color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;
  color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;
  return color;
}

void main () {
  vec2 uv = v_uv;
  vec4 baseColor = vec4(vec3(0.89), 1.0);
  vec4 clipColor = texture2D(u_tDiffuseClip, uv);
  vec4 photoColor = texture2D(u_tDiffusePhoto, uv);
  vec4 cursorColor = texture2D(u_tDiffuseCursor, uv);
  vec4 maskColor = texture2D(u_tDiffuseMask, uv);

  if (uv.x > 0.5 && maskColor.r < u_cutOffFactor) {
    baseColor = vec4(vec3(0.99), 1.0); 
  }

  vec4 color = mix(clipColor, photoColor, clipColor.r);
  color = mix(baseColor, color, color.a);

  vec2 mouse = vec2(u_mouse.x, u_resolution.y - u_mouse.y);
  float cursorAlpha = circle(gl_FragCoord.xy, u_mouse, u_cursorSize);

  vec4 cursorCircleColor = color;
  vec2 uvRandom = uv;
  uvRandom.y *= random(vec2(uvRandom.y, u_time));
  cursorCircleColor.rgb += random(uvRandom) * 0.075;

  color = mix(color, cursorColor, cursorColor.a);

  float fmin = 0.9;
  float fmod = mod(u_time * 3.0 + uv.y * 200.0, 1.75);
  float fstep = fmin + (1.0 - fmin) * fmod;

  vec4 hoverColor = cursorCircleColor;
  cursorCircleColor.rgb *= fstep;

  hoverColor = mix(hoverColor, cursorCircleColor, u_hoverMixFactor);

  gl_FragColor = mix(color, hoverColor, cursorAlpha);

  // gl_FragColor = maskColor;
  
  
}