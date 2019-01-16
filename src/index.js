/* CSS Sniff.js - Matthew Holloway (C) 2019 */

/*
 @param children
 @param options
 @param matchedCSS
 @returns { object }
   'matchedCSS' a variable to give to serializeCSSRules()
*/
export function getCSSRules(children, options, matchedCSS) {
  return children.reduce((matchedCSS, child, i) => {
    matchedCSS = getCSSRulesByElement(child, options, matchedCSS);
    if (child.childNodes)
      matchedCSS = getCSSRules([...child.childNodes], options, matchedCSS);
    return matchedCSS;
  }, matchedCSS || {});
}

function getCSSRulesByElement(el, options, matchedCSS) {
  const matches =
    el.matches ||
    el.webkitMatchesSelector ||
    el.mozMatchesSelector ||
    el.msMatchesSelector ||
    el.oMatchesSelector;
  if (!matches) return matchedCSS; // presumed text node
  el.matches = matches;

  const sheets = options.document.styleSheets || window.document.styleSheets;

  for (let i in sheets) {
    const sheet = sheets[i];
    if (sheetIsAllowed(sheet, options)) {
      const matchedCSSRule = _filterCSSRulesByElement(
        el,
        sheet.rules || sheet.cssRules,
        options,
        matchedCSS[i] || {}
      );
      if (matchedCSSRule) {
        matchedCSS[i] = matchedCSSRule;
      }
    }
  }
  return matchedCSS;
}

function _filterCSSRulesByElement(el, rules, options, matchedCSS) {
  for (let i in rules) {
    const rule = rules[i];
    if (rule.selectorText) {
      if (ruleIsAllowed(rule.selectorText, options)) {
        // TODO use proper selector parser
        // Currently the splitting is naive and splits
        // on comma which is fine for most CSS but
        // this wouldn't support selectors strings like
        // 'a[attr=','],b'
        const selectors = rule.selectorText.split(",");

        selectors.forEach(selector => {
          let trimmedSelector, normalizedSelector;

          try {
            // Exceptions may be thrown about browser-specific
            // selectors such as
            //
            //   input::-moz-something
            //   input::-webkit-something
            //   input::-ms-something
            //   input:-moz-something
            //   input:-webkit-something
            //   input:-ms-something
            //
            // or potentially global selectors like without anything
            // before the "::",
            //
            //   ::-moz-something
            //
            // and there are also escaped selectors like,
            //
            //   .link.\:link
            //
            //  (used like <input class="link :link">)
            //
            // and pseudo-elements like,
            //
            //   span::before
            //
            // where the "::before" is irrelevant to whether the
            // selector matches the element so we should remove it.
            //
            // and
            //
            //   input:first-child
            //   p > :first-child
            //
            // where we should change to
            //   input
            //   p > *
            // respectively.
            //
            // So given all those scenarios we have the following logic,
            //
            // 1) If it starts with ":" without anything preceding we'll
            //    consider it a match because it could be.
            //    (maybe this should be configurable?)
            //
            // 2) If it has a ":" in it that's not preceded by "\" then
            //    we remove to the end of the selector. ie,
            //    input:-moz-something -> input
            //    input\:-moz-something -> input\:-moz-something
            //    input::before -> input::before
            //    input\:\:moz-something -> input\:\:moz-something
            trimmedSelector = selector.trim();
            const unique = Math.random().toString(16);
            normalizedSelector = trimmedSelector
              .replace(/\\:/g, unique) // ensure "\:" is temporarily changed to simplify removing ":something"
              .replace(/:+.*$/gi, match => {
                return [
                  ":first-child",
                  ":last-child",
                  ":first-letter",
                  ":first-line"
                ].includes(match.replace("::", ":"))
                  ? match
                  : "";
              })
              .replace(new RegExp(unique, "g"), "\\:");

            if (
              trimmedSelector.indexOf(":") === 0 ||
              el.matches(normalizedSelector)
            ) {
              matchedCSS[i] = {
                selectors: (matchedCSS[i] && matchedCSS[i].selectors) || [],
                properties: rule.cssText.substring(rule.cssText.indexOf("{"))
              };
              if (matchedCSS[i].selectors.indexOf(selector) === -1) {
                matchedCSS[i].selectors.push(selector);
              }
            }
          } catch (e) {
            if ("@charset".indexOf(rule.selectorText) !== -1) {
              console.error(
                "ERROR",
                rule.type,
                `[${trimmedSelector}]`,
                `[[${normalizedSelector}]]`,
                `(((${rule.selectorText})))`,
                e
              );
            }
          }
        });
      }
    } else if ((rule.rules || rule.cssRules) && rule.conditionText) {
      if (mediaIsAllowed(rule.conditionText, options)) {
        // a nested rule like @media { rule { ... } }
        // so we filter the rules inside individually
        const nestedRules = _filterCSSRulesByElement(
          el,
          rule.rules || rule.cssRules,
          options,
          {}
        );
        if (nestedRules) {
          matchedCSS[i] = {
            before: "@media " + rule.conditionText + " {",
            children: nestedRules,
            after: "}"
          };
        }
      }
    }
  }
  return Object.keys(matchedCSS).length ? matchedCSS : undefined;
}

