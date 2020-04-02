uniform vec2 u_planeSize;

varying vec2 v_uv;

void main () {
  vec3 newPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  // v_uv = uv;
  v_uv = vec2(newPosition.x / u_planeSize.x + 0.5, newPosition.y / u_planeSize.y + 0.5);
}