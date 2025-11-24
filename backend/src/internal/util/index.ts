// Hash utilities
export {
  generateSalt,
  hashPassword,
  checkPassword,
  parseHash,
} from "./hash.js";
export type { HashOptions } from "./hash.js";

// General utilities
export {
  stringSliceDiff,
  isUrl,
  trimSpaceSlice,
  timeAfter,
  timeBefore,
  timeEqual,
  mapTags,
  stringIsEqual,
  getOutboundIP,
  ipToInt,
  removeDuplicateStrings,
  getUpdatedJSONFields,
  permutateStrings,
  toE164,
  nextPowOf2,
  nilString,
  nilBool,
  nilToEmptyString,
  anyToInt,
  anyToNilString,
  max,
  anyToFloat64,
  parseDate,
} from "./util.js";