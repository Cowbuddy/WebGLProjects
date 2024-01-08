const canvas = document.getElementById('webglCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported');
    throw new Error('WebGL not available');
}

const textureImage = new Image();
textureImage.crossOrigin = 'anonymous';
textureImage.onload = () => {
    initTexture(textureImage);
};
textureImage.src = 'testgrid.png'; // Replace with your image path

let shaderProgram;
let vertexPositionBuffer;
let textureCoordBuffer;

function initShaderProgram(vsSource, fsSource) {
    const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

function loadShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

const vsSource = `
attribute vec4 aVertexPosition;
attribute vec2 aTexCoord;
varying highp vec2 vTexCoord;

void main() {
    gl_Position = aVertexPosition;
    vTexCoord = aTexCoord;
}`;

const fsSource = `
varying highp vec2 vTexCoord;
uniform sampler2D uSampler;

void main() {
    gl_FragColor = texture2D(uSampler, vTexCoord);
}`;

function initTexture(image) {
    window.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    shaderProgram = initShaderProgram(vsSource, fsSource);
    vertexPositionBuffer = gl.createBuffer();
    textureCoordBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    const vertices = new Float32Array([
        -1.0,  1.0,   // Vertex 1
         1.0,  1.0,   // Vertex 2
        -1.0, -1.0,   // Vertex 3
         1.0, -1.0    // Vertex 4
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    const textureCoordinates = new Float32Array([
        0.0, 0.0,   // TexCoord 1
        1.0, 0.0,   // TexCoord 2
        0.0, 1.0,   // TexCoord 3
        1.0, 1.0    // TexCoord 4
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, textureCoordinates, gl.STATIC_DRAW);

    render();
}

function render() {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgram);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uSampler'), 0);

    const positionLocation = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const texCoordLocation = gl.getAttribLocation(shaderProgram, 'aTexCoord');
    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