function sheetIsAllowed(sheet, options) {
  // Returns boolean of whether the sheet is allowed
  // due to whitelist/blacklist
  if (!sheet) return false;
  if (!sheet.ownerNode) return true;

  const checkStylesheet = (sheet, sheetMatch) => {
    switch (sheet.ownerNode.nodeName.toLowerCase()) {
      case "style":
      case "link":
        // matching on JSON.stringify(node.attrs)
        const nodeAttrs = sheet.ownerNode.attributes;
        const attrs = {};
        for (let i = 0; i < nodeAttrs.length; i++)
          attrs[nodeAttrs[i].name] = nodeAttrs[i].value;
        const attributesJSON = JSON.stringify(attrs);
        return attributesJSON.indexOf(sheetMatch) !== -1;
    }
  };

  let whitelisted = true;
  let blacklisted = false;

  const whitelistStylesheets =
    options.whitelist && options.whitelist.stylesheet;
  if (whitelistStylesheets) {
    const sheetMatches = Array.isArray(whitelistStylesheets)
      ? whitelistStylesheets
      : [whitelistStylesheets];
    whitelisted = sheetMatches.some(sheetMatch =>
      checkStylesheet(sheet, sheetMatches)
    );
  }

  const blacklistStylesheets =
    options.blacklist && options.blacklist.stylesheet;
  if (blacklistStylesheets) {
    const sheetMatches = Array.isArray(blacklistStylesheets)
      ? blacklistStylesheets
      : [blacklistStylesheets];
    blacklisted = sheetMatches.some(sheetMatch =>
      checkStylesheet(sheet, sheetMatch)
    );
  }

  return whitelisted !== false && blacklisted !== true;
}

function mediaIsAllowed(mediaString, options) {
  if (!options || !mediaString) return false;

  let whitelisted = true;
  let blacklisted = false;

  const whitelistMedia = options.whitelist && options.whitelist.media;
  if (whitelistMedia) {
    const mediaMatches = Array.isArray(whitelistMedia)
      ? whitelistMedia
      : [whitelistMedia];
    whitelisted = mediaMatches.some(
      mediaMatch => mediaString.indexOf(mediaMatch) !== -1
    );
  }

  const blacklistMedia = options.blacklist && options.blacklist.media;
  if (blacklistMedia) {
    const mediaMatches = Array.isArray(blacklistMedia)
      ? blacklistMedia
      : [blacklistMedia];
    blacklisted = mediaMatches.some(
      mediaMatch => mediaString.indexOf(mediaMatch) !== -1
    );
  }

  return whitelisted !== false && blacklisted !== true;
}

function ruleIsAllowed(ruleString, options) {
  if (!options || !ruleString) return false;

  let whitelisted = true;
  let blacklisted = false;

  const whitelistRules = options.whitelist && options.whitelist.rule;
  if (whitelistRules) {
    const ruleMatches = Array.isArray(whitelistRules)
      ? whitelistRules
      : [whitelistRules];
    whitelisted = ruleMatches.some(
      ruleMatch => ruleString.indexOf(ruleMatch) !== -1
    );
  }

  const blacklistRules = options.blacklist && options.blacklist.rule;
  if (blacklistRules) {
    const ruleMatches = Array.isArray(blacklistRules)
      ? blacklistRules
      : [blacklistRules];
    blacklisted = ruleMatches.some(
      ruleMatch => ruleString.indexOf(ruleMatch) !== -1
    );
  }

  return whitelisted !== false && blacklisted !== true;
}

export function deepMergeRules(rulesArray) {
  // Via https://stackoverflow.com/a/34749873
  /**
   * Simple object check.
   * @param item
   * @returns {boolean}
   */
  function isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
  }

  /**
   * Deep merge two objects.
   * @param target
   * @param ...sources
   */
  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources);
  }

  return mergeDeep({}, ...rulesArray);
}

export function serializeCSSRules(rules) {
  if (!rules) return "";
  return Object.keys(rules)
    .map(key => {
      const rule = rules[key];
      let css = "";
      if (rule.selectors) {
        css += rule.selectors.join(",");
        css += rule.properties;
      } else if (rule.before) {
        css += rule.before;
        css += serializeCSSRules(rule.children);
        css += rule.after;
      } else if (rule instanceof Object) {
        css += serializeCSSRules(rule);
      }
      return css;
    })
    .join("");
}

