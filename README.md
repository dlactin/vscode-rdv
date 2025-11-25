# vscode-rdv

`vscode-rdv` provides a fast and local preview of your rendered Kubernetes manifest changes directly within Visual Studio Code.

It integrates the `rdv` CLI to render your local Helm chart or Kustomize overlay, validates rendered manifests via `kubeconform`, and compares the resulting manifests against the version in a target Git ref (such as `main`).

The extension opens a native side-by-side diff of the final rendered YAML.

---

## Requirements

- Visual Studio Code **1.80+**
- `git`
- `rdv` installed and in your `$PATH` (or configured via settings)

---

## Installation

### Via Command Line

Install the extension locally using the provided Makefile:

```sh
make install
```

### Manual Setup

Ensure `rdv` is installed:

```sh
go install github.com/dlactin/rdv@latest
```

Download the `.vsix` release and install it:

```sh
code --install-extension vscode-rdv-0.1.0.vsix
```

---

## Configuration

| Setting          | Description                                                                                          | Default |
|------------------|------------------------------------------------------------------------------------------------------|---------|
| `rdv.binaryPath` | Path to the `rdv` executable. If it's not available in your global PATH, supply the absolute path.   | `rdv`   |

---

## Usage

### Supported Files

The extension targets Helm values files matching:

- `values-*.yaml` (e.g., `values-dev.yaml`, `values-prod.yaml`)
- `*.values.yaml` (e.g., `dev.values.yaml`)

### Running a Diff

1. Open your project in VS Code (must be a Git repository).
2. Right-click on a supported values file in the Explorer or active editor.
3. Select **RDV: Render and Diff**.
4. Or open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run **RDV: Render and Diff**.

---

## How It Works

1. The extension detects the chart or Kustomize overlay directory relative to the selected values file.
2. Any unsaved changes in the active editor are saved.
3. `rdv` renders both:
   - **Target** state: manifests from the selected Git ref
   - **Local** state: manifests rendered from the working directory
4. The results are stored in a temporary directory.
5. VS Code opens a native side-by-side diff of the rendered YAML.

---
