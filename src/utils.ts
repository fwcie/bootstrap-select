export function inArray(needle: any, haystack: any[]) {
  let length = haystack.length;
  for (let i = 0; i < length; i++) {
    if (haystack[i] == needle) return true;
  }
  return false;
}

// shallow array comparison
export function isEqual(array1: [], array2: []) {
  return (
    array1.length === array2.length &&
    array1.every(function (element, index) {
      return element === array2[index];
    })
  );
}

export function toKebabCase(str: string) {
  return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, function ($, ofs) {
    return (ofs ? '-' : '') + $.toLowerCase();
  });
}

export function createElementFromHTML(htmlString: string) {
  const div = document.createElement('div');
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes.
  return div.firstChild;
}


export function toInteger(value: string) {
  return parseInt(value, 10) || 0;
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 */
export function mergeDeep<T extends Object>(target: T, ...sources: T[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key as keyof T])) {
        if (!target[key as keyof T]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key as keyof Object], source[key as keyof Object]);
      } else {
        Object.assign(target, { [key]: source[key as keyof T] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}