uniform vec2 u_dragOffsetVec;

void main () {
  vec3 newPosition = position;

  float distFromCenter = distance(newPosition, vec3(0.0));
  newPosition.xy += u_dragOffsetVec * distFromCenter * 0.002;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
}
