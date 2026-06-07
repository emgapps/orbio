export const vertexShaderSource = `
attribute vec2 aPos;
varying vec2 vUv;
void main(){
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

export const fragmentShaderSource = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uEnergy;
uniform float uPulse;
uniform float uSpeed;
uniform float uPulseStrength;
uniform float uGlowStrength;
uniform vec3  uColorBot;
uniform vec3  uColorMid;
uniform vec3  uColorTop;
uniform vec3  uAuraA;
uniform vec3  uAuraB;
uniform vec3  uRim;

varying vec2 vUv;

float hash(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0 - 2.0*f);
  float a = hash(i);
  float b = hash(i + vec2(1.0,0.0));
  float c = hash(i + vec2(0.0,1.0));
  float d = hash(i + vec2(1.0,1.0));
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for(int i=0;i<5;i++){ v += a*vnoise(p); p = m*p; a *= 0.5; }
  return v;
}

void main(){
  vec2 frag = vUv * uRes;
  vec2 p = (2.0*frag - uRes) / min(uRes.x, uRes.y);
  float r = length(p);
  float time = uTime * uSpeed;

  float R = 0.64 + 0.013 * sin(time*0.55) + 0.040 * uEnergy;
  float aa = 3.5 / min(uRes.x, uRes.y);
  float disk = smoothstep(R + aa, R - aa, r);

  float z = sqrt(max(0.0, R*R - r*r));
  float zN = z / max(R, 1e-4);
  float t = time * 0.09;

  vec2 q = p * 1.7;
  vec2 drift = vec2(time * 0.025, time * 0.034);
  vec2 qf = q + drift;
  vec2 warp = vec2(
    fbm(qf + vec2(0.0, 1.0) + t),
    fbm(qf + vec2(3.7, 2.3) - t)
  );
  float n = fbm(qf + 2.2*warp + 0.6*t);
  n += uEnergy * 0.10 * fbm(qf*2.3 - t*4.0);

  float gy = clamp(0.5 + 0.50*(p.y/R) + (n - 0.5)*1.05, 0.0, 1.0);

  vec3 col = mix(uColorBot, uColorMid, smoothstep(0.0, 0.55, gy));
  col = mix(col, uColorTop, smoothstep(0.45, 1.0, gy));
  col *= 0.82 + 0.34 * n;

  vec3 nrm = normalize(vec3(p, z + 1e-4));
  vec3 L = normalize(vec3(-0.35, 0.50, 1.0));
  float diff = clamp(dot(nrm, L), 0.0, 1.0);
  col *= 0.80 + 0.30*diff;
  col *= mix(0.86, 1.05, zN);
  col += pow(1.0 - zN, 2.2) * 0.10 * uRim;

  float flow = fbm(qf*1.2 + 1.6*warp - vec2(0.0, time*0.16));
  float band = smoothstep(0.32, 1.0, 0.5 + 0.5*sin(flow*8.0 - time*1.3));
  float band2 = smoothstep(0.55, 1.0, 0.5 + 0.5*sin(flow*14.0 + time*1.9 + n*4.0));
  float speak = smoothstep(0.05, 0.60, uEnergy);
  float shimmer = (band*0.75 + band2*0.25) * (0.06 + 0.42*speak) * (0.45 + 0.55*zN);
  vec3 glowTint = mix(col, vec3(1.0, 0.97, 0.96), 0.70);
  col = mix(col, glowTint, clamp(shimmer, 0.0, 0.8) * (0.65 + 0.35*uPulse*uPulseStrength));
  col += 0.025 * uEnergy * zN * uGlowStrength;

  float aura = pow(smoothstep(R + 0.34, R, r), 1.7) * (1.0 - disk);
  vec3 auraCol = mix(uAuraA, uAuraB, 0.5 + 0.5*sin(time*0.3));
  float auraA = aura * (0.13 + 0.5*uEnergy*uGlowStrength);

  vec3 outCol = col*disk + auraCol*auraA;
  float outA = max(disk, auraA);

  gl_FragColor = vec4(outCol, outA);
}
`;
