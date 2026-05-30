varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform vec3 uColor;
uniform float uRoughness;
uniform float uMetalness;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;

void main() {
  // Simple Lambertian + ambient
  float nDotL = max(dot(normalize(vNormal), normalize(uLightDirection)), 0.0);
  vec3 diffuse = uColor * (uAmbientColor + uLightColor * nDotL);

  // Simple fresnel rim
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rim = 1.0 - max(dot(viewDir, normalize(vNormal)), 0.0);
  rim = pow(rim, 3.0) * uMetalness * 0.3;

  gl_FragColor = vec4(diffuse + rim, 1.0);
}
