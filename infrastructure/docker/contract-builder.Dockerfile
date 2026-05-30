FROM rust:1.82-slim AS builder

RUN rustup target add wasm32v1-none \
 && cargo install soroban-cli --locked

WORKDIR /workspace
COPY . .

RUN cargo build --release --target wasm32v1-none

FROM scratch AS artifacts
COPY --from=builder /workspace/target/wasm32v1-none/release/*.wasm /
