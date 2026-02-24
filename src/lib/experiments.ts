export const SEARCH_UI_EXPERIMENT_KEY = "ww_exp_search_ui";
export type SearchUiVariant = "control" | "immersive";

interface CookieStoreLike {
  get(name: string): { value: string } | undefined;
}

export function parseSearchUiVariant(value?: string | null): SearchUiVariant {
  if (value === "immersive") return "immersive";
  return "control";
}

export function getSearchUiVariant(cookies: CookieStoreLike): SearchUiVariant {
  return parseSearchUiVariant(cookies.get(SEARCH_UI_EXPERIMENT_KEY)?.value);
}
