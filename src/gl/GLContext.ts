// canvas + webgl context

// Wrapper for a WebGL context and its associated canvas
export class GLContext {
  public readonly canvas: HTMLCanvasElement;
  public readonly gl: WebGL2RenderingContext;

  constructor(canvas: HTMLCanvasElement){
    if (!canvas) {
        throw new Error("Canvas element is undefined.");
    }
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2");
    if (!gl) {
      throw new Error("Unable to initialize WebGL. Your browser may not support it.");
    }
    
    this.gl = gl;
    this.configure();
    self.addEventListener('resize', () => this.resize());
    this.resize();
  }
    private configure() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clearColor(0.5, 0.7, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }
    resize() {
        const canvas = this.canvas;
        const displayWidth  = canvas.clientWidth;
        const displayHeight = canvas.clientHeight;

        if (canvas.width  !== displayWidth ||
            canvas.height !== displayHeight) {
                canvas.width  = displayWidth;
                canvas.height = displayHeight;
        }
        this.gl.viewport(0, 0, canvas.width, canvas.height);
    }
    clear(r = 0.1, g = 0.1, b = 0.12, a = 1.0) {
        const gl = this.gl;
        gl.clearColor(r, g, b, a);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
}