attribute vec4 aPosition;
varying vec2 texcoord;
void main() {
    texcoord = aPosition.xy * 0.5 + 0.5;
    gl_Position = aPosition;
}
