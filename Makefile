# Variables
EXTENSION_NAME := $(shell node -p "require('./package.json').name")
VERSION        := $(shell node -p "require('./package.json').version")
VSIX_NAME      := $(EXTENSION_NAME)-$(VERSION).vsix

# Tools
NPM            := npm
VSCE           := npx vsce
CODE           := code

.PHONY: all deps build watch package install test clean lint help

# Default target
all: build

## ----------------------------------------------------------------------
## Development
## ----------------------------------------------------------------------

deps: ## Install dependencies
	$(NPM) install

build: ## Compile the extension (TypeScript -> JS)
	$(NPM) run compile

watch: ## Watch for changes and recompile automatically
	$(NPM) run watch

lint: ## Run ESLint
	$(NPM) run lint

test: ## Run the headless extension tests
	$(NPM) test

## ----------------------------------------------------------------------
## Distribution
## ----------------------------------------------------------------------

package: build ## Create the installable .vsix file
	$(VSCE) package

install: package ## Package and install the extension locally into VS Code
	$(CODE) --install-extension $(VSIX_NAME) --force

publish: ## Publish to VS Code Marketplace (requires token)
	$(VSCE) publish

## ----------------------------------------------------------------------
## Cleanup
## ----------------------------------------------------------------------

clean: ## Remove build artifacts and temporary files
	rm -rf out
	rm -f *.vsix
	rm -rf node_modules

help: ## Show this help menu
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'