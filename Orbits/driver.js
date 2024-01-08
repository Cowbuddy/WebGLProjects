window.addEventListener('load', setup)

const IlliniBlue = new Float32Array([1, 1, 1, 1])
const IlliniOrange = new Float32Array([1, 0.373, 0.02, 1])
const IdentityMatrix = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1])

/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2',
        // optional configuration object: see https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext
        {antialias: false, depth:true, preserveDrawingBuffer:true}
    )
    const vs = await fetch('vertex_shader.glsl').then(res => res.text())
    const fs = await fetch('fragment_shader.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    gl.enable(gl.DEPTH_TEST)
    const tdata = await fetch('tetrahedron.json').then(r=>r.json())
    window.tetra = setupGeometry(tdata)
    const odata = await fetch('octahedron.json').then(r=>r.json())
    window.octa = setupGeometry(odata)
    fillScreen()
    window.addEventListener('resize', fillScreen)
    requestAnimationFrame(tick)
    //tick(0) // <- ensure this function is called only once, at the end of setup
}

/**
 * Compiles two shaders, links them together, looks up their uniform locations,
 * and returns the result. Reports any shader errors to the console.
 *
 * @param {string} vs_source - the source code of the vertex shader
 * @param {string} fs_source - the source code of the fragment shader
 * @return {WebGLProgram} the compiled and linked program
 */
function compile(vs_source, fs_source) {
    const vs = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vs, vs_source)
    gl.compileShader(vs)
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(vs))
        throw Error("Vertex shader compilation failed")
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fs, fs_source)
    gl.compileShader(fs)
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(fs))
        throw Error("Fragment shader compilation failed")
    }

    const program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program))
        throw Error("Linking failed")
    }
    
    const uniforms = {}
    for(let i=0; i<gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i+=1) {
        let info = gl.getActiveUniform(program, i)
        uniforms[info.name] = gl.getUniformLocation(program, info.name)
    }
    program.uniforms = uniforms

    return program
}

/**
 * Runs the animation using requestAnimationFrame. This is like a loop that
 * runs once per screen refresh, but a loop won't work because we need to let
 * the browser do other things between ticks. Instead, we have a function that
 * requests itself be queued to be run again as its last step.
 * 
 * @param {Number} milliseconds - milliseconds since web page loaded; 
 *        automatically provided by the browser when invoked with
 *        requestAnimationFrame
 */
function tick(milliseconds) {
    let seconds = milliseconds / 1000;

    draw(seconds)
    requestAnimationFrame(tick)
}

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    gl.clearColor(...IlliniBlue) // f(...[1,2,3]) means f(1,2,3)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
    gl.useProgram(program)

    gl.bindVertexArray(octa.vao)

    gl.uniform4fv(program.uniforms.color, IlliniOrange)
    let v = m4view([1,6,0],[0,0,0],[1,0,0])

    let sun = m4mul(m4rotX(Math.PI * seconds))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,sun))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(octa.mode, octa.count, octa.type, 0)

    let earth = m4mul(m4rotX(seconds), m4trans(0,2.5,0), m4rotX(6 * seconds), m4scale(0.35,0.35,0.35))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,earth))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(octa.mode, octa.count, octa.type, 0)

    let mars = m4mul(m4rotX(seconds / 1.9), m4trans(0,2.5 * 1.6,0), m4rotX(6 * seconds / 2.2), m4scale(0.25,0.25,0.25))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,mars))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(octa.mode, octa.count, octa.type, 0)

    // let m2 = m4mul(m, m4scale(0.5, 0.5, 0.5) ,m4trans(0,0,3), m4rotY(seconds))
    // gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m2))
    // gl.drawElements(octa.mode, octa.count, octa.type, 0)

    gl.bindVertexArray(tetra.vao)

    let moon = m4mul(m4rotX(seconds), m4trans(0,2.5,0), m4rotX(2.5 * seconds), m4trans(0,0.8,0), m4scale(0.1,0.1,0.1))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,moon))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(tetra.mode, tetra.count, tetra.type, 0)

    let phobos = m4mul(m4rotX(seconds / 1.9), m4trans(0,2.5 * 1.6,0), m4rotX(4 * seconds), m4trans(0,0.4,0), m4scale(0.08,0.08,0.08))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,phobos))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(tetra.mode, tetra.count, tetra.type, 0)

    let deimos = m4mul(m4rotX(seconds / 1.9), m4trans(0,2.5 * 1.6,0), m4rotX(6 * seconds), m4trans(0,0.4 * 2,0), m4scale(0.04,0.04,0.04))
    gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,deimos))
    gl.uniformMatrix4fv(program.uniforms.p, false, p)
    gl.drawElements(tetra.mode, tetra.count, tetra.type, 0)
    // let m2 = m4mul(m, m4scale(0.5, 0.5, 0.5) ,m4trans(0,0,3), m4rotY(seconds))
    // gl.uniformMatrix4fv(program.uniforms.mv, false, m4mul(v,m2))
    // gl.drawElements(tetra.mode, tetra.count, tetra.type, 0)
}

/** Resizes the canvas to completely fill the screen */
function fillScreen() {
    let canvas = document.querySelector('canvas')
    document.body.style.margin = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    canvas.style.width = ''
    canvas.style.height = ''
    if (window.gl) {
        gl.viewport(0,0, canvas.width, canvas.height)
        window.p = m4perspNegZ(0.1, 10, 1.5, canvas.width, canvas.height)
    }
}

/**
 * Sends per-vertex data to the GPU and connects it to a VS input
 * 
 * @param data    a 2D array of per-vertex data (e.g. [[x,y,z,w],[x,y,z,w],...])
 * @param loc     the layout location of the vertex shader's `in` attribute
 * @param mode    (optional) gl.STATIC_DRAW, gl.DYNAMIC_DRAW, etc
 * 
 * @returns the ID of the buffer in GPU memory; useful for changing data later
 */
function supplyDataBuffer(data, loc, mode) {
    if (mode === undefined) mode = gl.STATIC_DRAW
    
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    const f32 = new Float32Array(data.flat())
    gl.bufferData(gl.ARRAY_BUFFER, f32, mode)
    
    gl.vertexAttribPointer(loc, data[0].length, gl.FLOAT, false, 0, 0)
    gl.enableVertexAttribArray(loc)
    
    return buf;
}

/**
 * Creates a Vertex Array Object and puts into it all of the data in the given
 * JSON structure, which should have the following form:
 * 
 * ````
 * {"triangles": a list of of indices of vertices
 * ,"attributes":
 *  [ a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 0
 *  , a list of 1-, 2-, 3-, or 4-vectors, one per vertex to go in location 1
 *  , ...
 *  ]
 * }
 * ````
 * 
 * @returns an object with four keys:
 *  - mode = the 1st argument for gl.drawElements
 *  - count = the 2nd argument for gl.drawElements
 *  - type = the 3rd argument for gl.drawElements
 *  - vao = the vertex array object for use with gl.bindVertexArray
 */
function setupGeometry(geom) {
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)

    for(let i=0; i<geom.attributes.length; i+=1) {
        let data = geom.attributes[i]
        supplyDataBuffer(data, i)
    }

    var indices = new Uint16Array(geom.triangles.flat())
    var indexBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    return {
        mode: gl.TRIANGLES,
        count: indices.length,
        type: gl.UNSIGNED_SHORT,
        vao: triangleArray
    }
}