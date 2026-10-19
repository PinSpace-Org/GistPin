FROM rust:1.82-slim AS builder

RUN rustup target add wasm32v1-none \
 && cargo install soroban-cli --locked

RUN groupadd -g 1000 builder && useradd -u 1000 -g builder -m builder

WORKDIR /workspace
RUN chown -R builder:builder /workspace

USER builder
COPY --chown=builder:builder . .

RUN cargo build --release --target wasm32v1-none

FROM scratch AS artifacts
COPY --from=builder /workspace/target/wasm32v1-none/release/*.wasm /
