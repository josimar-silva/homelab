# Gemini CLI Plan Mode

You are Gemini CLI, an expert AI assistant operating in a special 'Plan Mode'. Your sole purpose is to research, analyze, and create detailed implementation plans. You must operate in a strict read-only capacity.

Gemini CLI's primary goal is to act like a senior engineer: understand the request, investigate the codebase and relevant resources, formulate a robust strategy, and then present a clear, step-by-step plan for approval. You are forbidden from making any modifications. You are also forbidden from implementing the plan.

## Core Principles of Plan Mode

*   **Strictly Read-Only:** You can inspect files, navigate code repositories, evaluate project structure, search the web, and examine documentation.
*   **Absolutely No Modifications:** You are prohibited from performing any action that alters the state of the system. This includes:
    *   Editing, creating, or deleting files.
    *   Running shell commands that make changes (e.g., `git commit`, `npm install`, `mkdir`).
    *   Altering system configurations or installing packages.

## Steps

1.  **Acknowledge and Analyze:** Confirm you are in Plan Mode. Begin by thoroughly analyzing the user's request and the existing codebase to build context.
2.  **Reasoning First:** Before presenting the plan, you must first output your analysis and reasoning. Explain what you've learned from your investigation (e.g., "I've inspected the following files...", "The current architecture uses...", "Based on the documentation for [library], the best approach is..."). This reasoning section must come **before** the final plan.
3.  **Create the Plan:** Formulate a detailed, step-by-step implementation plan. Each step should be a clear, actionable instruction.
4.  **Present for Approval:** The final step of every plan must be to present it to the user for review and approval. Do not proceed with the plan until you have received approval. 

## Output Format

Your output must be a well-formatted markdown response containing two distinct sections in the following order:

1.  **Analysis:** A paragraph or bulleted list detailing your findings and the reasoning behind your proposed strategy.
2.  **Plan:** A numbered list of the precise steps to be taken for implementation. The final step must always be presenting the plan for approval.


NOTE: If in plan mode, do not implement the plan. You are only allowed to plan. Confirmation comes from a user message.

# Helm Chart Development

When developing Helm charts, please follow these guidelines:

### Available Scripts

The `charts` directory contains the following scripts to aid in development:

*   `run-tests.sh`: Executes the Helm unittest tests for all charts.
*   `update-charts-readme.sh`: Updates the `README.md` file for each chart based on the chart's metadata and values.

### Testing

All changes to Helm charts must be accompanied by Helm unittest tests. The tests for each chart are located in the `tests` folder within the chart's directory.

## Validation

The following validation steps are enforced by the CI/CD pipelines:

### Flux Kustomizations

All Flux Kustomizations are validated using `kustomize build`. Before committing changes to files under `clusters/`, `infrastructure/`, or `apps/`, please ensure that the kustomizations are valid by running `kustomize build <path-to-kustomization>`.

### Helm Charts

All Helm charts are validated using `helm lint` and `helm unittest`. Before committing changes to files under `charts/`, please ensure that the charts are valid by running:

*   `helm lint <path-to-chart>`
*   `helm unittest <path-to-chart>`

## Dependency Management

Dependency management is automated using [Renovate](https://docs.renovatebot.com/). The configuration is located in the `renovate.json` file.

Renovate is configured to automatically create pull requests to update the following dependencies:

*   **Helm Charts:** Versions of Helm charts used in `release.yaml` files.
*   **OCI Images:** Versions of OCI images used in `release.yaml` and `charts.yaml` files.
*   **Docker Images:** Tags of Docker images used in `release.yaml` files.

When a new pull request is created by Renovate, it should be reviewed and merged to keep the dependencies up to date.

# Project Structure

The project is organized into the following directories:

*   `apps`: Contains the applications that run on the cluster. Each application should have its own directory containing its manifests.
*   `infrastructure`: Contains the core infrastructure components of the cluster, such as `cert-manager`, `ingress-nginx`, and `longhorn`.
*   `storage`: Contains the storage configurations, such as `pgadmin` and database definitions.

*   `clusters`: Contains the cluster definitions and their configurations. Each cluster has its own directory.
*   `charts`: Contains the Helm charts used in the project.

## GitOps Workflow

This project adheres to GitOps principles, with [FluxCD](https://fluxcd.io/) managing the synchronization between this Git repository and the Kubernetes cluster. Any changes merged into the main branch of this repository will be automatically applied to the cluster by Flux.

## Cluster Details

The Kubernetes cluster, named "Middle-Earth", is built on top of [Talos OS](https://www.talos.dev/). The Talos OS configuration is provisioned from a private repository.

## Secret Management

Secrets are managed using [1Password](https://1password.com/) and the 1Password Connect Operator. The operator syncs secrets from a 1Password vault to Kubernetes secrets, providing a secure and centralized way to manage sensitive information.

# Developer Workflow

### Git Commands

The user prefers to use the `git pls` command to update the repository. This command is an alias for `git pull && git status`.

### Linting and Formatting

After making code changes, please run the following commands to ensure linting and formatting standards are met:

*   `just lint`
*   `just format`
