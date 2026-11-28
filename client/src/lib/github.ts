const GITHUB_USERNAME = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export const isGithubUsername = (value: unknown): value is string =>
  typeof value === "string" && GITHUB_USERNAME.test(value);

export const githubUrlForUsername = (value: unknown): string | null =>
  isGithubUsername(value) ? `https://github.com/${value}` : null;

/** Only an exact github.com profile URL is accepted from a room document. */
export const safeGithubUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const match = value.match(/^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/?$/);
  const username = match?.[1];

  return isGithubUsername(username) ? `https://github.com/${username}` : null;
};
