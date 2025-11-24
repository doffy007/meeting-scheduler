include .env

MIGRATIONS_DIR=./migrations

.PHONY: help migrate-up migrate-down migrate-force migrate-create migrate-drop dev run build


migrate-up:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" up 1

migrate-up-all:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" up

migrate-down:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" down 1

migrate-down-all:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" down

migrate-force:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" force $(v)

migrate-create:
	migrate create -ext sql -dir $(MIGRATIONS_DIR) $(name)

migrate-drop:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" drop -f

migrate-version:
	migrate -path $(MIGRATIONS_DIR) -database "$(DSN)" version


dev:
	bun run --watch src/index.ts

run:
	bun run src/index.ts

build:
	bun build src/index.ts --outfile bin/api --target bun

# --- DOCKER ---

docker-build:
	docker build -t meeting-scheduler:latest .

docker-run:
	docker run --rm -p 3000:3000 --env-file .env meeting-scheduler:latest