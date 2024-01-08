#version 300 es
precision highp float;
uniform vec3 lightdir;
uniform vec3 lightcolor;
uniform vec3 halfway;

out vec4 fragColor;
in vec4 vColor;
in vec3 vnormal;

void main() {
    vec3 n = normalize(vnormal);

    // Calculate slope steepness (you can adjust the threshold)
    float steepness = 1.0 - n.y;

    // Define the threshold for differentiating between shallow and steep slopes
    float threshold = 0.5;  // Adjust this value as needed

    // Use the ternary operator to select the material based on slope steepness
    float shineIntensity = steepness > threshold ? 2.0 : 1.0;

    // Calculate lighting
    float lambert = max(dot(n, lightdir), 0.0);
    float blinn = pow(max(dot(n, halfway), 0.0), 150.0);
    float blinn2 = pow(max(dot(n, halfway), 0.0), 10.0);

    vec3 materialColor = steepness > threshold ? vec3(0.2, 0.6, 0.1) * (lightcolor * lambert) + vec3(1,1,1) * blinn * 2.0 : vec3(0.6, 0.3, 0.3) * (lightcolor * lambert) + vec3(1,1,1) * blinn2;


    // Combine material properties and lighting
    // fragColor = vec4(materialColor.rgb * (lightcolor * lambert) + vec3(1, 1, 1) * blinn * shineIntensity, vColor.a);
    fragColor = vec4(materialColor, vColor.a);
}