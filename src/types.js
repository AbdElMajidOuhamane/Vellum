// @flow
/*::
// Shared type contract for Vellum. All source files use Flow's comment
// syntax so the same files execute in Fairyfly without a transform step.

export type NavItem = {
  label: string,
  link: string,
  external?: boolean,
};

export type SidebarItem = {
  label: string,
  link?: string,
  items?: Array<SidebarItem>,
  collapsed?: boolean,
};

export type ThemeConfig = {
  accent?: string,
  accentContrast?: string,
  customCss?: string | Array<string>,
  logo?: string,
  favicon?: string,
  socialImage?: string,
};

export type ResolvedThemeConfig = {
  accent: string,
  accentContrast: string,
  customCss: Array<string>,
  logo: string,
  favicon: string,
  socialImage?: string,
};

export type EditLinkConfig = {
  baseUrl: string,
  label?: string,
};

export type MarkdownConfig = {
  tables?: boolean,
  callouts?: boolean,
  headingAnchors?: boolean,
  externalLinksNewTab?: boolean,
};

export type SearchConfig = {
  enabled?: boolean,
  maxResults?: number,
};

export type BundlerProvider = "auto" | "rsbuild" | "builtin";

export type BundlerConfig = {
  provider?: BundlerProvider,
  node?: string,
};

export type DevConfig = {
  port?: number,
  watchInterval?: number,
  liveReload?: boolean,
};

export type HeroAction = {
  text: string,
  link: string,
  variant?: "primary" | "secondary" | "minimal",
};

// Accepts the Starlight-style mapping as well as a plain path.
export type HeroImage = string | { file: string, alt?: string };

export type HeroConfig = {
  title?: string,
  tagline?: string,
  eyebrow?: string,
  image?: HeroImage,
  imageAlt?: string,
  actions?: Array<HeroAction>,
};

// Cards rendered under the hero on a landing page.
export type FeatureConfig = {
  title: string,
  description: string,
  link?: string,
};

// The shape authored in vellum.config.js.
export type ProjectConfig = {
  title?: string,
  description?: string,
  site?: string,
  lang?: string,
  srcDir?: string,
  publicDir?: string,
  outDir?: string,
  base?: string,
  trailingSlash?: boolean,
  nav?: Array<NavItem>,
  sidebar?: "auto" | Array<SidebarItem>,
  theme?: ThemeConfig,
  editLink?: EditLinkConfig,
  social?: { github?: string, [string]: string },
  markdown?: MarkdownConfig,
  search?: SearchConfig,
  bundler?: BundlerConfig,
  dev?: DevConfig,
  drafts?: boolean,
  footer?: string,
  hero?: HeroConfig,
  features?: Array<FeatureConfig>,
  integrations?: Array<any>,
};

export type ResolvedBundlerConfig = {
  provider: BundlerProvider,
  node: string,
};

export type ResolvedDevConfig = {
  port: number,
  watchInterval: number,
  liveReload: boolean,
};

export type ResolvedConfig = {
  root: string,
  configPath: string,
  title: string,
  description: string,
  site: string,
  lang: string,
  srcDir: string,
  publicDir: string,
  outDir: string,
  base: string,
  trailingSlash: boolean,
  nav: Array<NavItem>,
  sidebar: "auto" | Array<SidebarItem>,
  theme: ResolvedThemeConfig,
  editLink: EditLinkConfig | null,
  social: { [string]: string },
  markdown: MarkdownConfig,
  search: SearchConfig,
  bundler: ResolvedBundlerConfig,
  dev: ResolvedDevConfig,
  drafts: boolean,
  footer: string,
  hero: HeroConfig | null,
  features: Array<FeatureConfig>,
  integrations: Array<any>,
};

export type SidebarMeta = {
  label?: string,
  group?: string,
  order?: number,
  hidden?: boolean,
};

export type Frontmatter = {
  title?: string,
  description?: string,
  slug?: string,
  order?: number,
  draft?: boolean,
  sidebar?: SidebarMeta,
  hero?: HeroConfig,
  features?: Array<FeatureConfig>,
  layout?: string,
  template?: string,
  robots?: string,
  editLink?: boolean,
  toc?: boolean,
  [string]: any,
};

export type Heading = {
  level: number,
  text: string,
  id: string,
};

export type TocNode = {
  id: string,
  text: string,
  level: number,
  children: Array<TocNode>,
};

export type LinkRef = {
  href: string,
  kind: "link" | "image",
};

export type ContentEntry = {
  file: string,
  relativeFile: string,
  route: string,
  outputFile: string,
  frontmatter: Frontmatter,
  title: string,
  description: string,
  sidebarLabel: string,
  sidebarOrder: number,
  sidebarGroup: string,
  sidebarHidden: boolean,
  draft: boolean,
  order: number,
  html: string,
  headings: Array<Heading>,
  bodyText: string,
  links: Array<LinkRef>,
  source: string,
};

export type SearchRecord = {
  title: string,
  description: string,
  route: string,
  headings: Array<string>,
  text: string,
};

export type RenderAssets = {
  css: Array<string>,
  js: Array<string>,
};

export type RenderContext = {
  config: ResolvedConfig,
  entry: ContentEntry,
  entries: Array<ContentEntry>,
  sidebar: Array<SidebarItem>,
  nav: Array<NavItem>,
  toc: Array<TocNode>,
  prev: ContentEntry | null,
  next: ContentEntry | null,
  assets: RenderAssets,
  dev: boolean,
  version: string,
};

export type BuildResult = {
  pages: number,
  assets: Array<string>,
  outDir: string,
  durationMs: number,
  warnings: Array<string>,
  bundler: string,
};

export type DevServerOptions = {
  config: ResolvedConfig,
  frameworkRoot: string,
  logger?: Logger,
};

export type Logger = {
  info: (message: string) => void,
  step: (message: string) => void,
  warn: (message: string) => void,
  error: (message: string) => void,
  debug: (message: string) => void,
  quiet: boolean,
};

export type CliOptions = {
  command: string,
  configPath: string | null,
  root: string | null,
  port: number | null,
  outDir: string | null,
  drafts: boolean,
  search: boolean,
  bundler: BundlerProvider | null,
  json: boolean,
  quiet: boolean,
  verbose: boolean,
  force: boolean,
  title: string | null,
  positional: Array<string>,
  help: boolean,
  version: boolean,
};

export type ParsedMarkdown = {
  html: string,
  headings: Array<Heading>,
  bodyText: string,
  links: Array<LinkRef>,
};

export type YamlValue = string | number | boolean | null | Array<YamlValue> | { [string]: YamlValue };
*/
