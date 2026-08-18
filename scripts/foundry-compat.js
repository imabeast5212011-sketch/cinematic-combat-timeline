import { MODULE_TITLE } from "./constants.js?v=0.1.14";

const TEMPLATE_CACHE = new Map();

function handlebarsApi() {
  return globalThis.foundry?.applications?.handlebars ?? {};
}

export async function loadTemplatesCompat(paths) {
  if (typeof globalThis.loadTemplates === "function") return globalThis.loadTemplates(paths);
  const api = handlebarsApi();
  if (typeof api.loadTemplates === "function") return api.loadTemplates(paths);
  return Promise.resolve([]);
}

export async function renderTemplateCompat(path, data) {
  if (typeof globalThis.renderTemplate === "function") return globalThis.renderTemplate(path, data);
  const api = handlebarsApi();
  if (typeof api.renderTemplate === "function") return api.renderTemplate(path, data);
  if (!globalThis.Handlebars?.compile) throw new Error("No Foundry Handlebars renderer is available.");

  if (!TEMPLATE_CACHE.has(path)) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Unable to load template ${path}: ${response.status}`);
    TEMPLATE_CACHE.set(path, globalThis.Handlebars.compile(await response.text()));
  }
  return TEMPLATE_CACHE.get(path)(data);
}

export function getApplicationV2Api() {
  const api = globalThis.foundry?.applications?.api ?? {};
  const ApplicationV2 = api.ApplicationV2 ?? globalThis.ApplicationV2;
  const HandlebarsApplicationMixin = api.HandlebarsApplicationMixin ?? globalThis.HandlebarsApplicationMixin;
  if (!ApplicationV2 || !HandlebarsApplicationMixin) {
    throw new Error("Foundry ApplicationV2 or HandlebarsApplicationMixin is unavailable.");
  }
  return { ApplicationV2, HandlebarsApplicationMixin };
}

export function reportError(context, error) {
  console.error(`${MODULE_TITLE} | ${context}`, error);
}

export function reportWarning(context, data = undefined) {
  if (data === undefined) console.warn(`${MODULE_TITLE} | ${context}`);
  else console.warn(`${MODULE_TITLE} | ${context}`, data);
}
