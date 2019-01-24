import { getCSSRules, serializeCSSRules } from "./index";
import { JSDOM } from "jsdom";

describe("CSS Rules", () => {
  it("Simple global rules", async () => {
    const dom = await getDom("p { background: red;}", "<p>test</p>");
    const paragraphs = [...dom.window.document.querySelectorAll("p")];
    const matchedCSS = getCSSRules(paragraphs, {
      document: dom.window.document
    });
    const css = serializeCSSRules(matchedCSS);
    expect(css).toBe("p{background: red;}");
  });

  it("Filters unused selectors", async () => {
    const dom = await getDom("p,a { background: red;}", "<p>test</p>");
    const paragraphs = [...dom.window.document.querySelectorAll("p")];
    const matchedCSS = getCSSRules(paragraphs, {
      document: dom.window.document
    });
    const css = serializeCSSRules(matchedCSS);
    expect(css).toBe("p{background: red;}");
  });

  it("Includes @media queries", async () => {
    const dom = await getDom(
      "p,a { background: red;} @media print { p { color: purple } } ",
      "<p>test</p>"
    );
    const paragraphs = [...dom.window.document.querySelectorAll("p")];
    const matchedCSS = getCSSRules(paragraphs, {
      document: dom.window.document
    });
    const css = serializeCSSRules(matchedCSS);
    expect(css).toBe("p{background: red;}@media print {p{color: purple;}}");
  });

  it("Filters @media queries", async () => {
    const dom = await getDom(
      "p,a { background: red;} @media print { p,a { color: purple } } ",
      "<p>test</p>"
    );
    const paragraphs = [...dom.window.document.querySelectorAll("p")];
    const matchedCSS = getCSSRules(paragraphs, {
      document: dom.window.document
    });
    const css = serializeCSSRules(matchedCSS);
    expect(css).toBe("p{background: red;}@media print {p{color: purple;}}");
  });

  it("Handles escaping \\: in class (2 chars: a backslash and colon)", async () => {
    const dom = await getDom(
      ".link { background: blue;} .link.\\:focus { background: red;} ",
      '<p class="link :focus">test</p>'
    );
    const paragraphs = [...dom.window.document.querySelectorAll("p")];
    const matchedCSS = getCSSRules(paragraphs, {
      document: dom.window.document
    });
    const css = serializeCSSRules(matchedCSS);
    expect(css).toBe(
      ".link{background: blue;}.link.\\:focus{background: red;}"
    );
  });
});

const getDom = async (css, body) => {
  const options = {
    resources: "usable",
    runScripts: "dangerously",
    pretendToBeVisual: true
  };
  let dom;
  try {
    dom = await new JSDOM(
      `<html><head><style>${css}</style></head><body>${body}</body></html>`,
      options
    );
  } catch (e) {
    if (!e || e.statusCode !== 404) {
      console.log(e);
    }
  }

  // Wait for subresources to load so that CSS detection will work
  await new Promise((resolve, reject) => {
    dom.window.document.addEventListener("load", resolve);
  });

  return dom;
};
