uniform vec2 u_planeSize;
uniform vec2 u_imageSize;
uniform sampler2D u_diffuse;

varying vec2 v_uv;

void main () {
  vec2 s = u_planeSize; // Screen
  vec2 i = u_imageSize; // Image

  float rs = s.x / s.y;
  float ri = i.x / i.y;
  vec2 new = rs < ri ? vec2(i.x * s.y / i.y, s.y) : vec2(s.x, i.y * s.x / i.x);
  vec2 offset = (rs < ri ? vec2((new.x - s.x) / 2.0, 0.0) : vec2(0.0, (new.y - s.y) / 2.0)) / new;
  vec2 uv = v_uv * s / new + offset;
  gl_FragColor = texture2D(u_diffuse, uv);
}
