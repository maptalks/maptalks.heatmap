precision highp int;
precision highp float;
uniform sampler2D source;
varying vec2 texcoord;
float linstep(float low, float high, float value) {
    return clamp((value-low)/(high-low), 0.0, 1.0);
}
float fade(float low, float high, float value) {
    float mid = (low+high)*0.5;
    float range = (high-low)*0.5;
    float x = 1.0 - clamp(abs(mid-value)/range, 0.0, 1.0);
    return smoothstep(0.0, 1.0, x);
}
vec3 getColor(float intensity) {
    vec3 blue = vec3(0.0, 0.0, 1.0);
    vec3 cyan = vec3(0.0, 1.0, 1.0);
    vec3 green = vec3(0.0, 1.0, 0.0);
    vec3 yellow = vec3(1.0, 1.0, 0.0);
    vec3 red = vec3(1.0, 0.0, 0.0);
    vec3 color = (
    fade(-0.25, 0.25, intensity)*blue +
    fade(0.0, 0.5, intensity)*cyan +
    fade(0.25, 0.75, intensity)*green +
    fade(0.5, 1.0, intensity)*yellow +
    smoothstep(0.75, 1.0, intensity)*red
    );
    return color;
}
vec4 alphaFun(vec3 color, float intensity) {
    float alpha = smoothstep(0.00000000, 1.00000000, intensity);
    return vec4(color*alpha, alpha);
}
void main() {
    vec4 value = texture2D(source, texcoord);
    float intensity = smoothstep(0.0, 1.0, value.r);
    vec3 color = getColor(intensity);
    gl_FragColor = alphaFun(color, intensity);
    // gl_FragColor = value;
}
