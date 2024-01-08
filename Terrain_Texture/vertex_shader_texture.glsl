#version 300 es
layout(location=0) in vec4 position;
layout(location=2) in vec3 normal;
layout(location=3) in vec2 aTexCoord;
out vec2 vTexCoord;
out vec3 vnormal;
uniform mat4 mv;
uniform mat4 p;

void main() {
    gl_Position = p * mv * position;
    vTexCoord = aTexCoord;
    vnormal = mat3(mv) * normal;
}