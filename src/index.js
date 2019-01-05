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
          try {
            // Exceptions may be thrown about browser-specific
            // selectors such as
            //   ::-moz-something
            //   ::-webkit-something
            //   ::-ms-something
            const trimmedSelector = selector.trim();
            const colonColonIndex = trimmedSelector.indexOf("::");
            const selectorBeforeColonColon = selector.substring(
              0,
              colonColonIndex === -1 ? selector.length : colonColonIndex
            );
            if (colonColonIndex === 0 || el.matches(selectorBeforeColonColon)) {
              matchedCSS[i] = {
                selectors: (matchedCSS[i] && matchedCSS[i].selectors) || [],
                properties: rule.cssText.substring(rule.cssText.indexOf("{"))
              };
              if (matchedCSS[i].selectors.indexOf(selector) === -1) {
                matchedCSS[i].selectors.push(selector);
              }
            }
          } catch (e) {
            console.error("ERROR", selector, e);
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

function deepMergeRules(rulesArray) {
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
