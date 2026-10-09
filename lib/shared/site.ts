// Public links shown around the site.
export const GITHUB_REPO = "https://github.com/brohan2001/countdowndle";
export const CONTACT_EMAIL = "rohan.balasubramanian@gmail.com";

export const issueUrl = (template: "bug_report.yml" | "feature_request.yml") =>
  `${GITHUB_REPO}/issues/new?template=${template}`;
