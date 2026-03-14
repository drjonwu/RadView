/**
 * Development-only logger.
 *
 * All output is suppressed in production builds (when import.meta.env.DEV
 * is false) to prevent PHI leakage through browser console logs.
 */

const noop = () => {};

const isDev = import.meta.env.DEV;

export const logger = {
  log: isDev ? console.log.bind(console) : noop,
  warn: isDev ? console.warn.bind(console) : noop,
  info: isDev ? console.info.bind(console) : noop,
  error: console.error.bind(console), // Always log errors
};
