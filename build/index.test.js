"use strict";

var _index = require("./index");

var _jsdom = require("jsdom");

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

describe("CSS Rules", function () {
  it("Simple global rules",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee() {
    var dom, paragraphs, matchedCSS, css;
    return regeneratorRuntime.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return getDom("p { background: red;}", "<p>test</p>");

          case 2:
            dom = _context.sent;
            paragraphs = _toConsumableArray(dom.window.document.querySelectorAll("p"));
            matchedCSS = (0, _index.getCSSRules)(paragraphs, {
              document: dom.window.document
            });
            css = (0, _index.serializeCSSRules)(matchedCSS);
            expect(css).toBe("p{background: red;}");

          case 7:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, this);
  })));
  it("Filters unused selectors",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee2() {
    var dom, paragraphs, matchedCSS, css;
    return regeneratorRuntime.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return getDom("p,a { background: red;}", "<p>test</p>");

          case 2:
            dom = _context2.sent;
            paragraphs = _toConsumableArray(dom.window.document.querySelectorAll("p"));
            matchedCSS = (0, _index.getCSSRules)(paragraphs, {
              document: dom.window.document
            });
            css = (0, _index.serializeCSSRules)(matchedCSS);
            expect(css).toBe("p{background: red;}");

          case 7:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2, this);
  })));
  it("Includes @media queries",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee3() {
    var dom, paragraphs, matchedCSS, css;
    return regeneratorRuntime.wrap(function _callee3$(_context3) {
      while (1) {
        switch (_context3.prev = _context3.next) {
          case 0:
            _context3.next = 2;
            return getDom("p,a { background: red;} @media print { p { color: purple } } ", "<p>test</p>");

          case 2:
            dom = _context3.sent;
            paragraphs = _toConsumableArray(dom.window.document.querySelectorAll("p"));
            matchedCSS = (0, _index.getCSSRules)(paragraphs, {
              document: dom.window.document
            });
            css = (0, _index.serializeCSSRules)(matchedCSS);
            expect(css).toBe("p{background: red;}@media print {p{color: purple;}}");

          case 7:
          case "end":
            return _context3.stop();
        }
      }
    }, _callee3, this);
  })));
  it("Filters @media queries",
  /*#__PURE__*/
  _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee4() {
    var dom, paragraphs, matchedCSS, css;
    return regeneratorRuntime.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return getDom("p,a { background: red;} @media print { p,a { color: purple } } ", "<p>test</p>");

          case 2:
            dom = _context4.sent;
            paragraphs = _toConsumableArray(dom.window.document.querySelectorAll("p"));
            matchedCSS = (0, _index.getCSSRules)(paragraphs, {
              document: dom.window.document
            });
            css = (0, _index.serializeCSSRules)(matchedCSS);
            expect(css).toBe("p{background: red;}@media print {p{color: purple;}}");

          case 7:
          case "end":
            return _context4.stop();
        }
      }
    }, _callee4, this);
  })));
});

var getDom =
/*#__PURE__*/
function () {
  var _ref5 = _asyncToGenerator(
  /*#__PURE__*/
  regeneratorRuntime.mark(function _callee5(css, body) {
    var options, dom;
    return regeneratorRuntime.wrap(function _callee5$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            options = {
              resources: "usable",
              runScripts: "dangerously",
              pretendToBeVisual: true
            };
            _context5.prev = 1;
            _context5.next = 4;
            return new _jsdom.JSDOM("<html><head><style>".concat(css, "</style></head><body>").concat(body, "</body></html>"), options);

          case 4:
            dom = _context5.sent;
            _context5.next = 10;
            break;

          case 7:
            _context5.prev = 7;
            _context5.t0 = _context5["catch"](1);

            if (!_context5.t0 || _context5.t0.statusCode !== 404) {
              console.log(_context5.t0);
            }

          case 10:
            _context5.next = 12;
            return new Promise(function (resolve, reject) {
              dom.window.document.addEventListener("load", resolve);
            });

          case 12:
            return _context5.abrupt("return", dom);

          case 13:
          case "end":
            return _context5.stop();
        }
      }
    }, _callee5, this, [[1, 7]]);
  }));

  return function getDom(_x, _x2) {
    return _ref5.apply(this, arguments);
  };
}();