import assert from "node:assert/strict";
import test from "node:test";
import {
  isStrongPassword,
  isValidDisplayName,
  isValidUsername,
  normalizeGitHubRepositoryInput,
} from "./validation.js";

test("normalizeGitHubRepositoryInput accepts common GitHub repository formats", () => {
  assert.equal(
    normalizeGitHubRepositoryInput("github.com/openai/openai-node"),
    "https://github.com/openai/openai-node"
  );
  assert.equal(
    normalizeGitHubRepositoryInput("https://github.com/openai/openai-node.git"),
    "https://github.com/openai/openai-node"
  );
  assert.equal(
    normalizeGitHubRepositoryInput("git@github.com:openai/openai-node.git"),
    "https://github.com/openai/openai-node"
  );
});

test("normalizeGitHubRepositoryInput rejects invalid repository inputs", () => {
  assert.equal(normalizeGitHubRepositoryInput("not a repo"), null);
  assert.equal(normalizeGitHubRepositoryInput("https://gitlab.com/openai/openai-node"), null);
  assert.equal(normalizeGitHubRepositoryInput("https://github.com/openai"), null);
  assert.equal(normalizeGitHubRepositoryInput("https://github.com/openai/openai-node/tree/main"), null);
});

test("username, name, and password validation enforce minimum quality", () => {
  assert.equal(isValidUsername("ab"), false);
  assert.equal(isValidUsername("valid_user"), true);
  assert.equal(isValidDisplayName("A"), false);
  assert.equal(isValidDisplayName("Arsh"), true);
  assert.equal(isStrongPassword("weakpass"), false);
  assert.equal(isStrongPassword("StrongPass1"), true);
});
