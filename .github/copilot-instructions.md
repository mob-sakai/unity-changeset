# Copilot Instructions for Unity Changeset Project

## Overview
This project is a TypeScript library and CLI tool for retrieving and listing Unity editor changesets. It supports both Deno and Node.js environments, using Deno for development and building npm packages via dnt. The codebase follows Deno's conventions and uses modern TypeScript features.

## Coding Standards
- **Language**: TypeScript with Deno runtime
- **Style**: Follow Deno's linting rules (`deno lint`) and formatting (`deno fmt`)
- **Imports**: Use Deno-style imports from `deno.land` or npm specifiers
- **Error Handling**: Use explicit error handling with try-catch blocks; prefer throwing errors over returning error objects
- **Naming**: Use camelCase for variables/functions, PascalCase for classes/interfaces
- **Async/Await**: Prefer async/await over promises for asynchronous operations
- **Types**: Use strict TypeScript typing; avoid `any` unless necessary
- **Modules**: Keep modules focused and single-responsible; export only what's needed

## Testing
- Use Deno's built-in testing framework (`deno test`)
- Write tests in `.test.ts` files alongside source files
- Use `std/testing/asserts` for assertions
- Cover both unit tests and integration tests where applicable
- Run tests with `deno task test` before committing

## Build and Deployment
- Build npm packages using dnt (Deno to Node Transform)
- Run `deno task build` to generate npm distribution
- Follow semantic versioning for releases
- Use conventional commit messages for automated releases

## Dependencies
- Core: Deno standard library (`std/path`, `std/testing/asserts`)
- CLI: Cliffy for command-line interface
- GraphQL: graphql-request for Unity API interactions
- Build: dnt for npm package generation

## Communication
- **Ask Questions When Needed**: If user requirements are unclear, ask clarifying questions to ensure accurate implementation
- **Think in English**: All internal reasoning and planning should be conducted in English to maintain consistency and clarity

## Best Practices
- Keep code modular and reusable
- Document complex logic with comments
- Ensure cross-platform compatibility (macOS, Windows, Linux)
- Validate inputs and handle edge cases
- Follow security best practices, especially when handling external data
