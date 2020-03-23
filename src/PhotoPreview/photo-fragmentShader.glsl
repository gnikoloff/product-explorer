uniform vec2 u_planeSize;
uniform vec2 u_imageSize;
uniform sampler2D u_textures[3];
uniform float u_opacity;
uniform int u_texIdx0;
uniform int u_texIdx1;
uniform float u_photoMixFactor; 
uniform float u_horizontalDirection;

varying vec2 v_uv;

vec4 getTexture (int index, vec2 uv) {
  for (int i = 0; i < 3; i++) {
    if (i == index){
      return texture2D(u_textures[i], uv);
    }
  }
}

vec4 transition (int texIdx0, int texIdx1, vec2 uv, float progress) {
  vec2 direction = vec2(u_horizontalDirection, 1.0);
  vec2 center = vec2(0.5);
  float smoothness = 0.5;
  vec2 v = normalize(direction);
  v /= abs(v.x) + abs(v.y);
  float d = v.x * center.x + v.y * center.y;
  float m = 1.0 - smoothstep(-smoothness, 0.0, v.x * uv.x + v.y * uv.y - (d - 0.5 + progress * (1.0 + smoothness)));
  return mix(getTexture(texIdx0, (uv - 0.5) * (1.0 - m) + 0.5), getTexture(texIdx1, (uv - 0.5) * m + 0.5), m);
}

void main () {
  vec2 s = u_planeSize; // Screen
  vec2 i = u_imageSize; // Image

  float rs = s.x / s.y;
  float ri = i.x / i.y;
  vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
  vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
  vec2 uv = v_uv * s / new + offset;

  vec4 texColor0 = getTexture(u_texIdx0, uv);
  vec4 texColor1 = getTexture(u_texIdx1, uv);
  // gl_FragColor = mix(texColor0, texColor1, u_photoMixFactor);
  gl_FragColor = transition(u_texIdx0, u_texIdx1, uv, u_photoMixFactor);
  // gl_FragColor.a = u_opacity;
}
