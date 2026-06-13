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
uniform float uEffectMode;
uniform float uStateMode;
uniform float uUnavailableAmount;
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

float starLayer(vec2 p, float scale, float threshold, float time, float blurBoost){
  vec2 grid = p * scale;
  vec2 id = floor(grid);
  vec2 gv = fract(grid) - 0.5;
  float rnd = hash(id);
  float size = mix(0.055, 0.125, hash(id + 19.17));
  float dotShape = 1.0 - smoothstep(size * 0.35, size, length(gv));
  float crossShape = max(
    (1.0 - smoothstep(0.0, size * 1.8, abs(gv.x))) * (1.0 - smoothstep(0.0, size * 0.42, abs(gv.y))),
    (1.0 - smoothstep(0.0, size * 1.8, abs(gv.y))) * (1.0 - smoothstep(0.0, size * 0.42, abs(gv.x)))
  );
  float halo = 1.0 - smoothstep(size * 0.75, size * (2.8 + blurBoost * 2.4), length(gv));
  float blurPick = smoothstep(0.50, 0.98, hash(id + 71.13));
  float twinkle = 0.60 + 0.40 * sin(time * (0.62 + rnd * 1.75) + rnd * 18.0);
  float visible = step(threshold, rnd);
  return visible * (dotShape + 0.26 * crossShape + halo * blurPick * (0.18 + 0.22 * blurBoost)) * twinkle;
}

float starField(vec2 p, float time, float blurBoost){
  vec2 orbitA = vec2(sin(time * 0.22), cos(time * 0.17)) * 0.040;
  vec2 orbitB = vec2(cos(time * 0.14 + 1.7), sin(time * 0.19 + 0.8)) * 0.030;
  float nearStars = starLayer(p + orbitA + vec2(time * 0.003, -time * 0.002), 10.5, 0.77, time, blurBoost);
  float farStars = starLayer(p + orbitB + vec2(-time * 0.002, time * 0.001), 17.0, 0.88, time + 8.0, blurBoost * 0.72);
  return nearStars + 0.58 * farStars;
}

float waterRippleField(vec2 p, float time, float energy){
  vec2 current = vec2(
    fbm(p * 2.2 + vec2(time * 0.055, -time * 0.035)),
    fbm(p * 2.1 + vec2(-time * 0.030, time * 0.050) + 8.4)
  ) - 0.5;
  vec2 rp = p + current * (0.25 + 0.05 * energy);
  rp += 0.035 * vec2(
    sin(p.y * 7.0 + time * 0.42 + current.x * 3.0),
    cos(p.x * 6.5 - time * 0.36 + current.y * 3.4)
  );
  float drift = fbm(rp * 3.4 + vec2(time * 0.060, -time * 0.042));
  float shimmer = fbm(rp * 8.5 + current * 1.6 - time * 0.12);
  float horizontal = sin((rp.y + 0.10 * sin(rp.x * 3.6 + time * 0.38) + drift * 0.16) * 18.0 - time * (0.82 + energy * 0.20));

  vec2 cA = vec2(-0.25, 0.16) + 0.055 * vec2(sin(time * 0.31), cos(time * 0.24));
  vec2 cB = vec2(0.31, -0.12) + 0.045 * vec2(cos(time * 0.22 + 1.4), sin(time * 0.29));
  vec2 cC = vec2(0.02, 0.30) + 0.035 * vec2(sin(time * 0.18 + 2.1), cos(time * 0.26));
  float dA = length((rp - cA) * vec2(1.18, 0.84)) + 0.045 * shimmer;
  float dB = length((rp - cB) * vec2(0.78, 1.24)) + 0.050 * fbm(rp * 7.0 + 4.2);
  float dC = length((rp - cC) * vec2(1.35, 0.72)) + 0.040 * fbm(rp * 6.2 - 3.7);
  float ringsA = sin(dA * 24.0 - time * (1.04 + energy * 0.22));
  float ringsB = sin(dB * 21.0 - time * (0.92 + energy * 0.18));
  float ringsC = sin(dC * 17.0 + time * 0.58);
  float lines = smoothstep(0.82, 1.0, 0.5 + 0.5 * horizontal);
  float rings = smoothstep(0.77, 0.99, 0.5 + 0.5 * max(max(ringsA, ringsB), ringsC * 0.72));
  return clamp(lines * 0.20 + rings * (0.34 + 0.09 * energy) + shimmer * 0.10, 0.0, 1.0);
}

