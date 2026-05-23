FROM golang:1.26-alpine AS builder

WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY *.go ./
RUN CGO_ENABLED=0 go build -o sync-engine .

FROM alpine:3.21

RUN adduser -D -u 1000 appuser && mkdir -p /data && chown appuser /data
USER appuser

COPY --from=builder /build/sync-engine /usr/local/bin/sync-engine

EXPOSE 42061
VOLUME /data

ENV DB_PATH=/data/taskjournal.db
ENV LOG_LEVEL=info
ENTRYPOINT ["sync-engine"]
