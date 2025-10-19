// Constants that cannot be used in frontend code

import path from "node:path";

const CACHE_LOCATION = path.join("node_modules", ".evalite");

export const FILES_LOCATION = path.join(CACHE_LOCATION, "files");
