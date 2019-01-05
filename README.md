# CSS Sniff

A utility that looks at document nodes (elements) and returns all matching CSS Rules (selectors+properties). Because the CSS Rules are found (not inline styles), it includes responsive modes and pseudo-elements etc.

Used by [React-Patterns](https://github.com/springload/react-patterns/) to extract CSS Rules for pattern libraries, but could also be used for extracting crucial CSS 'above the fold' etc.

Requires a browser environment, and works in browsers and JSDOM.

## Usage

    import { getCSSRules, serializeCSSRules } from 'css-sniff';

    const elements = document.querySelectorAll('header, .logo');
    const matchedCSS = getCSSRules([...elements]);
    const cssString = serializeCSSRules(matchedCSS);

cssString is now a string that might look like:

    header { background: red; }
    .logo { width: 250px; }
    @media only screen and (max-width: 250px) {
        .logo {
            width: 100%;
        }
    }

## API

### getCSSRules(children, options, matchedCSS)

The bulk of CSS Sniff. This returns a `matchedCSS` variable that may be given to `serializeCSSRules` to produce a CSS string.

##### • children (required)

An array of Nodes (not a NodeList).

All nodes below these are searched for CSS Rules.

##### • options (optional)

A map to set options in format

    {
       whitelist: {
             // optional pattern to only include
             // CSS if it matches these patterns,
           media: ["media substring match"],
             // useful for only allowing some
             // types of @media such as print
           stylesheet: ["url substring match"],
             // useful for only allowing some
             // CSS files
           rule: ["selector substring match"]
       },
       blacklist: {
           media: ["media substring match"],
           stylesheet: ["url substring match"],
             // Useful for blocking some CSS files
             // such as a site's template.
           rule: ["selector substring match"]
       },
       document, // optional in browsers, but required
                 // for JSDOM to provide the `document`
                 // instance
    }

#### • matchedCSS (optional)

You may provide a previously returned value to add more matched rules to, in order to build up a more complete set of CSS Rules.

This may be useful to chunk up jobs over several event loop cycles, or perhaps it's an easier API to use in some code patterns (ie. a progress indicator pattern).

### serializeCSSRules(matchedCSS)

Serializes `matchedCSS` into a CSS string.

## Limitations

### Inherited properties (and _sorta_-inherited properties)

Some CSS properties are inherited (or effectively inherited) from parent elements.

For example, if you have a `header` with a red background but that red colour comes from `body { background: red; }` then searching for CSS Rules for `header` won't include the red background CSS.

Similarly, if a parent element defines a `line-height` which is used by descendant elements then that won't be included.

Arguably I suppose standalone components shouldn't rely on cascade, but that's a whole 'nother can of worms.
