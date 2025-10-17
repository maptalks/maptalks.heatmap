struct VertexInput {
    @location($i) aPosition: vec4i,
};

struct VertexOutput {
    @builtin(position) Position: vec4f,
    @location($o) texcoord: vec2f,
};

@vertex
fn main(vertexInput: VertexInput) -> VertexOutput {
    var vertexOutput: VertexOutput;
    var position = vec4f(vertexInput.aPosition);

    vertexOutput.texcoord = vec2f(position.x * 0.5 + 0.5, -position.y * 0.5 + 0.5);
    vertexOutput.Position = position;

    return vertexOutput;
}
