---
trigger: always_on
description: Tailwind CSS v4 syntax, gradient, and aspect-ratio styling conventions.
---

# Tailwind CSS v4 Styling Guidelines

This repository uses **Tailwind CSS v4**. Always follow the canonical v4 conventions when writing or refactoring styles:

## 1. Aspect Ratio Syntax
- Use native fraction utilities instead of arbitrary bracket syntax:
  - Use `aspect-4/5` instead of `aspect-[4/5]`
  - Use `aspect-9/16` instead of `aspect-[9/16]`
  - Use `aspect-16/9` instead of `aspect-[16/9]`
  - Use `aspect-1/1` or `aspect-square` instead of `aspect-[1/1]`

## 2. Gradient Syntax
- Tailwind CSS v4 replaced legacy `bg-gradient-to-*` with `bg-linear-to-*`:
  - Use `bg-linear-to-r` instead of `bg-gradient-to-r`
  - Use `bg-linear-to-t` instead of `bg-gradient-to-t`
  - Use `bg-linear-to-b` instead of `bg-gradient-to-b`
  - Use `bg-linear-to-tr` instead of `bg-gradient-to-tr`

## 3. Canonical Utilities
- Prefer canonical utility classes over arbitrary bracketed values `[...]` whenever a built-in utility exists.
- Keep classes formatted with `prettier-plugin-tailwindcss`.
