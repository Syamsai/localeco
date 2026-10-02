import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.NEXT_PUBLIC_USE_MOCK_DATA = "true";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});
