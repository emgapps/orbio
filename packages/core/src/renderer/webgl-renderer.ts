import type { RenderFrameInput, OrbRenderer } from "./types";
import { fragmentShaderSource, vertexShaderSource } from "./shaders";
import type { OrbSettings, OrbState, ResolvedOrbTheme } from "../types";

type UniformMap = {
  res: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  energy: WebGLUniformLocation | null;
  pulse: WebGLUniformLocation | null;
  speed: WebGLUniformLocation | null;
  pulseStrength: WebGLUniformLocation | null;
  glowStrength: WebGLUniformLocation | null;
  effectMode: WebGLUniformLocation | null;
  stateMode: WebGLUniformLocation | null;
  colorBot: WebGLUniformLocation | null;
  colorMid: WebGLUniformLocation | null;
  colorTop: WebGLUniformLocation | null;
  auraA: WebGLUniformLocation | null;
  auraB: WebGLUniformLocation | null;
  rim: WebGLUniformLocation | null;
};

export class WebGlOrbRenderer implements OrbRenderer {
  readonly element: HTMLCanvasElement;

  private readonly gl: WebGLRenderingContext;
  private readonly program: WebGLProgram;
  private readonly uniforms: UniformMap;
  private readonly buffer: WebGLBuffer;

  constructor(settings: OrbSettings) {
    this.element = document.createElement("canvas");
    this.element.className = "emgapps-orb-canvas";
    this.element.dataset.renderer = "webgl";
    this.element.style.display = "block";
    this.element.style.width = "100%";
    this.element.style.height = "100%";
    this.element.style.pointerEvents = "none";

    const gl = this.element.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      antialias: true,
      depth: false,
    });

    if (!gl) {
      throw new Error("WebGL is not supported.");
    }

    this.gl = gl;
    this.program = createProgram(gl);
    this.buffer = createFullScreenTriangle(gl, this.program);
    this.uniforms = getUniforms(gl, this.program);

    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    this.resize(settings);
  }

  resize(settings: OrbSettings) {
    const dpr = Math.min(window.devicePixelRatio || 1, settings.dprCap);
    const width = Math.max(1, Math.round((this.element.clientWidth || settings.size) * dpr));
    const height = Math.max(1, Math.round((this.element.clientHeight || settings.size) * dpr));

    if (this.element.width !== width || this.element.height !== height) {
      this.element.width = width;
      this.element.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }

  render(input: RenderFrameInput) {
    this.resize(input.settings);

    const gl = this.gl;
    const uniforms = this.uniforms;

    gl.useProgram(this.program);
    gl.uniform2f(uniforms.res, this.element.width, this.element.height);
    gl.uniform1f(uniforms.time, input.time);
    gl.uniform1f(uniforms.energy, input.signal.energy);
    gl.uniform1f(uniforms.pulse, input.signal.pulse);
    gl.uniform1f(uniforms.speed, input.settings.speed);
    gl.uniform1f(uniforms.pulseStrength, input.settings.pulseStrength);
    gl.uniform1f(uniforms.glowStrength, input.settings.glowStrength);
    gl.uniform1f(uniforms.effectMode, getThemeEffectMode(input.theme));
    gl.uniform1f(uniforms.stateMode, getStateEffectMode(input.state));
    setColor(gl, uniforms.colorBot, input.theme.colors.bottom);
    setColor(gl, uniforms.colorMid, input.theme.colors.middle);
    setColor(gl, uniforms.colorTop, input.theme.colors.top);
    setColor(gl, uniforms.auraA, input.theme.colors.auraA);
    setColor(gl, uniforms.auraB, input.theme.colors.auraB);
    setColor(gl, uniforms.rim, input.theme.colors.rim);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  destroy() {
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteProgram(this.program);
    this.element.remove();
  }
}

function createProgram(gl: WebGLRenderingContext) {
  const program = gl.createProgram();
  if (!program) throw new Error("Unable to create WebGL program.");

  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexShaderSource));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Unable to link WebGL program.");
  }

  return program;
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create WebGL shader.");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Unable to compile WebGL shader.");
  }

  return shader;
}

function createFullScreenTriangle(gl: WebGLRenderingContext, program: WebGLProgram) {
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("Unable to create WebGL buffer.");

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  return buffer;
}

function getUniforms(gl: WebGLRenderingContext, program: WebGLProgram): UniformMap {
  return {
    res: gl.getUniformLocation(program, "uRes"),
    time: gl.getUniformLocation(program, "uTime"),
    energy: gl.getUniformLocation(program, "uEnergy"),
    pulse: gl.getUniformLocation(program, "uPulse"),
    speed: gl.getUniformLocation(program, "uSpeed"),
    pulseStrength: gl.getUniformLocation(program, "uPulseStrength"),
    glowStrength: gl.getUniformLocation(program, "uGlowStrength"),
    effectMode: gl.getUniformLocation(program, "uEffectMode"),
    stateMode: gl.getUniformLocation(program, "uStateMode"),
    colorBot: gl.getUniformLocation(program, "uColorBot"),
    colorMid: gl.getUniformLocation(program, "uColorMid"),
    colorTop: gl.getUniformLocation(program, "uColorTop"),
    auraA: gl.getUniformLocation(program, "uAuraA"),
    auraB: gl.getUniformLocation(program, "uAuraB"),
    rim: gl.getUniformLocation(program, "uRim"),
  };
}

function getThemeEffectMode(theme: ResolvedOrbTheme) {
  if (theme.name === "default") return 2;
  if (theme.name === "calm") return 1;
  if (theme.name === "cosmic") return 0;
  return -1;
}

export function getStateEffectMode(state: OrbState) {
  if (state === "disabled") return 1;
  if (state === "error") return 2;
  return 0;
}

function setColor(
  gl: WebGLRenderingContext,
  uniform: WebGLUniformLocation | null,
  color: [number, number, number],
) {
  gl.uniform3f(uniform, color[0], color[1], color[2]);
}
