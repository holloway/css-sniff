"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getCSSRules = getCSSRules;
exports.deepMergeRules = deepMergeRules;
exports.serializeCSSRules = serializeCSSRules;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

/* CSS Sniff.js - Matthew Holloway (C) 2019 */

/* split-css-selector by Joakim Carlstein (C) 2015 for function 'splitSelectors'. Licenced under MIT */

/*
 @param children
 @param options
 @param matchedCSS
 @returns { object }
   'matchedCSS' a variable to give to serializeCSSRules()
*/
function getCSSRules(children, options, matchedCSS) {
  return children.reduce(function (matchedCSS, child, i) {
    matchedCSS = getCSSRulesByElement(child, options, matchedCSS);
    if (!options.ignoreChildren && child.childNodes) matchedCSS = getCSSRules(_toConsumableArray(child.childNodes), options, matchedCSS);
    return matchedCSS;
  }, matchedCSS || {});
}

function getCSSRulesByElement(el, options, matchedCSS) {
  var matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector;
  if (!matches) return matchedCSS; // presumed text node

  el.matches = matches;
  var sheets = options.document.styleSheets || window.document.styleSheets;

  for (var i in sheets) {
    var sheet = sheets[i];

    if (sheetIsAllowed(sheet, options)) {
      var matchedCSSRule = _filterCSSRulesByElement(el, sheet.rules || sheet.cssRules, options, matchedCSS[i] || {});

      if (matchedCSSRule) {
        matchedCSS[i] = matchedCSSRule;
      }
    }
  }

  return matchedCSS;
}

function _filterCSSRulesByElement(el, rules, options, matchedCSS) {
  var _loop = function _loop(i) {
    var rule = rules[i];

    if (rule.selectorText) {
      if (ruleIsAllowed(rule.selectorText, options)) {
        var selectors = splitSelectors(rule.selectorText);
        selectors.forEach(function (selector) {
          var trimmedSelector, normalizedSelector;

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
            // or potentially selectors without anything before
            // the ":",
            //
            //   ::-moz-something
            //   :not(input)
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
            var unique = Math.random().toString(16);
            normalizedSelector = trimmedSelector.replace(/\\:/g, unique) // Temporarily replace "\:" (escaped colon) to simplify
            // removing ":something" (real colon) which we restore later.
            .replace(/:+.*$/gi, function (match) {
              return [":first-child", ":last-child", ":first-letter", ":first-line", ":first"].includes(match.replace(/::/g, ":")) ? match : "";
            }) // Restore escaped colons back to "\:".
            // See above comment about escaped colons.
            .replace(new RegExp(unique, "g"), "\\:");

            if (el.matches(normalizedSelector)) {
              matchedCSS[i] = {
                selectors: matchedCSS[i] && matchedCSS[i].selectors || [],
                properties: rule.cssText.substring(rule.cssText.indexOf("{"))
              };

              if (matchedCSS[i].selectors.indexOf(selector) === -1) {
                matchedCSS[i].selectors.push(selector);
              }
            }
          } catch (e) {
            if ("@charset".indexOf(rule.selectorText) !== -1) {
              console.error("ERROR", rule.type, "[".concat(trimmedSelector, "]"), "[[".concat(normalizedSelector, "]]"), "(((".concat(rule.selectorText, ")))"), e);
            }
          }
        });
      }
    } else if ((rule.rules || rule.cssRules) && (rule.conditionText || rule.media)) {
      var conditionText = rule.conditionText || rule.media[0];

      if (mediaIsAllowed(conditionText, options)) {
        // a nested rule like @media { rule { ... } }
        // so we filter the rules inside individually
        var nestedRules = _filterCSSRulesByElement(el, rule.rules || rule.cssRules, options, {});

        if (nestedRules) {
          matchedCSS[i] = {
            before: "@media " + conditionText + " {",
            children: nestedRules,
            after: "}"
          };
        }
      }
    }
  };

  for (var i in rules) {
    _loop(i);
  }

  return Object.keys(matchedCSS).length ? matchedCSS : undefined;
}

