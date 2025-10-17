struct VertexInput {
    @location($i) aPosition: vec2f,
    @location($i) aOffset: vec2f,
    @location($i) aIntensity: f32,
};

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location($o) off: vec2f,
    @location($o) dim: vec2f,
    @location($o) vIntensity: f32,
};

struct GlobalUniforms {
    zoomScale: f32,
};

struct MyAppUniforms {
    projViewModelMatrix: mat4x4f,
};

@group(0) @binding($b) var<uniform> globalUniforms: GlobalUniforms;
@group(0) @binding($b) var<uniform> uniforms: MyAppUniforms;

@vertex
fn main(vertexInput: VertexInput) -> VertexOutput {
    var vertexOutput: VertexOutput;

    var off = vec2f(vertexInput.aOffset);
    vertexOutput.off = off;
    vertexOutput.dim = abs(vec2f(vertexInput.aOffset));

    let pos = vertexInput.aPosition.xy + globalUniforms.zoomScale * off;
    vertexOutput.vIntensity = f32(vertexInput.aIntensity) / 255.0;

    vertexOutput.Position = uniforms.projViewModelMatrix * vec4f(pos, 0.0, 1.0);

    return vertexOutput;
}
