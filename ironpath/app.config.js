// Extends app.json. Lets the website build live under a sub-path, e.g. GitHub Pages
// serves this repo at https://<user>.github.io/remotion-hello-world/.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return { ...config, experiments: { ...(config.experiments ?? {}), baseUrl } };
};