function sheetIsAllowed(sheet, options) {
  // Returns boolean of whether the sheet is allowed
  // due to whitelist/blacklist
  if (!sheet) return false;
  if (!sheet.ownerNode) return true;

  var checkStylesheet = function checkStylesheet(sheet, sheetMatch) {
    switch (sheet.ownerNode.nodeName.toLowerCase()) {
      case "style":
      case "link":
        // matching on JSON.stringify(node.attrs)
        var nodeAttrs = sheet.ownerNode.attributes;
        var attrs = {};

        for (var i = 0; i < nodeAttrs.length; i++) {
          attrs[nodeAttrs[i].name] = nodeAttrs[i].value;
        }

        var attributesJSON = JSON.stringify(attrs);
        return attributesJSON.indexOf(sheetMatch) !== -1;
    }
  };

  var whitelisted = true;
  var blacklisted = false;
  var whitelistStylesheets = options.whitelist && options.whitelist.stylesheet;

  if (whitelistStylesheets) {
    var sheetMatches = Array.isArray(whitelistStylesheets) ? whitelistStylesheets : [whitelistStylesheets];
    whitelisted = sheetMatches.some(function (sheetMatch) {
      return checkStylesheet(sheet, sheetMatches);
    });
  }

  var blacklistStylesheets = options.blacklist && options.blacklist.stylesheet;

  if (blacklistStylesheets) {
    var _sheetMatches = Array.isArray(blacklistStylesheets) ? blacklistStylesheets : [blacklistStylesheets];

    blacklisted = _sheetMatches.some(function (sheetMatch) {
      return checkStylesheet(sheet, sheetMatch);
    });
  }

  return whitelisted !== false && blacklisted !== true;
}

function mediaIsAllowed(mediaString, options) {
  if (!options || !mediaString) return false;
  var whitelisted = true;
  var blacklisted = false;
  var whitelistMedia = options.whitelist && options.whitelist.media;

  if (whitelistMedia) {
    var mediaMatches = Array.isArray(whitelistMedia) ? whitelistMedia : [whitelistMedia];
    whitelisted = mediaMatches.some(function (mediaMatch) {
      return mediaString.indexOf(mediaMatch) !== -1;
    });
  }

  var blacklistMedia = options.blacklist && options.blacklist.media;

  if (blacklistMedia) {
    var _mediaMatches = Array.isArray(blacklistMedia) ? blacklistMedia : [blacklistMedia];

    blacklisted = _mediaMatches.some(function (mediaMatch) {
      return mediaString.indexOf(mediaMatch) !== -1;
    });
  }

  return whitelisted !== false && blacklisted !== true;
}

function ruleIsAllowed(ruleString, options) {
  if (!options || !ruleString) return false;
  var whitelisted = true;
  var blacklisted = false;
  var whitelistRules = options.whitelist && options.whitelist.rule;

  if (whitelistRules) {
    var ruleMatches = Array.isArray(whitelistRules) ? whitelistRules : [whitelistRules];
    whitelisted = ruleMatches.some(function (ruleMatch) {
      return ruleString.indexOf(ruleMatch) !== -1;
    });
  }

  var blacklistRules = options.blacklist && options.blacklist.rule;

  if (blacklistRules) {
    var _ruleMatches = Array.isArray(blacklistRules) ? blacklistRules : [blacklistRules];

    blacklisted = _ruleMatches.some(function (ruleMatch) {
      return ruleString.indexOf(ruleMatch) !== -1;
    });
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


  function mergeDeep(target) {
    for (var _len = arguments.length, sources = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      sources[_key - 1] = arguments[_key];
    }

    if (!sources.length) return target;
    var source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (var key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, _defineProperty({}, key, {}));
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, _defineProperty({}, key, source[key]));
        }
      }
    }

    return mergeDeep.apply(void 0, [target].concat(sources));
  }

  return mergeDeep.apply(void 0, [{}].concat(_toConsumableArray(rulesArray)));
}

function serializeCSSRules(rules) {
  if (!rules) return "";
  return Object.keys(rules).map(function (key) {
    var rule = rules[key];
    var css = "";

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
  }).join("");
}

function splitSelectors(selectors) {
  function isAtRule(selector) {
    return selector.indexOf("@") === 0;
  }

  if (isAtRule(selectors)) {
    return [selectors];
  }

  var splitted = [];
  var parens = 0;
  var angulars = 0;
  var soFar = "";

  for (var i = 0, len = selectors.length; i < len; i++) {
    var char = selectors[i];

    if (char === "(") {
      parens += 1;
    } else if (char === ")") {
      parens -= 1;
    } else if (char === "[") {
      angulars += 1;
    } else if (char === "]") {
      angulars -= 1;
    } else if (char === ",") {
      if (!parens && !angulars) {
        splitted.push(soFar.trim());
        soFar = "";
        continue;
      }
    }

    soFar += char;
  }

  splitted.push(soFar.trim());
  return splitted;
}