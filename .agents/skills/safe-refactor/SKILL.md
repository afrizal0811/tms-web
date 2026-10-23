---
name: safe-refactor
description: Safely refactor existing code while preserving algorithms, business logic, behavior, and API contracts. Improve readability, maintainability, and simplicity without unnecessary code or comments. Use when refactoring, cleaning up, simplifying, or restructuring existing code.
---

# Safe Refactor

## Core Objective

Refactor existing code to make it simpler, clearer, and easier to maintain without changing its existing algorithms or behavior.

Preserve existing functionality. Improve implementation, not requirements.

## 1. Preserve Existing Behavior

- Never remove, replace, or redesign an existing algorithm merely to make code shorter.
- Preserve business rules, calculation formulas, execution order, conditions, filtering, sorting, and data transformations.
- Preserve existing outputs, return types, side effects, error handling, and API contracts unless explicitly asked to change them.
- Preserve edge-case behavior, including behavior that appears unusual but may be intentional.
- Do not silently fix unrelated bugs or change business logic during refactoring.
- If existing behavior is ambiguous, investigate callers and tests before modifying it.
- If a requested simplification could change behavior, explain the risk before proceeding.

## 2. Inspect Before Changing

- Read the relevant implementation and surrounding code.
- Find all callers, dependencies, exports, tests, and affected interfaces.
- Understand the current algorithm and its data flow before editing.
- Identify duplicated logic, unnecessary complexity, unclear naming, and redundant operations.
- Establish which behavior must remain unchanged.
- Avoid broad rewrites when a localized change is sufficient.

## 3. Simplify the Implementation

- Prefer the smallest complete refactor.
- Reuse existing helpers, components, utilities, and project conventions.
- Remove redundant variables, conditions, loops, conversions, and repeated calculations when safe.
- Reduce nested conditions and excessive branching when doing so preserves behavior.
- Avoid unnecessary abstractions, wrappers, classes, hooks, utilities, and design patterns.
- Do not create helpers used only once unless they materially improve clarity or isolate meaningful complexity.
- Do not introduce new dependencies for trivial functionality.
- Avoid premature optimization and speculative future-proofing.
- Keep functions focused and appropriately sized.
- Do not compress code into unreadable one-liners.
- Prefer straightforward control flow and explicit naming over clever tricks.

## 4. Improve Maintainability

- Use descriptive, consistent names for variables, functions, and parameters.
- Keep related logic together and separate unrelated responsibilities where beneficial.
- Preserve the existing architecture unless restructuring is necessary.
- Follow the project's established coding style, framework conventions, and dependency versions.
- Keep data in its existing format unless conversion is required.
- Avoid unnecessary state, duplicated sources of truth, and hidden side effects.
- Preserve type safety and existing validation.
- Avoid creating multiple layers of indirection for simple operations.

## 5. No Code Comments

- Do not add comments to code.
- Do not add TODO, FIXME, or explanatory comments.
- Do not retain obsolete comments in code being refactored.
- Express intent through clear names, simple logic, and appropriate function boundaries.
- Explain important decisions or limitations in the response instead of adding code comments.
- Preserve required legal notices or machine-readable directives when removing them could cause problems.

## 6. Testing and Verification

- Inspect existing tests before changing implementation.
- Preserve existing test coverage and update tests only when required by the refactor.
- For non-trivial changes, use existing tests or add focused tests that verify unchanged behavior.
- Cover important edge cases and boundary conditions.
- Compare outputs before and after refactoring when practical.
- Run relevant tests, type checks, and linting when available.
- Never claim tests passed unless they were actually executed successfully.
- If verification cannot be completed, state what remains unchecked.

## 7. Change Scope

- Modify only code necessary to complete the refactor.
- Update affected callers when necessary to preserve compatibility.
- Do not mix unrelated feature development, dependency upgrades, formatting changes, or bug fixes into the refactor.
- Preserve existing error handling, security checks, accessibility requirements, and validation.
- Avoid changing public interfaces unless explicitly requested.
- Prefer a small, reviewable diff over a broad rewrite.

## 8. Refactoring Workflow

1. Inspect the existing code and its callers.
2. Identify the algorithm, business rules, and observable behavior that must remain unchanged.
3. Identify the smallest useful improvements.
4. Refactor incrementally without changing behavior.
5. Review the diff for accidental logic changes and unnecessary additions.
6. Run relevant tests and verification.
7. Summarize the changes, verification performed, and any remaining risks.

## 9. Completion Criteria

A refactor is complete only when:

- Existing algorithms and business behavior remain unchanged.
- Relevant callers and interfaces remain compatible.
- Code is easier to read and maintain.
- Unnecessary complexity and duplication are reduced.
- No unrequested features or dependencies are introduced.
- No unnecessary comments are added.
- Verification results and remaining risks are reported honestly.

## 10. Response Format

- Summarize the important changes concisely.
- Explain any non-obvious trade-offs outside the code.
- State which tests or checks were run.
- Mention what was not checked and any relevant risks.
- Do not claim behavior is unchanged beyond what the available verification supports.
