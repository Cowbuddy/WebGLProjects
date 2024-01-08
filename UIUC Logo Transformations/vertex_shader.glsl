#version 300 es
precision highp float;

layout(location=0) in vec4 position; // Position attribute
layout(location=1) in vec4 color;

uniform mat4 transformationMatrix;

out vec4 vColor;

void main() {
    vColor = color;
    gl_Position = transformationMatrix * vec4(position.x, position.y, 0, 1) ;
}
