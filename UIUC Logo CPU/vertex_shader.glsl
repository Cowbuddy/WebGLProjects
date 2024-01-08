#version 300 es
precision highp float;

layout(location=0) in vec4 position; // Position attribute

void main() {
    gl_Position = position;
}
