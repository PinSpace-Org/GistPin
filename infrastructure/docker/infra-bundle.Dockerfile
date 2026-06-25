# Infrastructure bundle Dockerfile (issue #556)
# Creates an immutable container image containing all infrastructure-as-code
# components, versions, and metadata. This image is never modified after build -
# any changes require a new image with a new version tag.

FROM alpine:3.20

# Build-time metadata (these values are baked into the image at build time)
ARG BUILD_VERSION
ARG GIT_COMMIT
ARG BUILD_TIMESTAMP
ARG BUILT_BY

# Environment variables from metadata
ENV INFRA_VERSION=${BUILD_VERSION:-unknown}
ENV GIT_SHA=${GIT_COMMIT:-unknown}
ENV BUILD_DATE=${BUILD_TIMESTAMP:-unknown}
ENV DEPLOYED_BY=${BUILT_BY:-unknown}

# Install necessary tools
RUN apk add --no-cache \
    bash \
    curl \
    jq \
    yq \
    kubectl \
    helm \
    terraform \
    openssl \
    ca-certificates

# Create non-root user for security
RUN addgroup -S infra && adduser -S infra -G infra
USER infra

# Create working directory
WORKDIR /infra

# Copy all infrastructure files into the image
COPY .infrabundle/ .

# Verify metadata exists
RUN if [ ! -f metadata.env ]; then echo "metadata.env not found, image is corrupted"; exit 1; fi

# Verify all required infrastructure directories exist
RUN for dir in terraform k8s ci docker docs monitoring; do \
        if [ ! -d "$dir" ]; then echo "Infrastructure directory $dir missing, image is corrupted"; exit 1; fi \
    done

# Add labels for OCI image specification
LABEL org.opencontainers.image.title="GistPin Infrastructure Bundle"
LABEL org.opencontainers.image.description="Immutable infrastructure bundle for GistPin Kubernetes deployment"
LABEL org.opencontainers.image.version="${INFRA_VERSION}"
LABEL org.opencontainers.image.revision="${GIT_SHA}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.authors="${DEPLOYED_BY}"
LABEL org.opencontainers.image.vendor="PinSpace-Org"
LABEL org.opencontainers.image.licenses="MIT"

# Default command - display metadata and keep container running
CMD ["sh", "-c", "cat metadata.env && exec tail -f /dev/null"]