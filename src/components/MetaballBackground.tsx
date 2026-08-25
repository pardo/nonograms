import { useEffect, useRef, useState } from 'react'
import type { BackgroundSettings } from '../hooks/useBackgroundSettings'
import { CssBlobBackground } from './CssBlobBackground'

const MAX_BLOBS = 24

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision highp float;

  uniform vec2 u_resolution;
  uniform int u_blobCount;
  uniform vec3 u_blobs[${MAX_BLOBS}];
  uniform vec3 u_colors[${MAX_BLOBS}];
  uniform float u_gooiness;
  uniform float u_opacity;

  void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    st.x *= aspect;

    float totalDensity = 0.0;
    vec3 colorAcc = vec3(0.0);
    float weightAcc = 0.0;

    for (int i = 0; i < ${MAX_BLOBS}; i++) {
      if (i >= u_blobCount) break;

      vec2 pos = u_blobs[i].xy;
      pos.x *= aspect;
      float r = u_blobs[i].z;

      float dist = distance(st, pos);

      if (dist < r * u_gooiness) {
        float field = pow(1.0 - (dist / (r * u_gooiness)), 2.0);
        totalDensity += field;
        colorAcc += u_colors[i] * field;
        weightAcc += field;
      }
    }

    if (totalDensity > 0.4) {
      vec3 baseCol = colorAcc / max(weightAcc, 0.001);
      float edge = smoothstep(0.4, 0.48, totalDensity);
      float innerGlow = smoothstep(0.48, 1.2, totalDensity) * 0.35;
      vec3 finalColor = mix(vec3(0.0), baseCol + innerGlow, edge);
      gl_FragColor = vec4(finalColor, edge * u_opacity);
    } else {
      discard;
    }
  }
`

function createShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

class Blob2D {
  x: number
  y: number
  radius: number
  color: [number, number, number]
  vx: number
  vy: number

  constructor(baseRadius: number, colors: [number, number, number][]) {
    this.x = Math.random()
    this.y = Math.random()
    this.radius = baseRadius * (0.8 + Math.random() * 0.4)
    this.color = colors[Math.floor(Math.random() * colors.length)]

    const angle = Math.random() * Math.PI * 2
    const spd = 0.0006 + Math.random() * 0.0012
    this.vx = Math.cos(angle) * spd
    this.vy = Math.sin(angle) * spd
  }

  update(speed: number) {
    this.x += this.vx * speed
    this.y += this.vy * speed

    const margin = this.radius * 0.5
    if (this.x < margin) {
      this.x = margin
      this.vx *= -1
    }
    if (this.x > 1 - margin) {
      this.x = 1 - margin
      this.vx *= -1
    }
    if (this.y < margin) {
      this.y = margin
      this.vy *= -1
    }
    if (this.y > 1 - margin) {
      this.y = 1 - margin
      this.vy *= -1
    }

    this.vx *= 0.999
    this.vy *= 0.999
  }
}

// The vivid "Cósmico" palette from the reference metaball background,
// used as-is regardless of theme so the blobs stay saturated instead of
// washing out to the muted UI accent colors.
const COSMIC_PALETTE: [number, number, number][] = [
  [0.54, 0.23, 0.96], // Violet
  [0.92, 0.28, 0.6], // Pink
  [0.18, 0.7, 0.96], // Cyan
  [0.65, 0.18, 0.88], // Purple
]

interface MetaballBackgroundProps {
  settings: BackgroundSettings
  theme: 'light' | 'dark'
}

export function MetaballBackground({ settings, theme }: MetaballBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    if (settings.mode === 'off') return

    const canvas = canvasRef.current
    if (!canvas) return

    const gl = (canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false }) ??
      canvas.getContext('experimental-webgl', { alpha: true }) as WebGLRenderingContext | null)
    if (!gl) {
      setWebglFailed(true)
      return
    }

    const program = gl.createProgram()
    const vs = createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!program || !vs || !fs) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uBlobCount = gl.getUniformLocation(program, 'u_blobCount')
    const uGooiness = gl.getUniformLocation(program, 'u_gooiness')
    const uOpacity = gl.getUniformLocation(program, 'u_opacity')
    const uBlobsLoc = gl.getUniformLocation(program, 'u_blobs')
    const uColorsLoc = gl.getUniformLocation(program, 'u_colors')

    // "random every visit": pick fresh parameters within pleasant ranges for
    // this page load only (not persisted), so a reload gives a new mix.
    const isRandom = settings.mode === 'random'
    const count = isRandom ? 3 + Math.floor(Math.random() * 6) : settings.count
    const baseRadius = isRandom ? 0.1 + Math.random() * 0.12 : settings.size
    const speed = isRandom ? 0.3 + Math.random() * 0.9 : settings.speed
    const gooiness = isRandom ? 2.0 + Math.random() * 1.5 : settings.gooiness

    const colors = COSMIC_PALETTE
    let blobs = Array.from({ length: count }, () => new Blob2D(baseRadius, colors))

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas!.width = window.innerWidth * dpr
      canvas!.height = window.innerHeight * dpr
      gl!.viewport(0, 0, canvas!.width, canvas!.height)
    }
    window.addEventListener('resize', resize)
    resize()

    const blobData = new Float32Array(MAX_BLOBS * 3)
    const colorData = new Float32Array(MAX_BLOBS * 3)

    let rafId = 0
    function render() {
      if (!reducedMotion) {
        blobs.forEach((b) => b.update(speed))
      }

      blobData.fill(0)
      colorData.fill(0)
      blobs.forEach((b, i) => {
        blobData[i * 3] = b.x
        blobData[i * 3 + 1] = 1 - b.y
        blobData[i * 3 + 2] = b.radius
        colorData[i * 3] = b.color[0]
        colorData[i * 3 + 1] = b.color[1]
        colorData[i * 3 + 2] = b.color[2]
      })

      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.enable(gl!.BLEND)
      gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA)

      gl!.uniform2f(uResolution, canvas!.width, canvas!.height)
      gl!.uniform1i(uBlobCount, blobs.length)
      gl!.uniform1f(uGooiness, gooiness)
      gl!.uniform1f(uOpacity, theme === 'dark' ? 0.75 : 0.55)
      gl!.uniform3fv(uBlobsLoc, blobData)
      gl!.uniform3fv(uColorsLoc, colorData)

      gl!.drawArrays(gl!.TRIANGLES, 0, 6)

      if (!reducedMotion) {
        rafId = requestAnimationFrame(render)
      }
    }
    render()

    return () => {
      window.removeEventListener('resize', resize)
      if (rafId) cancelAnimationFrame(rafId)
      blobs = []
    }
    // Re-run the whole effect whenever mode, theme, or (in custom mode) the
    // sliders change. "random" mode intentionally re-seeds on every mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.mode, settings.count, settings.size, settings.speed, settings.gooiness, theme])

  if (settings.mode === 'off') return null
  if (webglFailed) return <CssBlobBackground />

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />
}
