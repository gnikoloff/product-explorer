uniform vec2 u_resoluton;
    
varying vec2 v_uv;

float random (vec2 p) {
  vec2 K1 = vec2(
    23.14069263277926, // e^pi (Gelfond's constant)
    2.665144142690225 // 2^sqrt(2) (Gelfond–Schneider constant)
  );
  return fract( cos( dot(p,K1) ) * 12345.6789 );
}

void main () {
  float v = v_uv[0];
  float w = v_uv[1];
  vec4 color = vec4(vec3(0.1), 1.0);
  vec2 uvRandom = v_uv;
  uvRandom.y *= random(vec2(uvRandom.y, 0.5));
  color.rgb += random(uvRandom) * 0.1;
  gl_FragColor = mix(vec4(0.0), color, step(v * v - w, 0.0));
}