float flameField(vec2 p, float time, float energy){
  float wind = sin(time * 0.18) * 0.34 + sin(time * 0.073 + 1.9) * 0.22;
  vec2 fp = p;
  fp.x += (fp.y + 0.52) * wind * 0.44;
  fp.x += 0.045 * sin(time * 0.31 + fp.y * 5.5);

  vec2 flameP = vec2(
    fp.x * 3.2 + 0.18 * sin(time * 0.72 + fp.y * 7.0),
    fp.y * 2.15 - time * (0.42 + energy * 0.035)
  );
  float heat = fbm(flameP * 1.7);
  float lick = sin(fp.x * 13.0 + heat * 6.5 - time * 1.35) * 0.5 + 0.5;
  float reach = -0.22 + heat * 0.98 + lick * 0.26 + energy * 0.025;
  float body = smoothstep(-0.68, -0.50, fp.y) * (1.0 - smoothstep(reach, reach + 0.13, fp.y));
  float taper = 1.0 - smoothstep(0.16, 0.62, abs(fp.x) + max(fp.y, 0.0) * 0.28);
  float tongues = smoothstep(0.30, 0.88, heat * 0.72 + lick * 0.52);
  return clamp(body * taper * tongues, 0.0, 1.0);
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

  if (uEffectMode > -0.5 && uEffectMode < 0.5) {
    float starTime = time * 0.38;
    float starBlur = 0.34 + 0.42 * speak;
    float stars = starField(p + 0.05 * warp, starTime, starBlur);
    float starMask = disk * smoothstep(0.12, 0.54, zN) * (1.0 - smoothstep(R * 0.88, R, r));
    vec3 starTint = mix(vec3(0.78, 0.84, 1.0), vec3(1.0, 0.96, 0.86), 0.35 + 0.35 * sin(starTime * 0.32));
    col *= 0.90;
    col += starTint * stars * starMask * (0.16 + 0.05 * uGlowStrength + 0.035 * speak);
  } else if (uEffectMode < 1.5) {
    float rippleTime = time * 0.36;
    vec2 rippleP = p + 0.070 * warp;
    float ripples = waterRippleField(rippleP, rippleTime, speak);
    ripples = mix(ripples, waterRippleField(rippleP + vec2(0.018, -0.014), rippleTime + 0.74, speak), 0.34);
    ripples *= 0.85;
    float rippleMask = disk * smoothstep(0.05, 0.72, zN);
    vec3 waterTint = mix(vec3(0.62, 0.92, 1.0), vec3(0.98, 1.0, 0.86), smoothstep(-0.28, 0.42, p.y));
    col += waterTint * ripples * rippleMask * (0.076 + 0.032 * uGlowStrength + 0.022 * speak);
    col *= 1.0 + ripples * rippleMask * (0.018 + 0.010 * speak);
  } else if (uEffectMode < 2.5) {
    float flameTime = time * 0.44;
    float flames = flameField(p, flameTime, speak);
    float flameMask = disk * (0.42 + 0.58 * zN);
    vec3 ember = vec3(1.0, 0.18, 0.05);
    vec3 gold = vec3(1.0, 0.78, 0.20);
    vec3 fireTint = mix(ember, gold, smoothstep(-0.50, 0.28, p.y) + 0.035 * uPulse);
    col = mix(col, fireTint, clamp(flames * flameMask * 0.48, 0.0, 0.60));
    col += fireTint * flames * flameMask * (0.14 + 0.075 * uGlowStrength + 0.018 * speak);
  }

  if (uUnavailableAmount > 0.001) {
    float gray = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(gray), 0.90 * uUnavailableAmount);
    col *= mix(1.0, 0.78, uUnavailableAmount);
  }

  if (uStateMode > 1.5) {
    float redSweep = smoothstep(-0.62, 0.58, p.y);
    float redBloom = 1.0 - smoothstep(0.08, 0.74, length(p - vec2(-0.20, 0.24)));
    float redAmount = clamp(0.22 + redSweep * 0.22 + redBloom * 0.20 + uPulse * 0.05, 0.0, 0.58);
    vec3 alertRed = mix(vec3(0.45, 0.0, 0.02), vec3(1.0, 0.04, 0.03), redSweep);
    col = mix(col, alertRed, redAmount * disk);
    col += vec3(1.0, 0.02, 0.01) * redBloom * disk * 0.11;
  }

  float aura = pow(smoothstep(R + 0.34, R, r), 1.7) * (1.0 - disk);
  vec3 auraCol = mix(uAuraA, uAuraB, 0.5 + 0.5*sin(time*0.3));
  if (uEffectMode > 1.5 && uEffectMode < 2.5) {
    auraCol = mix(auraCol, vec3(1.0, 0.34, 0.08), 0.28 + 0.025*uPulse);
  }
  float auraA = aura * (0.13 + 0.5*uEnergy*uGlowStrength);
  if (uUnavailableAmount > 0.001) {
    float auraGray = dot(auraCol, vec3(0.299, 0.587, 0.114));
    auraCol = mix(auraCol, vec3(auraGray), 0.92 * uUnavailableAmount);
    auraA *= mix(1.0, 0.24, uUnavailableAmount);
  }

  if (uStateMode > 1.5) {
    auraCol = mix(auraCol, vec3(1.0, 0.02, 0.03), 0.68);
    auraA *= 1.15;
  }

  vec3 outCol = col*disk + auraCol*auraA;
  float outA = max(disk, auraA);

  gl_FragColor = vec4(outCol, outA);
}
`;
