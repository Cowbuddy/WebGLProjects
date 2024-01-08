window.addEventListener('load', setup)

/**
 * Fetches, reads, and compiles GLSL; sets two global variables; and begins
 * the animation
 */
async function setup() {
    window.gl = document.querySelector('canvas').getContext('webgl2')
    const vs = await fetch('vertex_shader.glsl').then(res => res.text())
    const fs = await fetch('fragment_shader.glsl').then(res => res.text())
    window.program = compile(vs,fs)
    const data = await fetch('geometry.json').then(r=>r.json())
    window.geom = setupGeomery(data)
    tick(0) // <- ensure this function is called only once, at the end of setup
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
    const seconds = milliseconds / 1000
    draw(seconds)
    requestAnimationFrame(tick) // <- only call this here, nowhere else
}

/**
 * Clears the screen, sends two uniforms to the GPU, and asks the GPU to draw
 * several points. Note that no geometry is provided; the point locations are
 * computed based on the uniforms in the vertex shader.
 *
 * @param {Number} seconds - the number of seconds since the animation began
 */
function draw(seconds) {
    // Construct the transformation matrix based on time
    const transformationMatrix = constructTransformationMatrix(seconds);

    // Pass the transformation matrix as a uniform to the shader
    const matrixLocation = gl.getUniformLocation(program, 'transformationMatrix');

    gl.uniformMatrix4fv(matrixLocation, false, new Float32Array(flattenMatrix(transformationMatrix)));
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindVertexArray(geom.vao)
    gl.drawElements(geom.mode, geom.count, geom.type, 0)
}

function setupGeomery(geom) {
    // a "vertex array object" or VAO records various data provision commands
    var triangleArray = gl.createVertexArray()
    gl.bindVertexArray(triangleArray)
    
    // loop over every attribute
    for(let i=0; i<geom.attributes.length; i+=1) {
        // goal 1: get data from CPU memory to GPU memory 
        // createBuffer allocates an array of GPU memory
        let buf = gl.createBuffer()
        // to get data into the array we tell the GPU which buffer to use
        gl.bindBuffer(gl.ARRAY_BUFFER, buf)
        // and convert the data to a known fixed-sized type
        let f32 = new Float32Array(geom.attributes[i].flat())
        // then send that data to the GPU, with a hint that we don't plan to change it very often
        gl.bufferData(gl.ARRAY_BUFFER, f32, gl.STATIC_DRAW)
        
        // goal 2: connect the buffer to an input of the vertex shader
        // inputs are numbered in the vertex shader to equal i here
        // telling the GPU how to parse the bytes of the array:
        gl.vertexAttribPointer(i, geom.attributes[i][0].length, gl.FLOAT, false, 0, 0)
        // and connecting the currently-used array to the VS input
        gl.enableVertexAttribArray(i)
    }

    // We also have to explain how values are connected into shapes.
    // There are other ways, but we'll use indices into the other arrays
    var indices = new Uint16Array(geom.triangles.flat())
    // we'll need a GPU array for the indices too
    var indexBuffer = gl.createBuffer()
    // but the GPU puts it in a different "ready" position, one for indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW)

    // we return all the bits we'll need to use this work later
    return {
        mode:gl.TRIANGLES,      // grab 3 indices per triangle
        count:indices.length,   // out of this many indices overall
        type:gl.UNSIGNED_SHORT, // each index is stored as a Uint16
        vao:triangleArray       // and this VAO knows which buffers to use
    }
}

// Function to construct the transformation matrix based on time
function constructTransformationMatrix(time) {
    const translationX = Math.sin(time) - 0.1;
    const translationY = 0.0;
    const scaling = Math.sin(time) + 2;

    // Create a 4x4 identity matrix
    const transformationMatrix = [
        [1.0, 0.0, 0.0, 0.0],
        [0.0, 1.0, 0.0, 0.0],
        [0.0, 0.0, 1.0, 0.0],
        [0.0, 0.0, 0.0, 1.0],
    ];

    // Apply transformations (translation, scaling, rotation) to the matrix
    transformationMatrix[0][3] = translationX;
    transformationMatrix[1][3] = translationY;
    transformationMatrix[0][0] = scaling;
    transformationMatrix[1][1] = scaling;


    return transformationMatrix;
}

// Function to flatten the 4x4 matrix into a 16-element array
function flattenMatrix(matrix) {
    const flatArray = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            flatArray.push(matrix[j][i]);
        }
    }
    return flatArray;
}