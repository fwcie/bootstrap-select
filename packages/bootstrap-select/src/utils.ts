import {
  SAFE_URL_PATTERN,
  DATA_URL_PATTERN,
  uriAttrs,
  ParseableAttributes,
  deburredLetters


} from "./constants";

export function inArray(needle: any, haystack: any[]) {
  let length = haystack.length;
  for (let i = 0; i < length; i++) {
    if (haystack[i] == needle) return true;
  }
  return false;
}

export function allowedAttribute(attr: Attr, allowedAttributeList: string[]) {
  let attrName = attr.nodeName.toLowerCase();

  if (inArray(attrName, allowedAttributeList)) {
    if (inArray(attrName, uriAttrs)) {
      return Boolean(
        attr.nodeValue?.match(SAFE_URL_PATTERN) ||
          attr.nodeValue?.match(DATA_URL_PATTERN)
      );
    }

    return true;
  }

  const regExp = allowedAttributeList.filter(function (
    value: string | RegExp,
    _index: number
  ) {
    return value instanceof RegExp;
  });

  // Check if a regular expression validates the attribute.
  for (let i = 0, l = regExp.length; i < l; i++) {
    if (attrName.match(regExp[i])) {
      return true;
    }
  }

  return false;
}

export function sanitizeHtml(
  unsafeElements: HTMLAllCollection,
  whiteList: { "*": [] },
  sanitizeFn: Function
) {
  if (sanitizeFn && typeof sanitizeFn === "function") {
    return sanitizeFn(unsafeElements);
  }

  let whitelistKeys = Object.keys(whiteList);

  for (let i = 0, len = unsafeElements.length; i < len; i++) {
    let elements = unsafeElements[i].querySelectorAll("*");

    for (let j = 0, len2 = elements.length; j < len2; j++) {
      let el = elements[j];
      let elName = el.nodeName.toLowerCase();

      if (whitelistKeys.indexOf(elName) === -1) {
        el.parentNode?.removeChild(el);

        continue;
      }

      let attributeList = Array.from(el.attributes);
      let whitelistedAttributes = [].concat(
        whiteList["*"] || [],
        whiteList[elName as keyof {}] || []
      );

      for (let k = 0, len3 = attributeList.length; k < len3; k++) {
        let attr: Attr = attributeList[k];

        if (!allowedAttribute(attr, whitelistedAttributes)) {
          el.removeAttribute(attr.nodeName);
        }
      }
    }
  }
}

export function getAttributesObject($select: HTMLSelectElement) {
  let attributesObject: { title?: string; placeholder?: string } = {},
    attrVal: string | null;

  ParseableAttributes.forEach(function (item) {
    attrVal = $select.getAttribute(item);
    if (attrVal) attributesObject[item as keyof { title?: string }] = attrVal;
  });

  // for backwards compatibility
  // (using title as placeholder is deprecated - remove in v2.0.0)
  if (!attributesObject.placeholder && attributesObject.title) {
    attributesObject.placeholder = attributesObject.title;
  }

  return attributesObject;
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
    return (ofs ? "-" : "") + $.toLowerCase();
  });
}

export function createElementFromHTML(htmlString: string) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();

  // Change this to div.childNodes to support multiple top-level nodes.
  return div.firstChild;
}

export function deburrLetter(key: string) {
  return deburredLetters[key keyof deburredLetters];
}

export function normalizeToBase(string: string) {
  string = string.toString();
  return (
    string && string.replace(reLatin, deburrLetter).replace(reComboMark, "")
  );
}

export function toInteger(value: string) {
  return parseInt(value, 10) || 0;
}

export function stringSearch(
  li: HTMLLIElement,
  searchString: string,
  method: Function,
  normalize: boolean
) {
  let stringTypes = ["display", "subtext", "tokens"],
    searchSuccess = false;

  for (const element of stringTypes) {
    let stringType = element,
      string = li[stringType];

    if (string) {
      string = string.toString();

      // Strip HTML tags. This isn't perfect, but it's much faster than any other method
      if (stringType === "display") {
        string = string.replace(/<[^>]+>/g, "");
      }

      if (normalize) string = normalizeToBase(string);
      string = string.toUpperCase();

      if (typeof method === "function") {
        searchSuccess = method(string, searchString);
      } else if (method === "contains") {
        searchSuccess = string.indexOf(searchString) >= 0;
      } else {
        searchSuccess = string.startsWith(searchString);
      }

      if (searchSuccess) break;
    }
  }

  return searchSuccess;
}

export function createEscaper(map: Object) {
  let escaper = function (match) {
    return map[match];
  };
  // Regexes for identifying a key that needs to be escaped.
  let source = "(?:" + Object.keys(map).join("|") + ")";
  let testRegexp = RegExp(source);
  let replaceRegexp = RegExp(source, "g");
  return function (string) {
    string = string == null ? "" : "" + string;
    return testRegexp.test(string)
      ? string.replace(replaceRegexp, escaper)
      : string;
  };
}
