/*! ableplayer V4.8.0 with DOMPurify included */
/*! @license DOMPurify 3.3.1 | (c) Cure53 and other contributors | Released under the Apache license 2.0 and Mozilla Public License 2.0 | github.com/cure53/DOMPurify/blob/3.3.1/LICENSE */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DOMPurify = factory());
})(this, (function () { 'use strict';

  const {
    entries,
    setPrototypeOf,
    isFrozen,
    getPrototypeOf,
    getOwnPropertyDescriptor
  } = Object;
  let {
    freeze,
    seal,
    create
  } = Object; 
  let {
    apply,
    construct
  } = typeof Reflect !== 'undefined' && Reflect;
  if (!freeze) {
    freeze = function freeze(x) {
      return x;
    };
  }
  if (!seal) {
    seal = function seal(x) {
      return x;
    };
  }
  if (!apply) {
    apply = function apply(func, thisArg) {
      for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
        args[_key - 2] = arguments[_key];
      }
      return func.apply(thisArg, args);
    };
  }
  if (!construct) {
    construct = function construct(Func) {
      for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        args[_key2 - 1] = arguments[_key2];
      }
      return new Func(...args);
    };
  }
  const arrayForEach = unapply(Array.prototype.forEach);
  const arrayLastIndexOf = unapply(Array.prototype.lastIndexOf);
  const arrayPop = unapply(Array.prototype.pop);
  const arrayPush = unapply(Array.prototype.push);
  const arraySplice = unapply(Array.prototype.splice);
  const stringToLowerCase = unapply(String.prototype.toLowerCase);
  const stringToString = unapply(String.prototype.toString);
  const stringMatch = unapply(String.prototype.match);
  const stringReplace = unapply(String.prototype.replace);
  const stringIndexOf = unapply(String.prototype.indexOf);
  const stringTrim = unapply(String.prototype.trim);
  const objectHasOwnProperty = unapply(Object.prototype.hasOwnProperty);
  const regExpTest = unapply(RegExp.prototype.test);
  const typeErrorCreate = unconstruct(TypeError);
  function unapply(func) {
    return function (thisArg) {
      if (thisArg instanceof RegExp) {
        thisArg.lastIndex = 0;
      }
      for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        args[_key3 - 1] = arguments[_key3];
      }
      return apply(func, thisArg, args);
    };
  }
  function unconstruct(Func) {
    return function () {
      for (var _len4 = arguments.length, args = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        args[_key4] = arguments[_key4];
      }
      return construct(Func, args);
    };
  }
  function addToSet(set, array) {
    let transformCaseFunc = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : stringToLowerCase;
    if (setPrototypeOf) {
      setPrototypeOf(set, null);
    }
    let l = array.length;
    while (l--) {
      let element = array[l];
      if (typeof element === 'string') {
        const lcElement = transformCaseFunc(element);
        if (lcElement !== element) {
          if (!isFrozen(array)) {
            array[l] = lcElement;
          }
          element = lcElement;
        }
      }
      set[element] = true;
    }
    return set;
  }
  function cleanArray(array) {
    for (let index = 0; index < array.length; index++) {
      const isPropertyExist = objectHasOwnProperty(array, index);
      if (!isPropertyExist) {
        array[index] = null;
      }
    }
    return array;
  }
  function clone(object) {
    const newObject = create(null);
    for (const [property, value] of entries(object)) {
      const isPropertyExist = objectHasOwnProperty(object, property);
      if (isPropertyExist) {
        if (Array.isArray(value)) {
          newObject[property] = cleanArray(value);
        } else if (value && typeof value === 'object' && value.constructor === Object) {
          newObject[property] = clone(value);
        } else {
          newObject[property] = value;
        }
      }
    }
    return newObject;
  }
  function lookupGetter(object, prop) {
    while (object !== null) {
      const desc = getOwnPropertyDescriptor(object, prop);
      if (desc) {
        if (desc.get) {
          return unapply(desc.get);
        }
        if (typeof desc.value === 'function') {
          return unapply(desc.value);
        }
      }
      object = getPrototypeOf(object);
    }
    function fallbackValue() {
      return null;
    }
    return fallbackValue;
  }

  const html$1 = freeze(['a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo', 'big', 'blink', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'center', 'cite', 'code', 'col', 'colgroup', 'content', 'data', 'datalist', 'dd', 'decorator', 'del', 'details', 'dfn', 'dialog', 'dir', 'div', 'dl', 'dt', 'element', 'em', 'fieldset', 'figcaption', 'figure', 'font', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hgroup', 'hr', 'html', 'i', 'img', 'input', 'ins', 'kbd', 'label', 'legend', 'li', 'main', 'map', 'mark', 'marquee', 'menu', 'menuitem', 'meter', 'nav', 'nobr', 'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'search', 'section', 'select', 'shadow', 'slot', 'small', 'source', 'spacer', 'span', 'strike', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt', 'u', 'ul', 'var', 'video', 'wbr']);
  const svg$1 = freeze(['svg', 'a', 'altglyph', 'altglyphdef', 'altglyphitem', 'animatecolor', 'animatemotion', 'animatetransform', 'circle', 'clippath', 'defs', 'desc', 'ellipse', 'enterkeyhint', 'exportparts', 'filter', 'font', 'g', 'glyph', 'glyphref', 'hkern', 'image', 'inputmode', 'line', 'lineargradient', 'marker', 'mask', 'metadata', 'mpath', 'part', 'path', 'pattern', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'style', 'switch', 'symbol', 'text', 'textpath', 'title', 'tref', 'tspan', 'view', 'vkern']);
  const svgFilters = freeze(['feBlend', 'feColorMatrix', 'feComponentTransfer', 'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap', 'feDistantLight', 'feDropShadow', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR', 'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology', 'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight', 'feTile', 'feTurbulence']);
  const svgDisallowed = freeze(['animate', 'color-profile', 'cursor', 'discard', 'font-face', 'font-face-format', 'font-face-name', 'font-face-src', 'font-face-uri', 'foreignobject', 'hatch', 'hatchpath', 'mesh', 'meshgradient', 'meshpatch', 'meshrow', 'missing-glyph', 'script', 'set', 'solidcolor', 'unknown', 'use']);
  const mathMl$1 = freeze(['math', 'menclose', 'merror', 'mfenced', 'mfrac', 'mglyph', 'mi', 'mlabeledtr', 'mmultiscripts', 'mn', 'mo', 'mover', 'mpadded', 'mphantom', 'mroot', 'mrow', 'ms', 'mspace', 'msqrt', 'mstyle', 'msub', 'msup', 'msubsup', 'mtable', 'mtd', 'mtext', 'mtr', 'munder', 'munderover', 'mprescripts']);
  const mathMlDisallowed = freeze(['maction', 'maligngroup', 'malignmark', 'mlongdiv', 'mscarries', 'mscarry', 'msgroup', 'mstack', 'msline', 'msrow', 'semantics', 'annotation', 'annotation-xml', 'mprescripts', 'none']);
  const text = freeze(['#text']);

  const html = freeze(['accept', 'action', 'align', 'alt', 'autocapitalize', 'autocomplete', 'autopictureinpicture', 'autoplay', 'background', 'bgcolor', 'border', 'capture', 'cellpadding', 'cellspacing', 'checked', 'cite', 'class', 'clear', 'color', 'cols', 'colspan', 'controls', 'controlslist', 'coords', 'crossorigin', 'datetime', 'decoding', 'default', 'dir', 'disabled', 'disablepictureinpicture', 'disableremoteplayback', 'download', 'draggable', 'enctype', 'enterkeyhint', 'exportparts', 'face', 'for', 'headers', 'height', 'hidden', 'high', 'href', 'hreflang', 'id', 'inert', 'inputmode', 'integrity', 'ismap', 'kind', 'label', 'lang', 'list', 'loading', 'loop', 'low', 'max', 'maxlength', 'media', 'method', 'min', 'minlength', 'multiple', 'muted', 'name', 'nonce', 'noshade', 'novalidate', 'nowrap', 'open', 'optimum', 'part', 'pattern', 'placeholder', 'playsinline', 'popover', 'popovertarget', 'popovertargetaction', 'poster', 'preload', 'pubdate', 'radiogroup', 'readonly', 'rel', 'required', 'rev', 'reversed', 'role', 'rows', 'rowspan', 'spellcheck', 'scope', 'selected', 'shape', 'size', 'sizes', 'slot', 'span', 'srclang', 'start', 'src', 'srcset', 'step', 'style', 'summary', 'tabindex', 'title', 'translate', 'type', 'usemap', 'valign', 'value', 'width', 'wrap', 'xmlns', 'slot']);
  const svg = freeze(['accent-height', 'accumulate', 'additive', 'alignment-baseline', 'amplitude', 'ascent', 'attributename', 'attributetype', 'azimuth', 'basefrequency', 'baseline-shift', 'begin', 'bias', 'by', 'class', 'clip', 'clippathunits', 'clip-path', 'clip-rule', 'color', 'color-interpolation', 'color-interpolation-filters', 'color-profile', 'color-rendering', 'cx', 'cy', 'd', 'dx', 'dy', 'diffuseconstant', 'direction', 'display', 'divisor', 'dur', 'edgemode', 'elevation', 'end', 'exponent', 'fill', 'fill-opacity', 'fill-rule', 'filter', 'filterunits', 'flood-color', 'flood-opacity', 'font-family', 'font-size', 'font-size-adjust', 'font-stretch', 'font-style', 'font-variant', 'font-weight', 'fx', 'fy', 'g1', 'g2', 'glyph-name', 'glyphref', 'gradientunits', 'gradienttransform', 'height', 'href', 'id', 'image-rendering', 'in', 'in2', 'intercept', 'k', 'k1', 'k2', 'k3', 'k4', 'kerning', 'keypoints', 'keysplines', 'keytimes', 'lang', 'lengthadjust', 'letter-spacing', 'kernelmatrix', 'kernelunitlength', 'lighting-color', 'local', 'marker-end', 'marker-mid', 'marker-start', 'markerheight', 'markerunits', 'markerwidth', 'maskcontentunits', 'maskunits', 'max', 'mask', 'mask-type', 'media', 'method', 'mode', 'min', 'name', 'numoctaves', 'offset', 'operator', 'opacity', 'order', 'orient', 'orientation', 'origin', 'overflow', 'paint-order', 'path', 'pathlength', 'patterncontentunits', 'patterntransform', 'patternunits', 'points', 'preservealpha', 'preserveaspectratio', 'primitiveunits', 'r', 'rx', 'ry', 'radius', 'refx', 'refy', 'repeatcount', 'repeatdur', 'restart', 'result', 'rotate', 'scale', 'seed', 'shape-rendering', 'slope', 'specularconstant', 'specularexponent', 'spreadmethod', 'startoffset', 'stddeviation', 'stitchtiles', 'stop-color', 'stop-opacity', 'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke', 'stroke-width', 'style', 'surfacescale', 'systemlanguage', 'tabindex', 'tablevalues', 'targetx', 'targety', 'transform', 'transform-origin', 'text-anchor', 'text-decoration', 'text-rendering', 'textlength', 'type', 'u1', 'u2', 'unicode', 'values', 'viewbox', 'visibility', 'version', 'vert-adv-y', 'vert-origin-x', 'vert-origin-y', 'width', 'word-spacing', 'wrap', 'writing-mode', 'xchannelselector', 'ychannelselector', 'x', 'x1', 'x2', 'xmlns', 'y', 'y1', 'y2', 'z', 'zoomandpan']);
  const mathMl = freeze(['accent', 'accentunder', 'align', 'bevelled', 'close', 'columnsalign', 'columnlines', 'columnspan', 'denomalign', 'depth', 'dir', 'display', 'displaystyle', 'encoding', 'fence', 'frame', 'height', 'href', 'id', 'largeop', 'length', 'linethickness', 'lspace', 'lquote', 'mathbackground', 'mathcolor', 'mathsize', 'mathvariant', 'maxsize', 'minsize', 'movablelimits', 'notation', 'numalign', 'open', 'rowalign', 'rowlines', 'rowspacing', 'rowspan', 'rspace', 'rquote', 'scriptlevel', 'scriptminsize', 'scriptsizemultiplier', 'selection', 'separator', 'separators', 'stretchy', 'subscriptshift', 'supscriptshift', 'symmetric', 'voffset', 'width', 'xmlns']);
  const xml = freeze(['xlink:href', 'xml:id', 'xlink:title', 'xml:space', 'xmlns:xlink']);

  const MUSTACHE_EXPR = seal(/\{\{[\w\W]*|[\w\W]*\}\}/gm); 
  const ERB_EXPR = seal(/<%[\w\W]*|[\w\W]*%>/gm);
  const TMPLIT_EXPR = seal(/\$\{[\w\W]*/gm); 
  const DATA_ATTR = seal(/^data-[\-\w.\u00B7-\uFFFF]+$/); 
  const ARIA_ATTR = seal(/^aria-[\-\w]+$/); 
  const IS_ALLOWED_URI = seal(/^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i 
  );
  const IS_SCRIPT_OR_DATA = seal(/^(?:\w+script|data):/i);
  const ATTR_WHITESPACE = seal(/[\u0000-\u0020\u00A0\u1680\u180E\u2000-\u2029\u205F\u3000]/g 
  );
  const DOCTYPE_NAME = seal(/^html$/i);
  const CUSTOM_ELEMENT = seal(/^[a-z][.\w]*(-[.\w]+)+$/i);

  var EXPRESSIONS = Object.freeze({
    __proto__: null,
    ARIA_ATTR: ARIA_ATTR,
    ATTR_WHITESPACE: ATTR_WHITESPACE,
    CUSTOM_ELEMENT: CUSTOM_ELEMENT,
    DATA_ATTR: DATA_ATTR,
    DOCTYPE_NAME: DOCTYPE_NAME,
    ERB_EXPR: ERB_EXPR,
    IS_ALLOWED_URI: IS_ALLOWED_URI,
    IS_SCRIPT_OR_DATA: IS_SCRIPT_OR_DATA,
    MUSTACHE_EXPR: MUSTACHE_EXPR,
    TMPLIT_EXPR: TMPLIT_EXPR
  });

  const NODE_TYPE = {
    element: 1,
    attribute: 2,
    text: 3,
    cdataSection: 4,
    entityReference: 5,
    entityNode: 6,
    progressingInstruction: 7,
    comment: 8,
    document: 9,
    documentType: 10,
    documentFragment: 11,
    notation: 12 
  };
  const getGlobal = function getGlobal() {
    return typeof window === 'undefined' ? null : window;
  };
  const _createTrustedTypesPolicy = function _createTrustedTypesPolicy(trustedTypes, purifyHostElement) {
    if (typeof trustedTypes !== 'object' || typeof trustedTypes.createPolicy !== 'function') {
      return null;
    }
    let suffix = null;
    const ATTR_NAME = 'data-tt-policy-suffix';
    if (purifyHostElement && purifyHostElement.hasAttribute(ATTR_NAME)) {
      suffix = purifyHostElement.getAttribute(ATTR_NAME);
    }
    const policyName = 'dompurify' + (suffix ? '#' + suffix : '');
    try {
      return trustedTypes.createPolicy(policyName, {
        createHTML(html) {
          return html;
        },
        createScriptURL(scriptUrl) {
          return scriptUrl;
        }
      });
    } catch (_) {

            return null;
    }
  };
  const _createHooksMap = function _createHooksMap() {
    return {
      afterSanitizeAttributes: [],
      afterSanitizeElements: [],
      afterSanitizeShadowDOM: [],
      beforeSanitizeAttributes: [],
      beforeSanitizeElements: [],
      beforeSanitizeShadowDOM: [],
      uponSanitizeAttribute: [],
      uponSanitizeElement: [],
      uponSanitizeShadowNode: []
    };
  };
  function createDOMPurify() {
    let window = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : getGlobal();
    const DOMPurify = root => createDOMPurify(root);
    DOMPurify.version = '3.3.1';
    DOMPurify.removed = [];
    if (!window || !window.document || window.document.nodeType !== NODE_TYPE.document || !window.Element) {
      DOMPurify.isSupported = false;
      return DOMPurify;
    }
    let {
      document
    } = window;
    const originalDocument = document;
    const currentScript = originalDocument.currentScript;
    const {
      DocumentFragment,
      HTMLTemplateElement,
      Node,
      Element,
      NodeFilter,
      NamedNodeMap = window.NamedNodeMap || window.MozNamedAttrMap,
      HTMLFormElement,
      DOMParser,
      trustedTypes
    } = window;
    const ElementPrototype = Element.prototype;
    const cloneNode = lookupGetter(ElementPrototype, 'cloneNode');
    const remove = lookupGetter(ElementPrototype, 'remove');
    const getNextSibling = lookupGetter(ElementPrototype, 'nextSibling');
    const getChildNodes = lookupGetter(ElementPrototype, 'childNodes');
    const getParentNode = lookupGetter(ElementPrototype, 'parentNode');
    if (typeof HTMLTemplateElement === 'function') {
      const template = document.createElement('template');
      if (template.content && template.content.ownerDocument) {
        document = template.content.ownerDocument;
      }
    }
    let trustedTypesPolicy;
    let emptyHTML = '';
    const {
      implementation,
      createNodeIterator,
      createDocumentFragment,
      getElementsByTagName
    } = document;
    const {
      importNode
    } = originalDocument;
    let hooks = _createHooksMap();
    DOMPurify.isSupported = typeof entries === 'function' && typeof getParentNode === 'function' && implementation && implementation.createHTMLDocument !== undefined;
    const {
      MUSTACHE_EXPR,
      ERB_EXPR,
      TMPLIT_EXPR,
      DATA_ATTR,
      ARIA_ATTR,
      IS_SCRIPT_OR_DATA,
      ATTR_WHITESPACE,
      CUSTOM_ELEMENT
    } = EXPRESSIONS;
    let {
      IS_ALLOWED_URI: IS_ALLOWED_URI$1
    } = EXPRESSIONS;
    let ALLOWED_TAGS = null;
    const DEFAULT_ALLOWED_TAGS = addToSet({}, [...html$1, ...svg$1, ...svgFilters, ...mathMl$1, ...text]);
    let ALLOWED_ATTR = null;
    const DEFAULT_ALLOWED_ATTR = addToSet({}, [...html, ...svg, ...mathMl, ...xml]);
    let CUSTOM_ELEMENT_HANDLING = Object.seal(create(null, {
      tagNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeNameCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      allowCustomizedBuiltInElements: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: false
      }
    }));
    let FORBID_TAGS = null;
    let FORBID_ATTR = null;
    const EXTRA_ELEMENT_HANDLING = Object.seal(create(null, {
      tagCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      },
      attributeCheck: {
        writable: true,
        configurable: false,
        enumerable: true,
        value: null
      }
    }));
    let ALLOW_ARIA_ATTR = true;
    let ALLOW_DATA_ATTR = true;
    let ALLOW_UNKNOWN_PROTOCOLS = false;
    let ALLOW_SELF_CLOSE_IN_ATTR = true;
    let SAFE_FOR_TEMPLATES = false;
    let SAFE_FOR_XML = true;
    let WHOLE_DOCUMENT = false;
    let SET_CONFIG = false;
    let FORCE_BODY = false;
    let RETURN_DOM = false;
    let RETURN_DOM_FRAGMENT = false;
    let RETURN_TRUSTED_TYPE = false;
    let SANITIZE_DOM = true;
    let SANITIZE_NAMED_PROPS = false;
    const SANITIZE_NAMED_PROPS_PREFIX = 'user-content-';
    let KEEP_CONTENT = true;
    let IN_PLACE = false;
    let USE_PROFILES = {};
    let FORBID_CONTENTS = null;
    const DEFAULT_FORBID_CONTENTS = addToSet({}, ['annotation-xml', 'audio', 'colgroup', 'desc', 'foreignobject', 'head', 'iframe', 'math', 'mi', 'mn', 'mo', 'ms', 'mtext', 'noembed', 'noframes', 'noscript', 'plaintext', 'script', 'style', 'svg', 'template', 'thead', 'title', 'video', 'xmp']);
    let DATA_URI_TAGS = null;
    const DEFAULT_DATA_URI_TAGS = addToSet({}, ['audio', 'video', 'img', 'source', 'image', 'track']);
    let URI_SAFE_ATTRIBUTES = null;
    const DEFAULT_URI_SAFE_ATTRIBUTES = addToSet({}, ['alt', 'class', 'for', 'id', 'label', 'name', 'pattern', 'placeholder', 'role', 'summary', 'title', 'value', 'style', 'xmlns']);
    const MATHML_NAMESPACE = 'http://www.w3.org/1998/Math/MathML';
    const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
    const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
    let NAMESPACE = HTML_NAMESPACE;
    let IS_EMPTY_INPUT = false;
    let ALLOWED_NAMESPACES = null;
    const DEFAULT_ALLOWED_NAMESPACES = addToSet({}, [MATHML_NAMESPACE, SVG_NAMESPACE, HTML_NAMESPACE], stringToString);
    let MATHML_TEXT_INTEGRATION_POINTS = addToSet({}, ['mi', 'mo', 'mn', 'ms', 'mtext']);
    let HTML_INTEGRATION_POINTS = addToSet({}, ['annotation-xml']);
    const COMMON_SVG_AND_HTML_ELEMENTS = addToSet({}, ['title', 'style', 'font', 'a', 'script']);
    let PARSER_MEDIA_TYPE = null;
    const SUPPORTED_PARSER_MEDIA_TYPES = ['application/xhtml+xml', 'text/html'];
    const DEFAULT_PARSER_MEDIA_TYPE = 'text/html';
    let transformCaseFunc = null;
    let CONFIG = null;
    const formElement = document.createElement('form');
    const isRegexOrFunction = function isRegexOrFunction(testValue) {
      return testValue instanceof RegExp || testValue instanceof Function;
    };
    const _parseConfig = function _parseConfig() {
      let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (CONFIG && CONFIG === cfg) {
        return;
      }
      if (!cfg || typeof cfg !== 'object') {
        cfg = {};
      }
      cfg = clone(cfg);
      PARSER_MEDIA_TYPE =
      SUPPORTED_PARSER_MEDIA_TYPES.indexOf(cfg.PARSER_MEDIA_TYPE) === -1 ? DEFAULT_PARSER_MEDIA_TYPE : cfg.PARSER_MEDIA_TYPE;
      transformCaseFunc = PARSER_MEDIA_TYPE === 'application/xhtml+xml' ? stringToString : stringToLowerCase;
      ALLOWED_TAGS = objectHasOwnProperty(cfg, 'ALLOWED_TAGS') ? addToSet({}, cfg.ALLOWED_TAGS, transformCaseFunc) : DEFAULT_ALLOWED_TAGS;
      ALLOWED_ATTR = objectHasOwnProperty(cfg, 'ALLOWED_ATTR') ? addToSet({}, cfg.ALLOWED_ATTR, transformCaseFunc) : DEFAULT_ALLOWED_ATTR;
      ALLOWED_NAMESPACES = objectHasOwnProperty(cfg, 'ALLOWED_NAMESPACES') ? addToSet({}, cfg.ALLOWED_NAMESPACES, stringToString) : DEFAULT_ALLOWED_NAMESPACES;
      URI_SAFE_ATTRIBUTES = objectHasOwnProperty(cfg, 'ADD_URI_SAFE_ATTR') ? addToSet(clone(DEFAULT_URI_SAFE_ATTRIBUTES), cfg.ADD_URI_SAFE_ATTR, transformCaseFunc) : DEFAULT_URI_SAFE_ATTRIBUTES;
      DATA_URI_TAGS = objectHasOwnProperty(cfg, 'ADD_DATA_URI_TAGS') ? addToSet(clone(DEFAULT_DATA_URI_TAGS), cfg.ADD_DATA_URI_TAGS, transformCaseFunc) : DEFAULT_DATA_URI_TAGS;
      FORBID_CONTENTS = objectHasOwnProperty(cfg, 'FORBID_CONTENTS') ? addToSet({}, cfg.FORBID_CONTENTS, transformCaseFunc) : DEFAULT_FORBID_CONTENTS;
      FORBID_TAGS = objectHasOwnProperty(cfg, 'FORBID_TAGS') ? addToSet({}, cfg.FORBID_TAGS, transformCaseFunc) : clone({});
      FORBID_ATTR = objectHasOwnProperty(cfg, 'FORBID_ATTR') ? addToSet({}, cfg.FORBID_ATTR, transformCaseFunc) : clone({});
      USE_PROFILES = objectHasOwnProperty(cfg, 'USE_PROFILES') ? cfg.USE_PROFILES : false;
      ALLOW_ARIA_ATTR = cfg.ALLOW_ARIA_ATTR !== false; 
      ALLOW_DATA_ATTR = cfg.ALLOW_DATA_ATTR !== false; 
      ALLOW_UNKNOWN_PROTOCOLS = cfg.ALLOW_UNKNOWN_PROTOCOLS || false; 
      ALLOW_SELF_CLOSE_IN_ATTR = cfg.ALLOW_SELF_CLOSE_IN_ATTR !== false; 
      SAFE_FOR_TEMPLATES = cfg.SAFE_FOR_TEMPLATES || false; 
      SAFE_FOR_XML = cfg.SAFE_FOR_XML !== false; 
      WHOLE_DOCUMENT = cfg.WHOLE_DOCUMENT || false; 
      RETURN_DOM = cfg.RETURN_DOM || false; 
      RETURN_DOM_FRAGMENT = cfg.RETURN_DOM_FRAGMENT || false; 
      RETURN_TRUSTED_TYPE = cfg.RETURN_TRUSTED_TYPE || false; 
      FORCE_BODY = cfg.FORCE_BODY || false; 
      SANITIZE_DOM = cfg.SANITIZE_DOM !== false; 
      SANITIZE_NAMED_PROPS = cfg.SANITIZE_NAMED_PROPS || false; 
      KEEP_CONTENT = cfg.KEEP_CONTENT !== false; 
      IN_PLACE = cfg.IN_PLACE || false; 
      IS_ALLOWED_URI$1 = cfg.ALLOWED_URI_REGEXP || IS_ALLOWED_URI;
      NAMESPACE = cfg.NAMESPACE || HTML_NAMESPACE;
      MATHML_TEXT_INTEGRATION_POINTS = cfg.MATHML_TEXT_INTEGRATION_POINTS || MATHML_TEXT_INTEGRATION_POINTS;
      HTML_INTEGRATION_POINTS = cfg.HTML_INTEGRATION_POINTS || HTML_INTEGRATION_POINTS;
      CUSTOM_ELEMENT_HANDLING = cfg.CUSTOM_ELEMENT_HANDLING || {};
      if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck)) {
        CUSTOM_ELEMENT_HANDLING.tagNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.tagNameCheck;
      }
      if (cfg.CUSTOM_ELEMENT_HANDLING && isRegexOrFunction(cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck)) {
        CUSTOM_ELEMENT_HANDLING.attributeNameCheck = cfg.CUSTOM_ELEMENT_HANDLING.attributeNameCheck;
      }
      if (cfg.CUSTOM_ELEMENT_HANDLING && typeof cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements === 'boolean') {
        CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements = cfg.CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements;
      }
      if (SAFE_FOR_TEMPLATES) {
        ALLOW_DATA_ATTR = false;
      }
      if (RETURN_DOM_FRAGMENT) {
        RETURN_DOM = true;
      }
      if (USE_PROFILES) {
        ALLOWED_TAGS = addToSet({}, text);
        ALLOWED_ATTR = [];
        if (USE_PROFILES.html === true) {
          addToSet(ALLOWED_TAGS, html$1);
          addToSet(ALLOWED_ATTR, html);
        }
        if (USE_PROFILES.svg === true) {
          addToSet(ALLOWED_TAGS, svg$1);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.svgFilters === true) {
          addToSet(ALLOWED_TAGS, svgFilters);
          addToSet(ALLOWED_ATTR, svg);
          addToSet(ALLOWED_ATTR, xml);
        }
        if (USE_PROFILES.mathMl === true) {
          addToSet(ALLOWED_TAGS, mathMl$1);
          addToSet(ALLOWED_ATTR, mathMl);
          addToSet(ALLOWED_ATTR, xml);
        }
      }
      if (cfg.ADD_TAGS) {
        if (typeof cfg.ADD_TAGS === 'function') {
          EXTRA_ELEMENT_HANDLING.tagCheck = cfg.ADD_TAGS;
        } else {
          if (ALLOWED_TAGS === DEFAULT_ALLOWED_TAGS) {
            ALLOWED_TAGS = clone(ALLOWED_TAGS);
          }
          addToSet(ALLOWED_TAGS, cfg.ADD_TAGS, transformCaseFunc);
        }
      }
      if (cfg.ADD_ATTR) {
        if (typeof cfg.ADD_ATTR === 'function') {
          EXTRA_ELEMENT_HANDLING.attributeCheck = cfg.ADD_ATTR;
        } else {
          if (ALLOWED_ATTR === DEFAULT_ALLOWED_ATTR) {
            ALLOWED_ATTR = clone(ALLOWED_ATTR);
          }
          addToSet(ALLOWED_ATTR, cfg.ADD_ATTR, transformCaseFunc);
        }
      }
      if (cfg.ADD_URI_SAFE_ATTR) {
        addToSet(URI_SAFE_ATTRIBUTES, cfg.ADD_URI_SAFE_ATTR, transformCaseFunc);
      }
      if (cfg.FORBID_CONTENTS) {
        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
          FORBID_CONTENTS = clone(FORBID_CONTENTS);
        }
        addToSet(FORBID_CONTENTS, cfg.FORBID_CONTENTS, transformCaseFunc);
      }
      if (cfg.ADD_FORBID_CONTENTS) {
        if (FORBID_CONTENTS === DEFAULT_FORBID_CONTENTS) {
          FORBID_CONTENTS = clone(FORBID_CONTENTS);
        }
        addToSet(FORBID_CONTENTS, cfg.ADD_FORBID_CONTENTS, transformCaseFunc);
      }
      if (KEEP_CONTENT) {
        ALLOWED_TAGS['#text'] = true;
      }
      if (WHOLE_DOCUMENT) {
        addToSet(ALLOWED_TAGS, ['html', 'head', 'body']);
      }
      if (ALLOWED_TAGS.table) {
        addToSet(ALLOWED_TAGS, ['tbody']);
        delete FORBID_TAGS.tbody;
      }
      if (cfg.TRUSTED_TYPES_POLICY) {
        if (typeof cfg.TRUSTED_TYPES_POLICY.createHTML !== 'function') {
          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createHTML" hook.');
        }
        if (typeof cfg.TRUSTED_TYPES_POLICY.createScriptURL !== 'function') {
          throw typeErrorCreate('TRUSTED_TYPES_POLICY configuration option must provide a "createScriptURL" hook.');
        }
        trustedTypesPolicy = cfg.TRUSTED_TYPES_POLICY;
        emptyHTML = trustedTypesPolicy.createHTML('');
      } else {
        if (trustedTypesPolicy === undefined) {
          trustedTypesPolicy = _createTrustedTypesPolicy(trustedTypes, currentScript);
        }
        if (trustedTypesPolicy !== null && typeof emptyHTML === 'string') {
          emptyHTML = trustedTypesPolicy.createHTML('');
        }
      }
      if (freeze) {
        freeze(cfg);
      }
      CONFIG = cfg;
    };
    const ALL_SVG_TAGS = addToSet({}, [...svg$1, ...svgFilters, ...svgDisallowed]);
    const ALL_MATHML_TAGS = addToSet({}, [...mathMl$1, ...mathMlDisallowed]);
    const _checkValidNamespace = function _checkValidNamespace(element) {
      let parent = getParentNode(element);
      if (!parent || !parent.tagName) {
        parent = {
          namespaceURI: NAMESPACE,
          tagName: 'template'
        };
      }
      const tagName = stringToLowerCase(element.tagName);
      const parentTagName = stringToLowerCase(parent.tagName);
      if (!ALLOWED_NAMESPACES[element.namespaceURI]) {
        return false;
      }
      if (element.namespaceURI === SVG_NAMESPACE) {
        if (parent.namespaceURI === HTML_NAMESPACE) {
          return tagName === 'svg';
        }
        if (parent.namespaceURI === MATHML_NAMESPACE) {
          return tagName === 'svg' && (parentTagName === 'annotation-xml' || MATHML_TEXT_INTEGRATION_POINTS[parentTagName]);
        }
        return Boolean(ALL_SVG_TAGS[tagName]);
      }
      if (element.namespaceURI === MATHML_NAMESPACE) {
        if (parent.namespaceURI === HTML_NAMESPACE) {
          return tagName === 'math';
        }
        if (parent.namespaceURI === SVG_NAMESPACE) {
          return tagName === 'math' && HTML_INTEGRATION_POINTS[parentTagName];
        }
        return Boolean(ALL_MATHML_TAGS[tagName]);
      }
      if (element.namespaceURI === HTML_NAMESPACE) {
        if (parent.namespaceURI === SVG_NAMESPACE && !HTML_INTEGRATION_POINTS[parentTagName]) {
          return false;
        }
        if (parent.namespaceURI === MATHML_NAMESPACE && !MATHML_TEXT_INTEGRATION_POINTS[parentTagName]) {
          return false;
        }
        return !ALL_MATHML_TAGS[tagName] && (COMMON_SVG_AND_HTML_ELEMENTS[tagName] || !ALL_SVG_TAGS[tagName]);
      }
      if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && ALLOWED_NAMESPACES[element.namespaceURI]) {
        return true;
      }
      return false;
    };
    const _forceRemove = function _forceRemove(node) {
      arrayPush(DOMPurify.removed, {
        element: node
      });
      try {
        getParentNode(node).removeChild(node);
      } catch (_) {
        remove(node);
      }
    };
    const _removeAttribute = function _removeAttribute(name, element) {
      try {
        arrayPush(DOMPurify.removed, {
          attribute: element.getAttributeNode(name),
          from: element
        });
      } catch (_) {
        arrayPush(DOMPurify.removed, {
          attribute: null,
          from: element
        });
      }
      element.removeAttribute(name);
      if (name === 'is') {
        if (RETURN_DOM || RETURN_DOM_FRAGMENT) {
          try {
            _forceRemove(element);
          } catch (_) {}
        } else {
          try {
            element.setAttribute(name, '');
          } catch (_) {}
        }
      }
    };
    const _initDocument = function _initDocument(dirty) {
      let doc = null;
      let leadingWhitespace = null;
      if (FORCE_BODY) {
        dirty = '<remove></remove>' + dirty;
      } else {
        const matches = stringMatch(dirty, /^[\r\n\t ]+/);
        leadingWhitespace = matches && matches[0];
      }
      if (PARSER_MEDIA_TYPE === 'application/xhtml+xml' && NAMESPACE === HTML_NAMESPACE) {
        dirty = '<html xmlns="http://www.w3.org/1999/xhtml"><head></head><body>' + dirty + '</body></html>';
      }
      const dirtyPayload = trustedTypesPolicy ? trustedTypesPolicy.createHTML(dirty) : dirty;
      if (NAMESPACE === HTML_NAMESPACE) {
        try {
          doc = new DOMParser().parseFromString(dirtyPayload, PARSER_MEDIA_TYPE);
        } catch (_) {}
      }
      if (!doc || !doc.documentElement) {
        doc = implementation.createDocument(NAMESPACE, 'template', null);
        try {
          doc.documentElement.innerHTML = IS_EMPTY_INPUT ? emptyHTML : dirtyPayload;
        } catch (_) {
        }
      }
      const body = doc.body || doc.documentElement;
      if (dirty && leadingWhitespace) {
        body.insertBefore(document.createTextNode(leadingWhitespace), body.childNodes[0] || null);
      }
      if (NAMESPACE === HTML_NAMESPACE) {
        return getElementsByTagName.call(doc, WHOLE_DOCUMENT ? 'html' : 'body')[0];
      }
      return WHOLE_DOCUMENT ? doc.documentElement : body;
    };
    const _createNodeIterator = function _createNodeIterator(root) {
      return createNodeIterator.call(root.ownerDocument || root, root,
      NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT | NodeFilter.SHOW_TEXT | NodeFilter.SHOW_PROCESSING_INSTRUCTION | NodeFilter.SHOW_CDATA_SECTION, null);
    };
    const _isClobbered = function _isClobbered(element) {
      return element instanceof HTMLFormElement && (typeof element.nodeName !== 'string' || typeof element.textContent !== 'string' || typeof element.removeChild !== 'function' || !(element.attributes instanceof NamedNodeMap) || typeof element.removeAttribute !== 'function' || typeof element.setAttribute !== 'function' || typeof element.namespaceURI !== 'string' || typeof element.insertBefore !== 'function' || typeof element.hasChildNodes !== 'function');
    };
    const _isNode = function _isNode(value) {
      return typeof Node === 'function' && value instanceof Node;
    };
    function _executeHooks(hooks, currentNode, data) {
      arrayForEach(hooks, hook => {
        hook.call(DOMPurify, currentNode, data, CONFIG);
      });
    }
    const _sanitizeElements = function _sanitizeElements(currentNode) {
      let content = null;
      _executeHooks(hooks.beforeSanitizeElements, currentNode, null);
      if (_isClobbered(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      const tagName = transformCaseFunc(currentNode.nodeName);
      _executeHooks(hooks.uponSanitizeElement, currentNode, {
        tagName,
        allowedTags: ALLOWED_TAGS
      });
      if (SAFE_FOR_XML && currentNode.hasChildNodes() && !_isNode(currentNode.firstElementChild) && regExpTest(/<[/\w!]/g, currentNode.innerHTML) && regExpTest(/<[/\w!]/g, currentNode.textContent)) {
        _forceRemove(currentNode);
        return true;
      }
      if (currentNode.nodeType === NODE_TYPE.progressingInstruction) {
        _forceRemove(currentNode);
        return true;
      }
      if (SAFE_FOR_XML && currentNode.nodeType === NODE_TYPE.comment && regExpTest(/<[/\w]/g, currentNode.data)) {
        _forceRemove(currentNode);
        return true;
      }
      if (!(EXTRA_ELEMENT_HANDLING.tagCheck instanceof Function && EXTRA_ELEMENT_HANDLING.tagCheck(tagName)) && (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName])) {
        if (!FORBID_TAGS[tagName] && _isBasicCustomElement(tagName)) {
          if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, tagName)) {
            return false;
          }
          if (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(tagName)) {
            return false;
          }
        }
        if (KEEP_CONTENT && !FORBID_CONTENTS[tagName]) {
          const parentNode = getParentNode(currentNode) || currentNode.parentNode;
          const childNodes = getChildNodes(currentNode) || currentNode.childNodes;
          if (childNodes && parentNode) {
            const childCount = childNodes.length;
            for (let i = childCount - 1; i >= 0; --i) {
              const childClone = cloneNode(childNodes[i], true);
              childClone.__removalCount = (currentNode.__removalCount || 0) + 1;
              parentNode.insertBefore(childClone, getNextSibling(currentNode));
            }
          }
        }
        _forceRemove(currentNode);
        return true;
      }
      if (currentNode instanceof Element && !_checkValidNamespace(currentNode)) {
        _forceRemove(currentNode);
        return true;
      }
      if ((tagName === 'noscript' || tagName === 'noembed' || tagName === 'noframes') && regExpTest(/<\/no(script|embed|frames)/i, currentNode.innerHTML)) {
        _forceRemove(currentNode);
        return true;
      }
      if (SAFE_FOR_TEMPLATES && currentNode.nodeType === NODE_TYPE.text) {
        content = currentNode.textContent;
        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
          content = stringReplace(content, expr, ' ');
        });
        if (currentNode.textContent !== content) {
          arrayPush(DOMPurify.removed, {
            element: currentNode.cloneNode()
          });
          currentNode.textContent = content;
        }
      }
      _executeHooks(hooks.afterSanitizeElements, currentNode, null);
      return false;
    };
    const _isValidAttribute = function _isValidAttribute(lcTag, lcName, value) {
      if (SANITIZE_DOM && (lcName === 'id' || lcName === 'name') && (value in document || value in formElement)) {
        return false;
      }
      if (ALLOW_DATA_ATTR && !FORBID_ATTR[lcName] && regExpTest(DATA_ATTR, lcName)) ; else if (ALLOW_ARIA_ATTR && regExpTest(ARIA_ATTR, lcName)) ; else if (EXTRA_ELEMENT_HANDLING.attributeCheck instanceof Function && EXTRA_ELEMENT_HANDLING.attributeCheck(lcName, lcTag)) ; else if (!ALLOWED_ATTR[lcName] || FORBID_ATTR[lcName]) {
        if (
        _isBasicCustomElement(lcTag) && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, lcTag) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(lcTag)) && (CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.attributeNameCheck, lcName) || CUSTOM_ELEMENT_HANDLING.attributeNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.attributeNameCheck(lcName, lcTag)) ||
        lcName === 'is' && CUSTOM_ELEMENT_HANDLING.allowCustomizedBuiltInElements && (CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof RegExp && regExpTest(CUSTOM_ELEMENT_HANDLING.tagNameCheck, value) || CUSTOM_ELEMENT_HANDLING.tagNameCheck instanceof Function && CUSTOM_ELEMENT_HANDLING.tagNameCheck(value))) ; else {
          return false;
        }
      } else if (URI_SAFE_ATTRIBUTES[lcName]) ; else if (regExpTest(IS_ALLOWED_URI$1, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if ((lcName === 'src' || lcName === 'xlink:href' || lcName === 'href') && lcTag !== 'script' && stringIndexOf(value, 'data:') === 0 && DATA_URI_TAGS[lcTag]) ; else if (ALLOW_UNKNOWN_PROTOCOLS && !regExpTest(IS_SCRIPT_OR_DATA, stringReplace(value, ATTR_WHITESPACE, ''))) ; else if (value) {
        return false;
      } else ;
      return true;
    };
    const _isBasicCustomElement = function _isBasicCustomElement(tagName) {
      return tagName !== 'annotation-xml' && stringMatch(tagName, CUSTOM_ELEMENT);
    };
    const _sanitizeAttributes = function _sanitizeAttributes(currentNode) {
      _executeHooks(hooks.beforeSanitizeAttributes, currentNode, null);
      const {
        attributes
      } = currentNode;
      if (!attributes || _isClobbered(currentNode)) {
        return;
      }
      const hookEvent = {
        attrName: '',
        attrValue: '',
        keepAttr: true,
        allowedAttributes: ALLOWED_ATTR,
        forceKeepAttr: undefined
      };
      let l = attributes.length;
      while (l--) {
        const attr = attributes[l];
        const {
          name,
          namespaceURI,
          value: attrValue
        } = attr;
        const lcName = transformCaseFunc(name);
        const initValue = attrValue;
        let value = name === 'value' ? initValue : stringTrim(initValue);
        hookEvent.attrName = lcName;
        hookEvent.attrValue = value;
        hookEvent.keepAttr = true;
        hookEvent.forceKeepAttr = undefined; 
        _executeHooks(hooks.uponSanitizeAttribute, currentNode, hookEvent);
        value = hookEvent.attrValue;
        if (SANITIZE_NAMED_PROPS && (lcName === 'id' || lcName === 'name')) {
          _removeAttribute(name, currentNode);
          value = SANITIZE_NAMED_PROPS_PREFIX + value;
        }
        if (SAFE_FOR_XML && regExpTest(/((--!?|])>)|<\/(style|title|textarea)/i, value)) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (lcName === 'attributename' && stringMatch(value, 'href')) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (hookEvent.forceKeepAttr) {
          continue;
        }
        if (!hookEvent.keepAttr) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (!ALLOW_SELF_CLOSE_IN_ATTR && regExpTest(/\/>/i, value)) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (SAFE_FOR_TEMPLATES) {
          arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
            value = stringReplace(value, expr, ' ');
          });
        }
        const lcTag = transformCaseFunc(currentNode.nodeName);
        if (!_isValidAttribute(lcTag, lcName, value)) {
          _removeAttribute(name, currentNode);
          continue;
        }
        if (trustedTypesPolicy && typeof trustedTypes === 'object' && typeof trustedTypes.getAttributeType === 'function') {
          if (namespaceURI) ; else {
            switch (trustedTypes.getAttributeType(lcTag, lcName)) {
              case 'TrustedHTML':
                {
                  value = trustedTypesPolicy.createHTML(value);
                  break;
                }
              case 'TrustedScriptURL':
                {
                  value = trustedTypesPolicy.createScriptURL(value);
                  break;
                }
            }
          }
        }
        if (value !== initValue) {
          try {
            if (namespaceURI) {
              currentNode.setAttributeNS(namespaceURI, name, value);
            } else {
              currentNode.setAttribute(name, value);
            }
            if (_isClobbered(currentNode)) {
              _forceRemove(currentNode);
            } else {
              arrayPop(DOMPurify.removed);
            }
          } catch (_) {
            _removeAttribute(name, currentNode);
          }
        }
      }
      _executeHooks(hooks.afterSanitizeAttributes, currentNode, null);
    };
    const _sanitizeShadowDOM = function _sanitizeShadowDOM(fragment) {
      let shadowNode = null;
      const shadowIterator = _createNodeIterator(fragment);
      _executeHooks(hooks.beforeSanitizeShadowDOM, fragment, null);
      while (shadowNode = shadowIterator.nextNode()) {
        _executeHooks(hooks.uponSanitizeShadowNode, shadowNode, null);
        _sanitizeElements(shadowNode);
        _sanitizeAttributes(shadowNode);
        if (shadowNode.content instanceof DocumentFragment) {
          _sanitizeShadowDOM(shadowNode.content);
        }
      }
      _executeHooks(hooks.afterSanitizeShadowDOM, fragment, null);
    };
    DOMPurify.sanitize = function (dirty) {
      let cfg = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      let body = null;
      let importedNode = null;
      let currentNode = null;
      let returnNode = null;
      IS_EMPTY_INPUT = !dirty;
      if (IS_EMPTY_INPUT) {
        dirty = '<!-->';
      }
      if (typeof dirty !== 'string' && !_isNode(dirty)) {
        if (typeof dirty.toString === 'function') {
          dirty = dirty.toString();
          if (typeof dirty !== 'string') {
            throw typeErrorCreate('dirty is not a string, aborting');
          }
        } else {
          throw typeErrorCreate('toString is not a function');
        }
      }
      if (!DOMPurify.isSupported) {
        return dirty;
      }
      if (!SET_CONFIG) {
        _parseConfig(cfg);
      }
      DOMPurify.removed = [];
      if (typeof dirty === 'string') {
        IN_PLACE = false;
      }
      if (IN_PLACE) {
        if (dirty.nodeName) {
          const tagName = transformCaseFunc(dirty.nodeName);
          if (!ALLOWED_TAGS[tagName] || FORBID_TAGS[tagName]) {
            throw typeErrorCreate('root node is forbidden and cannot be sanitized in-place');
          }
        }
      } else if (dirty instanceof Node) {
        body = _initDocument('<!---->');
        importedNode = body.ownerDocument.importNode(dirty, true);
        if (importedNode.nodeType === NODE_TYPE.element && importedNode.nodeName === 'BODY') {
          body = importedNode;
        } else if (importedNode.nodeName === 'HTML') {
          body = importedNode;
        } else {
          body.appendChild(importedNode);
        }
      } else {
        if (!RETURN_DOM && !SAFE_FOR_TEMPLATES && !WHOLE_DOCUMENT &&
        dirty.indexOf('<') === -1) {
          return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(dirty) : dirty;
        }
        body = _initDocument(dirty);
        if (!body) {
          return RETURN_DOM ? null : RETURN_TRUSTED_TYPE ? emptyHTML : '';
        }
      }
      if (body && FORCE_BODY) {
        _forceRemove(body.firstChild);
      }
      const nodeIterator = _createNodeIterator(IN_PLACE ? dirty : body);
      while (currentNode = nodeIterator.nextNode()) {
        _sanitizeElements(currentNode);
        _sanitizeAttributes(currentNode);
        if (currentNode.content instanceof DocumentFragment) {
          _sanitizeShadowDOM(currentNode.content);
        }
      }
      if (IN_PLACE) {
        return dirty;
      }
      if (RETURN_DOM) {
        if (RETURN_DOM_FRAGMENT) {
          returnNode = createDocumentFragment.call(body.ownerDocument);
          while (body.firstChild) {
            returnNode.appendChild(body.firstChild);
          }
        } else {
          returnNode = body;
        }
        if (ALLOWED_ATTR.shadowroot || ALLOWED_ATTR.shadowrootmode) {
          returnNode = importNode.call(originalDocument, returnNode, true);
        }
        return returnNode;
      }
      let serializedHTML = WHOLE_DOCUMENT ? body.outerHTML : body.innerHTML;
      if (WHOLE_DOCUMENT && ALLOWED_TAGS['!doctype'] && body.ownerDocument && body.ownerDocument.doctype && body.ownerDocument.doctype.name && regExpTest(DOCTYPE_NAME, body.ownerDocument.doctype.name)) {
        serializedHTML = '<!DOCTYPE ' + body.ownerDocument.doctype.name + '>\n' + serializedHTML;
      }
      if (SAFE_FOR_TEMPLATES) {
        arrayForEach([MUSTACHE_EXPR, ERB_EXPR, TMPLIT_EXPR], expr => {
          serializedHTML = stringReplace(serializedHTML, expr, ' ');
        });
      }
      return trustedTypesPolicy && RETURN_TRUSTED_TYPE ? trustedTypesPolicy.createHTML(serializedHTML) : serializedHTML;
    };
    DOMPurify.setConfig = function () {
      let cfg = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      _parseConfig(cfg);
      SET_CONFIG = true;
    };
    DOMPurify.clearConfig = function () {
      CONFIG = null;
      SET_CONFIG = false;
    };
    DOMPurify.isValidAttribute = function (tag, attr, value) {
      if (!CONFIG) {
        _parseConfig({});
      }
      const lcTag = transformCaseFunc(tag);
      const lcName = transformCaseFunc(attr);
      return _isValidAttribute(lcTag, lcName, value);
    };
    DOMPurify.addHook = function (entryPoint, hookFunction) {
      if (typeof hookFunction !== 'function') {
        return;
      }
      arrayPush(hooks[entryPoint], hookFunction);
    };
    DOMPurify.removeHook = function (entryPoint, hookFunction) {
      if (hookFunction !== undefined) {
        const index = arrayLastIndexOf(hooks[entryPoint], hookFunction);
        return index === -1 ? undefined : arraySplice(hooks[entryPoint], index, 1)[0];
      }
      return arrayPop(hooks[entryPoint]);
    };
    DOMPurify.removeHooks = function (entryPoint) {
      hooks[entryPoint] = [];
    };
    DOMPurify.removeAllHooks = function () {
      hooks = _createHooksMap();
    };
    return DOMPurify;
  }
  var purify = createDOMPurify();

  return purify;

}));


"use strict";

var AblePlayerInstances = [];

(function ($) {
	$(function () {
		$('video, audio').each(function (index, element) {
			if ($(element).data('able-player') !== undefined) {
				AblePlayerInstances.push(new AblePlayer($(this),$(element)));
			}
		});
	});

	window.onYouTubeIframeAPIReady = function() {
		AblePlayer.youTubeIframeAPIReady = true;
		$('body').trigger('youTubeIframeAPIReady', []);
	};
	$(window).on('keydown',function(e) {
		if (AblePlayer.nextIndex === 1) {
			AblePlayer.lastCreated.onPlayerKeyPress(e);
		}
	});

	window.AblePlayer = function(media) {

		var thisObj = this;

		AblePlayer.lastCreated = this;
		this.media = media;

		if ($(media).length === 0) {
			this.provideFallback();
			return;
		}


		if ($(media).attr('autoplay') !== undefined) {
			this.autoplay = true; 
			this.okToPlay = true; 
		} else {
			this.autoplay = false;
			this.okToPlay = false;
		}

		this.loop = ($(media).attr('loop') !== undefined) ? true : false;

		this.playsInline = ($(media).attr('playsinline') !== undefined) ? '1' : '0';

		this.hasPoster = ( $(media).attr('poster') || $(media).data('poster') ) ? true : false;

		this.audioPoster = $(media).data('poster');
		this.audioPosterAlt = $(media).data('poster-alt' );

		this.width = $(media).attr('width') ?? 0;
		this.height = $(media).attr('height') ?? 0;

		var startTime = $(media).data('start-time');
		var isNumeric = ( typeof startTime === 'number' || ( typeof startTime === 'string' && value.trim() !== '' && ! isNaN(value) && isFinite( Number(value) ) ) ) ? true : false;
		this.startTime =  ( startTime !== undefined && isNumeric ) ? startTime : 0;

		this.debug = ($(media).data('debug') !== undefined && $(media).data('debug') !== false) ? true : false;

		if ($(media).data('root-path') !== undefined) {
			this.rootPath = $(media).data('root-path').replace(/\/?$/, '/');
		} else {
			this.rootPath = this.getRootPath();
		}

		this.defaultVolume = 7;
		if ($(media).data('volume') !== undefined && $(media).data('volume') !== "") {
			var volume = $(media).data('volume');
			if (volume >= 0 && volume <= 10) {
				this.defaultVolume = volume;
			}
		}
		this.volume = this.defaultVolume;


		if ($(media).data('use-chapters-button') !== undefined && $(media).data('use-chapters-button') === false) {
			this.useChaptersButton = false;
		} else {
			this.useChaptersButton = true;
		}

		if ($(media).data('descriptions-audible') !== undefined && $(media).data('descriptions-audible') === false) {
			this.readDescriptionsAloud = false;
		} else if ($(media).data('description-audible') !== undefined && $(media).data('description-audible') === false) {
			this.readDescriptionsAloud = false;
		} else {
			this.readDescriptionsAloud = true;
		}

		this.descVoices = [];

		this.descReader = ($(media).data('desc-reader') == 'screenreader') ? 'screenreader' : 'browser';

		this.defaultStateCaptions = ($(media).data('state-captions') == 'off') ? 0 : 1;
		this.defaultStateDescriptions = ($(media).data('state-descriptions') == 'on') ? 1 : 0;

		this.defaultDescPause = ($(media).data('desc-pause-default') == 'off') ? 0 : 1;

		if ($(media).data('heading-level') !== undefined && $(media).data('heading-level') !== "") {
			var headingLevel = $(media).data('heading-level');
			if (/^[0-6]*$/.test(headingLevel)) { 
				this.playerHeadingLevel = headingLevel;
			}
		}

		var transcriptDivLocation = $(media).data('transcript-div');
		if ( transcriptDivLocation !== undefined && transcriptDivLocation !== "" && null !== document.getElementById( transcriptDivLocation ) ) {
			this.transcriptDivLocation = transcriptDivLocation;
		} else {
			this.transcriptDivLocation = null;
		}
		var includeTranscript = $(media).data('include-transcript');
		this.hideTranscriptButton = ( includeTranscript !== undefined && includeTranscript === false) ? true : false;

		this.transcriptType = null;
		if ($(media).data('transcript-src') !== undefined) {
			this.transcriptSrc = $(media).data('transcript-src');
			if (this.transcriptSrcHasRequiredParts()) {
				this.transcriptType = 'manual';
			} else {

							}
		} else if ($(media).find('track[kind="captions"],track[kind="subtitles"],track:not([kind])').length > 0) {
			this.transcriptType = (this.transcriptDivLocation) ? 'external' : 'popup';
		}

		this.lyricsMode = ($(media).data('lyrics-mode') !== undefined && $(media).data('lyrics-mode') !== false) ? true : false;

		if ($(media).data('transcript-title') !== undefined && $(media).data('transcript-title') !== "") {
			this.transcriptTitle = $(media).data('transcript-title');
		}

		var signDivLocation = $(media).data('sign-div');
		if ( signDivLocation !== undefined && signDivLocation !== "" && null !== document.getElementById( signDivLocation ) ) {
			this.$signDivLocation = $( '#' + signDivLocation );
		} else {
			this.$signDivLocation = null;
		}

		this.defaultCaptionsPosition = ($(media).data('captions-position') === 'overlay') ? 'overlay' : 'below';

		var chaptersDiv = $(media).data('chapters-div');
		if ( chaptersDiv !== undefined && chaptersDiv !== "") {
			this.chaptersDivLocation = chaptersDiv;
		}

		if ($(media).data('chapters-title') !== undefined) {
			this.chaptersTitle = $(media).data('chapters-title');
		}

		var defaultChapter = $(media).data('chapters-default');
		this.defaultChapter = ( defaultChapter !== undefined && defaultChapter !== "") ? defaultChapter : null;

		this.speedIcons = ($(media).data('speed-icons') === 'arrows') ? 'arrows' : 'animals';

		var seekbarScope = $(media).data('seekbar-scope');
		this.seekbarScope = ( seekbarScope === 'chapter' || seekbarScope === 'chapters') ? 'chapter' : 'video';

		var youTubeId = $(media).data('youtube-id');
		if ( youTubeId !== undefined && youTubeId !== "") {
			this.youTubeId = this.getYouTubeId(youTubeId);
			if ( ! this.hasPoster ) {
				let poster = this.getYouTubePosterUrl(this.youTubeId,'640');
				$(media).attr( 'poster', poster );
			}
		}

		var youTubeDescId = $(media).data('youtube-desc-id');
		if ( youTubeDescId !== undefined && youTubeDescId !== "") {
			this.youTubeDescId = this.getYouTubeId(youTubeDescId);
		}

		var youTubeSignId = $(media).data('youtube-sign-src');
		if ( youTubeSignId !== undefined && youTubeSignId !== "") {
			this.youTubeSignId = this.getYouTubeId(youTubeSignId);
		}

		var youTubeNoCookie = $(media).data('youtube-nocookie');
		this.youTubeNoCookie = (youTubeNoCookie !== undefined && youTubeNoCookie) ? true : false;

		var vimeoId = $(media).data('vimeo-id');
		if ( vimeoId !== undefined && vimeoId !== "") {
			this.vimeoId = this.getVimeoId(vimeoId);
			if ( ! this.hasPoster ) {
				let poster = thisObj.getVimeoPosterUrl(this.vimeoId,'1200');
				$(media).attr( 'poster', poster );
			}
		}
		var vimeoDescId = $(media).data('vimeo-desc-id');
		if ( vimeoDescId !== undefined && vimeoDescId !== "") {
			this.vimeoDescId = this.getVimeoId(vimeoDescId);
		}

		this.skin = ($(media).data('skin') == 'legacy') ? 'legacy' : '2020';

		if ($(media).data('width') !== undefined) {
			this.playerWidth = parseInt($(media).data('width'));
		} else if ($(media)[0].getAttribute('width')) {
			this.playerWidth = parseInt($(media)[0].getAttribute('width'));
		} else {
			this.playerWidth = null;
		}

		this.iconType = 'font';
		this.forceIconType = false;
		if ($(media).data('icon-type') !== undefined && $(media).data('icon-type') !== "") {
			var iconType = $(media).data('icon-type');
			if (iconType === 'font' || iconType === 'image' || iconType === 'svg') {
				this.iconType = iconType;
				this.forceIconType = true;
			}
		}

		var allowFullScreen = $(media).data('allow-fullscreen');
		this.allowFullscreen = (allowFullScreen !== undefined && allowFullScreen === false) ? false : true;

		this.clickedFullscreenButton = false;
		this.restoringAfterFullscreen = false;

		this.defaultSeekInterval = 10;
		this.useFixedSeekInterval = false; 
		if ($(media).data('seek-interval') !== undefined && $(media).data('seek-interval') !== "") {
			var seekInterval = $(media).data('seek-interval');
			if (/^[1-9][0-9]*$/.test(seekInterval)) { 
				this.seekInterval = seekInterval;
				this.useFixedSeekInterval = true; 
			}
		}

		var showNowPlaying = $(media).data('show-now-playing');
		this.showNowPlaying = (showNowPlaying !== undefined && showNowPlaying === false) ? false : true;

		if ($(media).data('use-ttml') !== undefined) {
			this.useTtml = true;
			this.convert = require('xml-js');
		} else {
			this.useTtml = false;
		}

		var testFallback = $(media).data('test-fallback');
		if ( testFallback !== undefined && testFallback !== false) {
			this.testFallback = ( testFallback == '2' ) ? 2 : 1;
		} else {
			this.testFallback = false;
		}

		var lang = $(media).data('lang');
		this.lang = ( lang !== undefined && lang !== "") ? lang.toLowerCase() : null;

		var metaType = $(media).data('meta-type');
		if ( metaType !== undefined && metaType !== "") {
			this.metaType = metaType;
		}
		var metaDiv = $(media).data('meta-div');
		if ( metaDiv !== undefined && metaDiv !== "") {
			this.metaDiv = metaDiv;
		}

		var searchDiv = $(media).data('search-div');
		if ( searchDiv !== undefined && searchDiv !== "") {

			this.searchDiv = searchDiv;

			var searchString = $(media).data('search');
			if ( searchString !== undefined && searchString !== "") {
				this.searchString = searchString;
			}

			var searchLang = $(media).data('search-lang');
			this.searchLang = ( searchLang !== undefined && searchLang !== "") ? searchLang : null;

			var searchIgnoreCaps = $(media).data('search-ignore-caps');
			this.searchIgnoreCaps = ( searchIgnoreCaps !== undefined && searchIgnoreCaps !== false) ? true : false;
		}

		if ($(media).data('hide-controls') !== undefined && $(media).data('hide-controls') !== false) {
			this.hideControls = true;
			this.hideControlsOriginal = true; 
		} else {
			this.hideControls = false;
			this.hideControlsOriginal = false;
		}

		if ($(media).data('steno-mode') !== undefined && $(media).data('steno-mode') !== false) {
			this.stenoMode = true;
			if ($(media).data('steno-iframe-id') !== undefined && $(media).data('steno-iframe-id') !== "") {
				this.stenoFrameId = $(media).data('steno-iframe-id');
				this.$stenoFrame = $('#' + this.stenoFrameId);
				if (!(this.$stenoFrame.length)) {
					this.stenoFrameId = null;
					this.$stenoFrame = null;
				}
			} else {
				this.stenoFrameId = null;
				this.$stenoFrame = null;
			}
		} else {
			this.stenoMode = false;
			this.stenoFrameId = null;
			this.$stenoFrame = null;
		}

		this.setDefaults();


		this.ableIndex = AblePlayer.nextIndex;
		AblePlayer.nextIndex += 1;

		this.title = $(media).attr('title');

		this.tt = {};
		var thisObj = this;
		async function fetchTranslations(thisObj) {
			try {
				await thisObj.getTranslationText();
				thisObj.setup();
			} catch {
				thisObj.provideFallback();
			}
		}
		fetchTranslations(thisObj);
	};

	AblePlayer.nextIndex = 0;

	AblePlayer.prototype.setup = function() {

		var thisObj = this;
		this.initializing = true; 

		this.reinitialize().then(function () {
			if (!thisObj.player) {
				thisObj.provideFallback();
			} else {
				thisObj.setupInstance().then(function () {
					thisObj.setupInstancePlaylist();
					if (thisObj.hasPlaylist) {
					} else {
						thisObj.recreatePlayer().then(function() {
							thisObj.initializing = false;
							thisObj.playerCreated = true; 
						});
					}
				});
			}
		});
	};

	AblePlayer.getActiveDOMElement = function () {
		var activeElement = document.activeElement;

		while (activeElement.shadowRoot && activeElement.shadowRoot.activeElement) {
			activeElement = activeElement.shadowRoot.activeElement;
		}

		return activeElement;
	};

	AblePlayer.localGetElementById = function(element, id) {
		if (element.getRootNode) {
			return $(element.getRootNode().querySelector('#' + id));
		} else {
			return $(document.getElementById(id));
		}
	};

	AblePlayer.youTubeIframeAPIReady = false;
	AblePlayer.loadingYouTubeIframeAPI = false;
})(jQuery);

(function ($) {
	AblePlayer.prototype.setDefaults = function () {

		this.playerCreated = false; 
		this.playing = false; 
		this.paused = true; 
		this.clickedPlay = false; 
		this.fullscreen = false; 
		this.swappingSrc = false; 
		this.initializing = false; 
		this.cueingPlaylistItems = false; 
		this.buttonWithFocus = null; 
		this.speechEnabled = null; 

		this.setIconColor();
		this.setButtonImages();
	};

	AblePlayer.prototype.getRootPath = function() {

		var scripts, i, scriptSrc, scriptFile, fullPath, ablePath, parentFolderIndex, rootPath;
		scripts= document.getElementsByTagName('script');
		for (i=0; i < scripts.length; i++) {
			scriptSrc = scripts[i].src;
			scriptFile = scriptSrc.substring(scriptSrc.lastIndexOf('/'));
			if (scriptFile.indexOf('ableplayer') !== -1) {
				fullPath = scriptSrc.split('?')[0]; 
				break;
			}
		}
		ablePath= fullPath.split('/').slice(0, -1).join('/'); 
		parentFolderIndex = ablePath.lastIndexOf('/');
		rootPath = ablePath.substring(0, parentFolderIndex) + '/';
		return rootPath;
	}

	AblePlayer.prototype.setIconColor = function() {



		var $elements, i, $el, bgColor, rgb, red, green, blue, luminance, iconColor;

		$elements = ['controller', 'toolbar'];
		for (i=0; i<$elements.length; i++) {
			if ($elements[i] == 'controller') {
				$el =	 $('<div>', {
					'class': 'able-controller'
				}).hide();
			} else if ($elements[i] === 'toolbar') {
				$el =	 $('<div>', {
					'class': 'able-window-toolbar'
				}).hide();
			}
			$('body').append($el);
			bgColor = $el.css('background-color');
			rgb = bgColor.replace(/[^\d,]/g, '').split(',');
			red = rgb[0];
			green = rgb[1];
			blue = rgb[2];
			luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
			iconColor = (luminance < 125) ? 'white' : 'black';

			if ($elements[i] === 'controller') {
				this.iconColor = iconColor;
			} else if ($elements[i] === 'toolbar') {
				this.toolbarIconColor = iconColor;
			}
			$el.remove();
		}
	};

	AblePlayer.prototype.setButtonImages = function() {

		this.imgPath = this.rootPath + 'button-icons/' + this.iconColor + '/';
		this.playButtonImg = this.imgPath + 'play.png';
		this.pauseButtonImg = this.imgPath + 'pause.png';
		this.restartButtonImg = this.imgPath + 'restart.png';
		this.rewindButtonImg = this.imgPath + 'rewind.png';
		this.forwardButtonImg = this.imgPath + 'forward.png';
		this.previousButtonImg = this.imgPath + 'previous.png';
		this.nextButtonImg = this.imgPath + 'next.png';

		if (this.speedIcons === 'arrows') {
			this.fasterButtonImg = this.imgPath + 'slower.png';
			this.slowerButtonImg = this.imgPath + 'faster.png';
		} else if (this.speedIcons === 'animals') {
			this.fasterButtonImg = this.imgPath + 'rabbit.png';
			this.slowerButtonImg = this.imgPath + 'turtle.png';
		}

		this.captionsButtonImg = this.imgPath + 'captions.png';
		this.chaptersButtonImg = this.imgPath + 'chapters.png';
		this.signButtonImg = this.imgPath + 'sign.png';
		this.transcriptButtonImg = this.imgPath + 'transcript.png';
		this.descriptionsButtonImg = this.imgPath + 'descriptions.png';
		this.fullscreenExpandButtonImg = this.imgPath + 'fullscreen-expand.png';
		this.fullscreenCollapseButtonImg = this.imgPath + 'fullscreen-collapse.png';
		this.prefsButtonImg = this.imgPath + 'preferences.png';
		this.helpButtonImg = this.imgPath + 'help.png';
	};

	AblePlayer.prototype.getIconData = function(button) {

		var svg = Array();

		switch (button) {

			case 'play':
				svg[0] = '0 0 16 20';
				svg[1] = 'M0 18.393v-16.429q0-0.29 0.184-0.402t0.441 0.033l14.821 8.237q0.257 0.145 0.257 0.346t-0.257 0.346l-14.821 8.237q-0.257 0.145-0.441 0.033t-0.184-0.402z';
				svg[2] = 'icon-play';
				svg[3] = this.playButtonImg;
				break;

			case 'pause':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502zM10 18.036v-15.714q0-0.29 0.212-0.502t0.502-0.212h5.714q0.29 0 0.502 0.212t0.212 0.502v15.714q0 0.29-0.212 0.502t-0.502 0.212h-5.714q-0.29 0-0.502-0.212t-0.212-0.502z';
				svg[2] = 'icon-pause';
				svg[3] = this.pauseButtonImg;
				break;

			case 'restart':
				svg[0] = '0 0 20 20';
				svg[1] = 'M18 8h-6l2.243-2.243c-1.133-1.133-2.64-1.757-4.243-1.757s-3.109 0.624-4.243 1.757c-1.133 1.133-1.757 2.64-1.757 4.243s0.624 3.109 1.757 4.243c1.133 1.133 2.64 1.757 4.243 1.757s3.109-0.624 4.243-1.757c0.095-0.095 0.185-0.192 0.273-0.292l1.505 1.317c-1.466 1.674-3.62 2.732-6.020 2.732-4.418 0-8-3.582-8-8s3.582-8 8-8c2.209 0 4.209 0.896 5.656 2.344l2.344-2.344v6z';
				svg[2] = 'icon-restart';
				svg[3] = this.restartButtonImg;
				break;

			case 'rewind':
				svg[0] = '0 0 20 20';
				svg[1] = 'M11.25 3.125v6.25l6.25-6.25v13.75l-6.25-6.25v6.25l-6.875-6.875z';
				svg[2] = 'icon-rewind';
				svg[3] = this.rewindButtonImg;
				break;

			case 'forward':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10 16.875v-6.25l-6.25 6.25v-13.75l6.25 6.25v-6.25l6.875 6.875z';
				svg[2] = 'icon-forward';
				svg[3] = this.forwardButtonImg;
				break;

			case 'previous':
				svg[0] = '0 0 20 20';
				svg[1] = 'M5 17.5v-15h2.5v6.875l6.25-6.25v13.75l-6.25-6.25v6.875z';
				svg[2] = 'icon-previous';
				svg[3] = this.previousButtonImg;
				break;

			case 'next':
				svg[0] = '0 0 20 20';
				svg[1] = 'M15 2.5v15h-2.5v-6.875l-6.25 6.25v-13.75l6.25 6.25v-6.875z';
				svg[2] = 'icon-next';
				svg[3] = this.nextButtonImg;
				break;

			case 'slower':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0 7.321q0-0.29 0.212-0.502t0.502-0.212h10q0.29 0 0.502 0.212t0.212 0.502-0.212 0.502l-5 5q-0.212 0.212-0.502 0.212t-0.502-0.212l-5-5q-0.212-0.212-0.212-0.502z';
				svg[2] = 'icon-slower';
				svg[3] = this.slowerButtonImg;
				break;

			case 'faster':
				svg[0] = '0 0 11 20';
				svg[1] = 'M0 12.411q0-0.29 0.212-0.502l5-5q0.212-0.212 0.502-0.212t0.502 0.212l5 5q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-10q-0.29 0-0.502-0.212t-0.212-0.502z';
				svg[2] = 'icon-faster';
				svg[3] = this.fasterButtonImg;
				break;

			case 'turtle':
				svg[0] = '0 0 20 20';
				svg[1] = 'M17.212 3.846c-0.281-0.014-0.549 0.025-0.817 0.144-1.218 0.542-1.662 2.708-2.163 3.942-1.207 2.972-7.090 4.619-11.755 5.216-0.887 0.114-1.749 0.74-2.428 1.466 0.82-0.284 2.126-0.297 2.74 0.144 0.007 0.488-0.376 1.062-0.625 1.37-0.404 0.5-0.398 0.793 0.12 0.793 0.473 0 0.752 0.007 1.635 0 0.393-0.003 0.618-0.16 1.49-1.49 3.592 0.718 5.986-0.264 5.986-0.264s0.407 1.755 1.418 1.755h1.49c0.633 0 0.667-0.331 0.625-0.433-0.448-1.082-0.68-1.873-0.769-2.5-0.263-1.857 0.657-3.836 2.524-5.457 0.585 0.986 2.253 0.845 2.909-0.096s0.446-2.268-0.192-3.221c-0.49-0.732-1.345-1.327-2.188-1.37zM8.221 4.663c-0.722-0.016-1.536 0.111-2.5 0.409-4.211 1.302-4.177 4.951-3.51 5.745 0 0-0.955 0.479-0.409 1.274 0.448 0.652 3.139 0.191 5.409-0.529s4.226-1.793 5.312-2.692c0.948-0.785 0.551-2.106-0.505-1.947-0.494-0.98-1.632-2.212-3.798-2.26zM18.846 5.962c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577z';
				svg[2] = 'icon-turtle';
				svg[3] = this.slowerButtonImg;
				break;

			case 'rabbit':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.817 0c-2.248 0-1.586 0.525-1.154 0.505 1.551-0.072 5.199 0.044 6.851 2.428 0 0-1.022-2.933-5.697-2.933zM10.529 0.769c-2.572 0-2.837 0.51-2.837 1.106 0 0.545 1.526 0.836 2.524 0.697 2.778-0.386 4.231-0.12 5.264 0.865-1.010 0.779-0.75 1.401-1.274 1.851-1.093 0.941-2.643-0.673-4.976-0.673-2.496 0-4.712 1.92-4.712 4.76-0.157-0.537-0.769-0.913-1.442-0.913-0.974 0-1.514 0.637-1.514 1.49 0 0.769 1.13 1.791 2.861 0.938 0.499 1.208 2.265 1.364 2.452 1.418 0.538 0.154 1.875 0.098 1.875 0.865 0 0.794-1.034 1.094-1.034 1.707 0 1.070 1.758 0.873 2.284 1.034 1.683 0.517 2.103 1.214 2.788 2.212 0.771 1.122 2.572 1.408 2.572 0.625 0-3.185-4.413-4.126-4.399-4.135 0.608-0.382 2.139-1.397 2.139-3.534 0-1.295-0.703-2.256-1.755-2.861 1.256 0.094 2.572 1.205 2.572 2.74 0 1.877-0.653 2.823-0.769 2.957 1.975-1.158 3.193-3.91 3.029-6.37 0.61 0.401 1.27 0.577 1.971 0.625 0.751 0.052 1.475-0.225 1.635-0.529 0.38-0.723 0.162-2.321-0.12-2.837-0.763-1.392-2.236-1.73-3.606-1.683-1.202-1.671-3.812-2.356-5.529-2.356zM1.37 3.077l-0.553 1.538h3.726c0.521-0.576 1.541-1.207 2.284-1.538h-5.457zM18.846 5.192c0.325 0 0.577 0.252 0.577 0.577s-0.252 0.577-0.577 0.577c-0.325 0-0.577-0.252-0.577-0.577s0.252-0.577 0.577-0.577zM0.553 5.385l-0.553 1.538h3.197c0.26-0.824 0.586-1.328 0.769-1.538h-3.413z';
				svg[2] = 'icon-rabbit';
				svg[3] = this.fasterButtonImg;
				break;

			case 'ellipsis':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2zM3.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.986 2.199-2.2s-0.984-2.2-2.199-2.2zM17.001 7.8c-1.215 0-2.201 0.985-2.201 2.2s0.986 2.2 2.201 2.2c1.215 0 2.199-0.985 2.199-2.2s-0.984-2.2-2.199-2.2z';
				svg[2] = 'icon-ellipsis';
				svg[3] = false;
				break;

			case 'pipe':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.15 0.179h0.623c0.069 0 0.127 0.114 0.127 0.253v19.494c0 0.139-0.057 0.253-0.127 0.253h-1.247c-0.069 0-0.126-0.114-0.126-0.253v-19.494c0-0.139 0.057-0.253 0.126-0.253h0.623z';
				svg[2] = 'icon-pipe';
				svg[3] = false;
				break;

			case 'captions':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0.033 3.624h19.933v12.956h-19.933v-12.956zM18.098 10.045c-0.025-2.264-0.124-3.251-0.743-3.948-0.112-0.151-0.322-0.236-0.496-0.344-0.606-0.386-3.465-0.526-6.782-0.526s-6.313 0.14-6.907 0.526c-0.185 0.108-0.396 0.193-0.519 0.344-0.607 0.697-0.693 1.684-0.731 3.948 0.037 2.265 0.124 3.252 0.731 3.949 0.124 0.161 0.335 0.236 0.519 0.344 0.594 0.396 3.59 0.526 6.907 0.547 3.317-0.022 6.176-0.151 6.782-0.547 0.174-0.108 0.384-0.183 0.496-0.344 0.619-0.697 0.717-1.684 0.743-3.949v0 0zM9.689 9.281c-0.168-1.77-1.253-2.813-3.196-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.442-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.977zM16.607 9.281c-0.167-1.77-1.252-2.813-3.194-2.813-1.773 0-3.168 1.387-3.168 3.617 0 2.239 1.271 3.636 3.372 3.636 1.676 0 2.851-1.071 3.035-2.852h-2.003c-0.079 0.661-0.397 1.168-1.068 1.168-1.059 0-1.253-0.91-1.253-1.876 0-1.33 0.441-2.010 1.174-2.010 0.653 0 1.068 0.412 1.13 1.129h1.976z';
				svg[2] = 'icon-captions';
				svg[3] = this.captionsButtonImg;
				break;

			case 'descriptions':
				svg[0] = '0 0 20 20';
				svg[1] = 'M17.623 3.57h-1.555c1.754 1.736 2.763 4.106 2.763 6.572 0 2.191-0.788 4.286-2.189 5.943h1.484c1.247-1.704 1.945-3.792 1.945-5.943-0-2.418-0.886-4.754-2.447-6.572v0zM14.449 3.57h-1.55c1.749 1.736 2.757 4.106 2.757 6.572 0 2.191-0.788 4.286-2.187 5.943h1.476c1.258-1.704 1.951-3.792 1.951-5.943-0-2.418-0.884-4.754-2.447-6.572v0zM11.269 3.57h-1.542c1.752 1.736 2.752 4.106 2.752 6.572 0 2.191-0.791 4.286-2.181 5.943h1.473c1.258-1.704 1.945-3.792 1.945-5.943 0-2.418-0.876-4.754-2.447-6.572v0zM10.24 9.857c0 3.459-2.826 6.265-6.303 6.265v0.011h-3.867v-12.555h3.896c3.477 0 6.274 2.806 6.274 6.279v0zM6.944 9.857c0-1.842-1.492-3.338-3.349-3.338h-0.876v6.686h0.876c1.858 0 3.349-1.498 3.349-3.348v0z';
				svg[2] = 'icon-descriptions';
				svg[3] = this.descriptionsButtonImg;
				break;

			case 'sign':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.954 10.307c0.378 0.302 0.569 1.202 0.564 1.193 0.697 0.221 1.136 0.682 1.136 0.682 1.070-0.596 1.094-0.326 1.558-0.682 0.383-0.263 0.366-0.344 0.567-1.048 0.187-0.572-0.476-0.518-1.021-1.558-0.95 0.358-1.463 0.196-1.784 0.167-0.145-0.020-0.12 0.562-1.021 1.247zM14.409 17.196c-0.133 0.182-0.196 0.218-0.363 0.454-0.28 0.361 0.076 0.906 0.253 0.82 0.206-0.076 0.341-0.488 0.567-0.623 0.115-0.061 0.422-0.513 0.709-0.82 0.211-0.238 0.363-0.344 0.564-0.594 0.341-0.422 0.412-0.744 0.709-1.193 0.184-0.236 0.312-0.307 0.481-0.594 0.886-1.679 0.628-2.432 1.475-3.629 0.26-0.353 0.552-0.442 0.964-0.653 0.383-2.793-0.888-4.356-0.879-4.361-1.067 0.623-1.644 0.879-2.751 0.82-0.417-0.005-0.636-0.182-1.048-0.145-0.385 0.015-0.582 0.159-0.964 0.29-0.589 0.182-0.91 0.344-1.529 0.535-0.393 0.11-0.643 0.115-1.050 0.255-0.348 0.147-0.182 0.029-0.427 0.312-0.317 0.348-0.238 0.623-0.535 1.222-0.371 0.785-0.326 0.891-0.115 0.987-0.14 0.402-0.174 0.672-0.14 1.107 0.039 0.331-0.101 0.562 0.255 0.825 0.483 0.361 1.499 1.205 1.757 1.217 0.39-0.012 1.521 0.029 2.096-0.368 0.13-0.081 0.167-0.162 0.056 0.145-0.022 0.037-1.433 1.136-1.585 1.131-1.794 0.056-1.193 0.157-1.303 0.115-0.091 0-0.955-1.055-1.477-0.682-0.196 0.12-0.287 0.236-0.363 0.452 0.066 0.137 0.383 0.358 0.675 0.54 0.422 0.27 0.461 0.552 0.881 0.653 0.513 0.115 1.060 0.039 1.387 0.081 0.125 0.034 1.256-0.297 1.961-0.675 0.65-0.336-0.898 0.648-1.276 1.131-1.141 0.358-0.82 0.373-1.362 0.483-0.503 0.115-0.479 0.086-0.822 0.196-0.356 0.086-0.648 0.572-0.312 0.825 0.201 0.167 0.827-0.066 1.445-0.086 0.275-0.005 1.391-0.518 1.644-0.653 0.633-0.339 1.099-0.81 1.472-1.077 0.518-0.361-0.584 0.991-1.050 1.558zM8.855 9.799c-0.378-0.312-0.569-1.212-0.564-1.217-0.697-0.206-1.136-0.667-1.136-0.653-1.070 0.582-1.099 0.312-1.558 0.653-0.388 0.277-0.366 0.363-0.567 1.045-0.187 0.594 0.471 0.535 1.021 1.561 0.95-0.344 1.463-0.182 1.784-0.142 0.145 0.010 0.12-0.572 1.021-1.247zM5.4 2.911c0.133-0.191 0.196-0.228 0.368-0.454 0.27-0.371-0.081-0.915-0.253-0.849-0.211 0.096-0.346 0.508-0.599 0.653-0.093 0.052-0.4 0.503-0.682 0.82-0.211 0.228-0.363 0.334-0.564 0.599-0.346 0.407-0.412 0.729-0.709 1.161-0.184 0.258-0.317 0.324-0.481 0.621-0.886 1.669-0.631 2.422-1.475 3.6-0.26 0.38-0.552 0.461-0.964 0.682-0.383 2.788 0.883 4.346 0.879 4.336 1.068-0.609 1.639-0.861 2.751-0.825 0.417 0.025 0.636 0.201 1.048 0.174 0.385-0.025 0.582-0.169 0.964-0.285 0.589-0.196 0.91-0.358 1.499-0.54 0.422-0.12 0.672-0.125 1.080-0.285 0.348-0.128 0.182-0.010 0.427-0.282 0.312-0.358 0.238-0.633 0.508-1.217 0.398-0.8 0.353-0.906 0.142-0.991 0.135-0.412 0.174-0.677 0.14-1.107-0.044-0.336 0.101-0.572-0.255-0.82-0.483-0.375-1.499-1.22-1.752-1.222-0.395 0.002-1.526-0.039-2.101 0.339-0.13 0.101-0.167 0.182-0.056-0.11 0.022-0.052 1.433-1.148 1.585-1.163 1.794-0.039 1.193-0.14 1.303-0.088 0.091-0.007 0.955 1.045 1.477 0.682 0.191-0.13 0.287-0.245 0.368-0.452-0.071-0.147-0.388-0.368-0.68-0.537-0.422-0.282-0.464-0.564-0.881-0.655-0.513-0.125-1.065-0.049-1.387-0.11-0.125-0.015-1.256 0.317-1.956 0.68-0.66 0.351 0.893-0.631 1.276-1.136 1.136-0.339 0.81-0.353 1.36-0.479 0.501-0.101 0.476-0.071 0.82-0.172 0.351-0.096 0.648-0.577 0.312-0.849-0.206-0.152-0.827 0.081-1.44 0.086-0.28 0.020-1.396 0.533-1.649 0.677-0.633 0.329-1.099 0.8-1.472 1.048-0.523 0.38 0.584-0.967 1.050-1.529z';
				svg[2] = 'icon-sign';
				svg[3] = this.signButtonImg;
				break;

			case 'mute':
			case 'volume-mute':
				svg[0] = '0 0 20 20';
				svg[1] = 'M7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714zM18.75 12.093v1.657h-1.657l-2.093-2.093-2.093 2.093h-1.657v-1.657l2.093-2.093-2.093-2.093v-1.657h1.657l2.093 2.093 2.093-2.093h1.657v1.657l-2.093 2.093z';
				svg[2] = 'icon-volume-mute';
				svg[3] = this.imgPath + 'volume-mute.png';
				break;

			case 'volume-soft':
				svg[0] = '0 0 20 20';
				svg[1] = 'M10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				svg[2] = 'icon-volume-soft';
				svg[3] = this.imgPath + 'volume-soft.png';
				break;

			case 'volume-medium':
				svg[0] = '0 0 20 20';
				svg[1] = 'M14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				svg[2] = 'icon-volume-medium';
				svg[3] = this.imgPath + 'volume-medium.png';
				break;

			case 'volume-loud':
				svg[0] = '0 0 21 20';
				svg[1] = 'M17.384 18.009c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.712-1.712 2.654-3.988 2.654-6.408s-0.943-4.696-2.654-6.408c-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.066 2.066 3.204 4.813 3.204 7.734s-1.138 5.668-3.204 7.734c-0.183 0.183-0.423 0.275-0.663 0.275zM14.053 16.241c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 2.559-2.559 2.559-6.722 0-9.281-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c1.594 1.594 2.471 3.712 2.471 5.966s-0.878 4.373-2.471 5.966c-0.183 0.183-0.423 0.275-0.663 0.275zM10.723 14.473c-0.24 0-0.48-0.092-0.663-0.275-0.366-0.366-0.366-0.96 0-1.326 1.584-1.584 1.584-4.161 0-5.745-0.366-0.366-0.366-0.96 0-1.326s0.96-0.366 1.326 0c2.315 2.315 2.315 6.082 0 8.397-0.183 0.183-0.423 0.275-0.663 0.275zM7.839 1.536c0.501-0.501 0.911-0.331 0.911 0.378v16.172c0 0.709-0.41 0.879-0.911 0.378l-4.714-4.713h-3.125v-7.5h3.125l4.714-4.714z';
				svg[2] = 'icon-volume-loud';
				svg[3] = this.imgPath + 'volume-loud.png';
				break;

			case 'chapters':
				svg[0] = '0 0 20 20';
				svg[1] = 'M5 2.5v17.5l6.25-6.25 6.25 6.25v-17.5zM15 0h-12.5v17.5l1.25-1.25v-15h11.25z';
				svg[2] = 'icon-chapters';
				svg[3] = this.chaptersButtonImg;
				break;

			case 'transcript':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 19.107v-17.857q0-0.446 0.313-0.759t0.759-0.313h8.929v6.071q0 0.446 0.313 0.759t0.759 0.313h6.071v11.786q0 0.446-0.313 0.759t-0.759 0.312h-15q-0.446 0-0.759-0.313t-0.313-0.759zM4.286 15.536q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 12.679q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM4.286 9.821q0 0.156 0.1 0.257t0.257 0.1h7.857q0.156 0 0.257-0.1t0.1-0.257v-0.714q0-0.156-0.1-0.257t-0.257-0.1h-7.857q-0.156 0-0.257 0.1t-0.1 0.257v0.714zM11.429 5.893v-5.268q0.246 0.156 0.402 0.313l4.554 4.554q0.156 0.156 0.313 0.402h-5.268z';
				svg[2] = 'icon-transcript';
				svg[3] = this.transcriptButtonImg;
				break;

			case 'preferences':
				svg[0] = '0 0 20 20';
				svg[1] = 'M18.238 11.919c-1.049-1.817-0.418-4.147 1.409-5.205l-1.965-3.404c-0.562 0.329-1.214 0.518-1.911 0.518-2.1 0-3.803-1.714-3.803-3.828h-3.931c0.005 0.653-0.158 1.314-0.507 1.919-1.049 1.818-3.382 2.436-5.212 1.382l-1.965 3.404c0.566 0.322 1.056 0.793 1.404 1.396 1.048 1.815 0.42 4.139-1.401 5.2l1.965 3.404c0.56-0.326 1.209-0.513 1.902-0.513 2.094 0 3.792 1.703 3.803 3.808h3.931c-0.002-0.646 0.162-1.3 0.507-1.899 1.048-1.815 3.375-2.433 5.203-1.387l1.965-3.404c-0.562-0.322-1.049-0.791-1.395-1.391zM10 14.049c-2.236 0-4.050-1.813-4.050-4.049s1.813-4.049 4.050-4.049 4.049 1.813 4.049 4.049c-0 2.237-1.813 4.049-4.049 4.049z';
				svg[2] = 'icon-preferences';
				svg[3] = this.prefsButtonImg;
				break;

			case 'close':
				svg[0] = '0 0 16 20';
				svg[1] = 'M1.228 14.933q0-0.446 0.312-0.759l3.281-3.281-3.281-3.281q-0.313-0.313-0.313-0.759t0.313-0.759l1.518-1.518q0.313-0.313 0.759-0.313t0.759 0.313l3.281 3.281 3.281-3.281q0.313-0.313 0.759-0.313t0.759 0.313l1.518 1.518q0.313 0.313 0.313 0.759t-0.313 0.759l-3.281 3.281 3.281 3.281q0.313 0.313 0.313 0.759t-0.313 0.759l-1.518 1.518q-0.313 0.313-0.759 0.313t-0.759-0.313l-3.281-3.281-3.281 3.281q-0.313 0.313-0.759 0.313t-0.759-0.313l-1.518-1.518q-0.313-0.313-0.313-0.759z';
				svg[2] = 'icon-close';
				svg[3] = null;
				break;

			case 'fullscreen-expand':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0 18.036v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502zM8.717 8.393q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257z';
				svg[2] = 'icon-fullscreen-expand';
				svg[3] = this.fullscreenExpandButtonImg;
				break;

			case 'fullscreen-collapse':
				svg[0] = '0 0 20 20';
				svg[1] = 'M0.145 16.964q0-0.145 0.112-0.257l3.705-3.705-1.607-1.607q-0.212-0.212-0.212-0.502t0.212-0.502 0.502-0.212h5q0.29 0 0.502 0.212t0.212 0.502v5q0 0.29-0.212 0.502t-0.502 0.212-0.502-0.212l-1.607-1.607-3.705 3.705q-0.112 0.112-0.257 0.112t-0.257-0.112l-1.272-1.272q-0.112-0.112-0.112-0.257zM8.571 9.464v-5q0-0.29 0.212-0.502t0.502-0.212 0.502 0.212l1.607 1.607 3.705-3.705q0.112-0.112 0.257-0.112t0.257 0.112l1.272 1.272q0.112 0.112 0.112 0.257t-0.112 0.257l-3.705 3.705 1.607 1.607q0.212 0.212 0.212 0.502t-0.212 0.502-0.502 0.212h-5q-0.29 0-0.502-0.212t-0.212-0.502z';
				svg[2] = 'icon-fullscreen-collapse';
				svg[3] = this.fullscreenCollapseButtonImg;
				break;
		}

		return svg;
	};

	AblePlayer.prototype.reinitialize = function () {

		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		this.startedPlaying = false;
		this.autoScrollTranscript = true;

		this.$media = $(this.media).first();
		this.media = this.$media[0];

		if (this.$media.is('audio')) {
			this.mediaType = 'audio';
		} else if (this.$media.is('video')) {
			this.mediaType = 'video';
		} else {
			this.provideFallback();
			deferred.reject();
			return promise;
		}

		this.$sources = this.$media.find('source');

		this.player = this.getPlayer();
		if (!this.player) {
			this.provideFallback();
		}
		this.setIconType();

		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.setPlayerSize = function(width, height) {

		if (this.mediaType !== 'audio' && width > 0 && height > 0) {
			this.playerWidth = width;
			this.playerHeight = height;
			this.aspectRatio = height / width;
		}
	};

	AblePlayer.prototype.setIconType = function() {

		if (this.forceIconType) {
			return false;
		}

		this.iconType = 'svg';
	};

	AblePlayer.prototype.setupInstance = function () {

		var deferred = new this.defer();
		var promise = deferred.promise();

		if (this.$media.attr('id')) {
			this.mediaId = this.$media.attr('id');
		} else {
			this.mediaId = "ableMediaId_" + this.ableIndex;
			this.$media.attr('id', this.mediaId);
		}
		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.setupInstancePlaylist = function() {

		var thisObj = this;

		this.hasPlaylist = false; 

		$('.able-playlist').each(function() {
			if ($(this).data('player') === thisObj.mediaId) {
				thisObj.hasPlaylist = true;
				thisObj.$playlist = $(this).find('li');

				var $youTubeVideos = $(this).find('li[data-youtube-id]');
				$youTubeVideos.each(function() {
					var youTubeId = DOMPurify.sanitize( $(this).attr('data-youtube-id') );
					var youTubePoster = thisObj.getYouTubePosterUrl(youTubeId,'120');
					var $youTubeImg = $('<img>',{
						'src': youTubePoster,
						'alt': ''
					});
					$(this).find('button').prepend($youTubeImg);
				});

				var $vimeoVideos = $(this).find('li[data-vimeo-id]');
				$vimeoVideos.each(function() {
					var vimeoId = $(this).attr('data-vimeo-id');
					var vimeoPoster = thisObj.getVimeoPosterUrl(vimeoId,'120');
					var $vimeoImg = $('<img>',{
						'src': vimeoPoster,
						'alt': ''
					});
					$(this).find('button').prepend($vimeoImg);
				});

				$(this).find('li span').attr('aria-hidden','true');
				thisObj.playlistIndex = 0;
				var dataEmbedded = $(this).data('embedded');
				thisObj.playlistEmbed = (typeof dataEmbedded !== 'undefined' && dataEmbedded !== false) ? true : false;
			}
		});

		if (this.hasPlaylist && this.loop) {
			this.media.removeAttribute('loop');
		}
		if (this.hasPlaylist && this.playlistEmbed) {
			var parent = this.$playlist.parent();
			this.$playlistDom = parent.clone();
			parent.remove();
		}
		if (this.hasPlaylist && this.$sources.length === 0) {
			this.cuePlaylistItem(0);
			this.$sources = this.$media.find('source');
		}
	};

	AblePlayer.prototype.recreatePlayer = function () {


		if (!this.player) {
			console.log("Can't create player; no appropriate player type detected.");
			return;
		}

		var deferred, promise, thisObj, prefsGroups, i;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		this.playerDeleted = false; 

		this.recreatingPlayer = true;

		if (!this.playerCreated) {
			this.loadCurrentPreferences();
			this.injectPlayerCode();
			this.resizePlayer(this.media.videoWidth,this.media.videoHeight);
		}

		this.getSampleDescriptionText();

		this.initSignLanguage();

		this.initPlayer().then(function() {

			thisObj.getTracks().then(function() {

				thisObj.initDescription().then(function() {

					thisObj.setupTracks().then(function() {
						if (thisObj.hasClosedDesc) {
							if (!thisObj.$descDiv || (thisObj.$descDiv && !($.contains(thisObj.$ableDiv[0], thisObj.$descDiv[0])))) {
								thisObj.injectTextDescriptionArea();
							}
						}
						thisObj.initSpeech('init');

						thisObj.setupTranscript().then(function() {

							thisObj.initStenoFrame().then(function() {

								if (thisObj.stenoMode && thisObj.$stenoFrame) {
									thisObj.stenoFrameContents = thisObj.$stenoFrame.contents();
								}
								thisObj.getMediaTimes().then(function(mediaTimes) {

									thisObj.duration = mediaTimes['duration'];
									thisObj.elapsed = mediaTimes['elapsed'];

									if (typeof thisObj.volume === 'undefined') {
										thisObj.volume = thisObj.defaultVolume;
									}
									if (thisObj.volume) {
										thisObj.setVolume(thisObj.volume);
									}
									if (thisObj.transcriptType) {
										thisObj.addTranscriptAreaEvents();
										thisObj.updateTranscript();
									}
									if (thisObj.captions.length) {
										thisObj.initDefaultCaption();
									}

									thisObj.setMediaAttributes();
									thisObj.addControls();
									thisObj.addEventListeners();

									prefsGroups = thisObj.getPreferencesGroups();
									for (i = 0; i < prefsGroups.length; i++) {
										thisObj.injectPrefsForm(prefsGroups[i]);
									}
									thisObj.setupPopups();
									thisObj.updateCaption();
									thisObj.injectVTS();
									thisObj.populateChaptersDiv();
									thisObj.showSearchResults();

									if (thisObj.player === 'html5') {
										if (!thisObj.loadingMedia) {
											thisObj.$media[0].load();
											thisObj.loadingMedia = true;
										}
									}
									setTimeout(function() {
										thisObj.refreshControls();
										deferred.resolve();
									},100);
								});
							});
						});
					});
				});
			});
		},
		function() {	 
			thisObj.provideFallback();
		});
		return promise;
	};

	AblePlayer.prototype.initPlayer = function () {

		var thisObj = this;
		var playerPromise;
		if (this.player === 'html5') {
			playerPromise = this.initHtml5Player();
		} else if (this.player === 'youtube') {
			playerPromise = this.initYouTubePlayer();
		} else if (this.player === 'vimeo') {
			playerPromise = this.initVimeoPlayer();
		}
		var deferred = new this.defer();
		var promise = deferred.promise();
		playerPromise.then(
			function () { 
				if (thisObj.useFixedSeekInterval) {
					if (!thisObj.seekInterval) {
						thisObj.seekInterval = thisObj.defaultSeekInterval;
					}
					thisObj.seekIntervalCalculated = true;
				} else {
					thisObj.setSeekInterval();
				}
				deferred.resolve();
			}
		).finally(function () { 
			deferred.reject();
			}
		);

		return promise;
	};

	AblePlayer.prototype.initStenoFrame = function() {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		if (this.stenoMode && this.$stenoFrame) {

			if (this.$stenoFrame[0].contentWindow,document.readyState == 'complete') {
				deferred.resolve();
			} else {
				this.$stenoFrame.on('load',function() {
					deferred.resolve();
				});
			}
		} else {
			deferred.resolve();
		}
		return promise;
	};

	AblePlayer.prototype.setSeekInterval = function () {

		var thisObj, duration;
		thisObj = this;
		this.seekInterval = this.defaultSeekInterval;
		duration = (this.useChapterTimes) ? this.chapterDuration : this.duration;

		if (typeof duration === 'undefined' || duration < 1) {
			this.seekIntervalCalculated = false;
			return;
		} else {
			if (duration <= 20) {
				this.seekInterval = 5;	 
			} else if (duration <= 30) {
				this.seekInterval = 6; 
			} else if (duration <= 40) {
				this.seekInterval = 8; 
			} else if (duration <= 100) {
				this.seekInterval = 10; 
			} else {
				this.seekInterval = Math.round(duration / 10, 0);
			}
			this.seekIntervalCalculated = true;
		}
	};

	AblePlayer.prototype.initDefaultCaption = function () {

		var captions, i;

		captions = this.captions;
		if (captions.length > 0) {
			for (i=0; i<captions.length; i++) {
				if (captions[i].def === true) {
					this.captionLang = captions[i].language;
					this.selectedCaptions = captions[i];
				}
			}
			if (typeof this.captionLang === 'undefined') {
				for (i=0; i<captions.length; i++) {
					if (captions[i].language === this.lang) {
						this.captionLang = captions[i].language;
						this.selectedCaptions = captions[i];
					}
				}
			}
			if (typeof this.captionLang === 'undefined') {
				this.captionLang = captions[0].language;
				this.selectedCaptions = captions[0];
			}
			if (typeof this.captionLang !== 'undefined') {
				if (this.$transcriptLanguageSelect) {
					this.$transcriptLanguageSelect.find('option[lang=' + this.captionLang + ']').prop('selected',true);
				}
				this.syncTrackLanguages('init',this.captionLang);
			}
			if (this.player === 'vimeo') {
				if (this.usingVimeoCaptions && this.prefCaptions == 1) {
						this.vimeoPlayer.enableTextTrack(this.captionLang).then(function(track) {
						}
					).catch(function(error) {
						switch (error.name) {
							case 'InvalidTrackLanguageError':

																break;
							case 'InvalidTrackError':

																break;
							default:

																break;
						}
					});
				} else {
					this.vimeoPlayer.disableTextTrack().then(function() {
					}).catch(function(error) {

											});
				}
			}
		}
	};

	AblePlayer.prototype.initHtml5Player = function () {
		var deferred = new this.defer();
		var promise = deferred.promise();
		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.setMediaAttributes = function () {
		this.$media.attr('tabindex', -1);

		var textTracks = this.$media.get(0).textTracks;
		if (textTracks) {
			var i = 0;
			while (i < textTracks.length) {
				textTracks[i].mode = 'disabled';
				i += 1;
			}
		}
	};

	AblePlayer.prototype.getPlayer = function() {

		if (this.testFallback) {
			return null;
		} else if (this.youTubeId) {
			return  (this.mediaType !== 'video') ? null : 'youtube';
		} else if (this.vimeoId) {
			return (this.mediaType !== 'video') ? null : 'vimeo';
		} else if (this.media.canPlayType) {
			return 'html5';
		} else {
			return null;
		}
	};
})(jQuery);

(function ($) {
	AblePlayer.prototype.setPrefs = function(preferences) {
		if ( typeof Cookies !== 'undefined' ) {
			Cookies.set('Able-Player', JSON.stringify(preferences), {
				expires: 90,
				sameSite: 'strict'
			});
		} else {
			localStorage.setItem( 'Able-Player', JSON.stringify( preferences ) );
		}
	};

	AblePlayer.prototype.getPref = function() {

		var defaultPrefs = {
			preferences: {},
			sign: {},
			transcript: {},
			voices: []
		};

		var preferences;
		try {
			if ( typeof Cookies !== 'undefined' ) {
				preferences = JSON.parse( Cookies.get('Able-Player') );
			} else {
				preferences = JSON.parse( localStorage.getItem('Able-Player') );
			}
		}
		catch (err) {
			this.setPrefs( defaultPrefs );
			preferences = defaultPrefs;
		}
		return (preferences) ? preferences : defaultPrefs;
	};

	AblePlayer.prototype.updatePreferences = function( setting ) {
		var preferences, $window, windowPos, available, i, prefName, voiceLangFound, newVoice;
		preferences = this.getPref();
		if (setting === 'transcript' || setting === 'sign') {
			if (setting === 'transcript') {
				$window = this.$transcriptArea;
				windowPos = $window.position();
				if (typeof preferences.transcript === 'undefined') {
					preferences.transcript = {};
				}
				preferences.transcript['position'] = $window.css('position'); 
				preferences.transcript['zindex'] = $window.css('z-index');
				preferences.transcript['top'] = windowPos.top;
				preferences.transcript['left'] = windowPos.left;
				preferences.transcript['width'] = $window.width();
				preferences.transcript['height'] = $window.height();
			} else if (setting === 'sign') {
				$window = this.$signWindow;
				windowPos = $window.position();
				if (typeof preferences.sign === 'undefined') {
					preferences.sign = {};
				}
				preferences.sign['position'] = $window.css('position'); 
				preferences.sign['zindex'] = $window.css('z-index');
				preferences.sign['top'] = windowPos.top;
				preferences.sign['left'] = windowPos.left;
				preferences.sign['width'] = $window.width();
				preferences.sign['height'] = $window.height();
			}
		} else if (setting === 'voice') {
			if (typeof preferences.voices === 'undefined') {
				preferences.voices = [];
			}
			voiceLangFound = false;
			for (var v=0; v < preferences.voices.length; v++) {
				if (preferences.voices[v].lang === this.prefDescVoiceLang) {
					voiceLangFound = true;
					preferences.voices[v].name = this.prefDescVoice;
				}
			}
			if (!voiceLangFound) {
				newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
				preferences.voices.push(newVoice);
			}
		} else {
			available = this.getAvailablePreferences();
			for (i = 0; i < available.length; i++) {
				prefName = available[i]['name'];
				if (prefName == setting) {
					preferences.preferences[prefName] = this[prefName];
				}
			}
		}
		this.setPrefs(preferences);
	};

	AblePlayer.prototype.getPreferencesGroups = function() {

		if (this.usingYouTubeCaptions) {
			return ['captions','descriptions','keyboard'];
		} else if (this.usingVimeoCaptions) {
			return ['descriptions','keyboard'];
		} else {
			return ['captions','descriptions','keyboard','transcript'];
		}
	}

	AblePlayer.prototype.getAvailablePreferences = function() {

		var prefs = [];

		prefs.push({
			'name': 'prefAltKey', 
			'label': this.translate( 'prefAltKey', 'Alt' ),
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefCtrlKey', 
			'label': this.translate( 'prefCtrlKey', 'Control' ),
			'group': 'keyboard',
			'default': 1
		});
		prefs.push({
			'name': 'prefShiftKey',
			'label': this.translate( 'prefShiftKey', 'Shift' ),
			'group': 'keyboard',
			'default': 0
		});
		prefs.push({
			'name': 'prefNoKeyShortcuts',
			'label': this.translate( 'prefNoKeyShortcuts', 'Disable Keyboard Shortcuts' ),
			'group': 'keyboard',
			'default': 0
		});

		prefs.push({
			'name': 'prefTranscript', 
			'label': null,
			'group': 'transcript',
			'default': 0 
		});
		prefs.push({
			'name': 'prefHighlight', 
			'label': this.translate( 'prefHighlight', 'Highlight transcript as media plays' ),
			'group': 'transcript',
			'default': 1 
		});
		prefs.push({
			'name': 'prefAutoScrollTranscript',
			'label': null,
			'group': 'transcript',
			'default': 1
		});
		prefs.push({
			'name': 'prefTabbable', 
			'label': this.translate( 'prefTabbable', 'Keyboard-enable transcript' ),
			'group': 'transcript',
			'default': 0 
		});

		prefs.push({
			'name': 'prefCaptions', 
			'label': null,
			'group': 'captions',
			'default': this.defaultStateCaptions
		});

		if (!this.usingYouTubeCaptions) {

			if (this.mediaType === 'video') {
				prefs.push({
					'name': 'prefCaptionsPosition',
					'label': this.translate( 'prefCaptionsPosition', 'Position' ),
					'group': 'captions',
					'default': this.defaultCaptionsPosition
				});
			}
			prefs.push({
				'name': 'prefCaptionsFont',
				'label': this.translate( 'prefCaptionsFont', 'Font' ),
				'group': 'captions',
				'default': 'sans-serif'
			});
		}
		prefs.push({
			'name': 'prefCaptionsSize',
			'label': this.translate( 'prefCaptionsSize', 'Font size' ),
			'group': 'captions',
			'default': '100%'
		});

		if (!this.usingYouTubeCaptions) {

			prefs.push({
				'name': 'prefCaptionsColor',
				'label': this.translate( 'prefCaptionsColor', 'Text Color' ),
				'group': 'captions',
				'default': 'white'
			});
			prefs.push({
				'name': 'prefCaptionsBGColor',
				'label': this.translate( 'prefCaptionsBGColor', 'Background' ),
				'group': 'captions',
				'default': 'black'
			});
			prefs.push({
				'name': 'prefCaptionsOpacity',
				'label': this.translate( 'prefCaptionsOpacity', 'Opacity' ),
				'group': 'captions',
				'default': '100%'
			});
		}

		if (this.mediaType === 'video') {
			prefs.push({
				'name': 'prefDesc', 
				'label': null,
				'group': 'descriptions',
				'default': this.defaultStateDescriptions
			});
			prefs.push({
				'name': 'prefDescMethod', 
				'label': null,
				'group': 'descriptions',
				'default': 'video' 
			});
			prefs.push({
				'name': 'prefDescVoice',
				'label': this.translate( 'prefDescVoice', 'Voice' ),
				'group': 'descriptions',
				'default': null 
			});
			prefs.push({
				'name': 'prefDescPitch',
				'label': this.translate( 'prefDescPitch', 'Pitch' ),
				'group': 'descriptions',
				'default': 1 
			});
			prefs.push({
				'name': 'prefDescRate',
				'label': this.translate( 'prefDescRate', 'Rate' ),
				'group': 'descriptions',
				'default': 1 
			});
			prefs.push({
				'name': 'prefDescVolume',
				'label': this.translate( 'volume', 'Volume' ),
				'group': 'descriptions',
				'default': 1 
			});
			if ( this.descMethod !== 'video' ) {
				prefs.push({
					'name': 'prefDescPause', 
					'label': this.translate( 'prefDescPause', 'Automatically pause video when description starts' ),
					'group': 'descriptions',
					'default': this.defaultDescPause
				});
			}
			prefs.push({
				'name': 'prefDescVisible', 
				'label': this.translate( 'prefDescVisible', 'Make description visible' ),
				'group': 'descriptions',
				'default': 0 
			});
		}
		prefs.push({
			'name': 'prefSign', 
			'label': null,
			'group': null,
			'default': 0 
		});

		return prefs;
	};

	AblePlayer.prototype.loadCurrentPreferences = function () {


		var available = this.getAvailablePreferences();
		var preferences = this.getPref();
		for (var ii = 0; ii < available.length; ii++) {
			var prefName = available[ii]['name'];
			var defaultValue = available[ii]['default'];
			if (preferences.preferences[prefName] !== undefined) {
				this[prefName] = preferences.preferences[prefName];
			} else {
				preferences.preferences[prefName] = defaultValue;
				this[prefName] = defaultValue;
			}
		}

		if (typeof preferences.voices !== 'undefined') {
			this.prefVoices = preferences.voices;
		}

		this.setPrefs(preferences);
	};

	AblePlayer.prototype.injectPrefsForm = function (form) {


		var thisObj, available,
			$prefsDiv, formTitle, introText, $prefsIntro,$prefsIntroP2,p3Text,$prefsIntroP3,i, j,
			$fieldset, fieldsetClass, fieldsetId, $legend, legendId, thisPref, $thisDiv, thisClass,
			thisId, $thisLabel, $thisField, options,$thisOption,optionValue,optionLang,optionText,
			changedPref,changedSpan,changedText, currentDescState, prefDescVoice, $kbHeading,$kbList,
			kbLabels,keys,kbListText,$kbListItem, dialog,$saveButton,$cancelButton,$buttonContainer;

		thisObj = this;
		available = this.getAvailablePreferences();

		$prefsDiv = $('<div>',{
			'class': 'able-prefs-form '
		});
		var customClass = 'able-prefs-form-' + form;
		$prefsDiv.addClass(customClass);

		if (form == 'captions') {
			formTitle = this.translate( 'prefTitleCaptions', 'Captions Preferences' );
		} else if (form == 'descriptions') {
			formTitle = this.translate( 'prefTitleDescriptions', 'Audio Description Preferences' );
			var $prefsIntro = $('<p>',{
				text: this.translate( 'prefIntroDescription1', 'This media player supports audio description in two ways: ' )
			});
			var $prefsIntroUL = $('<ul>');
			var $prefsIntroLI1 = $('<li>',{
				text: this.translate( 'prefDescFormatOption1', 'alternative described version of video' )
			});
			var $prefsIntroLI2 = $('<li>',{
				text: this.translate( 'prefDescFormatOption2', 'text-based description, announced by screen reader' )
			});

			$prefsIntroUL.append($prefsIntroLI1,$prefsIntroLI2);
			if (this.hasOpenDesc && this.hasClosedDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' ) + ' ';
				currentDescState += '<strong>' + this.translate( 'prefDescFormatOption1b', 'an alternative described version' ) + '</strong>';
				currentDescState += ' <em>' + this.translate( 'and', 'and' ) + '</em> <strong>' + this.translate( 'prefDescFormatOption2b', 'text-based description, announced by screen reader' ) + '</strong>.';
			} else if (this.hasOpenDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' );
				currentDescState += ' <strong>' + this.translate( 'prefDescFormatOption1b', 'an alternative described version' ) + '</strong>.';
			} else if (this.hasClosedDesc) {
				currentDescState = this.translate( 'prefIntroDescription2', 'The current video has ' );
				currentDescState += ' <strong>' + this.translate( 'prefDescFormatOption2b', 'text-based description, announced by screen reader' ) + '</strong>.';
			} else {
				currentDescState = this.translate( 'prefIntroDescriptionNone', 'The current video has no audio description in either format.' );
			}
			$prefsIntroP2 = $('<p>',{
				html: currentDescState
			});

			p3Text = this.translate( 'prefIntroDescription3', 'Use the following form to set your preferences related to text-based audio description.' );
			if (this.hasOpenDesc || this.hasClosedDesc) {
				p3Text += ' ' + this.translate( 'prefIntroDescription4', 'After you save your settings, audio description can be toggled on/off using the Description button.' );
			}
			$prefsIntroP3 = $('<p>',{
				text: p3Text
			});

			$prefsDiv.append( $prefsIntro, $prefsIntroUL, $prefsIntroP2, $prefsIntroP3 );
		} else if (form == 'keyboard') {
			formTitle = this.translate( 'prefTitleKeyboard', 'Keyboard Preferences' );
			introText = this.translate( 'prefIntroKeyboard1', 'The media player on this web page can be operated from anywhere on the page using keyboard shortcuts (see below for a list).' );
			introText += ' ' + this.translate( 'prefIntroKeyboard2', 'Modifier keys (Shift, Alt, and Control) can be assigned below.' );
			introText += ' ' + this.translate( 'prefIntroKeyboard3', 'NOTE: Some key combinations might conflict with keys used by your browser and/or other software applications. Try various combinations of modifier keys to find one that works for you.' );
			$prefsIntro = $('<p>',{
				text: introText
			});
			$prefsDiv.append($prefsIntro);
		} else if (form == 'transcript') {
			formTitle = this.translate( 'prefTitleTranscript', 'Transcript Preferences' );
		}

		$fieldset = $('<div>').attr('role','group');
		fieldsetClass = 'able-prefs-' + form;
		fieldsetId = this.mediaId + '-prefs-' + form;
		legendId = fieldsetId + '-legend';
		$fieldset.addClass(fieldsetClass).attr('id',fieldsetId);
		if (form === 'keyboard') {
			$legend = $('<h2>' + this.translate( 'prefHeadingKeyboard1', 'Modifier keys used for shortcuts' ) + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		} else if (form === 'descriptions') {
			$legend = $('<h2>' + this.translate( 'prefHeadingTextDescription', 'Text-based audio description' ) + '</h2>');
			$legend.attr('id',legendId);
			$fieldset.attr('aria-labelledby',legendId);
			$fieldset.append($legend);
		}
		for (i=0; i<available.length; i++) {

			if ((available[i]['group'] == form) && available[i]['label']) {

				thisPref = available[i]['name'];
				thisClass = 'able-' + thisPref;
				thisId = this.mediaId + '_' + thisPref;
				$thisDiv = $('<div>').addClass(thisClass);

				if (form === 'captions') {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<select>',{
						name: thisPref,
						id: thisId,
					});
					if (thisPref !== 'prefCaptions' && thisPref !== 'prefCaptionsStyle') {
						$thisField.on( 'change', function() {
							changedPref = $(this).attr('name');
							thisObj.stylizeCaptions(thisObj.$sampleCapsDiv,changedPref);
						});
					}
					options = this.getCaptionsOptions(thisPref);
					for (j=0; j < options.length; j++) {
						if (thisPref === 'prefCaptionsPosition') {
							optionValue = options[j];
							if (optionValue === 'overlay') {
								optionText = this.translate( 'captionsPositionOverlay', 'Overlay' );
							} else if (optionValue === 'below') {
								optionValue = options[j];
								optionText = this.translate( 'captionsPositionBelow', 'Below video' );
							}
						} else if (thisPref === 'prefCaptionsFont' || thisPref === 'prefCaptionsColor' || thisPref === 'prefCaptionsBGColor') {
							optionValue = options[j][0];
							optionText = options[j][1];
						} else if (thisPref === 'prefCaptionsOpacity') {
							optionValue = options[j];
							optionText = options[j];
							optionText += (optionValue === '0%') ? ' (' + this.translate( 'transparent', 'transparent' ) + ')' : ' (' + this.translate( 'solid', 'solid' ) + ')';
						} else {
							optionValue = options[j];
							optionText = options[j];
						}
						$thisOption = $('<option>',{
							value: optionValue,
							text: optionText
						});
						if (this[thisPref] === optionValue) {
							$thisOption.prop('selected',true);
						}
						$thisField.append($thisOption);
					}
					$thisDiv.append($thisLabel,$thisField);
				} else if (form === 'descriptions') {
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					if (thisPref === 'prefDescPause' || thisPref === 'prefDescVisible') {
						$thisDiv.addClass('able-prefs-checkbox');
						$thisField = $('<input>',{
							type: 'checkbox',
							name: thisPref,
							id: thisId,
							value: 'true'
						});
						if (this[thisPref] === 1) {
							$thisField.prop('checked',true);
						}
						$thisDiv.append($thisField,$thisLabel);
					} else if (this.synth) {
						$thisDiv.addClass('able-prefs-select');
						$thisField = $('<select>',{
							name: thisPref,
							id: thisId,
						});
						if (thisPref === 'prefDescVoice' && this.descVoices.length) {
							prefDescVoice = this.getPrefDescVoice();
							for (j=0; j < this.descVoices.length; j++) {
								optionValue = this.descVoices[j].name;
								optionLang = this.descVoices[j].lang.substring(0,2).toLowerCase();
								optionText = optionValue + ' (' + this.descVoices[j].lang + ')';
								$thisOption = $('<option>',{
									'value': optionValue,
									'data-lang': optionLang,
									text: optionText
								});
								if (prefDescVoice === optionValue) {
									$thisOption.prop('selected',true);
								}
								$thisField.append($thisOption);
							}
							this.$voiceSelectField = $thisField;
						} else {
							if (thisPref == 'prefDescPitch') { 
								options = [0,0.5,1,1.5,2];
							} else if (thisPref == 'prefDescRate') { 

								options = [0.7,0.8,0.9,1,1.1,1.2,1.5,2,2.5,3];
							} else if (thisPref == 'prefDescVolume') { 
								options = [0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1];
							}
							if (typeof options !== 'undefined') {
								for (j=0; j < options.length; j++) {
									optionValue = options[j];
									optionText = this.makePrefsValueReadable(thisPref,optionValue);
									$thisOption = $('<option>',{
										value: optionValue,
										text: optionText
									});
									if (this[thisPref] == optionValue) {
										$thisOption.prop('selected',true);
									}
									$thisField.append($thisOption);
									$thisDiv.append($thisLabel,$thisField);
								}
							}
						}
						$thisField.on('change',function() {
							thisObj.announceDescriptionText('sample',thisObj.currentSampleText);
						});
						$thisDiv.append($thisLabel,$thisField);
					}
				} else { 
					$thisLabel = $('<label for="' + thisId + '"> ' + available[i]['label'] + '</label>');
					$thisField = $('<input>',{
						type: 'checkbox',
						name: thisPref,
						id: thisId,
						value: 'true'
					});
					if (this[thisPref] === 1) {
						$thisField.prop('checked',true);
					}
					if (form === 'keyboard') {
						$thisField.on('change',function() {
							changedPref = $(this).attr('name');
							if (changedPref === 'prefAltKey') {
								changedSpan = '.able-modkey-alt';
								changedText = thisObj.tt.prefAltKey + ' + ';
							} else if (changedPref === 'prefCtrlKey') {
								changedSpan = '.able-modkey-ctrl';
								changedText = thisObj.tt.prefCtrlKey + ' + ';
							} else if (changedPref === 'prefShiftKey') {
								changedSpan = '.able-modkey-shift';
								changedText = thisObj.tt.prefShiftKey + ' + ';
							}
							if ( changedPref !== 'prefNoKeyShortcuts' ) {
								if ($(this).is(':checked')) {
									$(changedSpan).text(changedText);
								} else {
									$(changedSpan).text('');
								}
							} else {
								if ($(this).is(':checked')) {
									$('.able-modkey-item').addClass('hidden');
								} else {
									$('.able-modkey-item').removeClass('hidden');
								}
							}
						});
					}
					$thisDiv.append($thisField,$thisLabel);
				}
				if (thisPref === 'prefDescVoice' && !this.descVoices.length) {
				} else {
					$fieldset.append($thisDiv);
				}
			}
		}
		$prefsDiv.append($fieldset);

		if (form === 'captions') {
			if (!this.usingYouTubeCaptions) {
				this.$sampleCapsDiv = $('<div>',{
					'class': 'able-captions-sample'
				}).text( this.translate( 'sampleCaptionText', 'Sample caption text' ) );
				$prefsDiv.append(this.$sampleCapsDiv);
				this.stylizeCaptions(this.$sampleCapsDiv);
			}
		} else if (form === 'descriptions') {
			if (this.synth) {
				this.$sampleDescDiv = $('<div>',{
					'class': 'able-desc-sample'
				}).text( this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' ) );
				$prefsDiv.append(this.$sampleDescDiv);
				this.currentSampleText = this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' );
			}
		} else if (form === 'keyboard') {
			let shortcutClass = (this.prefNoKeyShortcuts === 1 ) ? 'able-modkey-item hidden' : 'able-modkey-item';

			$kbHeading = $('<h2>',{
				text: this.translate( 'prefHeadingKeyboard2', 'Current keyboard shortcuts' )
			});
			$kbList = $('<ul>');
			kbLabels = [];
			keys = [];
			for (i=0; i<this.controls.length; i++) {
				if (this.controls[i] === 'play') {
					kbLabels.push( this.translate( 'play', 'Play' ) + '/' + this.translate( 'pause', 'Pause' ) );
					keys.push('p</span> <em>' + this.translate( 'or', 'or' ) + '</em> <span class="able-help-modifiers"> ' + this.translate( 'spacebar', 'spacebar' ));
				} else if (this.controls[i] === 'restart') {
					kbLabels.push(this.translate( 'restart', 'Restart' ));
					keys.push('s');
				} else if (this.controls[i] === 'previous') {
					kbLabels.push( this.translate( 'prevTrack', 'Previous track' ) );
					keys.push('b'); 
				} else if (this.controls[i] === 'next') {
					kbLabels.push( this.translate( 'nextTrack', 'Next track' ) );
					keys.push('n');
				} else if (this.controls[i] === 'rewind') {
					kbLabels.push(this.translate( 'rewind', 'Rewind' ));
					keys.push('r');
				} else if (this.controls[i] === 'forward') {
					kbLabels.push(this.translate( 'forward', 'Forward' ));
					keys.push('f');
				} else if (this.controls[i] === 'volume') {
					kbLabels.push(this.translate( 'volume', 'Volume' ));
					keys.push('v</span> <em>' + this.translate( 'or', 'or' ) + '</em> <span class="able-modkey">1-9');
					kbLabels.push(this.translate( 'mute', 'Mute' ) + '/' + this.translate( 'unmute', 'Unmute' ));
					keys.push('m');
				} else if (this.controls[i] === 'captions') {
					if (this.captions.length > 1) {
						kbLabels.push(this.translate( 'captions', 'Captions' ));
					} else {
						if (this.captionsOn) {
							kbLabels.push(this.translate( 'hideCaptions', 'Hide captions' ));
						} else {
							kbLabels.push(this.translate( 'showCaptions', 'Show captions' ));
						}
					}
					keys.push('c');
				} else if (this.controls[i] === 'descriptions') {
					if (this.descOn) {
						kbLabels.push(this.translate( 'turnOffDescriptions', 'Turn off descriptions' ));
					} else {
						kbLabels.push(this.translate( 'turnOnDescriptions', 'Turn on descriptions' ));
					}
					keys.push('d');
				} else if (this.controls[i] === 'prefs') {
					kbLabels.push(this.translate( 'preferences', 'Preferences' ));
					keys.push('e');
				}
			}
			for (i=0; i<keys.length; i++) {
				kbListText = '<span class="able-modkey-alt">';
				if (this.prefAltKey === 1) {
					kbListText += this.translate( 'prefAltKey', 'Alt' ) + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey-ctrl">';
				if (this.prefCtrlKey === 1) {
					kbListText += this.translate( 'prefCtrlKey', 'Control' ) + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey-shift">';
				if (this.prefShiftKey === 1) {
					kbListText += this.translate( 'prefShiftKey', 'Shift' ) + ' + ';
				}
				kbListText += '</span>';
				kbListText += '<span class="able-modkey">' + keys[i] + '</span>';
				kbListText += ' = ' + kbLabels[i];
				$kbListItem = $('<li>',{
					'class': shortcutClass,
					html: kbListText,
				});
				$kbList.append($kbListItem);
			}
			kbListText = '<span class="able-modkey">' + this.translate( 'escapeKey', 'Escape' ) + '</span>';
			kbListText += ' = ' + this.translate( 'escapeKeyFunction', 'Close current dialog or popup menu' );
			$kbListItem = $('<li>',{
				html: kbListText
			});
			$kbList.append($kbListItem);
			$prefsDiv.append($kbHeading,$kbList);
		}

		$('body').append($prefsDiv);
		dialog = new AccessibleDialog(
			$prefsDiv,
			this.$prefsButton,
			formTitle,
			thisObj.tt.closeButtonLabel
		);

		$buttonContainer = $( '<div class="able-prefs-buttons"></div>' );
		$saveButton = $('<button class="modal-button">' + this.translate( 'save', 'Save' ) + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.translate( 'cancel', 'Cancel' ) + '</button>');
		$saveButton.on( 'click', function () {
			dialog.hide();
			thisObj.savePrefsFromForm();
		});
		$cancelButton.on( 'click', function () {
			dialog.hide();
			thisObj.resetPrefsForm();
		});
		$buttonContainer.append( $saveButton,$cancelButton );
		$prefsDiv.append($buttonContainer);
		if (form === 'captions' || form === 'transcript') {
			$fieldset.attr('aria-labelledby',dialog.titleH1.attr('id'));
		}

		if (form === 'captions') {
			this.captionPrefsDialog = dialog;
		} else if (form === 'descriptions') {
			this.descPrefsDialog = dialog;
		} else if (form === 'keyboard') {
			this.keyboardPrefsDialog = dialog;
		} else if (form === 'transcript') {
			this.transcriptPrefsDialog = dialog;
		}

		$('div.able-prefs-form button.modalCloseButton').on( 'click', function() {
			thisObj.resetPrefsForm();
		})
		$('div.able-prefs-form').on( 'keydown', function(e) {
			if (e.key === 'Escape') {
				thisObj.resetPrefsForm();
			}
		});
	};

	AblePlayer.prototype.getPrefDescVoice = function () {

		var lang, preferences, i;

		if (this.selectedDescriptions) {
			lang = this.selectedDescriptions.language;
		} else if (this.captionLang) {
			lang = this.captionLang;
		} else {
			lang = this.lang;
		}
		preferences = this.getPref();
		if (preferences.voices) {
			for (i=0; i < preferences.voices.length; i++) {
				if (preferences.voices[i].lang === lang) {
					return preferences.voices[i].name;
				}
			}
		}
		return null; 
	}

	AblePlayer.prototype.rebuildDescPrefsForm = function () {


		var i, optionValue, optionText, $thisOption;

		this.$voiceSelectField = $('#' + this.mediaId + '_prefDescVoice');
		this.$voiceSelectField.empty();
		for (i=0; i < this.descVoices.length; i++) {
			optionValue = this.descVoices[i].name;
			optionText = optionValue + ' (' + this.descVoices[i].lang + ')';
			$thisOption = $('<option>',{
				'value': optionValue,
				'data-lang': this.descVoices[i].lang.substring(0,2).toLowerCase(),
				text: optionText
			});
			if (this.prefDescVoice == optionValue) {
				$thisOption.prop('selected',true);
			}
			this.$voiceSelectField.append($thisOption);
		}
	};

	AblePlayer.prototype.makePrefsValueReadable = function(pref,value) {


		if (pref === 'prefDescPitch') {
			if (value === 0) {
				return this.translate( 'prefDescPitch1', 'Very low' );
			} else if (value === 0.5) {
				return this.translate( 'prefDescPitch2', 'Low' );
			} else if (value === 1) {
				return this.translate( 'prefDescPitch3', 'Default' );
			} else if (value === 1.5) {
				return this.translate( 'prefDescPitch4', 'High' );
			} else if (value === 2) {
				return this.translate( 'prefDescPitch5', 'Very high' );
			}
		} else if (pref === 'prefDescRate') {
			if (value === 0.7) {
				return 1;
			} else if (value === 0.8) {
				return 2;
			} else if (value === 0.9) {
				return 3;
			} else if (value === 1) {
				return 4;
			} else if (value === 1.1) {
				return 5;
			} else if (value === 1.2) {
				return 6;
			} else if (value === 1.5) {
				return 7;
			} else if (value === 2) {
				return 8;
			} else if (value === 2.5) {
				return 9;
			} else if (value === 3) {
				return 10;
			}
		} else if (pref === 'prefDescVolume') {
			return value * 10;
		}
		return value;
	};

	AblePlayer.prototype.resetPrefsForm = function () {


		var thisObj, preferences, available, i, prefName;

		thisObj = this;
		preferences = this.getPref();
		available = this.getAvailablePreferences();
		for (i=0; i<available.length; i++) {
			prefName = available[i]['name'];
			if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
				$('select[name="' + prefName + '"]').val(preferences.preferences[prefName]);
			} else { 
				if (this[prefName] === 1) {
					$('input[name="' + prefName + '"]').prop('checked',true);
				} else {
					$('input[name="' + prefName + '"]').prop('checked',false);
				}
			}
		}
		this.stylizeCaptions(this.$sampleCapsDiv);
	};

	AblePlayer.prototype.savePrefsFromForm = function () {

		var preferences, available, prefName, prefId,
			voiceSelectId, newVoice, newVoiceLang, numChanges, voiceLangFound,
			numCapChanges, capSizeChanged, capSizeValue, newValue;

		numChanges = 0;
		numCapChanges = 0; 
		capSizeChanged = false;
		preferences = this.getPref();
		available = this.getAvailablePreferences();
		for (var i=0; i < available.length; i++) {
			if (available[i]['label']) {
				prefName = available[i]['name'];
				prefId = this.mediaId + '_' + prefName;
				if (prefName === 'prefDescVoice') {
					if (typeof preferences.voices === 'undefined') {
						preferences.voices = [];
					}
					voiceSelectId = this.mediaId + '_prefDescVoice';
					this.prefDescVoice = $('select#' + voiceSelectId).find(':selected').val();
					this.prefDescVoiceLang = $('select#' + voiceSelectId).find(':selected').attr('data-lang');
					voiceLangFound = false;
					for (var v=0; v < preferences.voices.length; v++) {
						if (preferences.voices[v].lang === this.prefDescVoiceLang) {
							voiceLangFound = true;
							preferences.voices[v].name = this.prefDescVoice;
						}
					}
					if (!voiceLangFound) {
						newVoice = {'name':this.prefDescVoice, 'lang':this.prefDescVoiceLang};
						preferences.voices.push(newVoice);
					}
					numChanges++;
				} else if (prefName == 'prefDescMethod') {
					this.prefDescMethod = 'video';
					if (this.prefDescMethod !== preferences.preferences['prefDescMethod']) { 
						preferences.preferences['prefDescMethod'] = this.prefDescMethod;
						numChanges++;
					}
				} else if ((prefName.indexOf('Captions') !== -1) && (prefName !== 'prefCaptions')) {
					newValue = $('select[id="' + prefId + '"]').val();
					if (preferences.preferences[prefName] !== newValue) { 
						preferences.preferences[prefName] = newValue;
						this[prefName] = newValue;
						numChanges++;
						numCapChanges++;
					}
					if (prefName === 'prefCaptionsSize') {
						capSizeChanged = true;
						capSizeValue = newValue;
					}
				} else if ((prefName.indexOf('Desc') !== -1) && (prefName !== 'prefDescPause') && prefName !== 'prefDescVisible') {
					newValue = $('select[id="' + prefId + '"]').val();
					if (preferences.preferences[prefName] !== newValue) { 
						preferences.preferences[prefName] = newValue;
						this[prefName] = newValue;
						numChanges++;
					}
				} else { 
					if ($('input[id="' + prefId + '"]').is(':checked')) {
						preferences.preferences[prefName] = 1;
						if (this[prefName] === 1) {
						} else {
							this[prefName] = 1;
							numChanges++;
						}
					} else { 
						preferences.preferences[prefName] = 0;
						if (this[prefName] === 1) {
							this[prefName] = 0;
							numChanges++;
						} else {
						}
					}
				}
			}
		}
		if (numChanges > 0) {
			this.setPrefs(preferences);
			this.showAlert( this.translate( 'prefSuccess', 'Your changes have been saved.' ) );
		} else {
			this.showAlert( this.translate( 'prefNoChange', "You didn't make any changes" ) );
		}
		if (this.player === 'youtube' &&
			(typeof this.usingYouTubeCaptions !== 'undefined' && this.usingYouTubeCaptions) &&
			capSizeChanged) {
				this.youTubePlayer.setOption('captions','fontSize',this.translatePrefs('size',capSizeValue,'youtube'));
		}
		if (AblePlayerInstances.length > 1) {
			for (var i=0; i<AblePlayerInstances.length; i++) {
				AblePlayerInstances[i].updatePlayerPrefs();
				AblePlayerInstances[i].loadCurrentPreferences();
				AblePlayerInstances[i].resetPrefsForm();
				if (numCapChanges > 0) {
					AblePlayerInstances[i].stylizeCaptions(AblePlayerInstances[i].$captionsDiv);
					if (typeof AblePlayerInstances[i].$descDiv !== 'undefined') {
						AblePlayerInstances[i].stylizeCaptions(AblePlayerInstances[i].$descDiv);
					}
				}
			}
		} else {
			this.updatePlayerPrefs();
			if (numCapChanges > 0) {
				this.stylizeCaptions(this.$captionsDiv);
				if (typeof this.$descDiv !== 'undefined') {
					this.stylizeCaptions(this.$descDiv);
				}
			}
		}
	}

	AblePlayer.prototype.updatePlayerPrefs = function () {

		if (this.$transcriptDiv) {
			if (this.prefTabbable === 1) {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').attr('tabindex','0');
			} else {
				this.$transcriptDiv.find('span.able-transcript-seekpoint').removeAttr('tabindex');
			}

			if (this.prefHighlight === 0) {
				this.$transcriptDiv.find('span').removeClass('able-highlight');
			}
		}

		this.updateCaption();
		this.initDescription();
	};

	AblePlayer.prototype.usingModifierKeys = function(e) {

		if ((this.prefAltKey === 1) && !e.altKey) {
			return false;
		}
		if ((this.prefCtrlKey === 1) && !e.ctrlKey) {
			return false;
		}
		if ((this.prefShiftKey === 1) && !e.shiftKey) {
			return false;
		}
		return true;
	};

})(jQuery);

(function ($) {
	AblePlayer.prototype.parseWebVTT = function(data) {

		let srcFile = data.src;
		let text    = data.text;
		text = text.replace(/(\r\n|\n|\r)/g,'\n');

		var parserState = {
			src: srcFile,
			text: text,
			error: null,
			metadata: {},
			cues: [],
			line: 1,
			column: 1
		};

		try {
			act(parserState, parseFileBody);
		}
		catch (err) {
			var errString = 'Invalid WebVTT file: ' + parserState.src + '\n';
			errString += 'Line: ' + parserState.line + ', ';
			errString += 'Column: ' + parserState.column + '\n';
			errString += err;
			if (console.warn) {

							} else if (console.log) {

							}
		}
		return parserState;
	}

	function actList(state, list) {
		var results = [];
		for (var ii = 0; ii < list.length; ii++) {
			results.push(act(state, list[ii]));
		}
		return results;
	}

	function act(state, action) {
		var val = action(state);
		if (state.error !== null) {
			throw state.error;
		}
		return val;
	}

	function updatePosition(state, cutText) {
		for (var ii = 0; ii < cutText.length; ii++) {
			if (cutText[ii] === '\n') {
				state.column = 1;
				state.line += 1;
			} else {
				state.column += 1;
			}
		}
	}

	function cut(state, length) {
		var returnText = state.text.substring(0, length);
		updatePosition(state, returnText);
		state.text = state.text.substring(length);
		return returnText;
	}

	function cutLine(state, length) {
		var nextEOL = state.text.indexOf('\n');
		var returnText;
		if (nextEOL === -1) {
			returnText = state.text;
			updatePosition(state, returnText);
			state.text = '';
		} else {
			returnText = state.text.substring(0, nextEOL);
			updatePosition(state, returnText + '\n');
			state.text = state.text.substring(nextEOL + 1);
		}
		return returnText;
	}

	function peekLine(state) {
		var nextEOL = state.text.indexOf('\n');
		return (nextEOL === -1) ? state.text : state.text.substring(0, nextEOL);
	}

	function parseFileBody(state) {
		actList(state, [
			eatOptionalBOM,
			eatSignature]);
		var c = state.text[0];
		if (c === ' ' || c === '\t' || c === '\n') {
			actList(state, [
				eatUntilEOLInclusive,
				parseMetadataHeaders,
				eatAtLeast1EmptyLines,
				parseCuesAndComments]);
		} else {
			state.error = "WEBVTT signature not followed by whitespace.";
		}
	}

	function parseMetadataHeaders(state) {
		while (true) {
			var nextLine = peekLine(state);
			if (nextLine.indexOf('-->') !== -1) {
				return;
			} else if (nextLine.length === 0) {
				return;
			} else {
				var keyValue = act(state, getMetadataKeyValue);
				state.metadata[keyValue[0]] = keyValue[1];
				act(state, eatUntilEOLInclusive);
			}
		}
	}

	function nextSpaceOrNewline(s) {
		var possible = [];
		var spaceIndex = s.indexOf(' ');
		if (spaceIndex >= 0) {
			possible.push(spaceIndex);
		}
		var tabIndex = s.indexOf('\t');
		if (tabIndex >= 0) {
			possible.push(tabIndex);
		}
		var lineIndex = s.indexOf('\n');
		if (lineIndex >= 0) {
			possible.push(lineIndex);
		}

		return Math.min.apply(null, possible);
	}

	function getMetadataKeyValue(state) {
		var next = state.text.indexOf('\n');
		var pair = cut(state, next);
		var colon = pair.indexOf(':');
		if (colon === -1) {
			state.error = 'Missing colon.';
			return;
		} else {
			var pairName = pair.substring(0, colon);
			var pairValue = pair.substring(colon + 1);
			return [pairName, pairValue];
		}
	}

	function getSettingsKeyValue(state) {
		var next = nextSpaceOrNewline(state.text);
		var pair = cut(state, next);
		var colon = pair.indexOf(':');
		if (colon === -1) {
			state.error = 'Missing colon.';
			return;
		} else {
			var pairName = pair.substring(0, colon);
			var pairValue = pair.substring(colon + 1);
			return [pairName, pairValue];
		}
	}

	function parseCuesAndComments(state) {
		while (true) {
			var nextLine = peekLine(state);
			if (nextLine.indexOf('NOTE') === 0 && ((nextLine.length === 4) || (nextLine[4] === ' ') || (nextLine[4] === '\t'))) {
				actList(state, [eatComment, eatEmptyLines]);
			} else if (nextLine.trim().length === 0 && state.text.length > 0) {
				act(state, eatEmptyLines);
			} else if (nextLine.trim().length > 0) {
				act(state, parseCue);
			} else {
				return;
			}
		}
	}

	function parseCue(state) {

		var nextLine = peekLine(state);
		var cueId;
		var errString;

		if(nextLine.indexOf('-->') === -1) {
			cueId = cutLine(state);
			nextLine = peekLine(state);
			if(nextLine.indexOf('-->') === -1) {
				errString = 'Invalid WebVTT file: ' + state.src + '\n';
				errString += 'Line: ' + state.line + ', ';
				errString += 'Column: ' + state.column + '\n';
				errString += 'Expected cue timing for cueId \''+cueId+'\' but found: ' + nextLine + '\n';
				if (console.warn) {

									} else if (console.log) {

									}
				return; 
			}
		}

		var cueTimings = actList(state, [getTiming,
																		 eatAtLeast1SpacesOrTabs,
																		 eatArrow,
																		 eatAtLeast1SpacesOrTabs,
																		 getTiming]);

		var startTime = cueTimings[0];
		var endTime = cueTimings[4];
		if (startTime >= endTime) {
			state.error = 'Start time is not sooner than end time.';
			return;
		}

		act(state, eatSpacesOrTabs);
		var cueSettings = act(state, getCueSettings);
		cut(state, 1);
		var components = act(state, getCuePayload);

		if (typeof cueId === 'undefined') {
			cueId = state.cues.length + 1;
		}
		state.cues.push({
			id: cueId,
			start: startTime,
			end: endTime,
			settings: cueSettings,
			components: components
		});
	}

	function getCueSettings(state) {
		var cueSettings = {};
		while (state.text.length > 0 && state.text[0] !== '\n') {
			var keyValue = act(state, getSettingsKeyValue);
			cueSettings[keyValue[0]] = keyValue[1];
			act(state, eatSpacesOrTabs);
		}
		return cueSettings;
	}

	function getCuePayload(state) {
		var result = {type: 'internal', tagName: '', value: '', classes: [], annotation: '', parent: null, children: [], language: ''};
		var current = result;
		var languageStack = [];
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if (nextLine.indexOf('-->') !== -1 || /^\s+$/.test(nextLine)) {
				break; 
			}
			if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
				cut(state, 2);
				break;
			}

			var token = getCueToken(state);
			if (token.type === 'string') {
				current.children.push(token);
			} else if (token.type === 'startTag') {
				token.type = token.tagName;
				token.parent = current;
				if ($.inArray(token.tagName, ['i', 'b', 'u', 'ruby']) !== -1) {
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'rt' && current.tagName === 'ruby') {
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'c') {
					token.value = token.annotation;
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'v') {
					token.value = token.annotation;
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				} else if (token.tagName === 'lang') {
					languageStack.push(token.annotation);
					if (languageStack.length > 0) {
						current.language = languageStack[languageStack.length - 1];
					}
					current.children.push(token);
					current = token;
				}
			} else if (token.type === 'endTag') {
				if (token.tagName === current.type && $.inArray(token.tagName, ['c', 'i', 'b', 'u', 'ruby', 'rt', 'v']) !== -1) {
					current = current.parent;
				} else if (token.tagName === 'lang' && current.type === 'lang') {
					current = current.parent;
					languageStack.pop();
				} else if (token.tagName === 'ruby' && current.type === 'rt') {
					current = current.parent.parent;
				}
			} else if (token.type === 'timestampTag') {
				var tempState = {
					text: token.value,
					error: null,
					metadata: {},
					cues: [],
					line: 1,
					column: 1
				};
				try {
					var timing = act(tempState, getTiming);
					if (tempState.text.length === 0) {
						token.value = timing;
						current.push(token);
					}
				}
				catch (err) {
				}
			}
		}
		return result;
	}

	function getCueToken(state) {
		var tokenState = 'data';
		var result = [];
		var buffer = '';
		var token = {type: '', tagName: '', value: '', classes: [], annotation: '', children: []}

		while (true) {
			var c;
			if (state.text.length >= 2 && state.text[0] === '\n' && state.text[1] === '\n') {
				c = '\u0004';
			} else if (state.text.length > 0) {
				c = state.text[0];
			} else {
				c = '\u0004';
			}
			if (tokenState === 'data') {
				if (c === '&') {
					buffer = '&';
					tokenState = 'escape';
				} else if (c === '<') {
					if (result.length === 0) {
						tokenState = 'tag';
					} else {
						token.type = 'string';
						token.value = result.join('');
						return token;
					}
				} else if (c === '\u0004') {
					return {type: 'string', value: result.join('')};
				} else {
					result.push(c);
				}
			} else if (tokenState === 'escape') {
				if (c === '&') {
					result.push(buffer);
					buffer = '&';
				} else if (c.match(/[0-9a-z]/)) {
					buffer += c;
				} else if (c === ';') {
					if (buffer === '&amp') {
						result.push('&');
					} else if (buffer === '&lt') {
						result.push('<');
					} else if (buffer === '&gt') {
						result.push('>');
					} else if (buffer === '&lrm') {
						result.push('\u200e');
					} else if (buffer === '&rlm') {
						result.push('\u200f');
					} else if (buffer === '&nbsp') {
						result.push('\u00a0');
					} else {
						result.push(buffer);
						result.push(';');
					}
					tokenState = 'data';
				} else if (c === '<' || c === '\u0004') {
					result.push(buffer);
					token.type = 'string';
					token.value = result.join('');
					return token;
				} else if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') { 
					result.push(buffer);
					token.type = 'string';
					token.value = result.join('');
					return token;
				} else {
					result.push(buffer);
					tokenState = 'data';
				}
			} else if (tokenState === 'tag') {
				if (c === '\t' || c === '\n' || c === '\u000c' || c === ' ') {
					tokenState = 'startTagAnnotation';
				} else if (c === '.') {
					tokenState = 'startTagClass';
				} else if (c === '/') {
					tokenState = 'endTag';
				} else if (c.match('[0-9]')) {
					tokenState = 'timestampTag';
					result.push(c);
				} else if (c === '>') {
					cut(state, 1);
					break;
				} else if (c === '\u0004') {
					token.tagName = '';
					token.type = 'startTag';
					return token;
				} else {
					result.push(c);
					tokenState = 'startTag';
				}
			} else if (tokenState === 'startTag') {
				if (c === '\t' || c === '\u000c' || c === ' ') {
					tokenState = 'startTagAnnotation';
				} else if (c === '\n') {
					buffer = c;
					tokenState = 'startTagAnnotation';
				} else if (c === '.') {
					tokenState = 'startTagClass';
				} else if (c === '>') {
					cut(state, 1);
					token.tagName = result.join('');
					token.type = 'startTag';
					return token;
				} else if (c === '\u0004') {
					token.tagName = result.join('');
					token.type = 'startTag';
					return token;
				} else {
					result.push(c);
				}
			} else if (tokenState === 'startTagClass') {
				if (c === '\t' || c === '\u000c' || c === ' ') {
					token.classes.push(buffer);
					buffer = '';
					tokenState = 'startTagAnnotation';
				} else if (c === '\n') {
					token.classes.push(buffer);
					buffer = c;
					tokenState = 'startTagAnnotation';
				} else if (c === '.') {
					token.classes.push(buffer);
					buffer = "";
				} else if (c === '>') {
					cut(state, 1);
					token.classes.push(buffer);
					token.type = 'startTag';
					token.tagName = result.join('');
					return token;
				} else if (c === '\u0004') {
					token.classes.push(buffer);
					token.type = 'startTag';
					token.tagName = result.join('');
					return token;
				} else {
					buffer += 'c';
				}
			} else if (tokenState === 'startTagAnnotation') {
				if (c === '>') {
					cut(state, 1);
					buffer = buffer.trim().replace(/ +/, ' ');
					token.type = 'startTag';
					token.tagName = result.join('');
					token.annotation = buffer;
					return token;
				} else if (c === '\u0004') {
					buffer = buffer.trim().replace(/ +/, ' ');
					token.type = 'startTag';
					token.tagName = result.join('');
					token.annotation = buffer;
					return token;
				} else {
					buffer += c;
				}
			} else if (tokenState === 'endTag') {
				if (c === '>') {
					cut(state, 1);
					token.type = 'endTag';
					token.tagName = result.join('');
					return token;
				} else if (c === '\u0004') {
					token.type = 'endTag';
					token.tagName = result.join('');
					return token;
				} else {
					result.push(c);
				}
			} else if (tokenState === 'timestampTag') {
				if (c === '>') {
					cut(state, 1);
					token.type = 'timestampTag';
					token.name = result.join('');
					return token;
				} else if (c === '\u0004') {
					token.type = 'timestampTag';
					token.name = result.join('');
					return token;
				} else {
					result.push(c);
				}
			} else {
				throw 'Unknown tokenState ' + tokenState;
			}

			cut(state, 1);
		}
	}

	function eatComment(state) {
		var noteLine = cutLine(state);
		if (noteLine.indexOf('-->') !== -1) {
			state.error = 'Invalid syntax: --> in NOTE line.';
			return;
		}
		while (true) {
			var nextLine = peekLine(state);
			if ( nextLine.trim().length === 0) {
				return;
			} else if (nextLine.indexOf('-->') !== -1) {
				state.error = 'Invalid syntax: --> in comment.';
				return;
			} else {
				cutLine(state);
			}
		}
	}

	function eatOptionalBOM(state) {
		if (state.text[0] === '\ufeff') {
			cut(state, 1);
		}

	}

	function eatSignature(state) {
		if (state.text.substring(0,6) === 'WEBVTT') {
			cut(state, 6);
		} else {
			state.error = 'Invalid signature.';
		}
	}

	function eatArrow(state) {
		if (state.text.length < 3 || state.text.substring(0,3) !== '-->') {
			state.error = 'Missing -->';
		} else {
			cut(state, 3);
		}
	}

	function eatSingleSpaceOrTab(state) {
		if (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
		} else {
			state.error = 'Missing space.';
		}
	}

	function eatSpacesOrTabs(state) {
		while (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
		}
	}

	function eatAtLeast1SpacesOrTabs(state) {
		var numEaten = 0;
		while (state.text[0] === '\t' || state.text[0] === ' ') {
			cut(state, 1);
			numEaten += 1;
		}
		if (numEaten === 0) {
			state.error = 'Missing space.';
		}
	}

	function eatUntilEOLInclusive(state) {
		var nextEOL = state.text.indexOf('\n');
		if (nextEOL === -1) {
			state.error = 'Missing EOL.';
		} else {
			cut(state, nextEOL + 1);
		}
	}

	function eatEmptyLines(state) {
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if ( nextLine.trim().length === 0) {
				cutLine(state);
			} else {
				break;
			}
		}
	}

	function eatAtLeast1EmptyLines(state) {
		var linesEaten = 0;
		while (state.text.length > 0) {
			var nextLine = peekLine(state);
			if ( nextLine.trim().length === 0) {
				cutLine(state);
				linesEaten += 1;
			} else {
				break;
			}
		}
		if (linesEaten === 0) {
			state.error = 'Missing empty line.';
		}
	}

	function getTiming(state) {
		var nextSpace = nextSpaceOrNewline(state.text);
		if (nextSpace === -1) {
			state.error('Missing timing.');
			return;
		}
		var timestamp = cut(state, nextSpace);

		var results = /((\d+):)?((\d\d):)(\d\d).(\d\d\d)|(\d+).(\d\d\d)/.exec(timestamp);

		if (!results) {
			state.error = 'Unable to parse timestamp';
			return;
		}
		var time = 0;
		var hours = results[2];
		var minutes = results[4];

		if (minutes) {
			if (parseInt(minutes, 10) > 59) {
				state.error = 'Invalid minute range';
				return;
			}
			if (hours) {
				time += 3600 * parseInt(hours, 10);
			}
			time += 60 * parseInt(minutes, 10);
			var seconds = results[5];
			if (parseInt(seconds, 10) > 59) {
				state.error = 'Invalid second range';
				return;
			}

			time += parseInt(seconds, 10);
			time += parseInt(results[6], 10) / 1000;
		} else {
			time += parseInt(results[7], 10);
			time += parseInt(results[8], 10) / 1000;
		}

		return time;
	}
})(jQuery);

(function ($) {

	AblePlayer.prototype.injectPlayerCode = function() {


		var captionsContainer;
		this.$mediaContainer = this.$media.wrap('<div class="able-media-container"></div>').parent();
		this.$ableDiv = this.$mediaContainer.wrap('<div class="able"></div>').parent();
		this.$ableWrapper = this.$ableDiv.wrap('<div class="able-wrapper"></div>').parent();
		this.$ableWrapper.addClass('able-skin-' + this.skin);

		if (this.mediaType === 'video') {
			if (this.iconType != 'image' && (this.player !== 'youtube' || this.hasPoster)) {
				this.injectBigPlayButton();
			}
		}

		captionsContainer = $('<div>');
		if (this.mediaType === 'video') {
			captionsContainer.addClass('able-vidcap-container');
		} else if (this.mediaType === 'audio') {
			captionsContainer.addClass('able-audcap-container');
			captionsContainer.addClass('captions-off');
		}

		this.injectPlayerControlArea(); 
		this.$captionsContainer = this.$mediaContainer.wrap(captionsContainer).parent();
		this.injectAlert(this.$ableDiv);
		this.injectPlaylist();
		this.injectAudioPoster();
		this.injectOffscreenHeading();
	};

	AblePlayer.prototype.injectAudioPoster = function() {
		if ( this.mediaType === 'audio' && this.hasPoster ) {
			audioPoster = DOMPurify.sanitize(this.audioPoster);
			audioPosterAlt = DOMPurify.sanitize(this.audioPosterAlt);
			let audioPosterImg = document.createElement( 'img' );
			audioPosterImg.setAttribute( 'src', audioPoster );
			audioPosterImg.setAttribute( 'alt', audioPosterAlt );
			this.$audioWrapper = this.$playerDiv.wrap( '<div class="able-audio-wrapper">' ).parent();
			this.$audioWrapper.prepend( audioPosterImg );
		}
	}

	AblePlayer.prototype.injectOffscreenHeading = function () {

		var headingType;
		if (this.playerHeadingLevel == '0') {
		} else {
			if (typeof this.playerHeadingLevel === 'undefined') {
				this.playerHeadingLevel = this.getNextHeadingLevel(this.$ableDiv); 
			}
			headingType = 'h' + this.playerHeadingLevel.toString();
			this.$headingDiv = $('<' + headingType + '>');
			this.$ableDiv.prepend(this.$headingDiv);
			this.$headingDiv.addClass('able-offscreen');
			this.$headingDiv.text( this.translate( 'playerHeading', 'Media player' ) );
		}
	};

	AblePlayer.prototype.injectBigPlayButton = function () {

		var thisObj = this;

		this.$bigPlayButton = $('<button>', {
			'class': 'able-big-play-button',
			'aria-hidden': false,
			'aria-label': this.translate( 'play', 'Play' ),
			'type': 'button',
			'tabindex': 0
		});

		this.getIcon( this.$bigPlayButton, 'play' );

		this.$bigPlayButton.on( 'click', function () {
			thisObj.handlePlay();
		});

		this.$mediaContainer.append(this.$bigPlayButton);
	};

	AblePlayer.prototype.injectPlayerControlArea = function () {

		this.$playerDiv = $('<div>', {
			'class' : 'able-player',
			'role' : 'region',
			'aria-label' : ( 'audio' === this.mediaType ) ? this.translate( 'audioPlayer', 'audio player' ) : this.translate( 'videoPlayer', 'video player' )
		});
		this.$playerDiv.addClass('able-' + this.mediaType);
		if (this.hasPlaylist && this.showNowPlaying) {
			this.$nowPlayingDiv = $('<div>',{
				'class' : 'able-now-playing',
				'aria-live' : 'assertive',
				'aria-atomic': 'true'
			});
		}
		this.$controllerDiv = $('<div>',{
			'class' : 'able-controller'
		});
		this.$controllerDiv.addClass('able-' + this.iconColor + '-controls');

		this.$statusBarDiv = $('<div>',{
			'class' : 'able-status-bar'
		});
		this.$timer = $('<span>',{
			'class' : 'able-timer'
		});
		this.$elapsedTimeContainer = $('<span>',{
			'class': 'able-elapsedTime',
			text: '0:00'
		});
		this.$durationContainer = $('<span>',{
			'class': 'able-duration'
		});
		this.$timer.append(this.$elapsedTimeContainer).append(this.$durationContainer);

		this.$speed = $('<span>',{
			'class' : 'able-speed',
			'aria-live' : 'assertive',
			'aria-atomic' : 'true'
		}).text(this.translate( 'speed', 'Speed' ) + ': 1x');

		this.$status = $('<span>',{
			'class' : 'able-status',
			'aria-live' : 'polite'
		});

		this.$statusBarDiv.append(this.$timer, this.$speed, this.$status);
		if (this.showNowPlaying) {
			this.$playerDiv.append(this.$nowPlayingDiv, this.$controllerDiv, this.$statusBarDiv);
		} else {
			this.$playerDiv.append(this.$controllerDiv, this.$statusBarDiv);
		}

		if (this.mediaType === 'video') {
			this.$ableDiv.append(this.$playerDiv);
		} else {
			this.$ableDiv.prepend(this.$playerDiv);
		}
	};

	AblePlayer.prototype.injectTextDescriptionArea = function () {

		this.$descDiv = $('<div>',{
			'class': 'able-descriptions'
		});
		this.$descDiv.attr({
			'aria-live': 'assertive',
			'aria-atomic': 'true'
		});
		this.$descDiv.hide();
		this.$ableDiv.append(this.$descDiv);
	};

	AblePlayer.prototype.getDefaultWidth = function(which) {
		let viewportMaxwidth = window.innerWidth;
		if (which === 'transcript') {
			return ( viewportMaxwidth <= 450 ) ? viewportMaxwidth : 450;
		} else if (which === 'sign') {
			return ( viewportMaxwidth <= 400 ) ? viewportMaxwidth : 400;
		}
	};

	AblePlayer.prototype.rePositionDraggableWindow = function (which) {

		let preferences, $window;
		preferences = this.getPref();
		$window = ( which === 'transcript' ) ? this.$transcriptArea : this.$signWindow;

				if ( which === 'transcript' && $window ) {
			if (typeof preferences.transcript !== 'undefined') {
				this.prevTranscriptPosition = preferences.transcript;
			}
			$window.css({
				'top': 0,
				'left': 0
			});
		} else if ( 'sign' === which && $window ) {
			if (typeof preferences.sign !== 'undefined') {
				this.prevSignPosition = preferences.sign;
			}
			$window.css({
				'top': 0,
				'right': 0,
				'left': 'auto'
			});
		}
	}

	AblePlayer.prototype.positionDraggableWindow = function (which, width) {

		var preferences, preferencePos, $window, windowPos, viewportWidth, windowWidth;

		preferences = this.getPref();
		$window = ( which === 'transcript' ) ? this.$transcriptArea : this.$signWindow;
		if ( ! $window ) {
			return;
		}
		if (which === 'transcript') {
			if (typeof preferences.transcript !== 'undefined') {
				preferencePos = preferences.transcript;
			}
			if ( this.prevTranscriptPosition ) {
				preferencePos = this.prevTranscriptPosition;
				this.prevTranscriptPosition = false;
			}
		} else if (which === 'sign') {
			if (typeof preferences.sign !== 'undefined') {
				preferencePos = preferences.sign;
			}
			if ( this.prevSignPosition ) {
				preferencePos = this.prevSignPosition;
				this.prevSignPosition = false;
			}
		}
		if (typeof preferencePos !== 'undefined' && !($.isEmptyObject(preferencePos))) {
			$window.css({
				'position': preferencePos['position'],
				'width': preferencePos['width'],
				'z-index': preferencePos['zindex']
			});
			if (preferencePos['position'] === 'absolute') {
				$window.css({
					'top': preferencePos['top'],
					'left': preferencePos['left']
				});
				topPosition = $window.offset().top;
				leftPosition = $window.offset().left;
				viewportWidth = window.innerWidth;
				windowWidth = $window.width();
				if ( topPosition < 0 ) {
					$window.css({
						'top': preferencePos['top'] - topPosition
					});
				}
				if ( leftPosition < 0 && ! this.restoringAfterFullscreen ) {

										$window.css({
						'left': preferencePos['left'] - leftPosition
					});
				}
				if ( viewportWidth - leftPosition < 30 ) {
					$window.css({
						'left': viewportWidth - windowWidth
					});
				}
			}
			this.updateZIndex(which);
		} else {
			windowPos = this.getOptimumPosition(which, width);
			if (typeof width === 'undefined') {
				width = this.getDefaultWidth(which);
			}
			$window.css({
				'position': windowPos[0],
				'width': width,
				'z-index': windowPos[3]
			});
			if (windowPos[0] === 'absolute') {
				$window.css({
					'top': windowPos[1] + 'px',
					'left': windowPos[2] + 'px',
				});
			}
		}
	};

	AblePlayer.prototype.getOptimumPosition = function (targetWindow, targetWidth) {


		var gap, position, ableWidth, ableOffset, ableLeft, windowWidth, otherWindowWidth;

		if (typeof targetWidth === 'undefined') {
			targetWidth = this.getDefaultWidth(targetWindow);
		}

		gap = 5; 
		position = []; 

		ableWidth = this.$ableDiv.width();
		ableOffset = this.$ableDiv.offset();
		ableLeft = ableOffset.left;
		windowWidth = $(window).width();
		otherWindowWidth = 0; 

		if (targetWindow === 'transcript') {
			if (typeof this.$signWindow !== 'undefined' && (this.$signWindow.is(':visible'))) {
				otherWindowWidth = this.$signWindow.width() + gap;
			}
		} else if (targetWindow === 'sign') {
			if (typeof this.$transcriptArea !== 'undefined' && (this.$transcriptArea.is(':visible'))) {
				otherWindowWidth = this.$transcriptArea.width() + gap;
			}
		}
		if (targetWidth < (windowWidth - (ableLeft + ableWidth + gap + otherWindowWidth))) {
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableWidth + otherWindowWidth + gap;
		} else if (targetWidth + gap < ableLeft) {
			position[0] = 'absolute';
			position[1] = 0;
			position[2] = ableLeft - targetWidth - gap;
		} else {
			position[0] = 'relative';
		}
		return position;
	};

	AblePlayer.prototype.injectAlert = function ($container) {
		this.$alertBox = $('<div role="alert"></div>');
		this.$alertBox.addClass('able-alert');
		this.$alertBox.hide();

		var $alertText = $( '<span></span>' );
		$alertText.appendTo(this.$alertBox);

		var $alertDismiss = $('<button type="button"></button>' );
		$alertDismiss.attr( 'aria-label', this.translate( 'dismissButton', 'Dismiss' ) );
		$alertDismiss.text( '×' );
		$alertDismiss.appendTo(this.$alertBox);

		$alertDismiss.on( 'click', function(e) {
			$(this).parent('div').hide();
		});

		this.$alertBox.appendTo($container);

		if ( ! this.$srAlertBox ) {
			this.$srAlertBox = $('<div role="alert"></div>');
			this.$srAlertBox.addClass('able-screenreader-alert');
			this.$srAlertBox.appendTo($container);
		}
	};

	AblePlayer.prototype.injectPlaylist = function () {

		if (this.playlistEmbed === true) {
			var playlistClone = this.$playlistDom.clone();
			playlistClone.insertBefore(this.$statusBarDiv);
			this.$playlist = playlistClone.find('li');
		}
	};

	AblePlayer.prototype.createPopup = function (which, tracks) {


		var thisObj, $menu, includeMenuItem, i, $menuItem, prefCat, whichPref, hasDefault, track,
		windowOptions, $thisItem, $prevItem, $nextItem, hasDescription, hasTranscript;

		thisObj = this;

		$menu = $('<ul>',{
			'id': this.mediaId + '-' + which + '-menu',
			'class': 'able-popup',
			'role': 'menu'
		}).hide();

		if (which === 'captions') {
			$menu.addClass('able-popup-captions');
		}

		if (which === 'prefs') {
			if (this.prefCats.length > 1) {
				for (i = 0; i < this.prefCats.length; i++) {
					prefCat = this.prefCats[i];
					hasDescription = ( thisObj.hasDescTracks || thisObj.hasOpenDesc || thisObj.hasClosedDesc ) ? true : false;
					hasTranscript  = ( thisObj.transcriptType === null ) ? false : true;

					if ( prefCat === 'descriptions' && ! hasDescription || prefCat === 'transcript' && ! hasTranscript ) {
						continue;
					}
					$menuItem = $('<li></li>',{
						'role': 'menuitem',
						'tabindex': '-1'
					});
					if (prefCat === 'captions') {
						$menuItem.text( this.translate( 'prefMenuCaptions', 'Captions' ) );
					} else if (prefCat === 'descriptions') {
						$menuItem.text( this.translate( 'prefMenuDescriptions', 'Descriptions' ) );
					} else if (prefCat === 'keyboard') {
						$menuItem.text( this.translate( 'prefMenuKeyboard', 'Keyboard' ) );
					} else if (prefCat === 'transcript') {
						$menuItem.text( this.translate( 'prefMenuTranscript', 'Transcript' ) );
					}
					$menuItem.on('click',function() {
						whichPref = $(this).text();
						thisObj.showingPrefsDialog = true;
						thisObj.setFullscreen(false);
						if (whichPref === thisObj.tt.prefMenuCaptions) {
							thisObj.captionPrefsDialog.show();
						} else if (whichPref === thisObj.tt.prefMenuDescriptions) {
							thisObj.descPrefsDialog.show();
						} else if (whichPref === thisObj.tt.prefMenuKeyboard) {
							thisObj.keyboardPrefsDialog.show();
						} else if (whichPref === thisObj.tt.prefMenuTranscript) {
							thisObj.transcriptPrefsDialog.show();
						}
						thisObj.closePopups();
						thisObj.showingPrefsDialog = false;
					});
					$menu.append($menuItem);
				}
				this.$prefsButton.attr('data-prefs-popup','menu');
			} else if (this.prefCats.length == 1) {
				this.$prefsButton.attr('data-prefs-popup',this.prefCats[0]);
			}
		} else if (which === 'captions' || which === 'chapters') {
			hasDefault = false;
			for (i = 0; i < tracks.length; i++) {
				track = tracks[i];
				if (which === 'captions' && this.player === 'html5' && typeof track.cues === 'undefined') {
					includeMenuItem = false;
				} else {
					includeMenuItem = true;
				}
				if (includeMenuItem) {
					$menuItem = $('<li></li>',{
						'role': 'menuitemradio',
						'tabindex': '-1',
						'lang': track.language
					});
					if (track.def && this.prefCaptions == 1) {
						$menuItem.attr('aria-checked','true');
						hasDefault = true;
					} else {
						$menuItem.attr('aria-checked','false');
					}
					if (which == 'captions') {
						$menuItem.text(track.label);
						$menuItem.on('click',this.getCaptionClickFunction(track));
					} else if (which == 'chapters') {
						$menuItem.text(this.flattenCueForCaption(track) + ' - ' + this.formatSecondsAsColonTime(track.start));
						$menuItem.on('click',this.getChapterClickFunction(track.start));
					}
					$menu.append($menuItem);
				}
			}
			if (which === 'captions') {
				$menuItem = $('<li></li>',{
					'role': 'menuitemradio',
					'tabindex': '-1',
				}).text( this.translate( 'captionsOff', 'Captions off' ) );
				if (this.prefCaptions === 0) {
					$menuItem.attr('aria-checked','true');
					hasDefault = true;
				} else {
					$menuItem.attr('aria-checked','false');
				}
				$menuItem.on('click',this.getCaptionOffFunction());
				$menu.append($menuItem);
			}
		} else if (which === 'transcript-window' || which === 'sign-window') {
			windowOptions = [];
			windowOptions.push({
				'name': 'move',
				'label': this.translate( 'windowMove', 'Move' )
			});
			windowOptions.push({
				'name': 'resize',
				'label': this.translate( 'windowResize', 'Resize' )
			});
			windowOptions.push({
				'name': 'close',
				'label': this.translate( 'windowClose', 'Close' )
			});
			for (i = 0; i < windowOptions.length; i++) {
				$menuItem = $('<li></li>',{
					'role': 'menuitem',
					'tabindex': '-1',
					'data-choice': windowOptions[i].name
				});
				$menuItem.text(windowOptions[i].label);
				$menuItem.on('click',function(e) {
					e.stopPropagation();
					if (typeof e.button !== 'undefined' && e.button !== 0) {
						return false;
					}
					if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
						thisObj.windowMenuClickRegistered = true;
						thisObj.handleMenuChoice(which.substring(0, which.indexOf('-')), $(this).attr('data-choice'), e);
					}
				});
				$menu.append($menuItem);
			}
		}
		if (which === 'captions' && !hasDefault) {
			if ($menu.find('li[lang=' + this.captionLang + ']')) {
				$menu.find('li[lang=' + this.captionLang + ']').attr('aria-checked','true');
			} else {
				$menu.find('li').last().attr('aria-checked','true');
			}
		} else if (which === 'chapters') {
			if ($menu.find('li:contains("' + this.defaultChapter + '")')) {
				$menu.find('li:contains("' + this.defaultChapter + '")').attr('aria-checked','true').addClass('able-focus');
			} else {
				$menu.find('li').first().attr('aria-checked','true').addClass('able-focus');
			}
		}
		$menu.on('keydown',function (e) {

			$thisItem = $(this).find('li:focus');
			if ($thisItem.is(':first-child')) {
				$prevItem = $(this).find('li').last(); 
				$nextItem = $thisItem.next();
			} else if ($thisItem.is(':last-child')) {
				$prevItem = $thisItem.prev();
				$nextItem = $(this).find('li').first(); 
			} else {
				$prevItem = $thisItem.prev();
				$nextItem = $thisItem.next();
			}
			if (e.key === 'Tab') {
				if (e.shiftKey) {
					$thisItem.removeClass('able-focus');
					$prevItem.trigger('focus').addClass('able-focus');
				} else {
					$thisItem.removeClass('able-focus');
					$nextItem.trigger('focus').addClass('able-focus');
				}
			} else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
				$thisItem.removeClass('able-focus');
				$nextItem.trigger('focus').addClass('able-focus');
			} else if (e.key == 'ArrowUp' || e.key === 'ArrowLeft') {
				$thisItem.removeClass('able-focus');
				$prevItem.trigger('focus').addClass('able-focus');
			} else if (e.key === ' ' || e.key === 'Enter') {
				$thisItem.trigger( 'click' );
			} else if (e.key === 'Escape') {
				$thisItem.removeClass('able-focus');
				thisObj.closePopups();
				e.stopPropagation;
			}
			e.preventDefault();
		});
		this.$controllerDiv.append($menu);
		return $menu;
	};

	AblePlayer.prototype.closePopups = function () {

		var thisObj = this;

		if (this.chaptersPopup && this.chaptersPopup.is(':visible')) {
			this.chaptersPopup.hide();
			this.$chaptersButton.attr('aria-expanded','false').trigger('focus');
		}
		if (this.captionsPopup && this.captionsPopup.is(':visible')) {
			this.captionsPopup.hide();
			this.$ccButton.attr('aria-expanded', 'false');
			this.waitThenFocus(this.$ccButton);
		}
		if (this.prefsPopup && this.prefsPopup.is(':visible') && !this.hidingPopup) {
			this.hidingPopup = true; 
			this.prefsPopup.hide();
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$prefsButton.attr('aria-expanded', 'false');
			if (!this.showingPrefsDialog) {
				this.waitThenFocus(thisObj.$prefsButton);
			}
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		}
		if (this.$volumeSlider && this.$volumeSlider.is(':visible')) {
			this.$volumeSlider.hide().attr('aria-hidden','true');
			this.$volumeButton.attr('aria-expanded', 'false').trigger('focus');
		}
		if (this.$transcriptPopup && this.$transcriptPopup.is(':visible')) {
			this.hidingPopup = true;
			this.$transcriptPopup.hide();
			this.$transcriptPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$transcriptPopupButton.attr('aria-expanded','false').trigger('focus');
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		}
		if (this.$signPopup && this.$signPopup.is(':visible')) {
			this.$signPopup.hide();
			this.$signPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			this.$signPopupButton.attr('aria-expanded','false').trigger('focus');
		}
	};

	AblePlayer.prototype.setupPopups = function (which) {

		var popups, thisObj, i,	tracks;

		popups = [];
		if (typeof which === 'undefined') {
			popups.push('prefs');
		}

		if (which === 'captions' || (typeof which === 'undefined')) {
			if (this.captions.length > 0) {
				popups.push('captions');
			}
		}
		if (which === 'chapters' || (typeof which === 'undefined')) {
			if (this.chapters.length > 0 && this.useChaptersButton) {
				popups.push('chapters');
			}
		}
		if (which === 'transcript-window' && this.transcriptType === 'popup') {
			popups.push('transcript-window');
		}
		if (which === 'sign-window' && this.hasSignLanguage) {
			popups.push('sign-window');
		}
		if (popups.length > 0) {
			thisObj = this;
			for (var i=0; i<popups.length; i++) {
				var popup = popups[i];
				if (popup == 'prefs') {
					this.prefsPopup = this.createPopup('prefs');
				} else if (popup == 'captions') {
					if (typeof this.captionsPopup === 'undefined' || !this.captionsPopup) {
						this.captionsPopup = this.createPopup('captions',this.captions);
					}
				} else if (popup == 'chapters') {
					if (this.selectedChapters) {
						tracks = this.selectedChapters.cues;
					} else if (this.chapters.length >= 1) {
						tracks = this.chapters[0].cues;
					} else {
						tracks = [];
					}
					if (typeof this.chaptersPopup === 'undefined' || !this.chaptersPopup) {
						this.chaptersPopup = this.createPopup('chapters',tracks);
					}
				} else if (popup == 'transcript-window') {
					return this.createPopup('transcript-window');
				} else if (popup == 'sign-window') {
					return this.createPopup('sign-window');
				}
			}
		}
	};

	AblePlayer.prototype.provideFallback = function() {


		var i, $fallback;

		if (this.usingFallback) {
			return;
		} else {
			this.usingFallback = true;
		}

		if (!this.testFallback) {
			this.testFallback = 1;
		}

		if (typeof this.$media === 'undefined') {
			this.$media = $(this.media);
		}

		if (this.$media.attr('id')) {
			this.mediaId = this.$media.attr('id');
		} else {
			this.mediaId = 'media' + Math.floor(Math.random() * 1000000000).toString();
		}

		this.hasFallback = false;
		if (this.$media.children().length) {
			i = 0;
			while (i < this.$media.children().length && !this.hasFallback) {
				if (!(this.$media.children()[i].tagName === 'SOURCE' ||
					this.$media.children()[i].tagName === 'TRACK')) {
					this.hasFallback = true;
				}
				i++;
			}
		}
		if (!this.hasFallback) {
			$fallback = $('<p>').text('Media player unavailable.');
			this.$media.append($fallback);
		}

		if (this.$media.attr('width')) {
			this.$media.css('width',this.$media.attr('width') + 'px');
		}
		if (this.$media.attr('height')) {
			this.$media.css('height',this.$media.attr('height') + 'px');
		}
		this.$media.removeAttr('data-able-player');

		this.$media.prop('controls',true);

		if (this.testFallback == 2) {

			$(this.$media).replaceWith($('<foobar id="foobar-' + this.mediaId + '">'));
			this.$newFallbackElement = $('#foobar-' + this.mediaId);

			if (this.$media.children().length) {
				i = this.$media.children().length - 1;
				while (i >= 0) {
					this.$newFallbackElement.prepend($(this.$media.children()[i]));
					i--;
				}
			}
			if (!this.hasFallback) {
				this.$newFallbackElement.append($fallback);
			}
		}
		return;
	};

	AblePlayer.prototype.calculateControlLayout = function () {


		var controlLayout, playbackSupported, numA11yButtons;

		controlLayout = [];
		controlLayout[0] = [];
		controlLayout[1] = [];
		if (this.skin === 'legacy') {
			controlLayout[2] = [];
			controlLayout[3] = [];
		}

		controlLayout[0].push('play');
		controlLayout[0].push('restart');
		controlLayout[0].push('rewind');
		controlLayout[0].push('forward');

		if (this.skin === 'legacy') {
			controlLayout[1].push('seek');
		}

		if (this.hasPlaylist) {
			if (this.skin === 'legacy') {
				controlLayout[0].push('previous');
				controlLayout[0].push('next');
			} else {
				controlLayout[0].push('previous');
				controlLayout[0].push('next');
			}
		}

		if (this.isPlaybackRateSupported()) {
			playbackSupported = true;
			if (this.skin === 'legacy') {
				controlLayout[2].push('slower');
				controlLayout[2].push('faster');
			}
		} else {
			playbackSupported = false;
		}

		numA11yButtons = 0;
		if (this.hasCaptions) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('captions');
			} else {
				controlLayout[1].push('captions');
			}
		}
		if (this.hasSignLanguage) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('sign');
			} else {
				controlLayout[1].push('sign');
			}
		}
		if (this.mediaType === 'video') {
			if (this.hasOpenDesc || this.hasClosedDesc) {
				numA11yButtons++;
				if (this.skin === 'legacy') {
					controlLayout[2].push('descriptions');
				} else {
					controlLayout[1].push('descriptions');
				}
			}
		}
		if (this.transcriptType !== null && !(this.hideTranscriptButton)) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('transcript');
			} else {
				controlLayout[1].push('transcript');
			}
		}
		if (this.hasChapters && this.useChaptersButton) {
			numA11yButtons++;
			if (this.skin === 'legacy') {
				controlLayout[2].push('chapters');
			} else {
				controlLayout[1].push('chapters');
			}
		}

		if (this.skin == '2020' && numA11yButtons > 0) {
			controlLayout[1].push('pipe');
		}

		if (playbackSupported && this.skin === '2020') {
			controlLayout[1].push('faster');
			controlLayout[1].push('slower');
			controlLayout[1].push('pipe');
		}

		if (this.skin === 'legacy') {
			controlLayout[3].push('preferences');
		} else {
			controlLayout[1].push('preferences');
		}

		if (this.mediaType === 'video' && this.allowFullscreen && this.nativeFullscreenSupported() ) {
			if (this.skin === 'legacy') {
				controlLayout[3].push('fullscreen');
			} else {
				controlLayout[1].push('fullscreen');
			}
		}

		if (this.browserSupportsVolume()) {
			this.volumeButton = 'volume-' + this.getVolumeName(this.volume);
			if (this.skin === 'legacy') {
				controlLayout[1].push('volume');
			} else {
				controlLayout[1].push('volume');
			}
		} else {
			this.volume = false;
		}
		return controlLayout;
	};

	AblePlayer.prototype.addControls = function() {


		var thisObj, baseSliderWidth, controlLayout, numSections,
		i, j, controls, $controllerSpan, $sliderDiv, sliderLabel, $pipe, control,
		buttonTitle, $newButton, buttonText, position, buttonHeight,
		buttonWidth, buttonSide, controllerWidth, tooltipId, tooltipY, tooltipX,
		tooltipWidth, tooltipStyle, tooltip, tooltipTimerId, captionLabel, popupMenuId;

		thisObj = this;

		baseSliderWidth = 100; 

		controlLayout = this.calculateControlLayout();
		numSections = controlLayout.length;

		tooltipId = this.mediaId + '-tooltip';
		this.$tooltipDiv = $('<div>',{
			'id': tooltipId,
			'class': 'able-tooltip'
		}).hide();
		this.$controllerDiv.append(this.$tooltipDiv);

		if (this.skin == '2020') {
			$sliderDiv = $('<div class="able-seekbar"></div>');
			sliderLabel = this.mediaType + ' ' + this.translate( 'seekbarLabel', 'timeline' );
			this.$controllerDiv.append($sliderDiv);
			this.seekBar = new AccessibleSlider($sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
		}

		let $controlRow = $('<div class="able-control-row"></div>');
		this.$controllerDiv.append($controlRow);

		for (i = 0; i < numSections; i++) {
			controls = controlLayout[i];
			if ((i % 2) === 0) { 
				$controllerSpan = $('<div>',{
					'class': 'able-left-controls'
				});
			} else { 
				$controllerSpan = $('<div>',{
					'class': 'able-right-controls'
				});
			}
			$controlRow.append($controllerSpan);

			for (j=0; j<controls.length; j++) {
				control = controls[j];
				if (control === 'seek') {
					$sliderDiv = $('<div class="able-seekbar"></div>');
					sliderLabel = this.mediaType + ' ' + this.translate( 'seekbarLabel', 'timeline' );
					$controllerSpan.append($sliderDiv);
					if (typeof this.duration === 'undefined' || this.duration === 0) {
						this.duration = 60;
						this.elapsed = 0;
					}
					this.seekBar = new AccessibleSlider($sliderDiv, 'horizontal', baseSliderWidth, 0, this.duration, this.seekInterval, sliderLabel, 'seekbar', true, 'visible');
				} else if (control === 'pipe') {
					$pipe = $('<span>', {
						'tabindex': '-1',
						'aria-hidden': 'true',
						'class': 'able-pipe',
					});
					$pipe.append('|');
					$controllerSpan.append($pipe);
				} else {
					buttonTitle = this.getButtonTitle(control);


					$newButton = $('<div>',{
						'role': 'button',
						'tabindex': '0',
						'class': 'able-button-handler-' + control
					});

					if (control === 'volume' || control === 'preferences' || control === 'captions') {
						if (control == 'preferences') {
							this.prefCats = this.getPreferencesGroups();
							if (this.prefCats.length > 1) {
								popupMenuId = this.mediaId + '-prefs-menu';
								$newButton.attr({
									'aria-controls': popupMenuId,
									'aria-haspopup': 'menu',
									'aria-expanded': 'false'
								});
							} else if (this.prefCats.length === 1) {
								$newButton.attr({
									'aria-haspopup': 'dialog'
								});
							}
						} else if (control === 'volume') {
							popupMenuId = this.mediaId + '-volume-slider';
							$newButton.attr({
								'aria-controls': popupMenuId,
								'aria-expanded': 'false'
							});
						} else if (control === 'captions' && this.captions) {
							if (this.captions.length > 1) {
								$newButton.attr('aria-expanded', 'false')
							} else {
								$newButton.attr('aria-pressed', 'false')
							}
						}
					}
					var getControl = control;
					if ( control === 'faster' && this.speedIcons === 'animals' ) {
						getControl = 'rabbit';
					}
					if ( control === 'slower' && this.speedIcons === 'animals' ) {
						getControl = 'turtle';
					}
					if ( control === 'volume' ) {
						this.getIcon( $newButton, this.volumeButton );
					} else {
						if ( 'fullscreen' === getControl ) {
							getControl = ( this.fullscreen ) ? 'fullscreen-collapse' : 'fullscreen-expand';
						}
						this.getIcon( $newButton, getControl );
					}

					this.setText($newButton,buttonTitle);
					$newButton.on('mouseenter focus',function(e) {

						clearTimeout(tooltipTimerId);

						buttonText = $(this).attr('aria-label');
						position = $(this).position();
						buttonHeight = $(this).height();
						buttonWidth = $(this).width();
						controllerWidth = thisObj.$controllerDiv.width();
						position.right = controllerWidth - position.left - buttonWidth;

						tooltipY = position.top + buttonHeight + 5;

						if ($(this).parent().hasClass('able-right-controls')) {
							buttonSide = 'right';
						} else {
							buttonSide = 'left';
						}
						tooltipWidth = AblePlayer.localGetElementById($newButton[0], tooltipId).text(buttonText).width();
						if (buttonSide == 'left') {
							tooltipX = position.left - tooltipWidth/2;
							if (tooltipX < 0) {
								tooltipX = 2;
							}
							tooltipStyle = {
								left: tooltipX + 'px',
								right: '',
								top: tooltipY + 'px'
							};
						} else {
							tooltipX = position.right - tooltipWidth/2;
							if (tooltipX < 0) {
								tooltipX = 2;
							}
							tooltipStyle = {
								left: '',
								right: tooltipX + 'px',
								top: tooltipY + 'px'
							};
						}
						tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(buttonText).css(tooltipStyle);
						thisObj.showTooltip(tooltip);
						$(this).on('mouseleave blur',function() {


							clearTimeout(tooltipTimerId);
							tooltipTimerId = setTimeout(function() {
								AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
							}, 500);

							thisObj.$tooltipDiv.on('mouseenter focus', function() {
								clearTimeout(tooltipTimerId);
							});

							thisObj.$tooltipDiv.on('mouseleave blur', function() {
								AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
							});

						});
					});

					if (control === 'captions') {
						if (!this.prefCaptions || this.prefCaptions !== 1) {
							if (this.captions.length > 1) {
								captionLabel = this.translate( 'captions', 'Captions' );
							} else {
								captionLabel = this.translate( 'showCaptions', 'Show captions' );
							}
							$newButton.addClass('buttonOff').attr('title',captionLabel);
							$newButton.attr('aria-pressed', 'false');
						}
					} else if (control === 'descriptions') {
						if (!this.prefDesc || this.prefDesc !== 1) {
							$newButton.addClass('buttonOff').attr( 'title', this.translate( 'turnOnDescriptions', 'Turn on descriptions' ) );
						}
					}

					$controllerSpan.append($newButton);

					if (control === 'play') {
						this.$playpauseButton = $newButton;
					} else if (control == 'previous') {
						this.$prevButton = $newButton;
						if (this.buttonWithFocus == 'previous') {
							this.$prevButton.trigger('focus');
							this.buttonWithFocus = null;
						}
					} else if (control == 'next') {
						this.$nextButton = $newButton;
						if (this.buttonWithFocus == 'next') {
							this.$nextButton.trigger('focus');
							this.buttonWithFocus = null;
						}
					} else if (control === 'captions') {
						this.$ccButton = $newButton;
					} else if (control === 'sign') {
						this.$signButton = $newButton;
						if (!(this.$signWindow.is(':visible'))) {
							this.$signButton.addClass('buttonOff');
						}
					} else if (control === 'descriptions') {
						this.$descButton = $newButton;
					} else if (control === 'mute') {
						this.$muteButton = $newButton;
					} else if (control === 'transcript') {
						this.$transcriptButton = $newButton;
						if (!(this.$transcriptDiv.is(':visible'))) {
							this.$transcriptButton.addClass('buttonOff').attr( 'title', this.translate( 'showTranscript', 'Show transcript' ) );
						}
					} else if (control === 'fullscreen') {
						this.$fullscreenButton = $newButton;
					} else if (control === 'chapters') {
						this.$chaptersButton = $newButton;
					} else if (control === 'preferences') {
						this.$prefsButton = $newButton;
					} else if (control === 'volume') {
						this.$volumeButton = $newButton;
					}
				}
				if (control === 'volume') {
					this.addVolumeSlider($controllerSpan);
				}
			}
			if ((i % 2) == 1) {
				this.$controllerDiv.append('<div style="clear:both;"></div>');
			}
		}

		if (typeof this.$captionsDiv !== 'undefined') {
			this.stylizeCaptions(this.$captionsDiv);
		}
		if (typeof this.$descDiv !== 'undefined') {
			this.stylizeCaptions(this.$descDiv);
		}

		this.controls = [];
		for (var sec in controlLayout) if (controlLayout.hasOwnProperty(sec)) {
			this.controls = this.controls.concat(controlLayout[sec]);
		}

		this.refreshControls();
	};

	AblePlayer.prototype.cuePlaylistItem = function(sourceIndex) {


		var $newItem, prevPlayer, newPlayer, itemTitle, itemLang, nowPlayingSpan;

		var thisObj = this;

		prevPlayer = this.player;

		if (this.initializing) { 
		} else {
			if (this.playerCreated) {
				this.deletePlayer('playlist');
			}
		}

		this.swappingSrc = true;

		if (this.startedPlaying) {
			this.okToPlay = true;
		} else {
			this.okToPlay = false;
		}

		this.loadingMedia = false;

		$newItem = this.$playlist.eq(sourceIndex);
		if (this.hasAttr($newItem,'data-youtube-id')) {
			this.youTubeId = this.getYouTubeId($newItem.attr('data-youtube-id'));
			if (this.hasAttr($newItem,'data-youtube-desc-id')) {
				this.youTubeDescId = this.getYouTubeId($newItem.attr('data-youtube-desc-id'));
			}
			newPlayer = 'youtube';
		} else if (this.hasAttr($newItem,'data-vimeo-id')) {
			this.vimeoId = this.getVimeoId($newItem.attr('data-vimeo-id'));
			if (this.hasAttr($newItem,'data-vimeo-desc-id')) {
				this.vimeoDescId = this.getVimeoId($newItem.attr('data-vimeo-desc-id'));
			}
			newPlayer = 'vimeo';
		} else {
			newPlayer = 'html5';
		}
		if (newPlayer === 'youtube') {
			if (prevPlayer === 'html5') {
				if (this.playing) {
					this.pauseMedia();
				}
				this.$media.hide();
			}
		} else {
			this.youTubeId = false;
			if (prevPlayer === 'youtube') {
				this.$media.show();
			}
		}
		this.player = newPlayer;

		this.$media.empty();

		if (this.hasAttr($newItem,'data-poster')) {
			this.$media.attr('poster',$newItem.attr('data-poster'));
		}
		if (this.hasAttr($newItem,'data-youtube-desc-id')) {
			this.$media.attr('data-youtube-desc-id',$newItem.attr('data-youtube-desc-id'));
		}
		if (this.youTubeId) {
			this.$media.attr('data-youtube-id',$newItem.attr('data-youtube-id'));
		}

		var $sourceSpans = $newItem.children('span.able-source');
		if ($sourceSpans.length) {
			$sourceSpans.each(function() {
				const $this = $(this);

				if (thisObj.hasAttr($this, "data-src")) {
					const sanitizedSrc = DOMPurify.sanitize($this.attr("data-src"));

					if (validate.isProtocolSafe(sanitizedSrc)) {
						const $newSource = $("<source>", { src: sanitizedSrc });

						const optionalAttributes = [
							"data-type",
							"data-desc-src",
							"data-sign-src",
						];

						optionalAttributes.forEach((attr) => {
							if (thisObj.hasAttr($this, attr)) {
								const attrValue = $this.attr(attr); 
								const sanitizedValue = DOMPurify.sanitize(attrValue); 

								if (attr.endsWith("-src") && validate.isProtocolSafe(sanitizedValue)) {
									$newSource.attr(attr, sanitizedValue); 
								} else if (!attr.endsWith("-src")) {
									$newSource.attr(attr, sanitizedValue); 
								}
							}
             			});

						thisObj.$media.append($newSource);
					}
				}
			});
		}

		var $trackSpans = $newItem.children('span.able-track');
		if ($trackSpans.length) {
			$trackSpans.each(function() {
				const $this = $(this);
				if (thisObj.hasAttr($this, "data-src") && thisObj.hasAttr($this, "data-kind") && thisObj.hasAttr($this, "data-srclang")) {
					const sanitizedSrc = DOMPurify.sanitize($this.attr("data-src"));
					if (validate.isProtocolSafe(sanitizedSrc)) {
						const $newTrack = $("<track>", {
							src: sanitizedSrc,
							kind: $this.attr("data-kind"),
							srclang: $this.attr("data-srclang"),
						});
						const optionalAttributes = [
							"data-label",
							"data-desc",
							"data-default",
						];
						optionalAttributes.forEach((attr) => {
							if (thisObj.hasAttr($this, attr)) {
								$newTrack.attr(attr, DOMPurify.sanitize($this.attr(attr)));
							}
						});
						thisObj.$media.append($newTrack);
					}
				}
			});
		}

		itemTitle = DOMPurify.sanitize( $newItem.text() );
		if (this.hasAttr($newItem,'lang')) {
			itemLang = $newItem.attr('lang');
		}
		this.$sources = this.$media.find('source');

		if (this.recreatingPlayer) {
			return;
		}
		this.recreatePlayer().then(function() {

			thisObj.$playlist.removeClass('able-current')
				.children('button').removeAttr('aria-current');
			thisObj.$playlist.eq(sourceIndex).addClass('able-current')
				.children('button').attr('aria-current','true');

			if (thisObj.showNowPlaying === true) {
				if (typeof thisObj.$nowPlayingDiv !== 'undefined') {
					nowPlayingSpan = $('<span>');
					if (typeof itemLang !== 'undefined') {
						nowPlayingSpan.attr('lang',itemLang);
					}
					nowPlayingSpan.html('<span>' + thisObj.tt.selectedTrack + ':</span>' + itemTitle);
					thisObj.$nowPlayingDiv.html(nowPlayingSpan);
				}
			}

			if (thisObj.initializing) { 
				thisObj.swappingSrc = false;
			} else {
				if (thisObj.player === 'html5') {
					if (!thisObj.loadingMedia) {
						thisObj.media.load();
						thisObj.loadingMedia = true;
					}
				} else if (thisObj.player === 'youtube') {
					thisObj.okToPlay = true;
				}
			}
			thisObj.initializing = false;
			thisObj.playerCreated = true; 
		});
	};

	AblePlayer.prototype.deletePlayer = function(context) {



		if (this.player === 'youtube' && this.youTubePlayer) {
			this.youTubePlayer.destroy();
		}

		if (this.player === 'vimeo' && this.vimeoPlayer) {
			this.vimeoPlayer.destroy();
		}

		this.$controllerDiv.empty();
		this.$elapsedTimeContainer.empty().text('0:00'); 
		this.$durationContainer.empty(); 

		if (this.$signWindow) {
				this.$signWindow.remove();
		}
		if (this.$transcriptArea) {
				this.$transcriptArea.remove();
		}
		$('.able-modal-dialog').remove();

		if (this.$captionsWrapper) {
			this.$captionsWrapper.remove();
		}
		if (this.$descDiv) {
			this.$descDiv.remove();
		}

		this.hasCaptions = false;
		this.hasChapters = false;
		this.hasDescTracks = false;
		this.hasOpenDesc = false;
		this.hasClosedDesc = false;

		this.captionsPopup = null;
		this.chaptersPopup = null;
		this.transcriptType = null;

		this.playerDeleted = true; 
	};

	AblePlayer.prototype.getButtonTitle = function(control) {

		if (control === 'playpause') {
			return this.translate( 'play', 'Play' );
		} else if (control === 'play') {
			return this.translate( 'play', 'Play' );
		} else if (control === 'pause') {
			return this.translate( 'pause', 'Pause' );
		} else if (control === 'restart') {
			return this.translate( 'restart', 'Restart' );
		} else if (control === 'previous') {
			return this.translate( 'prevTrack', 'Previous track' );
		} else if (control === 'next') {
			return this.translate( 'nextTrack', 'Next track' );
		} else if (control === 'rewind') {
			return this.translate( 'rewind', 'Rewind' );
		} else if (control === 'forward') {
			return this.translate( 'forward', 'Forward' );
		} else if (control === 'captions') {
			if (this.captions.length > 1) {
				return this.translate( 'captions', 'Captions' );
			} else {
				return (this.captionsOn) ? this.translate( 'hideCaptions', 'Hide captions' ) : this.translate( 'showCaptions', 'Show captions' );
			}
		} else if (control === 'descriptions') {
			return (this.descOn) ? this.translate( 'turnOffDescriptions', 'Turn off descriptions' ) : this.translate( 'turnOnDescriptions', 'Turn on descriptions' );
		} else if (control === 'transcript') {
			return (this.$transcriptDiv.is(':visible')) ? this.translate( 'hideTranscript', 'Hide transcript' ) : this.translate( 'showTranscript', 'Show transcript' );
		} else if (control === 'chapters') {
			return this.translate( 'chapters', 'Chapters' );
		} else if (control === 'sign') {
			return this.translate( 'sign', 'Sign language' );
		} else if (control === 'volume') {
			return this.translate( 'volume', 'Volume' );
		} else if (control === 'faster') {
			return this.translate( 'faster', 'Faster' );
		} else if (control === 'slower') {
			return this.translate( 'slower', 'Slower' );
		} else if (control === 'preferences') {
			return this.translate( 'preferences', 'Preferences' );
		} else if (control === 'fullscreen') {
			return ( !this.fullscreen ) ? this.translate( 'enterFullScreen', 'Enter full screen' ) : this.translate( 'exitFullScreen', 'Exit full screen' );
		} else {
			if (this.debug) {

							}
			return this.capitalizeFirstLetter( control );
		}
	};
})(jQuery);


var preProcessing = {
  transformCSSClasses: function (vttContent) {
	if ( vttContent.length > 1000 ) {
		throw new Error( "Input too long" );
	}
    return vttContent.replace(
      /<(v|c|b|i|u|lang|ruby)\.([\w\.]+)([^>]*)>/g,
      function (_, tag, cssClasses, otherAttrs) {
        var classAttr = cssClasses.replace(/\./g, " ");
        return `<${tag} class="${classAttr}"${otherAttrs}>`;
      }
    );
  },

  transformLangTags: function (content) {
    return content.replace(
      /<lang\s+([\w-]+)([^>]*)>/g,
      function (_, langCode, otherAttrs) {
        return '<lang lang="' + langCode + '"' + otherAttrs + ">";
      }
    );
  },

  transformVTags: function (content) {
    return content.replace(/<v\s+([^>]*?)>/g, function (_, tagAttributes) {
      var classMatch = tagAttributes.match(/class="([^"]*)"/);
      var classAttr = classMatch ? classMatch[0] : "";
      var nonClassAttributes = tagAttributes
        .replace(/class="[^"]*"/, "")
        .trim()
        .split(/\s+/);

      var attributes = [];
      var titleParts = [];

      nonClassAttributes.forEach(function (token) {
        if (token.indexOf("=") !== -1) {
          attributes.push(token);
        } else {
          titleParts.push(token);
        }
      });

      var title = titleParts.join(" ");
      var newTag = "<v";

      if (title) {
        newTag += ' title="' + title + '"';
      }

      if (attributes.length > 0) {
        newTag += " " + attributes.join(" ");
      }

      if (classAttr) {
        newTag += " " + classAttr;
      }

      newTag += ">";
      return newTag;
    });
  },
};

var postProcessing = {
  postprocessCTag: function (vttContent) {
    return vttContent.replace(
      /<c class="([\w\s]+)">/g,
      function (_, classNames) {
        var classes = classNames.replace(/ /g, ".");
        return "<c." + classes + ">";
      }
    );
  },

  postprocessVTag: function (vttContent) {
    return vttContent.replace(
      /<v([^>]*)class="([\w\s]+)"([^>]*)>/g,
      function (_, beforeClass, classNames, afterClass) {
        var classes = classNames.trim().split(/\s+/).join(".");
        var attrs = (beforeClass + afterClass)
          .replace(/\s*class="[\w\s]+"/, "")
          .trim();
        return "<v." + classes + (attrs ? " " + attrs : "") + ">";
      }
    );
  },

  postprocessLangTag: function (vttContent) {
    return vttContent.replace(
      /<lang lang="([\w-]+)"([^>]*)>/g,
      function (_, langCode, otherAttrs) {
        return "<lang " + langCode + otherAttrs + ">";
      }
    );
  },
};

var validate = {
  preProcessVttContent: function (vttContent) {
    var processedCSS = preProcessing.transformCSSClasses(vttContent);
    var processedLang = preProcessing.transformLangTags(processedCSS);
    var processedVTags = preProcessing.transformVTags(processedLang);
    return processedVTags;
  },

  postProcessVttContent: function (sanitizedVttContent, originalVttContent) {
    var processedCTags = postProcessing.postprocessCTag(sanitizedVttContent);
    var processedVTags = postProcessing.postprocessVTag(processedCTags);
    var processedLangTags = postProcessing.postprocessLangTag(processedVTags);

    var arrowReplaced = processedLangTags.replace(/--&gt;/g, "-->");
    var timestampTagReplaced = arrowReplaced.replace(/&lt;([\d:.]+)&gt;/g, '<$1>');

    var finalContent = timestampTagReplaced.replace(
      /<\/v>/g,
      function (match, offset) {
        return originalVttContent.indexOf(match, offset) !== -1 ? match : "";
      }
    );

    return finalContent;
  },

  sanitizeVttContent: function (vttContent) {
    if (vttContent === null || vttContent === undefined) {
      return "";
    }
    var preSanitizedVttContent = validate.preProcessVttContent(vttContent);

    var config = {
      ALLOWED_TAGS: ["b", "i", "u", "v", "c", "lang", "ruby", "rt", "rp"],
      ALLOWED_ATTR: ["title", "class", "lang"],
      KEEP_CONTENT: true,
    };

    var sanitizedVttContent = DOMPurify.sanitize(
      preSanitizedVttContent,
      config
    );

    return validate.postProcessVttContent(sanitizedVttContent, vttContent);
  },
  isProtocolSafe: function (url) {
    try {
      const parsedUrl = new URL(url, window.location.origin); 
      return ["http:", "https:"].includes(parsedUrl.protocol); 
    } catch (e) {
      return false; 
    }
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = validate;
}

(function ($) {

  AblePlayer.prototype.setupTracks = function () {
    var thisObj, deferred, promise, loadingPromises, loadingPromise, i, tracks, track, kind;

    thisObj = this;

    deferred = new this.defer();
    promise = deferred.promise();

    loadingPromises = [];

    if ($("#able-vts").length) {
      this.vtsTracks = [];
      this.hasVts = true;
    } else {
      this.hasVts = false;
    }

    if (this.hasDescTracks && this.descOn) {
      tracks = this.altTracks;
    } else {
      tracks = this.tracks;
    }
    for (i = 0; i < tracks.length; i++) {
      track = tracks[i];
      kind = ( track.kind ) ? track.kind : 'subtitles';

      if (!track.src) {
        if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
          thisObj.setupCaptions(track);
        }
        continue;
      }
	  var trackSrc = track.src;
      loadingPromise = this.loadTextObject(trackSrc);
      loadingPromises.push(
        loadingPromise.catch(function (src) {

                  })
      );
      loadingPromise.then(
        (function (track, kind) {
          trackSrc = track.src;
          var trackLang = track.language;
          var trackLabel = track.label;
          var trackDesc = track.desc;

          return function (data) {
            var cues = thisObj.parseWebVTT(data).cues;
            if (thisObj.hasVts) {
              thisObj.setupVtsTracks(
                kind,
                trackLang,
                trackDesc,
                trackLabel,
                trackSrc,
                data.text
              );
            }
            if (kind === 'captions' || kind === 'subtitles') {
              thisObj.setupCaptions(track, cues);
            } else if (kind === 'descriptions') {
              thisObj.setupDescriptions(track, cues);
            } else if (kind === 'chapters') {
              thisObj.setupChapters(track, cues);
            } else if (kind === 'metadata') {
              thisObj.setupMetadata(cues);
            }
          };
        })(track, kind)
      );
    }
    if (thisObj.usingYouTubeCaptions || thisObj.usingVimeoCaptions) {
      deferred.resolve();
    } else {
      $.when.apply($, loadingPromises).then(function () {
        deferred.resolve();
      });
    }
    return promise;
  };

  AblePlayer.prototype.getTracks = function () {

    var thisObj, deferred, promise, trackLang, trackLabel, isDefault, forDesc,
	hasDefault, hasTrackInDefLang, trackFound, i;

    thisObj = this;
    hasDefault = false;

    deferred = new this.defer();
    promise = deferred.promise();

    this.$tracks = this.$media.find('track');
    this.tracks = []; 
    this.altTracks = []; 

    this.captions = [];
    this.descriptions = [];
    this.chapters = [];
    this.meta = [];

    this.hasCaptionsTrack = false; 
    this.hasDescTracks = false; 

    if (this.$tracks.length) {
      this.usingYouTubeCaptions = false;
      this.$tracks.each(function (index, element) {
        if ($(this).attr('kind') === 'captions') {
          thisObj.hasCaptionsTrack = true;
        } else if ($(this).attr('kind') === 'descriptions') {
          thisObj.hasClosedDesc = true;
        }

        if ($(this).attr('srclang')) {
          trackLang = $(this).attr('srclang');
        } else {
          trackLang = thisObj.lang;
        }
        if ($(this).attr('label')) {
          trackLabel = $(this).attr('label');
        } else {
          trackLabel = thisObj.getLanguageName(trackLang);
        }

        if (typeof $(this).attr('default') !== 'undefined' && !hasDefault) {
          isDefault = true;
          hasDefault = true;
        } else if (trackLang === thisObj.lang) {
          hasTrackInDefLang = true;
          isDefault = false; 
        } else {
          isDefault = false;
        }
        if (isDefault) {
          thisObj.captionLang = trackLang;
        }

        if ($(this).data("desc") !== undefined) {
          forDesc = true;
          thisObj.hasDescTracks = true;
        } else {
          forDesc = false;
        }
        if (forDesc) {
          thisObj.altTracks.push({
            kind: $(this).attr('kind'),
            src: $(this).attr('src'),
            language: trackLang,
            label: trackLabel,
            def: isDefault,
            desc: forDesc,
          });
        } else {
          thisObj.tracks.push({
            kind: $(this).attr('kind'),
            src: $(this).attr('src'),
            language: trackLang,
            label: trackLabel,
            def: isDefault,
            desc: forDesc,
          });
        }

        if (index == thisObj.$tracks.length - 1) {
          if (!hasDefault) {
            if (hasTrackInDefLang) {
              thisObj.captionLang = thisObj.lang;
              trackFound = false;
              i = 0;
              while (i < thisObj.tracks.length && !trackFound) {
                if (thisObj.tracks[i]['language'] === thisObj.lang) {
                  thisObj.tracks[i]['def'] = true;
                  trackFound = true;
                }
                i++;
              }
            } else {
              thisObj.tracks[0]['def'] = true;
              thisObj.captionLang = thisObj.tracks[0]['language'];
            }
          }
          thisObj.$media.find("track").removeAttr("default");
        }
      });
    }
    if (!this.$tracks.length || !this.hasCaptionsTrack) {
      if (this.player === 'youtube') {
        this.getYouTubeCaptionTracks().then(function () {
          if (thisObj.hasCaptions) {
            thisObj.usingYouTubeCaptions = true;
            if (thisObj.$captionsWrapper) {
              thisObj.$captionsWrapper.remove();
            }
          }
          deferred.resolve();
        });
      } else if (this.player === 'vimeo') {
        this.getVimeoCaptionTracks().then(function () {
          if (thisObj.hasCaptions) {
            thisObj.usingVimeoCaptions = true;
            if (thisObj.$captionsWrapper) {
              thisObj.$captionsWrapper.remove();
            }
          }
          deferred.resolve();
        });
      } else {
        this.hasCaptions = false;
        if (thisObj.$captionsWrapper) {
          thisObj.$captionsWrapper.remove();
        }
        deferred.resolve();
      }
    } else {
      deferred.resolve();
    }
    return promise;
  };

  AblePlayer.prototype.setupCaptions = function (track, cues) {
    var inserted, i, capLabel;

    if (typeof cues === "undefined") {
      cues = null;
    }

    if (this.usingYouTubeCaptions || this.usingVimeoCaptions) {
    } else {
      if (this.captions.length === 0) {
        this.captions.push({
          language: track.language,
          label: track.label,
          def: track.def,
          cues: cues,
        });
      } else {
        inserted = false;
        for (i = 0; i < this.captions.length; i++) {
          capLabel = track.label;
          if (capLabel.toLowerCase() < this.captions[i].label.toLowerCase()) {
            this.captions.splice(i, 0, {
              language: track.language,
              label: track.label,
              def: track.def,
              cues: cues,
            });
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          this.captions.push({
            language: track.language,
            label: track.label,
            def: track.def,
            cues: cues,
          });
        }
      }
    }

    this.hasCaptions = true;
    this.currentCaption = -1;
    if (this.prefCaptions === 1) {
      this.captionsOn = true;
    } else if (this.prefCaptions === 0) {
      this.captionsOn = false;
    } else {
      if (this.defaultStateCaptions === 1) {
        this.captionsOn = true;
      } else {
        this.captionsOn = false;
      }
    }
    if (this.mediaType === 'audio' && this.captionsOn) {
      this.$captionsContainer.removeClass('captions-off');
    }

    if (
      !this.$captionsWrapper ||
      (this.$captionsWrapper &&
        !$.contains(this.$ableDiv[0], this.$captionsWrapper[0]))
    ) {
      this.$captionsDiv = $('<div>', {
        class: "able-captions",
      });
      this.$captionsWrapper = $('<div>', {
        class: 'able-captions-wrapper',
        'aria-hidden': 'true',
      }).hide();
      if (this.prefCaptionsPosition === 'below') {
        this.$captionsWrapper.addClass('able-captions-below');
      } else {
        this.$captionsWrapper.addClass('able-captions-overlay');
      }
      this.$captionsWrapper.append(this.$captionsDiv);
      this.$captionsContainer.append(this.$captionsWrapper);
    }
  };

  AblePlayer.prototype.setupDescriptions = function (track, cues) {

    this.hasClosedDesc = true;
    this.currentDescription = -1;
    this.descriptions.push({
      cues: cues,
      language: track.language,
    });
  };

  AblePlayer.prototype.setupChapters = function (track, cues) {

    this.hasChapters = true;
    this.chapters.push({
      cues: cues,
      language: track.language,
    });
  };

  AblePlayer.prototype.setupMetadata = function (cues) {
    if (this.metaType === 'text') {
      if (this.metaDiv) {
        if ($('#' + this.metaDiv)) {
          this.$metaDiv = $('#' + this.metaDiv);
          this.hasMeta = true;
          this.meta = cues;
        }
      }
    } else if (this.metaType === 'selector') {
      this.hasMeta = true;
      this.visibleSelectors = [];
      this.meta = cues;
    }
  };

  AblePlayer.prototype.loadTextObject = function (src) {
    var deferred, promise, thisObj, $tempDiv;

    deferred = new this.defer();
    promise = deferred.promise();
    thisObj = this;

    $tempDiv = $('<div>', {
      style: 'display:none',
    });

	fetch(src)
		.then( response => {

			return response.text();
  		})
		.then( vtt => {
			var preParsed = vtt.split(/\r?\n\s*\r?\n/);
			var lines = '', line;

			preParsed.forEach((l) => {
				line   = validate.sanitizeVttContent(l);
				lines += line + "\n\n";
			});
			$tempDiv.html(lines);
			let data = { 'src': src, 'text': lines };
			deferred.resolve(data);
			$tempDiv.remove();
		})
		.catch( error => {
			if (thisObj.debug) {

							}
			deferred.reject(src);
			$tempDiv.remove();
		});

    return promise;
  };
})(jQuery);

(function ($) {

	AblePlayer.prototype.initYouTubePlayer = function () {

		var thisObj, deferred, promise, youTubeId;
		thisObj = this;
		deferred = new this.defer();
		promise = deferred.promise();

		this.youTubePlayerReady = false;

		youTubeId = (this.youTubeDescId && this.prefDesc) ? this.youTubeDescId : this.youTubeId;

		this.activeYouTubeId = youTubeId;
		if (AblePlayer.youTubeIframeAPIReady) {
			thisObj.finalizeYoutubeInit().then(function() {
				deferred.resolve();
			});
		} else {
			if (!AblePlayer.loadingYouTubeIframeAPI) {
				thisObj.getScript('https://www.youtube.com/iframe_api', function () {

									});
			}

			$('body').on('youTubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeInit = function () {

		var deferred, promise, thisObj, containerId, ccLoadPolicy, autoplay;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		containerId = this.mediaId + '_youtube';

		this.$mediaContainer.prepend($('<div>').attr('id', containerId));

		ccLoadPolicy = 1;
		autoplay = (this.okToPlay) ? 1 : 0;


		if (typeof this.captionLang == 'undefined') {
			this.captionLang = this.lang;
		}
		this.youTubePlayer = new YT.Player(containerId, {
			videoId: this.activeYouTubeId,
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			playerVars: {
				autoplay: autoplay,
				cc_lang_pref: this.captionLang, 
				cc_load_policy: ccLoadPolicy,
				controls: 0, 
				disableKb: 1, 
				enablejsapi: 1,
				hl: this.lang, 
				iv_load_policy: 3, 
				origin: window.location.origin,
				playsinline: this.playsInline,
				rel: 0, 
				start: this.startTime
			},
			events: {
				onReady: function () {
					thisObj.youTubePlayerReady = true;
					if (!thisObj.playerWidth || !thisObj.playerHeight) {
						thisObj.getYouTubeDimensions();
					}
					if (thisObj.playerWidth && thisObj.playerHeight) {
						thisObj.youTubePlayer.setSize(thisObj.playerWidth,thisObj.playerHeight);
					}
					if (thisObj.swappingSrc) {
						thisObj.swappingSrc = false;
						thisObj.restoreFocus();
						thisObj.cueingPlaylistItem = false;
						if (thisObj.playing || thisObj.okToPlay) {
							thisObj.playMedia();
						}
					}
					if (thisObj.userClickedPlaylist) {
						thisObj.userClickedPlaylist = false; 
					}
					if (thisObj.recreatingPlayer) {
						thisObj.recreatingPlayer = false; 
					}
					deferred.resolve();
				},
				onError: function (x) {
					deferred.reject();
				},
				onStateChange: function (x) {
					thisObj.getPlayerState().then(function(playerState) {
						if (playerState === 'playing') {
							if (thisObj.hasSignLanguage && thisObj.signVideo) {
								thisObj.signVideo.play(true);
							}
							thisObj.playing = true;
							thisObj.startedPlaying = true;
							thisObj.paused = false;
						} else if (playerState == 'ended') {
							thisObj.onMediaComplete();
						} else {
							thisObj.playing = false;
							thisObj.paused = true;
						}
						if (thisObj.stoppingYouTube && playerState === 'paused') {
							if (thisObj.hasSignLanguage && thisObj.signVideo) {
								thisObj.signVideo.pause(true);
							}
							if (typeof thisObj.$posterImg !== 'undefined') {
								thisObj.$posterImg.show();
							}
							thisObj.stoppingYouTube = false;
							thisObj.seeking = false;
							thisObj.playing = false;
							thisObj.paused = true;
						}
					});
					if (thisObj.player === 'youtube' && !thisObj.usingYouTubeCaptions) {
						if (thisObj.youTubePlayer.getOptions('captions')) {
							thisObj.youTubePlayer.unloadModule('captions');
						}
					}
				},
				onApiChange: function() {
					thisObj.duration = thisObj.youTubePlayer.getDuration();
				},
				onPlaybackQualityChange: function () {
				},
			}
		});
		if (!this.hasPlaylist) {
			this.$media.remove();
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubeDimensions = function (youTubeContainerId) {

		var $iframe, width, height;

		$iframe = this.$ableWrapper.find('iframe');
		if (typeof $iframe !== 'undefined') {
			if ($iframe.prop('width')) {
				width = $iframe.prop('width');
				if ($iframe.prop('height')) {
					height = $iframe.prop('height');
					this.resizePlayer(width,height);
				}
			}
		}
	};

	AblePlayer.prototype.getYouTubeCaptionTracks = function () {

		var deferred = new this.defer();
		var promise = deferred.promise();
		var thisObj, ytTracks, i, trackLang, trackLabel, isDefaultTrack, apiTriggered = false;

		thisObj = this;
		if (!this.youTubePlayer.getOption('captions','tracklist') ) {
			this.youTubePlayer.addEventListener('onApiChange',function() {
				apiTriggered = true;
				thisObj.duration = thisObj.youTubePlayer.getDuration();

				if (thisObj.loadingYouTubeCaptions) {
					ytTracks = thisObj.youTubePlayer.getOption('captions','tracklist');
					if ( ! thisObj.okToPlay ) {
						thisObj.youTubePlayer.pauseVideo();
					}
					if (ytTracks && ytTracks.length) {
						for (i=0; i < ytTracks.length; i++) {
							trackLang = ytTracks[i].languageCode;
							trackLabel = ytTracks[i].languageName; 
							isDefaultTrack = false;
							if (typeof thisObj.captionLang !== 'undefined' && (trackLang === thisObj.captionLang) ) {
								isDefaultTrack = true;
							} else if (typeof thisObj.lang !== 'undefined') {
								if (trackLang === thisObj.lang) {
									isDefaultTrack = true;
								}
							}
							thisObj.tracks.push({
								'kind': 'captions',
								'language': trackLang,
								'label': trackLabel,
								'def': isDefaultTrack
							});
							thisObj.captions.push({
								'language': trackLang,
								'label': trackLabel,
								'def': isDefaultTrack,
								'cues': null
							});
						}
						thisObj.hasCaptions = true;
						thisObj.setupPopups('captions');
					} else {
						thisObj.usingYouTubeCaptions = false;
						thisObj.hasCaptions = false;
					}
					thisObj.loadingYouTubeCaptions = false;
					if (thisObj.okToPlay) {
						thisObj.youTubePlayer.playVideo();
					}
				}
				if (thisObj.captionLangPending) {
					thisObj.youTubePlayer.setOption('captions', 'track', {'languageCode': thisObj.captionLangPending});
					thisObj.captionLangPending = null;
				}
				if (typeof thisObj.prefCaptionsSize !== 'undefined') {
					thisObj.youTubePlayer.setOption('captions','fontSize',thisObj.translatePrefs('size',thisObj.prefCaptionsSize,'youtube'));
				}
				deferred.resolve();
			});
			this.loadingYouTubeCaptions = true;
			this.youTubePlayer.playVideo();
			setTimeout(() => {
				if ( ! apiTriggered ) {
					setTimeout(() => {
						thisObj.youTubePlayer.pauseVideo();
						deferred.resolve();
					}, 500);
				}
			},500);
		}
		return promise;
	};

	AblePlayer.prototype.getYouTubePosterUrl = function (youTubeId, width) {

		var url = 'https://img.youtube.com/vi/' + youTubeId;
		if (width == '120') {
			return url + '/default.jpg';
		} else if (width == '320') {
			return url + '/mqdefault.jpg';
		} else if (width == '480') {
			return url + '/hqdefault.jpg';
		} else if (width == '640') {
			return url + '/sddefault.jpg';
		} else if (width == '1280') {
			return url + '/hq720.jpg';
		} else if ( width == '1920' ) {
			return url + '/maxresdefault.jpg';
		}
		return false;
	};

	AblePlayer.prototype.getYouTubeId = function (url) {


		var idStartPos, id;

		if (url.indexOf('youtu') !== -1) {
			url = url.trim();
			idStartPos = url.length - 11;
			id = url.substring(idStartPos);
			return id;
		} else {
			return url;
		}
};

})(jQuery);

(function ($) {



	window.AccessibleSlider = function(div, orientation, length, min, max, bigInterval, label, className, trackingMedia, initialState) {


		var thisObj, coords;

		thisObj = this;

		this.position = 0; 
		this.tracking = false;
		this.trackDevice = null; 
		this.keyTrackPosition = 0;
		this.lastTrackPosition = 0;
		this.nextStep = 1;
		this.inertiaCount = 0;

		this.bodyDiv = $(div);

		if (trackingMedia) {
			this.loadedDiv = $('<div></div>');
			this.playedDiv = $('<div></div>');
		}

		this.seekHead = $('<div>',{
			'aria-orientation': orientation,
			'class': 'able-' + className + '-head'
		});

		if (initialState === 'visible') {
			this.seekHead.attr('tabindex', '0');
		} else {
			this.seekHead.attr('tabindex', '-1');
		}
		this.seekHead.attr({
			'role': 'slider',
			'aria-label': label,
			'aria-valuemin': min,
			'aria-valuemax': max
		});

		this.timeTooltipTimeoutId = null;
		this.overTooltip = false;
		this.timeTooltip = $('<div>');
		this.bodyDiv.append(this.timeTooltip);

		this.timeTooltip.attr('role', 'tooltip');
		this.timeTooltip.addClass('able-tooltip');
		this.timeTooltip.on('mouseenter focus', function(){
			thisObj.overTooltip = true;
			clearInterval(thisObj.timeTooltipTimeoutId);
		});
		this.timeTooltip.on('mouseleave blur', function(){
			thisObj.overTooltip = false;
			$(this).hide();
		});
		this.timeTooltip.hide();

		this.bodyDiv.append(this.loadedDiv);
		this.bodyDiv.append(this.playedDiv);
		this.bodyDiv.append(this.seekHead);

		this.bodyDiv.wrap('<div></div>');
		this.wrapperDiv = this.bodyDiv.parent();

		if (this.skin === 'legacy') {
			if (orientation === 'horizontal') {
				this.wrapperDiv.width(length);
				this.loadedDiv.width(0);
			} else {
				this.wrapperDiv.height(length);
				this.loadedDiv.height(0);
			}
		}
		this.wrapperDiv.addClass('able-' + className + '-wrapper');

		if (trackingMedia) {
			this.loadedDiv.addClass('able-' + className + '-loaded');

			this.playedDiv.width(0);
			this.playedDiv.addClass('able-' + className + '-played');

			this.setDuration(max);
		}

		this.seekHead.on('mouseenter mouseleave mousemove mousedown mouseup focus blur touchstart touchmove touchend', function (e) {

			coords = thisObj.pointerEventToXY(e);

			if (e.type === 'mouseenter' || e.type === 'focus') {
				thisObj.overHead = true;
			} else if (e.type === 'mouseleave' || e.type === 'blur') {
				thisObj.overHead = false;
				if (!thisObj.overBody && thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			} else if (e.type === 'mousemove' || e.type === 'touchmove') {
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.trackHeadAtPageX(coords.x);
				}
			} else if (e.type === 'mousedown' || e.type === 'touchstart') {
				thisObj.startTracking('mouse', thisObj.pageXToPosition(thisObj.seekHead.offset() + (thisObj.seekHead.width() / 2)));
				if (!thisObj.bodyDiv.is(':focus')) {
					thisObj.bodyDiv.focus();
				}
				e.preventDefault();
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			}
			if (e.type !== 'mousemove' && e.type !== 'mousedown' && e.type !== 'mouseup' && e.type !== 'touchstart' && e.type !== 'touchend') {
				thisObj.refreshTooltip();
			}
		});

		this.bodyDiv.on(
			'mouseenter mouseleave mousemove mousedown mouseup keydown keyup touchstart touchmove touchend', function (e) {

			if ( e.button == 2 && e.type == 'mousedown' ) {
				return;
			}
			coords = thisObj.pointerEventToXY(e);
			let keyPressed = e.key;

			if (e.type === 'mouseenter') {
				thisObj.overBody = true;
				thisObj.overBodyMousePos = {
					x: coords.x,
					y: coords.y
				};
			} else if (e.type === 'mouseleave') {
				thisObj.overBody = false;
				thisObj.overBodyMousePos = null;
				if (!thisObj.overHead && thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			} else if (e.type === 'mousemove' || e.type === 'touchmove') {
				thisObj.overBodyMousePos = {
					x: coords.x,
					y: coords.y
				};
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.trackHeadAtPageX(coords.x);
				}
			} else if (e.type === 'mousedown' || e.type === 'touchstart') {
				thisObj.startTracking('mouse', thisObj.pageXToPosition(coords.x));
				thisObj.trackHeadAtPageX(coords.x);
				if (!thisObj.seekHead.is(':focus')) {
					thisObj.seekHead.focus();
				}
				e.preventDefault();
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.tracking && thisObj.trackDevice === 'mouse') {
					thisObj.stopTracking(thisObj.pageXToPosition(coords.x));
				}
			} else if (e.type === 'keydown') {
				if (e.key === 'Home') {
					thisObj.trackImmediatelyTo(0);
				} else if (e.key === 'End') {
					thisObj.trackImmediatelyTo(thisObj.duration);
				} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
					thisObj.arrowKeyDown(-1);
				} else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
					thisObj.arrowKeyDown(1);
				} else if (e.key === 'PageUp' && bigInterval > 0) {
					thisObj.arrowKeyDown(bigInterval);
				} else if (e.key === 'PageDown' && bigInterval > 0) {
					thisObj.arrowKeyDown(-bigInterval);
				} else {
					return;
				}
				e.preventDefault();
			} else if (e.type === 'keyup') {
				if ( keyPressed === e.key ) {
					if (thisObj.tracking && thisObj.trackDevice === 'keyboard') {
						thisObj.stopTracking(thisObj.keyTrackPosition);
					}
					e.preventDefault();
				}
			}
			if (!thisObj.overTooltip && e.type !== 'mouseup' && e.type !== 'keydown' && e.type !== 'keydown') {
				thisObj.refreshTooltip();
			}
		});
	}

	AccessibleSlider.prototype.arrowKeyDown = function (multiplier) {
		if (this.tracking && this.trackDevice === 'keyboard') {
			this.keyTrackPosition = this.boundPos(this.keyTrackPosition + (this.nextStep * multiplier));
			this.inertiaCount += 1;
			if (this.inertiaCount === 20) {
				this.inertiaCount = 0;
				this.nextStep *= 2;
			}
			this.trackHeadAtPosition(this.keyTrackPosition);
		} else {
			this.nextStep = 1;
			this.inertiaCount = 0;
			this.keyTrackPosition = this.boundPos(this.position + (this.nextStep * multiplier));
			this.startTracking('keyboard', this.keyTrackPosition);
			this.trackHeadAtPosition(this.keyTrackPosition);
		}
	};

	AccessibleSlider.prototype.pageXToPosition = function (pageX) {
		var offset = pageX - this.bodyDiv.offset().left;
		var position = this.duration * (offset / this.bodyDiv.width());
		return this.boundPos(position);
	};

	AccessibleSlider.prototype.boundPos = function (position) {
		return Math.max(0, Math.min(position, this.duration));
	}

	AccessibleSlider.prototype.setDuration = function (duration) {
		if (duration !== this.duration) {
			this.duration = duration;
			this.resetHeadLocation();
			this.seekHead.attr('aria-valuemax', duration);
		}
	};

	AccessibleSlider.prototype.setWidth = function (width) {
		this.wrapperDiv.width(width);
		this.resizeDivs();
		this.resetHeadLocation();
	};

	AccessibleSlider.prototype.getWidth = function () {
		return this.wrapperDiv.width();
	};

	AccessibleSlider.prototype.resizeDivs = function () {
		this.playedDiv.width(this.bodyDiv.width() * (this.position / this.duration));
		this.loadedDiv.width(this.bodyDiv.width() * this.buffered);
	};

	AccessibleSlider.prototype.resetHeadLocation = function () {
		var ratio = this.position / this.duration;
		var center = this.bodyDiv.width() * ratio;
		this.seekHead.css('left', center - (this.seekHead.width() / 2));

		if (this.tracking) {
			this.stopTracking(this.position);
		}
	};

	AccessibleSlider.prototype.setPosition = function (position, updateLive) {
		this.position = position;
		this.resetHeadLocation();
		if (this.overHead) {
			this.refreshTooltip();
		}
		this.resizeDivs();
		this.updateAriaValues(position, updateLive);
	}

	AccessibleSlider.prototype.setBuffered = function (ratio) {
		if (!isNaN(ratio)) {
			this.buffered = ratio;
			this.redrawDivs;
		}
	}

	AccessibleSlider.prototype.startTracking = function (device, position) {
		if (!this.tracking) {
			this.trackDevice = device;
			this.tracking = true;
			this.bodyDiv.trigger('startTracking', [position]);
		}
	};

	AccessibleSlider.prototype.stopTracking = function (position) {
		this.trackDevice = null;
		this.tracking = false;
		this.bodyDiv.trigger('stopTracking', [position]);
		this.setPosition(position, true);
	};

	AccessibleSlider.prototype.trackHeadAtPageX = function (pageX) {
		var position = this.pageXToPosition(pageX);
		var newLeft = pageX - this.bodyDiv.offset().left - (this.seekHead.width() / 2);
		newLeft = Math.max(0, Math.min(newLeft, this.bodyDiv.width() - this.seekHead.width()));
		this.lastTrackPosition = position;
		this.seekHead.css('left', newLeft);
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.trackHeadAtPosition = function (position) {
		var ratio = position / this.duration;
		var center = this.bodyDiv.width() * ratio;
		this.lastTrackPosition = position;
		this.seekHead.css('left', center - (this.seekHead.width() / 2));
		this.reportTrackAtPosition(position);
	};

	AccessibleSlider.prototype.reportTrackAtPosition = function (position) {
		this.bodyDiv.trigger('tracking', [position]);
		this.updateAriaValues(position, true);
	};

	AccessibleSlider.prototype.updateAriaValues = function (position, updateLive) {
		var pHours = Math.floor(position / 3600);
		var pMinutes = Math.floor((position % 3600) / 60);
		var pSeconds = Math.floor(position % 60);

		var pHourWord = pHours === 1 ? 'hour' : 'hours';
		var pMinuteWord = pMinutes === 1 ? 'minute' : 'minutes';
		var pSecondWord = pSeconds === 1 ? 'second' : 'seconds';

		var descriptionText;
		if (pHours > 0) {
			descriptionText = pHours +
				' ' + pHourWord +
				', ' + pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		} else if (pMinutes > 0) {
			descriptionText	 = pMinutes +
				' ' + pMinuteWord +
				', ' + pSeconds +
				' ' + pSecondWord;
		} else {
			descriptionText = pSeconds + ' ' + pSecondWord;
		}

		if (!this.liveAriaRegion) {
			this.liveAriaRegion = $('<span>', {
				'class': 'able-offscreen',
				'aria-live': 'polite'
			});
			this.wrapperDiv.append(this.liveAriaRegion);
		}
		if (updateLive && (this.liveAriaRegion.text() !== descriptionText)) {
			this.liveAriaRegion.text(descriptionText);
		}

		this.seekHead.attr('aria-valuetext', descriptionText);
		this.seekHead.attr('aria-valuenow', Math.floor(position).toString());
	};

	AccessibleSlider.prototype.trackImmediatelyTo = function (position) {
		this.startTracking('keyboard', position);
		this.trackHeadAtPosition(position);
		this.keyTrackPosition = position;
	};

	AccessibleSlider.prototype.refreshTooltip = function () {
		if (this.overHead) {
			this.timeTooltip.show();
			if (this.tracking) {
				this.timeTooltip.text(this.positionToStr(this.lastTrackPosition));
			} else {
				this.timeTooltip.text(this.positionToStr(this.position));
			}
			this.setTooltipPosition(this.seekHead.position().left + (this.seekHead.width() / 2));
		} else if (this.overBody && this.overBodyMousePos) {
			this.timeTooltip.show();
			this.timeTooltip.text(this.positionToStr(this.pageXToPosition(this.overBodyMousePos.x)));
			this.setTooltipPosition(this.overBodyMousePos.x - this.bodyDiv.offset().left);
		} else {

			clearTimeout(this.timeTooltipTimeoutId);
			var _this = this;
			this.timeTooltipTimeoutId = setTimeout(function() {
				_this.timeTooltip.hide();
			}, 500);
		}
	};

	AccessibleSlider.prototype.hideSliderTooltips = function () {
		this.overHead = false;
		this.overBody = false;
		this.timeTooltip.hide();
	};

	AccessibleSlider.prototype.setTooltipPosition = function (x) {
		this.timeTooltip.css({
			left: x - (this.timeTooltip.width() / 2) - 10,
			bottom: this.seekHead.height()
		});
	};

	AccessibleSlider.prototype.positionToStr = function (seconds) {

		var dHours = Math.floor(seconds / 3600);
		var dMinutes = Math.floor(seconds / 60) % 60;
		var dSeconds = Math.floor(seconds % 60);
		if (dSeconds < 10) {
			dSeconds = '0' + dSeconds;
		}
		if (dHours > 0) {
			if (dMinutes < 10) {
				dMinutes = '0' + dMinutes;
			}
			return dHours + ':' + dMinutes + ':' + dSeconds;
		} else {
			return dMinutes + ':' + dSeconds;
		}
	};

	AccessibleSlider.prototype.pointerEventToXY = function(e) {

		var out = {x:0, y:0};
		if (e.type == 'touchstart' || e.type == 'touchmove' || e.type == 'touchend' || e.type == 'touchcancel') {
			var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
			out.x = touch.pageX;
			out.y = touch.pageY;
		} else if (e.type == 'mousedown' || e.type == 'mouseup' || e.type == 'mousemove' || e.type == 'mouseover'|| e.type=='mouseout' || e.type=='mouseenter' || e.type=='mouseleave') {
			out.x = e.pageX;
			out.y = e.pageY;
		}
		return out;
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.addVolumeSlider = function($div) {


		var thisObj, volumeSliderId, volumeHelpId, volumePct, volumeLabel, volumeHeight;

		thisObj = this;

		volumeSliderId = this.mediaId + '-volume-slider';
		volumeHelpId = this.mediaId + '-volume-help';

		this.$volumeSlider = $('<div>',{
			'id': volumeSliderId,
			'class': 'able-volume-slider',
			'aria-hidden': 'true'
		}).hide();
		this.$volumeSliderTooltip = $('<div>',{
			'class': 'able-tooltip',
			'role': 'tooltip'
		}).hide();
		this.$volumeRange = $('<input>',{
			'type': 'range',
			'min': '0',
			'max': '10',
			'step': '1',
			'orient': 'vertical', 
			'aria-label': this.translate( 'volumeUpDown', 'Volume up down' ),
			'value': this.volume
		});
		volumePct = parseInt(thisObj.volume) / 10 * 100;
		this.$volumeHelp = $('<div>',{
			'id': volumeHelpId,
			'class': 'able-volume-help',
			'aria-live': 'polite'
		}).text(volumePct + '%');
		volumeLabel = this.$volumeButton.attr( 'aria-label' );
		this.$volumeButton.attr( 'aria-label', volumeLabel + ' ' + volumePct + '%');
		this.$volumeSlider.append(this.$volumeSliderTooltip,this.$volumeRange,this.$volumeHelp);
		volumeHeight = this.$volumeButton.parents( '.able-control-row' )[0];
		this.$volumeSlider.css( 'bottom', volumeHeight.offsetHeight );

		$div.append(this.$volumeSlider);

		this.$volumeRange.on('change',function (e) {
			thisObj.handleVolumeChange($(this).val());
		});

		this.$volumeRange.on('input',function (e) {
			thisObj.handleVolumeChange($(this).val());
		});

		this.$volumeRange.on('keydown',function (e) {

			if (e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') {
				if (thisObj.$volumeSlider.is(':visible')) {
					thisObj.closingVolume = true; 
					thisObj.hideVolumePopup();
				} else {
					if (!thisObj.closingVolume) {
						thisObj.showVolumePopup();
					}
				}
			} else {
				return;
			}
		});
	};

	AblePlayer.prototype.refreshVolumeHelp = function(volume) {

		var volumePct;
		volumePct = (volume/10) * 100;

		if (this.$volumeHelp) {
			this.$volumeHelp.text(volumePct + '%');
		}

		this.$volumeRange.attr('value',volume);
	};

	AblePlayer.prototype.refreshVolumeButton = function(volume) {

		var volumeName, volumePct, volumeLabel;

		volumeName = this.getVolumeName(volume);
		volumePct = (volume/10) * 100;
		volumeLabel = this.translate( 'volume', 'Volume' ) + ' ' + volumePct + '%';

		this.getIcon( this.$volumeButton, 'volume-' + volumeName );
		this.$volumeButton.attr( 'aria-label', volumeLabel );
	};

	AblePlayer.prototype.handleVolumeButtonClick = function() {

		if (this.$volumeSlider.is(':visible')) {
			this.hideVolumePopup();
		} else {
			this.showVolumePopup();
		}
	};

	AblePlayer.prototype.handleVolumeKeystroke = function(volume) {
		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		} else if (volume === 0) {
			this.setMute(true);
		} else {
			this.setVolume(volume); 
			this.refreshVolumeHelp(volume);
			this.refreshVolumeButton(volume);
		}
	};


	AblePlayer.prototype.handleVolumeChange = function(volume) {


		if (this.isMuted() && volume > 0) {
			this.setMute(false);
		} else if (volume === 0) {
			this.setMute(true);
		} else {
			this.setVolume(volume); 
			this.refreshVolumeHelp(volume);
			this.refreshVolumeButton(volume);
		}
	};

	AblePlayer.prototype.handleMute = function() {

		if (this.isMuted()) {
			this.setMute(false);
		} else {
			this.setMute(true);
		}
	};

	AblePlayer.prototype.showVolumePopup = function() {

		this.closePopups();
		this.$tooltipDiv.hide();
		this.$volumeSlider.show().attr('aria-hidden','false');
		this.$volumeButton.attr('aria-expanded','true');
		this.$volumeButton.focus(); 
		this.waitThenFocus(this.$volumeRange);
	};

	AblePlayer.prototype.hideVolumePopup = function() {

		var thisObj = this;

		this.$volumeSlider.hide().attr('aria-hidden','true');
		this.$volumeButton.attr('aria-expanded','false').focus();
		setTimeout(function() {
			thisObj.closingVolume = false;
		}, 1000);
	};

	AblePlayer.prototype.isMuted = function () {

		if (this.player === 'html5') {
			return this.media.muted;
		} else if (this.player === 'youtube') {
			return this.youTubePlayer.isMuted();
		}
	};

	AblePlayer.prototype.setMute = function(mute) {

		if (mute) {
			this.lastVolume = this.volume;
			this.volume = 0;
		} else { 
			if (typeof this.lastVolume !== 'undefined') {
				this.volume = this.lastVolume;
			}
		}

		if (this.player === 'html5') {
			this.media.muted = mute;
		} else if (this.player === 'youtube') {
			if (mute) {
				this.youTubePlayer.mute();
			} else {
				this.youTubePlayer.unMute();
			}
		}
		this.setVolume(this.volume);
		this.refreshVolumeHelp(this.volume);
		this.refreshVolumeButton(this.volume);
	};

	AblePlayer.prototype.setVolume = function (volume) {


		var newVolume;
		this.syncSignVideo( {'volume' : 0 } );
		if (this.player === 'html5') {
			newVolume = volume / 10;
			this.media.volume = newVolume;
		} else if (this.player === 'youtube') {
			newVolume = volume * 10;
			this.youTubePlayer.setVolume(newVolume);
			this.volume = volume;
		} else if (this.player === 'vimeo') {
			newVolume = volume / 10;
			this.vimeoPlayer.setVolume(newVolume).then(function() {
			});
		}
		this.lastVolume = volume;
	};

	AblePlayer.prototype.getVolume = function (volume) {

		if (this.player === 'html5') {
			return this.media.volume * 10;
		} else if (this.player === 'youtube') {
			if (this.youTubePlayerReady) {
				return this.youTubePlayer.getVolume() / 10;
			}
		}
		if (this.player === 'vimeo') {
			return this.volume;
		}
	};

	AblePlayer.prototype.getVolumeName = function (volume) {

		if (volume == 0) {
			return 'mute';
		} else if (volume == 10) {
			return 'loud';
		} else if (volume < 5) {
			return 'soft';
		} else {
			return 'medium';
		}
	};

})(jQuery);

(function ($) {
	var focusableElementsSelector = "a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, *[tabindex], *[contenteditable]";

	window.AccessibleDialog = function( modalDiv, $returnElement, title, closeButtonLabel) {

		this.title = title;
		this.closeButtonLabel = closeButtonLabel;
		this.focusedElementBeforeModal = $returnElement;
		this.baseId = $(modalDiv).attr('id') || Math.floor(Math.random() * 1000000000).toString();
		var thisObj = this;
		var modal = modalDiv;
		this.modal = modal;

		modal.addClass('able-modal-dialog');

		var closeButton = $('<button>',{
				'class': 'modalCloseButton',
				'title': thisObj.closeButtonLabel,
				'aria-label': thisObj.closeButtonLabel
		}).text('×');
		closeButton.on( 'keydown', function (e) {
			if (e.key === ' ') {
				thisObj.hide();
			}
		}).on( 'click', function () {
			thisObj.hide();
		});

		var titleH1 = $('<h1></h1>');
		titleH1.attr('id', 'modalTitle-' + this.baseId);
		titleH1.text(title);
		this.titleH1 = titleH1;

		modal.attr({
			'aria-labelledby': 'modalTitle-' + this.baseId,
		});
		var modalHeader = $( '<div>', {
			'class': 'able-modal-header'
		});
		modalHeader.prepend(titleH1);
		modalHeader.prepend(closeButton);
		modal.prepend(modalHeader);

		modal.attr({
			'aria-hidden': 'true',
			'role': 'dialog',
			'aria-modal': 'true'
		});

		modal.on( 'keydown', function (e) {
			if (e.key === 'Escape') {
				thisObj.hide();
				e.preventDefault();
			} else if (e.key === 'Tab') {
				var parts = modal.find('*');
				var focusable = parts.filter(focusableElementsSelector).filter(':visible');

				if (focusable.length === 0) {
					return;
				}

				var focused = $(':focus');
				var currentIndex = focusable.index(focused);
				if (e.shiftKey) {
					if (currentIndex === 0) {
						focusable.get(focusable.length - 1).trigger('focus');
						e.preventDefault();
					}
				} else {
					if (currentIndex === focusable.length - 1) {
						focusable.get(0).trigger('focus');
						e.preventDefault();
					}
				}
			}
			e.stopPropagation();
		});

		if ( $( 'body' ).hasClass( 'able-modal-active' ) ) {
			$( 'body > *') .not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('inert');
			$( 'body' ).removeClass( 'able-modal-active' );
		}
	};

	AccessibleDialog.prototype.show = function () {
		if (!this.overlay) {
			var overlay = $('<div></div>').attr({
				 'class': 'able-modal-overlay',
				 'tabindex': '-1'
			});
			this.overlay = overlay;
			$('body').append(overlay);

			overlay.on('mousedown.accessibleModal', function (e) {
				e.preventDefault();
				thisObj.hide();
			});
		}

		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').attr('inert', true);
		$( 'body' ).addClass( 'able-modal-active' );

		this.overlay.css('display', 'block');
		this.modal.css('display', 'block');
		this.modal.attr({
			'aria-hidden': 'false',
			'tabindex': '-1'
		});

		var focusable = this.modal.find("*").filter(focusableElementsSelector).filter(':visible');
		if (focusable.length === 0) {
			this.focusedElementBeforeModal.blur();
		}
		var thisObj = this;
		setTimeout(function () {
			thisObj.modal.find('button.modalCloseButton').first().trigger('focus');
		}, 300);
	};

	AccessibleDialog.prototype.hide = function () {
		if (this.overlay) {
			this.overlay.css('display', 'none');
		}
		this.modal.css('display', 'none');
		this.modal.attr('aria-hidden', 'true');
		$('body > *').not('.able-modal-overlay').not('.able-modal-dialog').removeAttr('inert');
		$( 'body' ).removeClass( 'able-modal-active' );

		this.focusedElementBeforeModal.trigger('focus');
	};

	AccessibleDialog.prototype.getInputs = function () {

		if (this.modal) {
			var inputs = this.modal.find('input');
			return inputs;
		}
		return false;
	};

})(jQuery);

(function ($) {
  AblePlayer.prototype.getNextHeadingLevel = function ($element) {

    var $parents, $foundHeadings, numHeadings, headingType, headingNumber;

    $parents = $element.parents();
    $parents.each(function () {
      $foundHeadings = $(this).children(":header");
      numHeadings = $foundHeadings.length;
      if (numHeadings) {
        headingType = $foundHeadings.eq(numHeadings - 1).prop("tagName");
        return false;
      }
    });
    if (typeof headingType === "undefined") {
      headingNumber = 1;
    } else {
      headingNumber = parseInt(headingType[1]);
      headingNumber += 1;
      if (headingNumber > 6) {
        headingNumber = 6;
      }
    }
    return headingNumber;
  };

  AblePlayer.prototype.countProperties = function (obj) {
    var count, prop;
    count = 0;
    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        ++count;
      }
    }
    return count;
  };

  AblePlayer.prototype.formatSecondsAsColonTime = function (
    seconds,
    showFullTime
  ) {

    var dHours, dMinutes, dSeconds, parts, milliSeconds, numShort, i;

    if (showFullTime) {
      parts = seconds.toString().split(".");
      if (parts.length === 2) {
        milliSeconds = parts[1];
        if (milliSeconds.length < 3) {
          numShort = 3 - milliSeconds.length;
          for (i = 1; i <= numShort; i++) {
            milliSeconds += "0";
          }
        }
      } else {
        milliSeconds = "000";
      }
    }
    dHours = Math.floor(seconds / 3600);
    dMinutes = Math.floor(seconds / 60) % 60;
    dSeconds = Math.floor(seconds % 60);
    if (dSeconds < 10) {
      dSeconds = "0" + dSeconds;
    }
    if (dHours > 0) {
      if (dMinutes < 10) {
        dMinutes = "0" + dMinutes;
      }
      if (showFullTime) {
        return dHours + ":" + dMinutes + ":" + dSeconds + "." + milliSeconds;
      } else {
        return dHours + ":" + dMinutes + ":" + dSeconds;
      }
    } else {
      if (showFullTime) {
        if (dHours < 1) {
          dHours = "00";
        } else if (dHours < 10) {
          dHours = "0" + dHours;
        }
        if (dMinutes < 1) {
          dMinutes = "00";
        } else if (dMinutes < 10) {
          dMinutes = "0" + dMinutes;
        }
        return dHours + ":" + dMinutes + ":" + dSeconds + "." + milliSeconds;
      } else {
        return dMinutes + ":" + dSeconds;
      }
    }
  };

  AblePlayer.prototype.getSecondsFromColonTime = function (timeStr) {
    var timeParts, hours, minutes, seconds;

    timeParts = timeStr.split(":");
    if (timeParts.length === 3) {
      hours = parseInt(timeParts[0]);
      minutes = parseInt(timeParts[1]);
      seconds = parseFloat(timeParts[2]);
      return hours * 3600 + minutes * 60 + seconds;
    } else if (timeParts.length === 2) {
      minutes = parseInt(timeParts[0]);
      seconds = parseFloat(timeParts[1]);
      return minutes * 60 + seconds;
    } else if (timeParts.length === 1) {
      seconds = parseFloat(timeParts[0]);
      return seconds;
    }
  };

  AblePlayer.prototype.capitalizeFirstLetter = function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  AblePlayer.prototype.roundDown = function (value, decimals) {
    return Number(Math.floor(value + "e" + decimals) + "e-" + decimals);
  };

  AblePlayer.prototype.defer = function() {
	const self = this;
	const promise = new Promise((resolve, reject) => {
		self.resolve = resolve;
		self.reject = reject;
		self.promise = () => promise;
	});
  }

  AblePlayer.prototype.getScript = function( source, callback ) {
	var script   = document.createElement('script');
	var prior    = document.getElementsByTagName('script')[0];
	script.async = 1;

	script.onload = script.onreadystatechange = function( _, isAbort ) {
		if ( isAbort || !script.readyState || /loaded|complete/.test(script.readyState) ) {
			script.onload = script.onreadystatechange = null;
			script        = undefined;

			if ( !isAbort && callback ) {
				setTimeout(callback, 0);
			}
		}
	};

	script.src = source;
	prior.parentNode.insertBefore(script, prior);
  }

  AblePlayer.prototype.hasAttr = function (object, attribute) {

    var attr = object.attr(attribute);

    if (typeof attr !== typeof undefined && attr !== false) {
      return true;
    } else {
      return false;
    }
  };

})(jQuery);

(function ($) {
	AblePlayer.prototype.initDescription = function() {




		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		if (this.mediaType === 'audio') {
			deferred.resolve();
		}

		this.descFile = this.$sources.first().attr('data-desc-src');
		if (typeof this.descFile !== 'undefined') {
			this.hasOpenDesc = true;
		} else {
			this.hasOpenDesc = (this.youTubeDescId || this.vimeoDescId) ? true : false;
		}

		this.descMethod = null;
		if (this.hasOpenDesc && this.hasClosedDesc) {
			this.descMethod = (this.prefDescMethod) ? this.prefDescMethod : 'video';
		} else if (this.hasOpenDesc) {
			this.descMethod = 'video';
		} else if (this.hasClosedDesc) {
			this.descMethod = 'text';
		}

		this.descOn = false;
		if (this.descMethod) {
			if (this.prefDesc === 1) {
				this.descOn = true;
			} else if (this.prefDesc === 0) {
				this.descOn = false;
			} else {
				this.descOn = (this.defaultStateDescriptions === 1) ? true : false;
			}
		}

		if (typeof this.$descDiv === 'undefined' && this.hasClosedDesc ) {
			this.injectTextDescriptionArea();
		}

		if (this.descOn) {
			if (this.descMethod === 'video' && !this.usingDescribedVersion() ) {
				this.swapDescription();
			}
			if (this.hasClosedDesc) {
				if (this.prefDescVisible) {
					if (typeof this.$descDiv !== 'undefined') {
						this.$descDiv.show();
						this.$descDiv.removeClass('able-offscreen');
					}
				} else {
					if (typeof this.$descDiv !== 'undefined') {
						this.$descDiv.addClass('able-offscreen');
					}
				}
			}
		} else { 
			if (this.descMethod === 'video') { 
				if (this.usingDescribedVersion()) {
					this.swapDescription();
				}
			} else if (this.descMethod === 'text') { 
				if (typeof this.$descDiv !== 'undefined') {
					this.$descDiv.hide();
					this.$descDiv.removeClass('able-offscreen');
				}
			}
		}
		deferred.resolve();
		return promise;
	};

	AblePlayer.prototype.usingDescribedVersion = function () {


		if (this.player === 'youtube') {
			return (this.activeYouTubeId === this.youTubeDescId);
		} else if (this.player === 'vimeo') {
			return (this.activeVimeoId === this.vimeoDescId);
		} else {
			return (this.$sources.first().attr('data-desc-src') === this.$sources.first().attr('src'));
		}
	};

	AblePlayer.prototype.initSpeech = function (context) {
		var thisObj = this;

		function attemptEnableSpeech() {
			var greeting = new SpeechSynthesisUtterance("\x20");
			greeting.onend = function () {
				thisObj.getBrowserVoices();
				if (
					(Array.isArray(thisObj.descVoices) && thisObj.descVoices.length) ||
					context !== "init"
				) {
					thisObj.speechEnabled = true;
				}
			};
			thisObj.synth.speak(greeting);
		}

		function handleInitialClick() {
			attemptEnableSpeech();
			$(document).off("click", handleInitialClick);
		}

		if (this.speechEnabled === null) {
			if (window.speechSynthesis) {
				this.synth = window.speechSynthesis;
				this.synth.cancel(); 

				if (context === "init") {
					attemptEnableSpeech();
					$(document).on("click", handleInitialClick);
				} else {
					attemptEnableSpeech();
				}
			} else {
				this.speechEnabled = false;
			}
		}
	};

	AblePlayer.prototype.getBrowserVoices = function () {


		var voices, descLangs, voiceLang, preferredLang;

		preferredLang = (this.captionLang) ? this.captionLang.substring(0,2).toLowerCase() : this.lang.substring(0,2).toLowerCase();

		this.descVoices = [];
		voices = this.synth.getVoices();
		descLangs = this.getDescriptionLangs();
		if (voices.length > 0) {
			this.descVoices = [];
			for (var i=0; i<voices.length; i++) {
				voiceLang = voices[i].lang.substring(0,2).toLowerCase();
				if (voiceLang === preferredLang && (descLangs.indexOf(voiceLang) !== -1)) {
					this.descVoices.push(voices[i]);
				}
			}
			if (!this.descVoices.length) {
				this.descVoices = voices;
			}
		}
		return false;
	};

	AblePlayer.prototype.getDescriptionLangs = function () {

		var descLangs = [];
		if (this.tracks) {
			for (var i=0; i < this.tracks.length; i++) {
				if (this.tracks[i].kind === 'descriptions') {
					descLangs.push(this.tracks[i].language.substring(0,2).toLowerCase());
				}
			}
		}
		return descLangs;
	};

	AblePlayer.prototype.setDescriptionVoice = function () {


		var preferences, voices, prefDescVoice, descVoice, descLang, prefVoiceFound;
		preferences = this.getPref();
		prefDescVoice = (typeof preferences.voices !== 'undefined') ? this.getPrefDescVoice() : null;

		this.getBrowserVoices();
		this.rebuildDescPrefsForm();

		if (this.selectedDescriptions) {
			descLang = this.selectedDescriptions.language;
		} else if (this.captionLang) {
			descLang = this.captionLang;
		} else {
			descLang = this.lang;
		}

		if (this.synth) {
			voices = this.synth.getVoices();
			if (voices.length > 0) {
				if (prefDescVoice) {
					prefVoiceFound = false;
					for (var i=0; i<voices.length; i++) {
						if (voices[i].lang.substring(0,2).toLowerCase() === descLang.substring(0,2).toLowerCase()) {
							if (voices[i].name === prefDescVoice) {
								descVoice = voices[i].name;
								prefVoiceFound = true;
								break;
							}
						}
					}
				}
				if (!prefVoiceFound) {
					for (var i=0; i<voices.length; i++) {
						if (voices[i].lang.substring(0,2).toLowerCase() === descLang.substring(0,2).toLowerCase()) {
							descVoice = voices[i].name;
							break;
						}
					}
				}
				this.prefDescVoice = descVoice;
				this.prefDescVoiceLang = descLang;
				if (this.$voiceSelectField) {
					this.$voiceSelectField.val(this.prefDescVoice);
				}
				this.updatePreferences('voice');
			}
		}
	};

	AblePlayer.prototype.swapDescription = function() {


		var thisObj, i, origSrc, descSrc;

		thisObj = this;

		this.loadingMedia = false;

		this.$focusedElement = $(':focus');
		this.activeMedia = this.mediaId;

		if (this.elapsed > 0) {
			this.swapTime = this.elapsed;
		} else {
			this.swapTime = 0;
		}
		if (this.duration > 0) {
			this.prevDuration = this.duration;
		}

		if (!this.okToPlay) {
			this.okToPlay = this.playing;
		}

		if (this.descOn) {
			this.showAlert( this.translate( 'alertDescribedVersion', 'Using the audio described version of this video' ) );
		} else {
			this.showAlert( this.translate( 'alertNonDescribedVersion', 'Using the non-described version of this video' ) );
		}

		if (this.player === 'html5') {

			this.swappingSrc = true;
			this.paused = true;

			if (this.usingDescribedVersion()) {
				for (i=0; i < this.$sources.length; i++) {
					origSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-orig-src') );
					srcType = this.$sources[i].getAttribute('type');
					if (origSrc) {
						this.$sources[i].setAttribute('src',origSrc);
					}
				}
			} else {
				for (i=0; i < this.$sources.length; i++) {
					origSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('src') );
					descSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-desc-src') );
					srcType = this.$sources[i].getAttribute('type');
					if (descSrc) {
						this.$sources[i].setAttribute('src',descSrc);
						this.$sources[i].setAttribute('data-orig-src',origSrc);
					}
				}
			}

			if (this.recreatingPlayer) {
				return;
			}
			if (this.playerCreated) {
				this.deletePlayer('swap-desc-html');
				this.recreatePlayer().then(function() {
					if (!thisObj.loadingMedia) {
						thisObj.media.load();
						thisObj.loadingMedia = true;
					}
				});
			} else {
			}
		} else if (this.player === 'youtube') {

			this.activeYouTubeId = (this.usingDescribedVersion()) ? this.youTubeId : this.youTubeDescId;

			if (typeof this.youTubePlayer !== 'undefined') {
				thisObj.swappingSrc = true;
				if (thisObj.playing) {
					thisObj.youTubePlayer.loadVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				} else {
					thisObj.youTubePlayer.cueVideoById(thisObj.activeYouTubeId,thisObj.swapTime);
				}
			}
			if (this.playerCreated) {
				this.deletePlayer('swap-desc-youtube');
			}
			if (this.recreatingPlayer) {
				return;
			}
			this.recreatePlayer().then(function() {
			});
		} else if (this.player === 'vimeo') {
			if (this.usingDescribedVersion()) {
				this.activeVimeoId = this.vimeoId;
				this.showAlert( this.translate( 'alertNonDescribedVersion', 'Using the non-described version of this video' ) );
			} else {
				this.activeVimeoId = this.vimeoDescId;
				this.showAlert( this.translate( 'alertDescribedVersion', 'Using the audio described version of this video' ) );
			}
			if (this.playerCreated) {
				this.deletePlayer('swap-desc-vimeo');
			}
			if (this.recreatingPlayer) {
				return;
			}
			this.recreatePlayer().then(function() {
				thisObj.vimeoPlayer.loadVideo(thisObj.activeVimeoId).then(function() {
					if (thisObj.playing) {
						thisObj.vimeoPlayer.setCurrentTime(thisObj.swapTime);
					} else {
						thisObj.vimeoPlayer.pause();
					}
				});
			});
		}
	};

	AblePlayer.prototype.showDescription = function(now) {
		if (!this.playing || !this.hasClosedDesc || this.swappingSrc || !this.descOn || ( this.descMethod === 'video' && !this.prefDescVisible ) ) {
			return;
		}

		var thisObj, cues, d, thisDescription, descText;
		thisObj = this;

		var flattenComponentForDescription = function (component) {
			var result = [];
			if (component.type === 'string') {
				result.push(component.value);
			} else {
				for (var i = 0; i < component.children.length; i++) {
					result.push(flattenComponentForDescription(component.children[i]));
				}
			}
			return result.join('');
		};
		cues = [];
		if (this.selectedDescriptions) {
			cues = this.selectedDescriptions.cues;
		} else if (this.descriptions.length >= 1) {
			cues = this.descriptions[0].cues;
		}
		for (d = 0; d < cues.length; d++) {
			if ((cues[d].start <= now) && (cues[d].end > now)) {
				thisDescription = d;
				break;
			}
		}
		if (typeof thisDescription !== 'undefined') {
			if (this.currentDescription !== thisDescription) {
				this.$status.removeAttr('aria-live');
				descText = flattenComponentForDescription(cues[thisDescription].components);
				if (this.descReader === 'screenreader') {
					this.$descDiv.html(descText);
				} else if (this.speechEnabled) {
					if ( 'video' !== this.descMethod ) {
						this.announceDescriptionText('description',descText);
					}
					if (this.prefDescVisible) {
						this.$descDiv.html(descText).removeAttr('aria-live aria-atomic');
					}
				} else {
					this.$descDiv.html(descText);
				}
				if (this.prefDescPause && this.descMethod === 'text') {
					this.pauseMedia();
					this.pausedForDescription = true;
				}
				this.currentDescription = thisDescription;
			}
		} else {
			this.$descDiv.html('');
			this.currentDescription = -1;
			this.$status.attr('aria-live','polite');
		}
	};

	AblePlayer.prototype.syncSpeechToPlaybackRate = function(rate) {

		var speechRate;

		if (rate === 0.5) {
			speechRate = 0.7; 
		} else if (rate === 0.75) {
			speechRate =  0.8; 
		} else if (rate === 1.0) {
			speechRate =  1; 
		} else if (rate === 1.25) {
			speechRate =  1.1; 
		} else if (rate === 1.5) {
			speechRate =  1.2; 
		} else if (rate === 1.75) {
			speechRate =  1.5; 
		} else if (rate === 2.0) {
			speechRate =  2; 
		} else if (rate === 2.25) {
			speechRate =  2.5; 
		} else if (rate >= 2.5) {
			speechRate =  3; 
		}
		this.prefDescRate = speechRate;
	};

	AblePlayer.prototype.announceDescriptionText = function(context, text) {


		var thisObj, voiceName, i, voice, pitch, rate, volume, utterance,
			timeElapsed, secondsElapsed;

		thisObj = this;

		var useFirstVoice = false;

		if (!this.speechEnabled) {
			this.initSpeech('desc');
		}

		if (context === 'sample') {
			voiceName = $('#' + this.mediaId + '_prefDescVoice').val();
			pitch = $('#' + this.mediaId + '_prefDescPitch').val();
			rate = $('#' + this.mediaId + '_prefDescRate').val();
			volume = $('#' + this.mediaId + '_prefDescVolume').val();
		} else {
			voiceName = this.prefDescVoice;
			pitch = this.prefDescPitch;
			rate = this.prefDescRate;
			volume = this.prefDescVolume;
		}

		if (this.descVoices) {
			if (this.descVoices.length > 0) {
				if (useFirstVoice) {
					voice = this.descVoices[0];
				} else if (voiceName) {
					for (i = 0; i < this.descVoices.length; i++) {
						if (this.descVoices[i].name == voiceName) {
							voice = this.descVoices[i];
							break;
						}
					}
				}
				if (typeof voice === 'undefined') {
					voice = this.descVoices[0];
				}
			}
		} else {
			voice = null;
		}
		utterance = new SpeechSynthesisUtterance();
		if (voice) {
			utterance.voice = voice;
		}
		utterance.voiceURI = 'native';
		utterance.volume = volume;
		utterance.rate = rate;
		utterance.pitch = pitch;
		utterance.text = text;
		utterance.lang = this.lang;
		utterance.onstart = function(e) {
		};
		utterance.onpause = function(e) {
		};
		utterance.onend = function(e) {
			this.speakingDescription = false;
			timeElapsed = e.elapsedTime;
			secondsElapsed = (timeElapsed > 100) ? (e.elapsedTime/1000).toFixed(2) : (e.elapsedTime).toFixed(2);

			if (this.debug) {

							}
			if (context === 'description') {
				if (thisObj.prefDescPause) {
					if (thisObj.pausedForDescription) {
						thisObj.playMedia();
						this.pausedForDescription = false;
					}
				}
			}
		};
		utterance.onerror = function(e) {

					};
		if (this.synth.paused) {
			this.synth.resume();
		}
		this.synth.speak(utterance);
		this.speakingDescription = true;
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.isIOS = function(version) {


		var userAgent, iOS;

		userAgent = navigator.userAgent.toLowerCase();
		iOS = /ipad|iphone|ipod/.exec(userAgent);
		if (iOS) {
			if (typeof version !== 'undefined') {
				if (userAgent.indexOf('os ' + version) !== -1) {
					return true;
				} else {
					return false;
				}
			} else {
				return true;
			}
		} else {
			return false;
		}
	};

	AblePlayer.prototype.browserSupportsVolume = function() {


		var audio, testVolume;

		if (this.isIOS()) {
			return false;
		}

		testVolume = 0.9;  
		audio = new Audio();
		audio.volume = testVolume;

		return ( audio.volume === testVolume );
	};

	AblePlayer.prototype.nativeFullscreenSupported = function () {

		return document.fullscreenEnabled || document.webkitFullscreenEnabled;
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.seekTo = function (newTime) {

		var thisObj = this;

		this.seekFromTime = this.media.currentTime;
		this.seekToTime = newTime;

		this.seeking = true;
		this.liveUpdatePending = true;

		if (this.speakingDescription) {
			this.synth.cancel();
		}

		this.syncSignVideo( {'time' : this.startTime } );

		if (this.player === 'html5') {
			var seekable;

			this.startTime = newTime;
			seekable = this.media.seekable;
			if (seekable.length > 0 && this.startTime >= seekable.start(0) && this.startTime <= seekable.end(0)) {
				this.media.currentTime = this.startTime;
				this.seekStatus = 'complete';
				this.syncSignVideo( { 'time' : this.startTime } );
			}
		} else if (this.player === 'youtube') {
			this.youTubePlayer.seekTo(newTime,true);
			if (newTime > 0) {
				if (typeof this.$posterImg !== 'undefined') {
					this.$posterImg.hide();
				}
			}
			this.syncSignVideo( {'time' : newTime } );
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.setCurrentTime(newTime).then(function() {
				thisObj.elapsed = newTime;
				thisObj.refreshControls('timeline');
			})
		}
		this.refreshControls('timeline');
	};

	AblePlayer.prototype.getMediaTimes = function (duration, elapsed) {



		var deferred, promise, thisObj, mediaTimes;
		mediaTimes = {};

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		if (typeof duration !== 'undefined' && typeof elapsed !== 'undefined') {
			mediaTimes['duration'] = duration;
			mediaTimes['elapsed'] = elapsed;
			deferred.resolve(mediaTimes);
		} else {
			this.getDuration().then(function(duration) {
				mediaTimes['duration'] = thisObj.roundDown(duration,6);
				thisObj.getElapsed().then(function(elapsed) {
					mediaTimes['elapsed'] = thisObj.roundDown(elapsed,6);
					deferred.resolve(mediaTimes);
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.getDuration = function () {

		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				 this.vimeoPlayer.getDuration().then(function(duration) {
					if (duration === undefined || isNaN(duration) || duration === -1) {
						deferred.resolve(0);
					} else {
						deferred.resolve(duration);
					}
				});
			} else { 
				deferred.resolve(0);
			}
		} else {
			var duration;
			if (this.player === 'html5') {
				duration = this.media.duration;
			} else if (this.player === 'youtube') {
				if (this.youTubePlayerReady) {
					if (this.duration > 0) {
						duration = this.duration;
					} else {
						duration = this.youTubePlayer.getDuration();
					}
				} else { 
					duration = 0;
				}
			}
			if (duration === undefined || isNaN(duration) || duration === -1) {
				deferred.resolve(0);
			} else {
				deferred.resolve(duration);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getElapsed = function () {


		var deferred, promise, thisObj;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'vimeo') {
			if (this.vimeoPlayer) {
				this.vimeoPlayer.getCurrentTime().then(function(elapsed) {
					if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
						deferred.resolve(0);
					} else {
						deferred.resolve(elapsed);
					}
				});
			} else { 
				deferred.resolve(0);
			}
		} else {
			var elapsed;
			if (this.player === 'html5') {
				elapsed = this.media.currentTime;
			} else if (this.player === 'youtube') {
				if (this.youTubePlayerReady) {
					elapsed = this.youTubePlayer.getCurrentTime();
				} else { 
					elapsed = 0;
				}
			}
			if (elapsed === undefined || isNaN(elapsed) || elapsed === -1) {
				deferred.resolve(0);
			} else {
				deferred.resolve(elapsed);
			}
		}
		return promise;
	};

	AblePlayer.prototype.getPlayerState = function () {


		var deferred, promise, thisObj;
		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;

		if (this.player === 'html5') {
			if (this.media.ended) {
				deferred.resolve('ended');
			} else if (this.media.paused) {
				deferred.resolve('paused');
			} else if (this.media.readyState !== 4) {
				deferred.resolve('buffering');
			} else {
				deferred.resolve('playing');
			}
		} else if (this.player === 'youtube' && this.youTubePlayerReady) {
			var state = this.youTubePlayer.getPlayerState();
			if (state === -1 || state === 5) {
				deferred.resolve('stopped');
			} else if (state === 0) {
				deferred.resolve('ended');
			} else if (state === 1) {
				deferred.resolve('playing');
			} else if (state === 2) {
				deferred.resolve('paused');
			} else if (state === 3) {
				deferred.resolve('buffering');
			}
		} else if (this.player === 'vimeo' && this.vimeoPlayer) {
			this.vimeoPlayer.getPaused().then(function(paused) {
				if (paused) {
					deferred.resolve('paused');
				} else {
					thisObj.vimeoPlayer.getEnded().then(function(ended) {
						if (ended) {
							deferred.resolve('ended');
						} else {
							deferred.resolve('playing');
						}
					});
				}
			});
		}
		return promise;
	};

	AblePlayer.prototype.isPlaybackRateSupported = function () {

		if (this.player === 'html5') {
			return (this.media.playbackRate) ? true : false;
		} else if (this.player === 'youtube') {
			if (this.youTubePlayerReady) {
				return (this.youTubePlayer.getAvailablePlaybackRates().length > 1) ? true : false;
			} else {
				return false;
			}
		} else if (this.player === 'vimeo') {
			return this.vimeoSupportsPlaybackRateChange;
		}
	};

	AblePlayer.prototype.setPlaybackRate = function (rate) {

		rate = Math.max(0.5, rate);

		if (this.hasClosedDesc && this.descMethod === 'text') {
			this.syncSpeechToPlaybackRate(rate);
		}

		this.syncSignVideo( {'rate' : rate } );

		if (this.player === 'html5') {
			this.media.playbackRate = rate;
		} else if (this.player === 'youtube') {
			this.youTubePlayer.setPlaybackRate(rate);
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.setPlaybackRate(rate);
		}
		this.syncSignVideo( { 'rate' : rate } );
		this.playbackRate = rate;
		this.$speed.text( this.translate( 'speed', 'Speed' ) + ': ' + rate.toFixed(2).toString() + 'x');
	};

	AblePlayer.prototype.getPlaybackRate = function () {

		if (this.player === 'html5') {
			return this.media.playbackRate;
		} else if (this.player === 'youtube' && (this.youTubePlayerReady)) {
			return this.youTubePlayer.getPlaybackRate();
		}
	};

	AblePlayer.prototype.isPaused = function () {


		if (this.player === 'vimeo') {
			return (this.playing) ? false : true;
		} else {
			this.getPlayerState().then(function(state) {
				return state === 'paused' || state === 'stopped' || state === 'ended';
			});
		}
	};

	AblePlayer.prototype.syncSignVideo = function(options) {
		if (this.hasSignLanguage && ( this.signVideo || this.signYoutube ) ) {
			if (options && typeof options.time !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.currentTime = options.time;
				} else {
					this.youTubeSignPlayer.seekTo(options.time,true);
				}
			}
			if (options && typeof options.rate !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.playbackRate = options.rate;
				} else {
					this.youTubeSignPlayer.setPlaybackRate(options.rate);
				}
			}
			if (options && typeof options.pause !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.pause(true);
				} else {
					this.youTubeSignPlayer.pauseVideo();
				}
			}
			if (options && typeof options.play !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.play(true);
				} else {
					this.youTubeSignPlayer.playVideo();
				}
			}
			if (options && typeof options.volume !== 'undefined') {
				if ( this.signVideo ) {
					this.signVideo.volume = 0;
				}
			}
		}
	};

	AblePlayer.prototype.pauseMedia = function () {

		this.syncSignVideo( { 'pause' : true } );

		if (this.player === 'html5') {
			this.media.pause(true);
		} else if (this.player === 'youtube') {
			this.youTubePlayer.pauseVideo();
		} else if (this.player === 'vimeo') {
			this.vimeoPlayer.pause();
		}
	};

	AblePlayer.prototype.playMedia = function () {

		this.syncSignVideo( { 'play' : true } );

		if (this.player === 'html5') {
			this.media.play(true);
		} else if (this.player === 'youtube') {

			this.youTubePlayer.playVideo();
			if (typeof this.$posterImg !== 'undefined') {
				this.$posterImg.hide();
			}
			this.stoppingYouTube = false;
		} else if (this.player === 'vimeo') {
			 this.vimeoPlayer.play();
		}
		this.startedPlaying = true;
		if (this.hideControls) {
			this.hidingControls = true;
			this.invokeHideControlsTimeout();
		}
	};

	AblePlayer.prototype.fadeControls = function(direction) {



		var thisObj = this;

		if (direction == 'out') {
			this.$playerDiv.addClass( 'fade-out' ).removeClass( 'fade-in' );
		} else if (direction == 'in') {
			this.$playerDiv.addClass( 'fade-in' ).removeClass( 'fade-out' );
		}
	};

	AblePlayer.prototype.invokeHideControlsTimeout = function () {

		var thisObj = this;
		this.hideControlsTimeout = window.setTimeout(function() {
			if (typeof thisObj.playing !== 'undefined' && thisObj.playing === true && thisObj.hideControls) {
				thisObj.fadeControls('out');
				thisObj.controlsHidden = true;
			}
		},5000);
		this.hideControlsTimeoutStatus = 'active';
	};

	AblePlayer.prototype.refreshControls = function(context = 'init', duration, elapsed) {


		context = 'init';


		var thisObj, duration,  textByState, timestamp,  captionsCount, newTop,	statusBarWidthBreakpoint;

		thisObj = this;
		if ( this.swappingSrc && this.playing ) {
			return;
		}

		if ( context === 'timeline' || context === 'init' ) {
			var lastChapterIndex, displayElapsed, updateLive, widthUsed,
				leftControls, rightControls, seekbarWidth, buffered;
			if (typeof this.duration === 'undefined') {
				return;
			}
			if (this.useChapterTimes) {
				this.chapterDuration = this.getChapterDuration();
				this.chapterElapsed = this.getChapterElapsed();
			}

			if ( !this.useFixedSeekInterval && !this.seekIntervalCalculated && this.duration > 0) {
				this.setSeekInterval();
			}

			if (this.seekBar) {
				if (this.useChapterTimes) {
					lastChapterIndex = this.selectedChapters.cues.length-1;
					if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
						if (this.currentChapter.end !== this.duration) {
							this.seekBar.setDuration(this.duration - this.currentChapter.start);
						} else {
							this.seekBar.setDuration(this.chapterDuration);
						}
					} else {
						this.seekBar.setDuration(this.chapterDuration);
					}
				} else if ( !(this.duration === undefined || isNaN(this.duration) || this.duration === -1) ) {
					this.seekBar.setDuration(this.duration);
				}
				if (!(this.seekBar.tracking)) {
					updateLive = this.liveUpdatePending || this.seekBar.seekHead.is($(document.activeElement));
					this.liveUpdatePending = false;
					if (this.useChapterTimes) {
						this.seekBar.setPosition(this.chapterElapsed, updateLive);
					} else {
						this.seekBar.setPosition(this.elapsed, updateLive);
					}
				}

				if (this.seekBar.tracking) {
					displayElapsed = this.seekBar.lastTrackPosition;
				} else {
					displayElapsed = ( this.useChapterTimes ) ? this.chapterElapsed : this.elapsed;
				}
			}
			if (typeof this.$durationContainer !== 'undefined') {
				if (this.useChapterTimes) {
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.chapterDuration));
				} else {
					this.$durationContainer.text(' / ' + this.formatSecondsAsColonTime(this.duration));
				}
			}
			if (typeof this.$elapsedTimeContainer !== 'undefined') {
				this.$elapsedTimeContainer.text(this.formatSecondsAsColonTime(displayElapsed));
			}

			if (this.skin === 'legacy') {
				if (this.seekBar) {
					let controlWrapper = this.seekBar.wrapperDiv.parent().parent();
					leftControls = this.seekBar.wrapperDiv.parent().prev('div.able-left-controls');
					rightControls = leftControls.next('div.able-right-controls');
					widthUsed = leftControls.outerWidth(true);
					rightControls.children().each(function () {
						if ($(this).attr('role')=='button') {
							widthUsed += $(this).outerWidth(true) + 5;
						}
					});
					if (this.fullscreen) {
						seekbarWidth = $(window).width() - widthUsed;
					} else {
						seekbarWidth = controlWrapper.width() - widthUsed - 10;
					}
					if (Math.abs(seekbarWidth - this.seekBar.getWidth()) > 5) {
						this.seekBar.setWidth(seekbarWidth);
					}
				}
			}

			if (this.player === 'html5' && this.media.buffered.length > 0) {
				buffered = this.media.buffered.end(0);
				if (this.useChapterTimes) {
					if (buffered > this.chapterDuration) {
						buffered = this.chapterDuration;
					}
					if (this.seekBar) {
						this.seekBar.setBuffered(buffered / this.chapterDuration);
					}
				} else if ( this.seekBar && !isNaN(buffered) ) {
					this.seekBar.setBuffered(buffered / duration);
				}
			} else if (this.player === 'youtube' && this.seekBar && this.youTubePlayerReady ) {
				this.seekBar.setBuffered(this.youTubePlayer.getVideoLoadedFraction());
			} else if (this.player === 'vimeo') {
			}
		}

		if (context === 'descriptions' || context == 'init') {
			if (this.$descButton) {
				this.toggleButtonState(
					this.$descButton,
					this.descOn,
					this.translate( 'turnOffDescriptions', 'Turn off descriptions' ),
					this.translate( 'turnOnDescriptions', 'Turn on descriptions' ),
				);
			}
		}

		if (context === 'captions' || context == 'init') {

			if (this.$ccButton) {

				captionsCount = this.captions.length;
				if (captionsCount > 1) {
					this.$ccButton.attr({
						'aria-haspopup': 'true',
						'aria-controls': this.mediaId + '-captions-menu'
					});
				}
				var ariaLabelOn = ( captionsCount > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'showCaptions', 'Show captions' );
				var ariaLabelOff = ( captionsCount > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'hideCaptions', 'Hide captions' );
				var ariaPressed = ( captionsCount > 1 ) ? true : false;

				this.toggleButtonState(
					this.$ccButton,
					this.captionsOn,
					ariaLabelOff,
					ariaLabelOn,
					ariaPressed
				);
			}
		}

		if (context === 'fullscreen' || context == 'init'){
			if (this.$fullscreenButton) {
				if (!this.fullscreen) {
					this.$fullscreenButton.attr( 'aria-label', this.translate( 'enterFullScreen', 'Enter full screen' ) );
					this.getIcon( this.$fullscreenButton, 'fullscreen-expand' );
				} else {
					this.$fullscreenButton.attr('aria-label', this.translate( 'exitFullScreen', 'Exit full screen' ) );
					this.getIcon( this.$fullscreenButton, 'fullscreen-collapse' );
				}
			}
		}
		if (context === 'playpause' || context == 'init'){
			if (typeof this.$bigPlayButton !== 'undefined' && typeof this.seekBar !== 'undefined') {
				if (this.paused && !this.seekBar.tracking) {
					if (!this.hideBigPlayButton) {
						this.$bigPlayButton.show();
						this.$bigPlayButton.attr('aria-hidden', 'false');
					}
				} else {
					this.$bigPlayButton.hide();
					this.$bigPlayButton.attr('aria-hidden', 'true');
				}
			}
		}

		if (context === 'transcript' || context == 'init'){

			if (this.transcriptType) {
				if (this.prefAutoScrollTranscript === 1) {
					this.autoScrollTranscript = true;
					this.$autoScrollTranscriptCheckbox.prop('checked',true);
				} else {
					this.autoScrollTranscript = false;
					this.$autoScrollTranscriptCheckbox.prop('checked',false);
				}

				if (this.autoScrollTranscript && this.currentHighlight) {
					newTop = Math.floor(this.$transcriptDiv.scrollTop() +
						$(this.currentHighlight).position().top -
						(this.$transcriptDiv.height() / 2) +
						($(this.currentHighlight).height() / 2));
					if (newTop !== Math.floor(this.$transcriptDiv.scrollTop())) {
						this.scrollingTranscript = true;
						if (this.movingHighlight) {
							this.$transcriptDiv.scrollTop(newTop);
							this.movingHighlight = false;
						}
					}
				}
			}
		}

		if (context === 'init') {

			if (this.$chaptersButton) {
				this.$chaptersButton.attr({
					'aria-label': this.translate( 'chapters', 'Chapters' ),
					'aria-haspopup': 'true',
					'aria-controls': this.mediaId + '-chapters-menu'
				});
			}
		}

		if (context === 'timeline' || context === 'playpause' || context === 'init') {

			textByState = {
				'stopped': this.translate( 'statusStopped', 'Stopped' ),
				'paused': this.translate( 'statusPaused', 'Paused' ),
				'playing': this.translate( 'statusPlaying', 'Playing' ),
				'buffering': this.translate( 'statusBuffering', 'Buffering' ),
				'ended': this.translate( 'statusEnd', 'End of track' )
			};

			if (this.stoppingYouTube) {
				if (this.$status.text() !== this.translate( 'statusStopped', 'Stopped' ) ) {
					this.$status.text( this.translate( 'statusStopped', 'Stopped' ) );
				}
				this.getIcon( this.$playpauseButton, 'play' );
			} else if (typeof this.$status !== 'undefined' && typeof this.seekBar !== 'undefined') {
				this.getPlayerState().then(function(currentState) {
					if (thisObj.$status.text() !== textByState[currentState] && !thisObj.seekBar.tracking) {
						if (thisObj.swappingSrc) {
							if (!thisObj.debouncingStatus) {
								thisObj.statusMessageThreshold = 2000; 
							}
						} else if (!thisObj.debouncingStatus) {
							thisObj.statusMessageThreshold = 250; 
						}
						timestamp = (new Date()).getTime();
						if (!thisObj.statusDebounceStart) {
							thisObj.statusDebounceStart = timestamp;
							thisObj.debouncingStatus = true;
							thisObj.statusTimeout = setTimeout(function () {
								thisObj.debouncingStatus = false;
								thisObj.refreshControls(context);
							}, thisObj.statusMessageThreshold);
						} else if ((timestamp - thisObj.statusDebounceStart) > thisObj.statusMessageThreshold) {
							thisObj.$status.text(textByState[currentState]);
							thisObj.statusDebounceStart = null;
							clearTimeout(thisObj.statusTimeout);
							thisObj.statusTimeout = null;
						}
					} else {
						thisObj.statusDebounceStart = null;
						thisObj.debouncingStatus = false;
						clearTimeout(thisObj.statusTimeout);
						thisObj.statusTimeout = null;
					}
					if (!thisObj.seekBar.tracking && !thisObj.stoppingYouTube) {
						if (currentState === 'paused' || currentState === 'stopped' || currentState === 'ended') {
							thisObj.$playpauseButton.attr('aria-label',thisObj.tt.play);
							thisObj.getIcon( thisObj.$playpauseButton, 'play' );
						} else {
							thisObj.$playpauseButton.attr('aria-label',thisObj.tt.pause);
							thisObj.getIcon( thisObj.$playpauseButton, 'pause' );
						}
					}
				});
			}
		}

		if (!this.fullscreen) {
			statusBarWidthBreakpoint = 300;
			if (this.$statusBarDiv.width() < statusBarWidthBreakpoint) {
				this.$statusBarDiv.find('span.able-speed').hide();
				this.hidingSpeed = true;
			} else {
				if (this.hidingSpeed) {
					this.$statusBarDiv.find('span.able-speed').show();
					this.hidingSpeed = false;
				}
			}
		}

	};

	AblePlayer.prototype.handlePlay = function(e) {
		if (this.paused) {
			this.okToPlay = true;
			this.playMedia();
			if (this.synth.paused) {
				this.synth.resume();
			}
		} else {
			this.okToPlay = false;
			this.pauseMedia();
			if (this.speakingDescription) {
				this.synth.pause();
			}
		}
		if (this.speechEnabled === null) {
			this.initSpeech('play');
		}
	};

	AblePlayer.prototype.handleRestart = function() {

		if (this.speakingDescription) {
			this.synth.cancel();
		}
		this.seekTo(0);
	};

	AblePlayer.prototype.handlePrevTrack = function() {

		this.playlistIndex = (this.playlistIndex === 0) ? this.$playlist.length - 1 : this.playlistIndex--;
		this.cueingPlaylistItem = true; 
		this.cuePlaylistItem(this.playlistIndex);
	};

	AblePlayer.prototype.handleNextTrack = function() {

		this.playlistIndex = (this.playlistIndex === this.$playlist.length - 1) ? 0 : this.playlistIndex++;
		this.cueingPlaylistItem = true; 
		this.cuePlaylistItem(this.playlistIndex);
	};

	AblePlayer.prototype.handleRewind = function() {

		var targetTime;

		targetTime = this.elapsed - this.seekInterval;
		if (this.useChapterTimes && (targetTime < this.currentChapter.start)) {
			targetTime = this.currentChapter.start;
		} else if (targetTime < 0) {
			targetTime = 0;
		}
		this.seekTo(targetTime);
	};

	AblePlayer.prototype.handleFastForward = function() {

		var targetTime, lastChapterIndex;

		lastChapterIndex = this.chapters.length-1;
		targetTime = this.elapsed + this.seekInterval;
		if (this.useChapterTimes) {
			if (this.chapters[lastChapterIndex] == this.currentChapter) {
				if (targetTime > this.duration || targetTime > this.currentChapter.end) {
					targetTime = Math.min(this.duration, this.currentChapter.end);
				} else if (this.duration % targetTime < this.seekInterval) {
					targetTime = Math.min(this.duration, this.currentChapter.end);
				}
			} else {
				if (targetTime > this.currentChapter.end) {
					targetTime = this.currentChapter.end;
				}
			}
		} else {
			if (targetTime > this.duration) {
				targetTime = this.duration;
			}
		}
		this.seekTo(targetTime);
	};

	AblePlayer.prototype.handleRateIncrease = function() {
		this.changeRate(1);
	};

	AblePlayer.prototype.handleRateDecrease = function() {
		this.changeRate(-1);
	};

	AblePlayer.prototype.changeRate = function (dir) {

		var rates, currentRate, index, newRate, vimeoMin, vimeoMax;

		if (this.player === 'html5') {
			this.setPlaybackRate(this.getPlaybackRate() + (0.25 * dir));
		} else if (this.player === 'youtube') {
			if (this.youTubePlayerReady) {
				rates = this.youTubePlayer.getAvailablePlaybackRates();
				currentRate = this.getPlaybackRate();
				index = rates.indexOf(currentRate);
				if (index === -1) {

									} else {
					index += dir;
					if (index < rates.length && index >= 0) {
						this.setPlaybackRate(rates[index]);
					}
				}
			}
		} else if (this.player === 'vimeo') {
			vimeoMin = 0.5;
			vimeoMax = 2;
			if (dir === 1) {
				newRate = (this.vimeoPlaybackRate + 0.5 <= vimeoMax) ? this.vimeoPlaybackRate + 0.5 : vimeoMax;
			} else if (dir === -1) {
				newRate = (this.vimeoPlaybackRate - 0.5 >= vimeoMin) ? this.vimeoPlaybackRate - 0.5 : vimeoMin;
			}
			this.setPlaybackRate(newRate);
		}
	};

	AblePlayer.prototype.handleCaptionToggle = function() {

		var thisObj = this;
		var captions, ariaPressed;
		if (this.hidingPopup) {
			this.hidingPopup = false;
			return false;
		}

		captions = (this.captions.length) ? this.captions : [];
		if (captions.length === 1) {
			if (this.captionsOn === true) {
				this.captionsOn = false;
				this.prefCaptions = 0;
				ariaPressed = false;
				this.updatePreferences('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.unloadModule('captions');
				} else if (this.usingVimeoCaptions) {
					this.vimeoPlayer.disableTextTrack();
				} else {
					this.$captionsWrapper.hide();
				}
			} else {
				this.captionsOn = true;
				this.prefCaptions = 1;
				ariaPressed = true;
				this.updatePreferences('prefCaptions');
				if (this.usingYouTubeCaptions) {
					this.youTubePlayer.loadModule('captions');
				} else if (this.usingVimeoCaptions) {
					this.vimeoPlayer.enableTextTrack(this.captionLang).then(function(track) {
					}).catch(function(error) {
						switch (error.name) {
							case 'InvalidTrackLanguageError':

																break;
							case 'InvalidTrackError':

																break;
							default:

																break;
							}
					});
				} else {
					this.$captionsWrapper.show();
				}
				for (var i=0; i<captions.length; i++) {
					if (captions[i].def === true) { 
						this.selectedCaptions = captions[i];
					}
				}
				this.selectedCaptions = this.captions[0];
				if (this.descriptions.length >= 0) {
					this.selectedDescriptions = this.descriptions[0];
				}
			}
		} else {
			if (this.captionsPopup && this.captionsPopup.is(':visible')) {
				this.captionsPopup.hide();
				this.hidingPopup = false;
				this.$ccButton.attr('aria-expanded', 'false')
				this.waitThenFocus(this.$ccButton);
			} else {
				this.closePopups();
				if (this.captionsPopup) {
					this.captionsPopup.show();
					this.$ccButton.attr('aria-expanded','true');

					setTimeout(function() {
						thisObj.captionsPopup.css('top', thisObj.$ccButton.position().top - thisObj.captionsPopup.outerHeight());
						thisObj.captionsPopup.css('left', thisObj.$ccButton.position().left)
						thisObj.captionsPopup.find('li').removeClass('able-focus');
						thisObj.captionsPopup.find('li').first().trigger('focus').addClass('able-focus');
					}, 50);
				}
			}
		}
		var ariaLabelOn = ( captions.length > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'showCaptions', 'Show captions' );
		var ariaLabelOff = ( captions.length > 1 ) ? this.translate( 'captions', 'Captions' ) : this.translate( 'hideCaptions', 'Hide captions' );

		this.toggleButtonState(
			this.$ccButton,
			this.captionsOn,
			ariaLabelOff,
			ariaLabelOn,
			ariaPressed
		);
	};

	AblePlayer.prototype.waitThenFocus = function($el, timeout) {

		var _timeout = (timeout === undefined || timeout === null) ? 50 : timeout;

		setTimeout(function() {
			$el.trigger('focus');
		}, _timeout);
	}

	AblePlayer.prototype.handleChapters = function () {
		if (this.hidingPopup) {
			this.hidingPopup = false;
			return false;
		}
		if (this.chaptersPopup.is(':visible')) {
			this.chaptersPopup.hide();
			this.hidingPopup = false;
			this.$chaptersButton.attr('aria-expanded','false').trigger('focus');
		} else {
			this.closePopups();
			this.chaptersPopup.show();
			this.$chaptersButton.attr('aria-expanded','true');
			this.chaptersPopup.css('top', this.$chaptersButton.position().top - this.chaptersPopup.outerHeight());
			this.chaptersPopup.css('left', this.$chaptersButton.position().left)

			this.chaptersPopup.find('li').removeClass('able-focus');
			if (this.chaptersPopup.find('li[aria-checked="true"]').length) {
				this.chaptersPopup.find('li[aria-checked="true"]').trigger('focus').addClass('able-focus');
			} else {
				this.chaptersPopup.find('li').first().addClass('able-focus').attr('aria-checked','true').trigger('focus');
			}
		}
	};

	AblePlayer.prototype.handleDescriptionToggle = function() {

		this.descOn = !this.descOn;
		this.prefDesc = + this.descOn; 
		this.updatePreferences('prefDesc');
		if (typeof this.$descDiv !== 'undefined') {
			if (!this.$descDiv.is(':hidden')) {
				this.$descDiv.hide();
			}
		}
		this.initDescription();
		this.refreshControls('descriptions');
	};

	AblePlayer.prototype.handlePrefsClick = function(pref) {



		var thisObj, prefsButtonPosition, prefsMenuRight, prefsMenuLeft;

		thisObj = this;

		if (this.speechEnabled === null) {
			this.initSpeech('prefs');
		}
		if (this.hidingPopup) {
			this.hidingPopup = false;
			return false;
		}
		if (this.prefsPopup.is(':visible')) {
			this.prefsPopup.hide();
			this.$prefsButton.attr('aria-expanded','false');
			this.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
			if (!this.showingPrefsDialog) {
				this.$prefsButton.trigger('focus');
			}
			setTimeout(function() {
				thisObj.hidingPopup = false;
			},100);
		} else {
			this.closePopups();
			this.prefsPopup.show();
			this.$prefsButton.attr('aria-expanded','true');
			this.$prefsButton.trigger('focus'); 
			setTimeout(function() {
				prefsButtonPosition = thisObj.$prefsButton.position();
				prefsMenuRight = thisObj.$ableDiv.width() - 5;
				prefsMenuLeft = prefsMenuRight - thisObj.prefsPopup.width();
				thisObj.prefsPopup.css('top', prefsButtonPosition.top - thisObj.prefsPopup.outerHeight());
				thisObj.prefsPopup.css('left', prefsMenuLeft);
				thisObj.prefsPopup.find('li').removeClass('able-focus').attr('tabindex','0');
				thisObj.prefsPopup.find('li').first().trigger('focus').addClass('able-focus');
			}, 50);
		}
	};

	AblePlayer.prototype.handleTranscriptToggle = function () {
		var thisObj = this;
		var visible = this.$transcriptDiv.is(':visible');
		if ( visible ) {
			this.$transcriptArea.hide();
			this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
			this.prefTranscript = 0;
			if ( this.transcriptType === 'popup' ) {
				this.$transcriptButton.trigger('focus').addClass('able-focus');
				setTimeout(function() {
					thisObj.closingTranscript = false;
				}, 100);
			}
		} else {
			if ( this.transcriptType === 'popup' ) {
				this.positionDraggableWindow('transcript');
				this.$transcriptArea.show();
				this.$transcriptPopup.hide();
				this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
				this.prefTranscript = 1;
				this.focusNotClick = true;
				this.$transcriptArea.find('button').first().trigger('focus');
				setTimeout(function() {
					thisObj.focusNotClick = false;
				}, 100);
			} else {
				this.toggleButtonState( this.$transcriptButton, ! visible, this.translate( 'hideTranscript', 'Hide transcript' ), this.translate( 'showTranscript', 'Show transcript' ) );
				this.$transcriptArea.show();
			}
		}
		this.updatePreferences('prefTranscript');
	};

	AblePlayer.prototype.handleSignToggle = function () {

		var thisObj = this;
		var visible = this.$signWindow.is(':visible');
		if ( visible ) {
			this.$signWindow.hide();
			this.toggleButtonState( this.$signButton, ! visible, this.translate( 'hideSign', 'Hide sign language' ), this.translate( 'showSign', 'Show sign language' ) );
			this.prefSign = 0;
			this.$signButton.trigger('focus').addClass('able-focus');
			setTimeout(function() {
				thisObj.closingSign = false;
			}, 100);
		} else {
			this.positionDraggableWindow('sign');
			this.$signWindow.show();
			this.$signPopup.hide();
			this.toggleButtonState( this.$signButton, ! visible, this.translate( 'hideSign', 'Hide sign language' ), this.translate( 'showSign', 'Show sign language' ) );
			this.prefSign = 1;
			this.focusNotClick = true;
			this.$signWindow.find('button').first().trigger('focus');
			setTimeout(function() {
				thisObj.focusNotClick = false;
			}, 100);
		}
		this.updatePreferences('prefSign');
	};

	AblePlayer.prototype.setFullscreen = function (fullscreen) {

		if (this.fullscreen == fullscreen) {
			return;
		}
		var thisObj = this;
		var $el = this.$ableWrapper;
		var el = $el[0];

		if (this.nativeFullscreenSupported()) {
			if (fullscreen) {
				var scroll = {
					x: window.pageXOffset || 0,
					y: window.pageYOffset || 0
				}
				if (this.prefTranscript === 1) {
					this.rePositionDraggableWindow("transcript");
				}
				if (this.prefSign === 1) {
					this.rePositionDraggableWindow("sign");
				}
				this.scrollPosition = scroll;
				if (el.requestFullscreen) {
					el.requestFullscreen();
				} else if (el.webkitRequestFullscreen) {
					el.webkitRequestFullscreen();
				}
				this.fullscreen = true;
			} else {
				this.restoringAfterFullscreen = true;
				if (document.exitFullscreen) {
					document.exitFullscreen();
				} else if (document.webkitExitFullscreen) {
					document.webkitExitFullscreen();
				} else if (document.webkitCancelFullscreen) {
					document.webkitCancelFullscreen();
				}
				if (this.prefTranscript === 1) {
					this.positionDraggableWindow("transcript");
				}
				if (this.prefSign === 1) {
					this.positionDraggableWindow("sign");
				}
				this.fullscreen = false;
			}
		} else {
		}
		$(document).on('fullscreenchange webkitfullscreenchange', function(e) {
			if (!thisObj.fullscreen) {
				thisObj.restoringAfterFullscreen = true;
			} else if (!thisObj.clickedFullscreenButton) {
				thisObj.fullscreen = false;
				thisObj.restoringAfterFullscreen = true;
			}
			thisObj.resizePlayer();
			thisObj.refreshControls('fullscreen');
			if ( thisObj.scrollPosition ) {
				scroll = thisObj.scrollPosition;
				window.scrollTo( scroll.x, scroll.y );
			}
			setTimeout(function() {
				thisObj.clickedFullscreenButton = false;
				thisObj.restoringAfterFullscreen = false;
			},100);
		});
	};

	AblePlayer.prototype.handleFullscreenToggle = function () {

		var stillPaused = this.paused;
		this.setFullscreen(!this.fullscreen);
		if (stillPaused) {
			this.pauseMedia(); 
		} else if (!stillPaused) {
			this.playMedia(); 
		}
		if (this.fullscreen) {
			this.hideControls = true;
			if (this.playing) {
				this.fadeControls('out');
				this.controlsHidden = true;
			}
		} else {
			this.hideControls = this.hideControlsOriginal;
			if (!this.hideControls) { 
				if (this.controlsHidden) {
					this.fadeControls('in');
					this.controlsHidden = false;
				}
				if (this.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(this.hideControlsTimeout);
					this.hideControlsTimeoutStatus = 'clear';
				}
			}
		}
	};

	AblePlayer.prototype.handleTranscriptLockToggle = function (val) {

		this.autoScrollTranscript = val; 
		this.prefAutoScrollTranscript = +val; 
		this.updatePreferences('prefAutoScrollTranscript');
		this.refreshControls('transcript');
	};

	AblePlayer.prototype.getIcon = function( $button, id, forceImg = false ) {
		var iconType = this.iconType;
		var iconData = this.getIconData( id );
		iconType = ( null === iconData[3] ) ? 'svg' : iconType;
		iconType =  ( forceImg === true ) ? 'img' : iconType;

		var existingIcon = $button.find( iconType + '#ableplayer-' + id );
		if ( existingIcon.length > 0 ) {
			return;
		}
		$button.find('svg, img, span').remove();

		if (iconType === 'font') {
			var $buttonIcon = $('<span>', {
				'class': iconData[2],
			});
			$button.append( $buttonIcon );
		} else if (iconType === 'svg') {
			function getNode(n, v) {
				n = document.createElementNS("http://www.w3.org/2000/svg", n);
				for (var p in v) {
					n.setAttributeNS(null, p.replace(/[A-Z]/g, function(m) {
						return "-" + m.toLowerCase();
					}), v[p]);
				}
				return n;
			}
			var icon = document.createElementNS( 'http://www.w3.org/2000/svg', 'svg' );
			icon.setAttribute( 'focusable', 'false' );
			icon.setAttribute( 'aria-hidden', 'true');
			icon.setAttribute( 'viewBox', iconData[0] );
			icon.setAttribute( 'id', 'ableplayer-' + id );
			let path = getNode( 'path', { d: iconData[1] } );
			icon.appendChild( path );

			$button.append( icon );
			$button.html($button.html());
		} else {
			var $buttonImg = $('<img>',{
				'src': iconData[3],
				'alt': '',
				'role': 'presentation'
			});
			$button.append($buttonImg);
			$button.find('img').attr('src',iconData[3]);
		}
	};

	AblePlayer.prototype.setText = function( $button, text ) {
		$button.attr( 'aria-label', text );
	};

	AblePlayer.prototype.toggleButtonState = function($button, isOn, onLabel, offLabel, ariaPressed = false, ariaExpanded = false) {
		let buttonOff = ( $button.hasClass( 'buttonOff' ) ) ? true : false;
		if ( buttonOff && ! isOn || ! buttonOff && isOn ) {
			return;
		}
		if (! isOn) {
			$button.addClass('buttonOff').attr('aria-label', offLabel);
			if ( ariaPressed ) {
				$button.attr('aria-pressed', 'false');
			}
			if ( ariaExpanded ) {
				$button.attr( 'aria-expanded', 'false' );
			}
		} else {
			$button.removeClass('buttonOff').attr('aria-label', onLabel);
			if ( ariaPressed ) {
				$button.attr('aria-pressed', 'true');
			}
			if ( ariaExpanded ) {
				$button.attr( 'aria-expanded', 'true' );
			}
		}
	};

	AblePlayer.prototype.showTooltip = function($tooltip) {

		$tooltip.show();
	};

	AblePlayer.prototype.showAlert = function( msg, location = 'main' ) {

		var thisObj, $alertBox, $parentWindow;

		thisObj = this;
		$alertBox = thisObj.$alertBox;
		$parentWindow = thisObj.$ableDiv;
		if (location === 'transcript') {
			$parentWindow = thisObj.$transcriptArea;
		} else if (location === 'sign') {
			$parentWindow = thisObj.$signWindow;
		} else if (location === 'screenreader') {
			$alertBox = thisObj.$srAlertBox;
		}
		$alertBox.find('span').text(msg);
		$alertBox.appendTo($parentWindow)
		$alertBox.css( {'display': 'flex'} );

		if (location !== 'screenreader') {
			setTimeout( function () {
				$alertBox.hide();
			}, 30000 );
		}
	};

	AblePlayer.prototype.showedAlert = function (which) {

		if (which === 'transcript') {
			return this.showedTranscriptAlert ?? false;
		} else if (which === 'sign') {
			return this.showedSignAlert ?? false;
		}
		return false;
	}

	AblePlayer.prototype.resizePlayer = function (width, height) {

		var captionSize, newWidth, newHeight, $iframe;

		if (this.mediaType === 'audio') {
			return;
		}
		if (typeof width !== 'undefined' && typeof height !== 'undefined') {
			this.aspectRatio = height / width;
			if (this.playerWidth) {
				newWidth = this.playerWidth;
				if (this.playerHeight) {
					newHeight = this.playerHeight;
				} else {
					newHeight = Math.round(newWidth * this.aspectRatio);
					this.playerHeight = newHeight;
				}
			} else {
				newWidth = (this.player === 'html5') ? $(window).width() : this.$ableWrapper.width();
				newHeight = Math.round(newWidth * this.aspectRatio);
			}
		} else if (this.fullscreen) {
			this.$ableWrapper.addClass('fullscreen');
			newWidth = $(window).width();
			newHeight = $(window).height() - this.$playerDiv.outerHeight() - 5;
			this.positionCaptions('overlay');
		} else { 
			this.$ableWrapper.removeClass('fullscreen');
			if (this.player === 'html5') {
				newWidth = (this.playerWidth) ? this.playerWidth : $(window).width();
			} else {
				newWidth = this.$ableWrapper.width();
			}
			newHeight = Math.round(newWidth * this.aspectRatio);
			this.positionCaptions(this.prefCaptionsPosition);
		}
		if (this.debug) {

					}
		if (this.player === 'youtube' || this.player === 'vimeo') {
			$iframe = this.$ableWrapper.find('iframe');
			if (this.player === 'youtube' && this.youTubePlayer) {
				this.youTubePlayer.setSize(newWidth,newHeight);
			} else {
				$iframe.attr({
					'width': newWidth,
					'height': newHeight
				});
			}
			if (this.playerWidth && this.playerHeight) {
				if (this.fullscreen) {
					$iframe.css({
						'max-width': '',
						'max-height': ''
					});
				} else {
					$iframe.css({
						'max-width': this.playerWidth + 'px',
						'max-height': this.playerHeight + 'px'
					});
				}
			}
		} else if (this.player === 'html5') {
			if (this.fullscreen) {
				this.$media.attr({
					'width': newWidth,
					'height': newHeight
				});
				this.$ableWrapper.css({
					'width': newWidth,
					'height': newHeight
				});
			} else {
				this.$media.removeAttr('width height');
				this.$ableWrapper.removeAttr( 'style' );
			}
		}
		if (typeof this.$captionsDiv !== 'undefined') {

			var isSmallScreen = false;
			var windowWidth = window.screen.width;
			if ( windowWidth < 1200 ) {
				isSmallScreen = true;
			}
			captionSize = parseInt(this.prefCaptionsSize,10);
			if (this.fullscreen && ! isSmallScreen ) {
				captionSize = (captionSize / 100) + 'vw';
			} else if ( this.fullscreen && isSmallScreen ) {
				captionSize = '1.2rem';
			} else {
				captionSize = captionSize + '%';
			}
			this.$captionsDiv.css({
				'font-size': captionSize
			});
		}
		this.refreshControls();
	};

	AblePlayer.prototype.retrieveOffscreenWindow = function( which, width, height ) {


		var window, windowPos, windowTop, windowLeft, windowRight, windowWidth, windowBottom, windowHeight;

		if (which == 'transcript') {
			window = this.$transcriptArea;
		} else if (which == 'sign') {
			window = this.$signWindow;
		}
		windowWidth = window.width();
		windowHeight = window.height();
		windowPos = window.position();
		windowTop = windowPos.top;
		windowLeft = windowPos.left;
		windowRight = windowLeft + windowWidth;
		windowBottom = windowTop + windowHeight;

		if (windowTop < 0) { 
			windowTop = 10;
			window.css('top',windowTop);
		}
		if (windowLeft < 0) { 
			windowLeft = 10;
			window.css('left',windowLeft);
		}
		if (windowRight > width) { 
			windowLeft = (width - 20) - windowWidth;
			window.css('left',windowLeft);
		}
		if (windowBottom > height) { 
			windowTop = (height - 10) - windowHeight;
			window.css('top',windowTop);
		}
	};

	AblePlayer.prototype.updateZIndex = function(which) {

		var defHighZ, defLowZ, transcriptZ, signZ, newHighZ, newLowZ;

		defHighZ = 8000; 
		defLowZ = 7000; 


		if (typeof this.$transcriptArea === 'undefined' || typeof this.$signWindow === 'undefined' ) {
			if (typeof this.$transcriptArea !== 'undefined') {
				transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
				if (transcriptZ > defLowZ) {
					this.$transcriptArea.css('z-index',defLowZ);
				}
			} else if (typeof this.$signWindow !== 'undefined') {
				signZ = parseInt(this.$signWindow.css('z-index'));
				if (signZ > defHighZ) {
					this.$signWindow.css('z-index',defHighZ);
				}
			}
			return false;
		}


		transcriptZ = parseInt(this.$transcriptArea.css('z-index'));
		signZ = parseInt(this.$signWindow.css('z-index'));

		if (transcriptZ === signZ) {
			newHighZ = defHighZ;
			newLowZ = defLowZ;
		} else if (transcriptZ > signZ) {
			if (which === 'transcript') {
				return false;
			} else {
				newHighZ = transcriptZ;
				newLowZ = signZ;
			}
		} else { 
			if (which === 'sign') {
				return false;
			} else {
				newHighZ = signZ;
				newLowZ = transcriptZ;
			}
		}
		if (which === 'transcript') {
			this.$transcriptArea.css('z-index',newHighZ);
			this.$signWindow.css('z-index',newLowZ);
		} else if (which === 'sign') {
			this.$signWindow.css('z-index',newHighZ);
			this.$transcriptArea.css('z-index',newLowZ);
		}
	};

	AblePlayer.prototype.syncTrackLanguages = function (source, language) {


		var i, captions, descriptions, chapters, meta;

		for (i = 0; i < this.captions.length; i++) {
			if (this.captions[i].language === language) {
				captions = this.captions[i];
			}
		}
		for (i = 0; i < this.chapters.length; i++) {
			if (this.chapters[i].language === language) {
				chapters = this.chapters[i];
			}
		}
		for (i = 0; i < this.descriptions.length; i++) {
			if (this.descriptions[i].language === language) {
				descriptions = this.descriptions[i];
			}
		}
		for (i = 0; i < this.meta.length; i++) {
			if (this.meta[i].language === language) {
				meta = this.meta[i];
			}
		}
		this.transcriptLang = language;
		if (source === 'init' || source === 'captions') {
			this.captionLang = language;
			this.selectedCaptions = captions;
			this.selectedChapters = chapters;
			this.selectedDescriptions = descriptions;
			this.selectedMeta = meta;
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
			this.updateChaptersList();
		} else if (source === 'transcript') {
			this.transcriptCaptions = captions;
			this.transcriptChapters = chapters;
			this.transcriptDescriptions = descriptions;
		}
		if (this.selectedDescriptions) {
			this.setDescriptionVoice();
			if (this.$sampleDescDiv) {
				if (this.sampleText) {
					for (i = 0; i < this.sampleText.length; i++) {
						if (this.sampleText[i].lang === this.selectedDescriptions.language) {
							this.currentSampleText = this.sampleText[i]['text'];
							this.$sampleDescDiv.html(this.currentSampleText);
						}
					}
				}
			}
		}
		this.updateTranscript();
	};

})(jQuery);

(function ($) {
  AblePlayer.prototype.updateCaption = function (time) {
    if (
      !this.usingYouTubeCaptions &&
      !this.usingVimeoCaptions &&
      typeof this.$captionsWrapper !== "undefined"
    ) {
      if (this.captionsOn) {
        this.$captionsWrapper.show();
        if (typeof time !== "undefined") {
          this.showCaptions(time);
        }
      } else if (this.$captionsWrapper) {
        this.$captionsWrapper.hide();
        this.prefCaptions = 0;
      }
    }
  };

  AblePlayer.prototype.updateCaptionsMenu = function (lang) {
    this.captionsPopup.find("li").attr("aria-checked", "false");
    if (typeof lang === "undefined") {
      this.captionsPopup.find("li").last().attr("aria-checked", "true");
    } else {
      this.captionsPopup
        .find("li[lang=" + lang + "]")
        .attr("aria-checked", "true");
    }
  };

  AblePlayer.prototype.getCaptionClickFunction = function (track) {

    var thisObj = this;
    return function () {
      thisObj.selectedCaptions = track;
      thisObj.captionLang = track.language;
      thisObj.currentCaption = -1;
      if (thisObj.usingYouTubeCaptions) {
        if (thisObj.captionsOn) {
          if (
            thisObj.youTubePlayer.getOptions("captions") &&
            thisObj.startedPlaying
          ) {
            thisObj.youTubePlayer.setOption("captions", "track", {
              languageCode: thisObj.captionLang,
            });
          } else {
            thisObj.captionLangPending = thisObj.captionLang;
          }
        } else {
          if (thisObj.youTubePlayer.getOptions("captions")) {
            thisObj.youTubePlayer.setOption("captions", "track", {
              languageCode: thisObj.captionLang,
            });
          } else {
            thisObj.youTubePlayer.loadModule("captions");
            thisObj.captionLangPending = thisObj.captionLang;
          }
        }
      } else if (thisObj.usingVimeoCaptions) {
        thisObj.vimeoPlayer
          .enableTextTrack(thisObj.captionLang)
          .then(function (track) {
          })
          .catch(function (error) {
            switch (error.name) {
              case "InvalidTrackLanguageError":

                                break;
              case "InvalidTrackError":

                                break;
              default:

                                break;
            }
          });
      } else {
        thisObj.syncTrackLanguages("captions", thisObj.captionLang);
        if (!thisObj.swappingSrc) {
          thisObj.updateCaption(thisObj.elapsed);
          thisObj.showDescription(thisObj.elapsed);
        }
      }
      thisObj.captionsOn = true;
      thisObj.hidingPopup = true;
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.attr("aria-expanded", "false");
      if (thisObj.mediaType === "audio") {
        thisObj.$captionsContainer.removeClass("captions-off");
      }
      setTimeout(function () {
        thisObj.hidingPopup = false;
      }, 100);
      thisObj.updateCaptionsMenu(thisObj.captionLang);
      thisObj.waitThenFocus(thisObj.$ccButton);

      thisObj.prefCaptions = 1;
      thisObj.updatePreferences("prefCaptions");
      thisObj.refreshControls("captions");
    };
  };

  AblePlayer.prototype.getCaptionOffFunction = function () {
    var thisObj = this;
    return function () {
      if (thisObj.player == "youtube") {
        thisObj.youTubePlayer.unloadModule("captions");
      } else if (thisObj.usingVimeoCaptions) {
        thisObj.vimeoPlayer.disableTextTrack();
      }
      thisObj.captionsOn = false;
      thisObj.currentCaption = -1;

      if (thisObj.mediaType === "audio") {
        thisObj.$captionsContainer.addClass("captions-off");
      }

      thisObj.hidingPopup = true;
      thisObj.captionsPopup.hide();
      thisObj.$ccButton.attr("aria-expanded", "false");
      setTimeout(function () {
        thisObj.hidingPopup = false;
      }, 100);
      thisObj.updateCaptionsMenu();
      thisObj.waitThenFocus(thisObj.$ccButton);

      thisObj.prefCaptions = 0;
      thisObj.updatePreferences("prefCaptions");
      if (!this.swappingSrc) {
        thisObj.refreshControls("captions");
        thisObj.updateCaption();
      }
    };
  };

  AblePlayer.prototype.showCaptions = function (now) {
    var c, thisCaption, captionText;
    var cues;
    if (this.selectedCaptions.cues.length) {
      cues = this.selectedCaptions.cues;
    } else if (this.captions.length >= 1) {
      cues = this.captions[0].cues;
    } else {
      cues = [];
    }
    for (c = 0; c < cues.length; c++) {
      if (cues[c].start <= now && cues[c].end > now) {
        thisCaption = c;
        break;
      }
    }
    if (typeof thisCaption !== "undefined") {
      if (this.currentCaption !== thisCaption) {
        captionText = this.flattenCueForCaption(cues[thisCaption]).replace( /\n/g, "<br>" );

        this.$captionsDiv.html(captionText);
        this.currentCaption = thisCaption;
        if (captionText.length === 0) {
          this.$captionsDiv.css("display", "none");
        } else {
          this.$captionsDiv.css("display", "inline-block");
        }
      }
    } else {
      this.$captionsDiv.html("").css("display", "none");
      this.currentCaption = -1;
    }
  };

  AblePlayer.prototype.flattenCueForCaption = function (cue) {





    var result = [];

    var flattenComponent = function (component) {
      var result = [],
        ii;
      if (component.type === "string") {
        result.push(component.value);
      } else if (component.type === "v") {
        result.push("(" + component.value + ")");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      } else if (component.type === "i") {
        result.push("<em>");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
        result.push("</em>");
      } else if (component.type === "b") {
        result.push("<strong>");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
        result.push("</strong>");
      } else {
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join("");
    };

    if (typeof cue.components !== "undefined") {
      for (var ii = 0; ii < cue.components.children.length; ii++) {
        result.push(flattenComponent(cue.components.children[ii]));
      }
    }
    return result.join("");
  };

  AblePlayer.prototype.getCaptionsOptions = function (pref) {
    var options = [];

    switch (pref) {
      case "prefCaptionsFont":
        options[0] = ["serif", this.translate( 'serif', 'serif' )];
        options[1] = ["sans-serif", this.translate( 'sans', 'sans-serif' )];
        options[2] = ["cursive", this.translate( 'cursive', 'cursive' )];
        options[3] = ["fantasy", this.translate( 'fantasy', 'fantasy' )];
        options[4] = ["monospace", this.translate( 'monospace', 'monospace' )];
        break;

      case "prefCaptionsColor":
      case "prefCaptionsBGColor":
        options[0] = ["white", this.translate( 'white', 'white' )];
        options[1] = ["yellow", this.translate( 'yellow', 'yellow' )];
        options[2] = ["green", this.translate( 'green', 'green' )];
        options[3] = ["cyan", this.translate( 'cyan', 'cyan' )];
        options[4] = ["blue", this.translate( 'blue', 'blue' )];
        options[5] = ["magenta", this.translate( 'magenta', 'magenta' )];
        options[6] = ["red", this.translate( 'red', 'red' )];
        options[7] = ["black", this.translate( 'black', 'black' )];
        break;

      case "prefCaptionsSize":
        options[0] = "75%";
        options[1] = "100%";
        options[2] = "125%";
        options[3] = "150%";
        options[4] = "200%";
        break;

      case "prefCaptionsOpacity":
        options[0] = "0%";
        options[1] = "25%";
        options[2] = "50%";
        options[3] = "75%";
        options[4] = "100%";
        break;

      case "prefCaptionsStyle":
        options[0] = this.translate( 'captionsStylePopOn', 'Pop-on' );
        options[1] = this.translate( 'captionsStyleRollUp', 'Roll-up' );
        break;

      case "prefCaptionsPosition":
        options[0] = "overlay";
        options[1] = "below";
        break;
    }
    return options;
  };

  AblePlayer.prototype.translatePrefs = function (pref, value, outputFormat) {
    if (outputFormat == "youtube") {
      if (pref === "size") {
        switch (value) {
          case "75%":
            return -1;
          case "100%":
            return 0;
          case "125%":
            return 1;
          case "150%":
            return 2;
          case "200%":
            return 3;
        }
      }
    }
    return false;
  };

  AblePlayer.prototype.stylizeCaptions = function ($element, pref) {
    var property, newValue, opacity;

    if (typeof $element !== "undefined") {
      if (pref == "prefCaptionsPosition") {
        this.positionCaptions();
      } else if (typeof pref !== "undefined") {
        if (pref === "prefCaptionsFont") {
          property = "font-family";
        } else if (pref === "prefCaptionsSize") {
          property = "font-size";
        } else if (pref === "prefCaptionsColor") {
          property = "color";
        } else if (pref === "prefCaptionsBGColor") {
          property = "background-color";
        } else if (pref === "prefCaptionsOpacity") {
          property = "opacity";
        }
        if (pref === "prefCaptionsOpacity") {
          newValue =
            parseFloat($("#" + this.mediaId + "_" + pref).val()) / 100.0;
        } else {
          newValue = $("#" + this.mediaId + "_" + pref).val();
        }
        $element.css(property, newValue);
      } else {
        opacity = parseFloat(this.prefCaptionsOpacity) / 100.0;
        $element.css({
          "font-family": this.prefCaptionsFont,
          color: this.prefCaptionsColor,
          "background-color": this.prefCaptionsBGColor,
          opacity: opacity,
        });
        if ($element === this.$captionsDiv) {
          if (typeof this.$captionsDiv !== "undefined") {
            this.$captionsDiv.css({
              "font-size": this.prefCaptionsSize,
            });
          }
        }
        if (this.prefCaptionsPosition === "below") {
          if (typeof this.$captionsWrapper !== "undefined") {
            this.$captionsWrapper.css({
              "background-color": this.prefCaptionsBGColor,
              opacity: "1",
            });
          }
        } else if (this.prefCaptionsPosition === "overlay") {
          if (typeof this.$captionsWrapper !== "undefined") {
            this.$captionsWrapper.css({
              "background-color": "transparent",
              opacity: "",
            });
          }
        }
        this.positionCaptions();
      }
    }
  };
  AblePlayer.prototype.positionCaptions = function (position) {
    if (typeof position === "undefined") {
      position = this.prefCaptionsPosition;
    }
    if (typeof this.$captionsWrapper !== "undefined") {
      if (position == "below") {
        this.$captionsWrapper
          .removeClass("able-captions-overlay")
          .addClass("able-captions-below");
        this.$captionsWrapper.css({
          "background-color": this.prefCaptionsBGColor,
          opacity: "1",
        });
      } else {
        this.$captionsWrapper
          .removeClass("able-captions-below")
          .addClass("able-captions-overlay");
        this.$captionsWrapper.css({
          "background-color": "transparent",
          opacity: "",
        });
      }
    }
  };
})(jQuery);

(function ($) {

	AblePlayer.prototype.populateChaptersDiv = function() {

		var headingLevel, headingType, headingId, $chaptersHeading;
		if ( ! this.chaptersDivLocation ) {
			return;
		}
		if ($('#' + this.chaptersDivLocation)) {

			this.$chaptersDiv = $('#' + this.chaptersDivLocation);
			this.$chaptersDiv.addClass('able-chapters-div');

			this.$chaptersDiv.empty();

			if (this.chaptersTitle) {
				headingLevel = this.getNextHeadingLevel(this.$chaptersDiv);
				headingType = 'h' + headingLevel.toString();
				headingId = this.mediaId + '-chapters-heading';
				$chaptersHeading = $('<' + headingType + '>', {
					'class': 'able-chapters-heading',
					'id': headingId
				}).text(this.chaptersTitle);
				this.$chaptersDiv.append($chaptersHeading);
			}

			this.$chaptersNav = $('<nav>');
			if (this.chaptersTitle) {
				this.$chaptersNav.attr( 'aria-labelledby', headingId );
			} else {
				this.$chaptersNav.attr( 'aria-label', this.translate( 'chapters', 'Chapters' ) );
			}
			this.$chaptersDiv.append(this.$chaptersNav);

			this.updateChaptersList();
		}
	};

	AblePlayer.prototype.updateChaptersList = function() {

		var thisObj, cues, $chaptersList, c, thisChapter,
			$chapterItem, $chapterButton, hasDefault,
			getClickFunction, $clickedItem, $chaptersList;

		thisObj = this;

		if (!this.$chaptersNav) {
			return false;
		}

		if (typeof this.useChapterTimes === 'undefined') {
			this.useChapterTimes = (this.seekbarScope === 'chapter' && this.selectedChapters.cues.length) ? true : false;
		}
		if (this.useChapterTimes) {
			cues = this.selectedChapters.cues;
		} else if (this.chapters.length >= 1) {
			cues = this.chapters[0].cues;
		} else {
			cues = [];
		}
		if (cues.length > 0) {
			$chaptersList = $('<ul>');
			for (c = 0; c < cues.length; c++) {
				thisChapter = c;
				$chapterItem = $('<li></li>');
				$chapterButton = $('<button>',{
					'type': 'button',
					'val': thisChapter
				}).text(this.flattenCueForCaption(cues[thisChapter]));

				getClickFunction = function (time) {
					return function () {
						thisObj.seekTrigger = 'chapter';
						$clickedItem = $(this).closest('li');
						$chaptersList = $(this).closest('ul').find('li');
						$chaptersList.removeClass('able-current-chapter')
							.children('button').removeAttr('aria-current');
						$clickedItem.addClass('able-current-chapter')
							.children('button').attr('aria-current','true');
						thisObj.updateChapter(time);
						thisObj.seekTo(time);
					}
				};
				$chapterButton.on('click',getClickFunction(cues[thisChapter].start)); 
				$chapterButton.on('focus',function() {
					$(this).closest('ul').find('li').removeClass('able-focus');
					$(this).closest('li').addClass('able-focus');
				});
				$chapterItem.on('hover',function() {
					$(this).closest('ul').find('li').removeClass('able-focus');
					$(this).addClass('able-focus');
				});
				$chapterItem.on('mouseleave',function() {
					$(this).removeClass('able-focus');
				});
				$chapterButton.on('blur',function() {
					$(this).closest('li').removeClass('able-focus');
				});

				$chapterItem.append($chapterButton);
				$chaptersList.append($chapterItem);
				if (this.defaultChapter === cues[thisChapter].id) {
					$chapterButton.attr('aria-current','true').parent('li').addClass('able-current-chapter');
					this.currentChapter = cues[thisChapter];
					hasDefault = true;
				}
			}
			if (!hasDefault) {
				this.currentChapter = cues[0];
				$chaptersList.find('button').first().attr('aria-current','true')
					.parent('li').addClass('able-current-chapter');
			}
			this.$chaptersNav.html($chaptersList);
		}
		return false;
	};

	AblePlayer.prototype.seekToChapter = function(chapterId) {

		var i=0;
		while (i < this.selectedChapters.cues.length) {
			if (this.selectedChapters.cues[i].id == chapterId) {
				this.seekTo(this.selectedChapters.cues[i].start);
				this.updateChapter(this.selectedChapters.cues[i].start);
				break;
			}
			i++;
		}
	};

	AblePlayer.prototype.updateChapter = function (now) {

		if (typeof this.selectedChapters === 'undefined') {
			return;
		}

		var chapters, i, thisChapterIndex;

		chapters = this.selectedChapters.cues;
		for (i = 0; i < chapters.length; i++) {
			if ((chapters[i].start <= now) && (chapters[i].end > now)) {
				thisChapterIndex = i;
				break;
			}
		}
		if (typeof thisChapterIndex !== 'undefined') {
			if (this.currentChapter !== chapters[thisChapterIndex]) {
				this.currentChapter = chapters[thisChapterIndex];
				if (this.useChapterTimes) {
					this.chapterDuration = this.getChapterDuration();
					this.seekIntervalCalculated = false; 
				}
				if (typeof this.$chaptersDiv !== 'undefined') {
					this.$chaptersDiv.find('ul').find('li')
						.removeClass('able-current-chapter')
						.children('button').removeAttr('aria-current');
					this.$chaptersDiv.find('ul').find('li').eq(thisChapterIndex)
						.addClass('able-current-chapter')
						.children('button').attr('aria-current','true');
				}
			}
		}
	};

	AblePlayer.prototype.getChapterDuration = function () {


		var lastChapterIndex, chapterEnd;

		if (typeof this.currentChapter === 'undefined') {
			return 0;
		}
		if (typeof this.duration === 'undefined') {
			return 0;
		}
		lastChapterIndex = this.selectedChapters.cues.length-1;
		if (this.selectedChapters.cues[lastChapterIndex] == this.currentChapter) {
			if (this.currentChapter.end !== this.duration) {
				chapterEnd = this.duration;
				this.currentChapter.end = this.duration;
			} else {
				chapterEnd = this.currentChapter.end;
			}
		} else { 
			chapterEnd = this.currentChapter.end;
		}
		return chapterEnd - this.currentChapter.start;
	};

	AblePlayer.prototype.getChapterElapsed = function () {

		if (typeof this.currentChapter === 'undefined') {
			return 0;
		}

		if (this.elapsed > this.currentChapter.start) {
			return this.elapsed - this.currentChapter.start;
		} else {
			return 0;
		}
	};

	AblePlayer.prototype.convertChapterTimeToVideoTime = function (chapterTime) {

		if (typeof this.currentChapter !== 'undefined') {
			var newTime = this.currentChapter.start + chapterTime;
			if (newTime > this.currentChapter.end) {
				return this.currentChapter.end;
			} else {
				return newTime;
			}
		} else {
			return chapterTime;
		}
	};

	AblePlayer.prototype.getChapterClickFunction = function (time) {

		var thisObj = this;
		return function () {
			thisObj.seekTrigger = 'chapter';
			thisObj.seekTo(time);
			thisObj.hidingPopup = true;
			thisObj.chaptersPopup.hide();
			setTimeout(function() {
				thisObj.hidingPopup = false;
			}, 100);
			thisObj.$chaptersButton.trigger('focus');
		}
	};

})(jQuery);

(function ($) {
  AblePlayer.prototype.updateMeta = function (time) {
    if (this.hasMeta) {
      if (this.metaType === "text") {
        this.$metaDiv.show();
        this.showMeta(time || this.elapsed);
      } else {
        this.showMeta(time || this.elapsed);
      }
    }
  };

  AblePlayer.prototype.showMeta = function (now) {
    var tempSelectors,
      m,
      thisMeta,
      cues,
      cueText,
      cueLines,
      i,
      line,
      showDuration,
      focusTarget;

    tempSelectors = [];
    if (this.meta.length >= 1) {
      cues = this.meta;
    } else {
      cues = [];
    }
    for (m = 0; m < cues.length; m++) {
      if (cues[m].start <= now && cues[m].end > now) {
        thisMeta = m;
        break;
      }
    }
    if (typeof thisMeta !== "undefined") {
      if (this.currentMeta !== thisMeta) {
        if (this.metaType === "text") {
          this.$metaDiv.html(
            this.flattenCueForMeta(cues[thisMeta]).replace(/\n/g, "<br>")
          );
        } else if (this.metaType === "selector") {
          cueText = this.flattenCueForMeta(cues[thisMeta]);
          cueLines = cueText.split("\n");
          for (i = 0; i < cueLines.length; i++) {
            line = cueLines[i].trim();
            if (line.toLowerCase().trim() === "pause") {
              this.hideBigPlayButton = true;
              this.pauseMedia();
            } else if (line.toLowerCase().substring(0, 6) == "focus:") {
              focusTarget = line.substring(6).trim();
              if ($(focusTarget).length) {
                $(focusTarget).trigger('focus');
              }
            } else {
              if ($(line).length) {
                this.currentMeta = thisMeta;
                showDuration = parseInt($(line).attr("data-duration"));
                if (
                  typeof showDuration !== "undefined" &&
                  !isNaN(showDuration)
                ) {
					$(line).show();
					const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
					delay(showDuration).then(() => {
						$(line).hide();
					});
                } else {
                  $(line).show();
                }
                this.visibleSelectors.push(line);
                tempSelectors.push(line);
              }
            }
          }
          if (this.visibleSelectors && this.visibleSelectors.length) {
            if (this.visibleSelectors.length !== tempSelectors.length) {
              for (i = this.visibleSelectors.length - 1; i >= 0; i--) {
                if ($.inArray(this.visibleSelectors[i], tempSelectors) == -1) {
                  $(this.visibleSelectors[i]).hide();
                  this.visibleSelectors.splice(i, 1);
                }
              }
            }
          }
        }
      }
    } else {
      if (typeof this.$metaDiv !== "undefined") {
        this.$metaDiv.html("");
      }
      if (this.visibleSelectors && this.visibleSelectors.length) {
        for (i = 0; i < this.visibleSelectors.length; i++) {
          $(this.visibleSelectors[i]).hide();
        }
        this.visibleSelectors = [];
      }
      this.currentMeta = -1;
    }
  };

  AblePlayer.prototype.flattenCueForMeta = function (cue) {
    var result = [];

    var flattenComponent = function (component) {
      var result = [],
        ii;
      if (component.type === "string") {
        result.push(component.value);
      } else if (component.type === "v") {
        result.push("[" + component.value + "]");
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      } else {
        for (ii = 0; ii < component.children.length; ii++) {
          result.push(flattenComponent(component.children[ii]));
        }
      }
      return result.join("");
    };

    for (var ii = 0; ii < cue.components.children.length; ii++) {
      result.push(flattenComponent(cue.components.children[ii]));
    }

    return result.join("");
  };
})(jQuery);

(function ($) {
  AblePlayer.prototype.setupTranscript = function () {
    var deferred = new this.defer();
    var promise = deferred.promise();

    if (this.usingYouTubeCaptions || this.usingVimeoCaptions || this.hideTranscriptButton ) {
      this.transcriptType = null;
      deferred.resolve();
    } else {
      if (!this.transcriptType) {

        if (this.captions.length) {
          this.transcriptType = "popup";
        }
      }
      if (this.transcriptType) {
        if ( this.transcriptType === "popup" || this.transcriptType === "external" ) {
          this.injectTranscriptArea();
          deferred.resolve();
        } else if (this.transcriptType === "manual") {
          this.setupManualTranscript();
          deferred.resolve();
        }
      } else {
        deferred.resolve();
      }
    }
    return promise;
  };

  AblePlayer.prototype.injectTranscriptArea = function () {
    var thisObj,
      $autoScrollLabel,
      $languageSelectWrapper,
      $languageSelectLabel,
      i,
      $option;

    thisObj = this;
    this.$transcriptArea = $("<div>", {
      class: "able-transcript-area",
      role: "dialog",
      "aria-label": this.translate( 'transcriptTitle', 'Transcript' ),
    });

    this.$transcriptToolbar = $("<div>", {
      class: "able-window-toolbar able-" + this.toolbarIconColor + "-controls",
    });

    this.$transcriptDiv = $("<div>", {
      class: "able-transcript",
    });


    this.$autoScrollTranscriptCheckbox = $("<input>", {
      id: "autoscroll-transcript-checkbox-" + this.mediaId,
      type: "checkbox",
    });
    $autoScrollLabel = $("<label>", {
      for: "autoscroll-transcript-checkbox-" + this.mediaId,
    }).text( this.translate( 'autoScroll', 'Auto scroll' ) );
	$autoScrollContainer = $( '<div>', {
		'class': 'autoscroll-transcript'
	});
	$autoScrollContainer.append(
		$autoScrollLabel,
		this.$autoScrollTranscriptCheckbox
	);
    this.$transcriptToolbar.append( $autoScrollContainer );

    if (this.captions.length > 1) {
      $languageSelectWrapper = $("<div>", {
        class: "transcript-language-select-wrapper",
      });
      $languageSelectLabel = $("<label>", {
        for: "transcript-language-select-" + this.mediaId,
      }).text( this.translate( 'language', 'Language' ) );
      this.$transcriptLanguageSelect = $("<select>", {
        id: "transcript-language-select-" + this.mediaId,
      });
      for (i = 0; i < this.captions.length; i++) {
        $option = $("<option></option>", {
          value: this.captions[i]["language"],
          lang: this.captions[i]["language"],
        }).text(this.captions[i]["label"]);
        if (this.captions[i]["def"]) {
          $option.prop("selected", true);
        }
        this.$transcriptLanguageSelect.append($option);
      }
    }
    if ($languageSelectWrapper) {
      $languageSelectWrapper.append(
        $languageSelectLabel,
        this.$transcriptLanguageSelect
      );
      this.$transcriptToolbar.append($languageSelectWrapper);
    }
    this.$transcriptArea.append(this.$transcriptToolbar, this.$transcriptDiv);

    if (this.transcriptDivLocation) {
	  this.$transcriptArea.removeAttr( 'role' );
	  this.$transcriptArea.removeAttr( 'aria-label' );
      $("#" + this.transcriptDivLocation).append(this.$transcriptArea);
    } else {
      this.$ableWrapper.append(this.$transcriptArea);
    }

    if (!this.transcriptDivLocation) {
      this.initDragDrop("transcript");
      if (this.prefTranscript === 1) {
        this.positionDraggableWindow(
          "transcript",
          this.getDefaultWidth("transcript")
        );
      }
    }

    if (!this.prefTranscript && !this.transcriptDivLocation) {
      this.$transcriptArea.hide();
    }
  };

  AblePlayer.prototype.addTranscriptAreaEvents = function () {
    var thisObj = this;

    this.$autoScrollTranscriptCheckbox.on( 'click', function () {
      thisObj.handleTranscriptLockToggle(
        thisObj.$autoScrollTranscriptCheckbox.prop("checked")
      );
    });

    this.$transcriptDiv.on(
      "mousewheel DOMMouseScroll click scroll",
      function (e) {
        if (!thisObj.scrollingTranscript) {
          thisObj.autoScrollTranscript = false;
          thisObj.refreshControls("transcript");
        }
        thisObj.scrollingTranscript = false;
      }
    );

    if (typeof this.$transcriptLanguageSelect !== "undefined") {
      this.$transcriptLanguageSelect.on('click', function (e) {
        e.stopPropagation();
      });

      this.$transcriptLanguageSelect.on("change", function () {
        var language = thisObj.$transcriptLanguageSelect.val();

        thisObj.syncTrackLanguages("transcript", language);
      });
    }
  };

  AblePlayer.prototype.transcriptSrcHasRequiredParts = function () {

    if ($("#" + this.transcriptSrc).length) {
      this.$transcriptArea = $("#" + this.transcriptSrc);
      if (this.$transcriptArea.find(".able-window-toolbar").length) {
        this.$transcriptToolbar = this.$transcriptArea
          .find(".able-window-toolbar")
          .eq(0);
        if (this.$transcriptArea.find(".able-transcript").length) {
          this.$transcriptDiv = this.$transcriptArea
            .find(".able-transcript")
            .eq(0);
          if (this.$transcriptArea.find(".able-transcript-seekpoint").length) {
            this.$transcriptSeekpoints = this.$transcriptArea.find(
              ".able-transcript-seekpoint"
            );
            return true;
          }
        }
      }
    }
    return false;
  };

  AblePlayer.prototype.setupManualTranscript = function () {
    var $autoScrollInput, $autoScrollLabel;

    $autoScrollInput = $("<input>", {
      id: "autoscroll-transcript-checkbox-" + this.mediaId,
      type: "checkbox",
    });
    $autoScrollLabel = $("<label>", {
      for: "autoscroll-transcript-checkbox-" + this.mediaId,
    }).text( this.translate( 'autoScroll', 'Auto scroll' ) );

    this.$autoScrollTranscriptCheckbox = $autoScrollInput;
    this.$transcriptToolbar.append(
      $autoScrollLabel,
      this.$autoScrollTranscriptCheckbox
    );
  };

  AblePlayer.prototype.updateTranscript = function () {
    if (!this.transcriptType) {
      return;
    }
    if (this.playerCreated && !this.$transcriptArea) {
      return;
    }
    if (this.transcriptType === "external" || this.transcriptType === "popup") {
      var chapters, captions, descriptions;

      if (this.transcriptLang) {
        captions = this.transcriptCaptions.cues;
      } else {
        if (this.transcriptCaptions) {
          this.transcriptLang = this.transcriptCaptions.language;
          captions = this.transcriptCaptions.cues;
        } else if (this.selectedCaptions) {
          this.transcriptLang = this.captionLang;
          captions = this.selectedCaptions.cues;
        }
      }

      if (this.transcriptChapters) {
        chapters = this.transcriptChapters.cues;
      } else if (this.chapters.length > 0) {
        if (this.transcriptLang) {
          for (var i = 0; i < this.chapters.length; i++) {
            if (this.chapters[i].language === this.transcriptLang) {
              chapters = this.chapters[i].cues;
            }
          }
        }
        if (typeof chapters === "undefined") {
          chapters = this.chapters[0].cues || [];
        }
      }

      if (this.transcriptDescriptions) {
        descriptions = this.transcriptDescriptions.cues;
      } else if (this.descriptions.length > 0) {
        if (this.transcriptLang) {
          for (var i = 0; i < this.descriptions.length; i++) {
            if (this.descriptions[i].language === this.transcriptLang) {
              descriptions = this.descriptions[i].cues;
            }
          }
        }
        if (!descriptions) {
          descriptions = this.descriptions[0].cues || [];
        }
      }

      var div = this.generateTranscript(
        chapters || [],
        captions || [],
        descriptions || []
      );
      this.$transcriptDiv.html(div);
      if (this.$transcriptLanguageSelect) {
        this.$transcriptLanguageSelect
          .find("option:selected")
          .prop("selected", false);
        this.$transcriptLanguageSelect
          .find("option[lang=" + this.transcriptLang + "]")
          .prop("selected", true);
      }
    }

    var thisObj = this;

    if (this.prefTabbable === 1) {
      this.$transcriptDiv
        .find("span.able-transcript-seekpoint")
        .attr("tabindex", "0");
    }

    if (this.$transcriptArea.length > 0) {
      this.$transcriptArea
        .find("span.able-transcript-seekpoint")
        .on( 'click', function (e) {
          thisObj.seekTrigger = "transcript";
          var spanStart = parseFloat($(this).attr("data-start"));
          spanStart += 0.01;
          if (!thisObj.seekingFromTranscript) {
            thisObj.seekingFromTranscript = true;
            thisObj.seekTo(spanStart);
          } else {
            thisObj.seekingFromTranscript = false;
          }
        });
    }
  };

  AblePlayer.prototype.highlightTranscript = function (currentTime) {

    if (!this.transcriptType) {
      return;
    }

    var start, end, isChapterHeading;
    var thisObj = this;

    currentTime = parseFloat(currentTime);

    this.$transcriptArea
      .find("span.able-transcript-seekpoint")
      .each(function () {
        start = parseFloat($(this).attr("data-start"));
        end = parseFloat($(this).attr("data-end"));
        if ($(this).parent().hasClass("able-transcript-chapter-heading")) {
          isChapterHeading = true;
        } else {
          isChapterHeading = false;
        }

        if (currentTime >= start && currentTime <= end && !isChapterHeading) {
          if (!$(this).hasClass("able-highlight")) {
            thisObj.$transcriptArea
              .find(".able-highlight")
              .removeClass("able-highlight");
            $(this).addClass("able-highlight");
            thisObj.movingHighlight = true;
          }
          return false;
        }
      });
    thisObj.currentHighlight = thisObj.$transcriptArea.find(".able-highlight");
    if (thisObj.currentHighlight.length === 0) {
      thisObj.currentHighlight = null;
    }
  };

  AblePlayer.prototype.generateTranscript = function (
    chapters,
    captions,
    descriptions
  ) {
    var thisObj = this;

    var $main = $('<div class="able-transcript-container"></div>');
    var transcriptTitle;

    $main.attr("lang", this.transcriptLang);

    if (typeof this.transcriptTitle !== "undefined") {
      transcriptTitle = this.transcriptTitle;
    } else if (this.lyricsMode) {
      transcriptTitle = this.translate( 'lyricsTitle', 'Lyrics' );
    } else {
      transcriptTitle = this.translate( 'transcriptTitle', 'Transcript' );
    }

    if (!this.transcriptDivLocation) {
      var headingNumber = this.playerHeadingLevel;
      headingNumber += 1;
      var chapterHeadingNumber = headingNumber + 1;

      if (headingNumber <= 6) {
        var transcriptHeading = "h" + headingNumber.toString();
      } else {
        var transcriptHeading = "div";
      }
      var $transcriptHeadingTag = $("<" + transcriptHeading + ">");
      $transcriptHeadingTag.addClass("able-transcript-heading");
      if (headingNumber > 6) {
        $transcriptHeadingTag.attr({
          role: "heading",
          "aria-level": headingNumber,
        });
      }
      $transcriptHeadingTag.text(transcriptTitle);

      $transcriptHeadingTag.attr("lang", this.lang);

      $main.append($transcriptHeadingTag);
    }

    var nextChapter = 0;
    var nextCap = 0;
    var nextDesc = 0;

    var addChapter = function (div, chap) {
      if (chapterHeadingNumber <= 6) {
        var chapterHeading = "h" + chapterHeadingNumber.toString();
      } else {
        var chapterHeading = "div";
      }

      var $chapterHeadingTag = $("<" + chapterHeading + ">", {
        class: "able-transcript-chapter-heading",
      });
      if (chapterHeadingNumber > 6) {
        $chapterHeadingTag.attr({
          role: "heading",
          "aria-level": chapterHeadingNumber,
        });
      }

      var flattenComponentForChapter = function (comp) {
        var result = [];
        if (comp.type === "string") {
          result.push(comp.value);
        } else {
          for (var i = 0; i < comp.children.length; i++) {
            result = result.concat(
              flattenComponentForChapter(comp.children[i])
            );
          }
        }
        return result;
      };

      var $chapSpan = $("<span>", {
        class: "able-transcript-seekpoint",
      });
      for (var i = 0; i < chap.components.children.length; i++) {
        var results = flattenComponentForChapter(chap.components.children[i]);
        for (var jj = 0; jj < results.length; jj++) {
          $chapSpan.append(results[jj]);
        }
      }
      $chapSpan.attr("data-start", chap.start.toString());
      $chapSpan.attr("data-end", chap.end.toString());
      $chapterHeadingTag.append($chapSpan);

      div.append($chapterHeadingTag);
    };

    var addDescription = function (div, desc) {
      var $descDiv = $("<div>", {
        class: "able-transcript-desc",
      });
      var $descHiddenSpan = $("<span>", {
        class: "able-hidden",
      });
      $descHiddenSpan.attr("lang", thisObj.lang);
      $descHiddenSpan.text(thisObj.tt.prefHeadingDescription + ": ");
      $descDiv.append($descHiddenSpan);

      var flattenComponentForDescription = function (comp) {
        var result = [];
        if (comp.type === "string") {
          result.push(comp.value);
        } else {
          for (var i = 0; i < comp.children.length; i++) {
            result = result.concat(
              flattenComponentForDescription(comp.children[i])
            );
          }
        }
        return result;
      };

      var $descSpan = $("<span>", {
        class: "able-transcript-seekpoint",
      });
      for (var i = 0; i < desc.components.children.length; i++) {
        var results = flattenComponentForDescription(
          desc.components.children[i]
        );
        for (var jj = 0; jj < results.length; jj++) {
          $descSpan.append(results[jj]);
        }
      }
      $descSpan.attr("data-start", desc.start.toString());
      $descSpan.attr("data-end", desc.end.toString());
      $descDiv.append($descSpan);

      div.append($descDiv);
    };

    var addCaption = function (div, cap) {
      var $capSpan = $("<span>", {
        class: "able-transcript-seekpoint able-transcript-caption",
      });

      var flattenComponentForCaption = function (comp) {
        var result = [];

        var parts = 0;

        var flattenString = function (str) {
          parts++;

          var flatStr;
          var result = [];
          if (str === "") {
            return result;
          }

          var openBracket = str.indexOf("[");
          var closeBracket = str.indexOf("]");
          var openParen = str.indexOf("(");
          var closeParen = str.indexOf(")");

          var hasBrackets = openBracket !== -1 && closeBracket !== -1;
          var hasParens = openParen !== -1 && closeParen !== -1;

          if (hasParens || hasBrackets) {
            if (parts > 1) {
              var silentSpanBreak = "<br/>";
            } else {
              var silentSpanBreak = "";
            }
            var silentSpanOpen =
              silentSpanBreak + '<span class="able-unspoken">';
            var silentSpanClose = "</span>";
            if (hasParens && hasBrackets) {
              if (openBracket < openParen) {
                hasParens = false;
              } else {
                hasBrackets = false;
              }
            }
          }
          if (hasParens) {
            flatStr = str.substring(0, openParen);
            flatStr += silentSpanOpen;
            flatStr += str.substring(openParen, closeParen + 1);
            flatStr += silentSpanClose;
            flatStr += flattenString(str.substring(closeParen + 1));
            result.push(flatStr);
          } else if (hasBrackets) {
            flatStr = str.substring(0, openBracket);
            flatStr += silentSpanOpen;
            flatStr += str.substring(openBracket, closeBracket + 1);
            flatStr += silentSpanClose;
            flatStr += flattenString(str.substring(closeBracket + 1));
            result.push(flatStr);
          } else {
            result.push(str);
          }
          return result;
        };

        if (comp.type === "string") {
          result = result.concat(flattenString(comp.value));
        } else if (comp.type === "v") {
          var $vSpan = $("<span>", {
            class: "able-unspoken",
          });
          comp.value = comp.value.replace(/^title="|\"$/g, "");
          $vSpan.text("(" + comp.value + ")");
          result.push($vSpan);
          for (var i = 0; i < comp.children.length; i++) {
            var subResults = flattenComponentForCaption(comp.children[i]);
            for (var jj = 0; jj < subResults.length; jj++) {
              result.push(subResults[jj]);
            }
          }
        } else if (comp.type === "b" || comp.type === "i") {
          if (comp.type === "b") {
            var $tag = $("<strong>");
          } else if (comp.type === "i") {
            var $tag = $("<em>");
          }
          for (var i = 0; i < comp.children.length; i++) {
            var subResults = flattenComponentForCaption(comp.children[i]);
            for (var jj = 0; jj < subResults.length; jj++) {
              $tag.append(subResults[jj]);
            }
          }
          if (comp.type === "b" || comp.type == "i") {
            result.push($tag);
          }
        } else {
          for (var i = 0; i < comp.children.length; i++) {
            result = result.concat(
              flattenComponentForCaption(comp.children[i])
            );
          }
        }
        return result;
      };

      for (var i = 0; i < cap.components.children.length; i++) {
		var next_child_tagname;
		if ( i < cap.components.children.length - 1 ) {
			next_child_tagname = cap.components.children[i + 1].tagName;
		}
        var results = flattenComponentForCaption(cap.components.children[i]);
        for (var jj = 0; jj < results.length; jj++) {
          var result = results[jj];
          if (typeof result === "string") {
           	if (thisObj.lyricsMode) {
				result = result.replace(/\n/g,'<br>');

				if ( !next_child_tagname || ( next_child_tagname !== 'i' && next_child_tagname !== 'b' ) ) {
					result += '<br>';
				}
            } else {
              result += " ";
            }
          }
          $capSpan.append(result);
        }
      }
      $capSpan.attr("data-start", cap.start.toString());
      $capSpan.attr("data-end", cap.end.toString());
      div.append($capSpan);
      div.append(" \n");
    };

    while (
      nextChapter < chapters.length ||
      nextDesc < descriptions.length ||
      nextCap < captions.length
    ) {
      if (
        nextChapter < chapters.length &&
        nextDesc < descriptions.length &&
        nextCap < captions.length
      ) {
        var firstStart = Math.min(
          chapters[nextChapter].start,
          descriptions[nextDesc].start,
          captions[nextCap].start
        );
      } else if (
        nextChapter < chapters.length &&
        nextDesc < descriptions.length
      ) {
        var firstStart = Math.min(
          chapters[nextChapter].start,
          descriptions[nextDesc].start
        );
      } else if (nextChapter < chapters.length && nextCap < captions.length) {
        var firstStart = Math.min(
          chapters[nextChapter].start,
          captions[nextCap].start
        );
      } else if (nextDesc < descriptions.length && nextCap < captions.length) {
        var firstStart = Math.min(
          descriptions[nextDesc].start,
          captions[nextCap].start
        );
      } else {
        var firstStart = null;
      }
      if (firstStart !== null) {
        if (
          typeof chapters[nextChapter] !== "undefined" &&
          chapters[nextChapter].start === firstStart
        ) {
          addChapter($main, chapters[nextChapter]);
          nextChapter += 1;
        } else if (
          typeof descriptions[nextDesc] !== "undefined" &&
          descriptions[nextDesc].start === firstStart
        ) {
          addDescription($main, descriptions[nextDesc]);
          nextDesc += 1;
        } else {
          addCaption($main, captions[nextCap]);
          nextCap += 1;
        }
      } else {
        if (nextChapter < chapters.length) {
          addChapter($main, chapters[nextChapter]);
          nextChapter += 1;
        } else if (nextDesc < descriptions.length) {
          addDescription($main, descriptions[nextDesc]);
          nextDesc += 1;
        } else if (nextCap < captions.length) {
          addCaption($main, captions[nextCap]);
          nextCap += 1;
        }
      }
    }
    var $components = $main.children();
    var spanCount = 0;
    $components.each(function () {
      if ($(this).hasClass("able-transcript-caption")) {
        if (
          $(this).text().indexOf("[") !== -1 ||
          $(this).text().indexOf("(") !== -1
        ) {
          if (spanCount > 0) {
            $main = wrapTranscriptBlocks( $main );
            spanCount = 0;
          }
        }
        $(this).addClass("able-block-temp");
        spanCount++;
      } else {
        if (spanCount > 0) {
          $main = wrapTranscriptBlocks( $main );
          spanCount = 0;
        }
      }
    });
	$main = wrapTranscriptBlocks( $main );

    return $main;
  };

  var wrapTranscriptBlocks = function( $main ) {
	$main.find(".able-block-temp")
		.removeClass("able-block-temp")
		.wrapAll('<div class="able-transcript-block"></div>');

	return $main;
  }
})(jQuery);

(function ($) {
  AblePlayer.prototype.showSearchResults = function () {


    var thisObj = this;
    if (this.searchDiv && this.searchString) {
      var cleanSearchString = DOMPurify.sanitize(this.searchString);
      if ($("#" + this.SearchDiv)) {
        var searchStringHtml = "<p>" + this.translate( 'resultsSummary1', 'You searched for:') + ' ';
        searchStringHtml +=
          '<span id="able-search-term-echo">' + cleanSearchString + "</span>";
        searchStringHtml += "</p>";
        var resultsArray = this.searchFor(
          cleanSearchString,
          this.searchIgnoreCaps
        );
        if (resultsArray.length > 0) {
          var $resultsSummary = $("<p>", {
            class: "able-search-results-summary",
          });
          var resultsSummaryText = this.translate( 'resultsSummary2', 'Found %1 matching items.', [ '<strong>' + resultsArray.length + '</strong>' ] );
          resultsSummaryText += ' ' + this.translate( 'resultsSummary3', 'Click the time associated with any item to play the video from that point.' );
          $resultsSummary.html( resultsSummaryText );
          var $resultsList = $("<ul>");
          for (var i = 0; i < resultsArray.length; i++) {
            var resultId = "aria-search-result-" + i;
            var $resultsItem = $("<li>", {});
            var itemStartTime = this.secondsToTime(resultsArray[i]["start"]);
            var itemLabel =
              this.translate( 'searchButtonLabel', 'Play at %1', [ itemStartTime["title"] ] );
            var itemStartSpan = $("<button>", {
              class: "able-search-results-time",
              "data-start": resultsArray[i]["start"],
              title: itemLabel,
              "aria-label": itemLabel,
              "aria-describedby": resultId,
            });
            itemStartSpan.text(itemStartTime["value"]);
            itemStartSpan.on("click", function (e) {
              thisObj.seekTrigger = "search";
              var spanStart = parseFloat($(this).attr("data-start"));
              spanStart += 0.01;
              thisObj.seeking = true;
              thisObj.seekTo(spanStart);
            });

            var itemText = $("<span>", {
              class: "able-search-result-text",
              id: resultId,
            });
            itemText.html('...' + resultsArray[i]["caption"] + '...');
            $resultsItem.append(itemStartSpan, itemText);
            $resultsList.append($resultsItem);
          }
          $('#' + this.searchDiv)
            .html(searchStringHtml)
            .append($resultsSummary, $resultsList);
        } else {
          var noResults = $('<p>').text( this.translate( 'noResultsFound', 'No results found.' ) );
          $('#' + this.searchDiv)
            .html(searchStringHtml)
            .append(noResults);
        }
      }
    }
  };

  AblePlayer.prototype.searchFor = function (searchString, ignoreCaps) {
    var captionLang, captions, results, caption, c, i, j;
    results = [];
    var searchTerms = searchString.split(" ");
    if (this.captions.length > 0) {
      for (i = 0; i < this.captions.length; i++) {
        if (this.captions[i].language === this.searchLang) {
          captionLang = this.searchLang;
          captions = this.captions[i].cues;
        }
      }
      if (captions.length > 0) {
        c = 0;
        for (i = 0; i < captions.length; i++) {
          if (
            $.inArray(captions[i].components.children[0]["type"], [
              "string",
              "i",
              "b",
              "u",
              "v",
              "c",
            ]) !== -1
          ) {
            caption = this.flattenCueForCaption(captions[i]);
            var captionNormalized = ignoreCaps
              ? caption.toLowerCase()
              : caption;
            for (j = 0; j < searchTerms.length; j++) {
              var searchTermNormalized = ignoreCaps
                ? searchTerms[j].toLowerCase()
                : searchTerms[j];
              if (captionNormalized.indexOf(searchTermNormalized) !== -1) {
                results[c] = [];
                results[c]["start"] = captions[i].start;
                results[c]["lang"] = captionLang;
                results[c]["caption"] = this.highlightSearchTerm(
                  searchTerms,
                  caption
                );
                c++;
                break;
              }
            }
          }
        }
      }
    }
    return results;
  };

  AblePlayer.prototype.highlightSearchTerm = function (
    searchTerms,
    resultString
  ) {
    searchTerms.forEach(function (searchTerm) {
      var reg = new RegExp(searchTerm, "gi");
      resultString = resultString.replace(
        reg,
        '<span class="able-search-term">$&</span>'
      );
    });
    return resultString;
  };

  AblePlayer.prototype.secondsToTime = function (totalSeconds) {

    var totalSeconds = Math.floor(totalSeconds);

    var hours = parseInt(totalSeconds / 3600, 10) % 24;
    var minutes = parseInt(totalSeconds / 60, 10) % 60;
    var seconds = totalSeconds % 60;
    var value = "";
    var title = "";
    if (hours > 0) {
      value += hours + ":";
      if (hours == 1) {
        title += "1 " + this.translate( 'hour', 'hour' ) + " ";
      } else {
        title += hours + " " + this.translate( 'hours', 'hours' ) + " ";
      }
    }
    if (minutes < 10) {
      value += "0" + minutes + ":";
      if (minutes > 0) {
        if (minutes == 1) {
          title += "1 " + this.translate( 'minute', 'minute' ) + " ";
        } else {
          title += minutes + " " + this.translate( 'minutes', 'minutes' ) + " ";
        }
      }
    } else {
      value += minutes + ":";
      title += minutes + " " + this.translate( 'minutes', 'minutes' ) + " ";
    }
    if (seconds < 10) {
      value += "0" + seconds;
      if (seconds > 0) {
        if (seconds == 1) {
          title += "1 " + this.translate( 'second', 'second' ) + " ";
        } else {
          title += seconds + " " + this.translate( 'seconds', 'seconds' ) + " ";
        }
      }
    } else {
      value += seconds;
      title += seconds + " " + this.translate( 'seconds', 'seconds' ) + " ";
    }
    var time = [];
    time["value"] = value;
    time["title"] = title;
    return time;
  };
})(jQuery);

(function ($) {
	AblePlayer.prototype.onMediaUpdateTime = function (duration, elapsed) {

		var thisObj = this;
		this.getMediaTimes(duration,elapsed).then(function(mediaTimes) {
			thisObj.duration = mediaTimes['duration'];
			thisObj.elapsed = mediaTimes['elapsed'];
			if (thisObj.duration > 0) {
				if (thisObj.prefHighlight === 1) {
					thisObj.highlightTranscript(thisObj.elapsed);
				}
				thisObj.updateCaption(thisObj.elapsed);
				thisObj.showDescription(thisObj.elapsed);
				thisObj.updateChapter(thisObj.elapsed);
				thisObj.updateMeta(thisObj.elapsed);
				thisObj.refreshControls('timeline', thisObj.duration, thisObj.elapsed);
			}
		});
	};

	AblePlayer.prototype.onMediaPause = function () {

		if (this.controlsHidden) {
			this.fadeControls('in');
			this.controlsHidden = false;
		}
		if (this.hideControlsTimeoutStatus === 'active') {
			window.clearTimeout(this.hideControlsTimeout);
			this.hideControlsTimeoutStatus = 'clear';

		}
		this.refreshControls('playpause');
	};

	AblePlayer.prototype.onMediaComplete = function () {
		if (this.hasPlaylist && !this.cueingPlaylistItem) {
			if (this.playlistIndex === (this.$playlist.length - 1)) {
				if (this.loop) {
					this.playlistIndex = 0;
					this.cueingPlaylistItem = true; 
					this.cuePlaylistItem(0);
				} else {
					this.playing = false;
					this.paused = true;
				}
			} else {
				this.playlistIndex++;
				this.cueingPlaylistItem = true; 
				this.cuePlaylistItem(this.playlistIndex)
			}
		}
		this.refreshControls();
	};

	AblePlayer.prototype.onMediaNewSourceLoad = function () {

		var loadIsComplete = false;

		if (this.cueingPlaylistItem) {
			this.cueingPlaylistItem = false;
		}
		if (this.recreatingPlayer) {
			this.recreatingPlayer = false;
		}
		if (this.playbackRate) {
			this.setPlaybackRate(this.playbackRate);
		}
		if (this.userClickedPlaylist) {
			if (!this.startedPlaying || this.okToPlay) {
				this.playMedia();
				loadIsComplete = true;
			 }
		} else if (this.seekTrigger == 'restart' ||
				this.seekTrigger == 'chapter' ||
				this.seekTrigger == 'transcript' ||
				this.seekTrigger == 'search'
				) {
			this.playMedia();
			loadIsComplete = true;
		} else if (this.swappingSrc) {
			if (this.hasPlaylist) {
				if ((this.playlistIndex !== this.$playlist.length) || this.loop) {
					this.playMedia();
					loadIsComplete = true;
				}
			} else if (this.swapTime > 0) {
				if (this.seekStatus === 'complete') {
					if (this.okToPlay) {
						this.playMedia();
					}
					loadIsComplete = true;
				} else if (this.seekStatus === 'seeking') {
				} else {
					if (this.swapTime === this.elapsed) {
						this.seekStatus = 'complete';
						if (this.okToPlay) {
							this.playMedia();
						}
						loadIsComplete = true;
					} else {
						if (this.hasDescTracks) {
							loadIsComplete = true;
						} else if (this.durationsAreCloseEnough(this.duration,this.prevDuration)) {
							this.seekStatus = 'seeking';
							this.seekTo(this.swapTime);
						} else {
							loadIsComplete = true;
						}
					}
				}
			} else {
				if (this.playing) {
					this.playMedia();
					loadIsComplete = true;
				}
			}
		} else if (!this.startedPlaying) {
			if (this.startTime > 0) {
				if (this.seeking) {
					this.seeking = false;
					if (this.okToPlay) {
						this.playMedia();
					}
					loadIsComplete = true;
				} else {
					this.seekTo(this.startTime);
				}
			} else if (this.defaultChapter && typeof this.selectedChapters !== 'undefined') {
				this.seekToChapter(this.defaultChapter);
			} else {
				if (this.okToPlay) {
					this.playMedia();
				}
				loadIsComplete = true;
			}
		} else if (this.hasPlaylist) {
			if ((this.playlistIndex !== this.$playlist.length) || this.loop) {
				this.playMedia();
				loadIsComplete = true;
			}
		} else {
			loadIsComplete = true;
		}
		if (loadIsComplete) {
			this.swappingSrc = false;
			this.seekStatus = null;
			this.swapTime = 0;
			this.seekTrigger = null;
			this.seekingFromTranscript = false;
			this.userClickedPlaylist = false;
			this.okToPlay = false;
		}
		this.refreshControls();
		if (this.$focusedElement) {
			this.restoreFocus();
			this.$focusedElement = null;
			this.activeMedia = null;
		}
	};

	AblePlayer.prototype.durationsAreCloseEnough = function(d1,d2) {


		var tolerance, diff;

		tolerance = 1;  
		diff = Math.abs(Math.round(d1) - Math.round(d2));

		return (diff <= tolerance) ? true : false;
	};

	AblePlayer.prototype.restoreFocus = function() {


		var classList, $mediaParent;

		if ( this.$focusedElement && null !== this.activeMedia ) {
			$mediaParent = $( '#' + this.activeMedia ).closest( '.able' );
			if ( (this.$focusedElement).attr('role') === 'button' ) {
				classList = this.$focusedElement.attr("class").split(/\s+/);
				$.each(classList, function(index, item) {
					if (item.substring(0,20) === 'able-button-handler-') {
						$mediaParent.find('div.able-controller div.' + item).trigger('focus');
					}
				});
			}
		}

	};

	AblePlayer.prototype.addSeekbarListeners = function () {

		var thisObj = this;

		this.seekBar.bodyDiv.on('startTracking', function (e) {
			thisObj.pausedBeforeTracking = thisObj.paused;
			thisObj.pauseMedia();
		}).on('tracking', function (e, position) {
			thisObj.highlightTranscript(position);
			thisObj.updateCaption(position);
			thisObj.showDescription(position);
			thisObj.updateChapter(thisObj.convertChapterTimeToVideoTime(position));
			thisObj.updateMeta(position);
			thisObj.refreshControls();
		}).on('stopTracking', function (e, position) {
			if (thisObj.useChapterTimes) {
				thisObj.seekTo(thisObj.convertChapterTimeToVideoTime(position));
			} else {
				thisObj.seekTo(position);
			}
			if (!thisObj.pausedBeforeTracking) {
				setTimeout(function () {
					thisObj.playMedia();
				}, 200);
			}
		});
	};

	AblePlayer.prototype.onClickPlayerButton = function (el) {
		var whichButton, prefsPopup;
		whichButton = this.getButtonNameFromClass($(el).attr('class'));
		switch ( whichButton ) {
			case 'play':
				this.clickedPlay = true;
				this.handlePlay();
				break;
			case 'restart':
				this.seekTrigger = 'restart';
				this.handleRestart();
				break;
			case 'previous':
				this.userClickedPlaylist = true;
				this.okToPlay = true;
				this.seekTrigger = 'previous';
				this.buttonWithFocus = 'previous';
				this.handlePrevTrack();
				break;
			case 'next':
				this.userClickedPlaylist = true;
				this.okToPlay = true;
				this.seekTrigger = 'next';
				this.buttonWithFocus = 'next';
				this.handleNextTrack();
				break;
			case 'rewind':
				this.seekTrigger = 'rewind';
				this.handleRewind();
				break;
			case 'forward':
				this.seekTrigger = 'forward';
				this.handleFastForward();
				break;
			case 'mute':
				this.handleMute();
				break;
			case 'volume':
				this.handleVolumeButtonClick();
				break;
			case 'faster':
				this.handleRateIncrease();
				break;
			case 'slower':
				this.handleRateDecrease();
				break;
			case 'captions':
				this.handleCaptionToggle();
				break;
			case 'chapters':
				this.handleChapters();
				break;
			case 'descriptions':
				this.handleDescriptionToggle();
				break;
			case 'sign':
				if ( ! this.closingSign ) {
					this.handleSignToggle();
				}
				break;
			case 'preferences':
				if ($(el).attr('data-prefs-popup') === 'menu') {
					this.handlePrefsClick();
				} else {
					this.showingPrefsDialog = true; 
					this.closePopups();
					prefsPopup = $(el).attr('data-prefs-popup');
					if (prefsPopup === 'keyboard') {
						this.keyboardPrefsDialog.show();
					} else if (prefsPopup === 'captions') {
						this.captionPrefsDialog.show();
					} else if (prefsPopup === 'descriptions') {
						this.descPrefsDialog.show();
					} else if (prefsPopup === 'transcript') {
						this.transcriptPrefsDialog.show();
					}
					this.showingPrefsDialog = false;
				}
				break;
			case 'transcript':
				if ( !this.closingTranscript ) {
					this.handleTranscriptToggle();
				}
				break;
			case 'fullscreen':
				this.clickedFullscreenButton = true;
				this.handleFullscreenToggle();
				break;
		}
	};

	AblePlayer.prototype.getButtonNameFromClass = function (classString) {
		var classes, i;

		classes = classString.split(' ');
		for (i = 0; i < classes.length; i++) {
			if (classes[i].substring(0,20) === 'able-button-handler-') {
				return classes[i].substring(20);
			}
		}
		return classString;
	}

	AblePlayer.prototype.okToHandleKeyPress = function () {
		let defaultReturn = true;
		if ( this.prefNoKeyShortcuts === 1 ) {
			defaultReturn = false;
		}
		var activeElement = AblePlayer.getActiveDOMElement();

		return ($(activeElement).prop('tagName') === 'INPUT') ? false : defaultReturn;
	};

	AblePlayer.prototype.onPlayerKeyPress = function (e) {


		var key, $thisElement;

		key = e.key;
		$thisElement = $(document.activeElement);

		if (key === 'Escape') {
			if (this.$transcriptArea && $.contains(this.$transcriptArea[0],$thisElement[0]) && !this.hidingPopup) {
				this.handleTranscriptToggle();
				return false;
			}
		}
		if (!this.okToHandleKeyPress()) {
			return false;
		}

		if (!(
			$(':focus').is('[contenteditable]') ||
			$(':focus').is('input') ||
			($(':focus').is('textarea') && !this.stenoMode) ||
			$(':focus').is('select') ||
			e.target.hasAttribute('contenteditable') ||
			e.target.tagName === 'INPUT' ||
			(e.target.tagName === 'TEXTAREA' && !this.stenoMode) ||
			e.target.tagName === 'SELECT'
		)){
			if (key === 'Escape') {
				this.closePopups();
				this.$tooltipDiv.hide();
				this.seekBar.hideSliderTooltips();
			} else if (key === ' ') {
				if ($thisElement.attr('role') === 'button') {
					e.preventDefault();
					$thisElement.trigger( 'click' );
				}
			} else if ( key === 'p' ) {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePlay();
				}
			} else if (key === 's') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleRestart();
				}
			} else if (key === 'm') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleMute();
				}
			} else if (key === 'v') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleVolumeButtonClick();
				}
			} else if (key >= 0 && key <= 9) {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleVolumeKeystroke(key);
				}
			} else if (key === 'c') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleCaptionToggle();
				}
			} else if (key === 'd') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleDescriptionToggle();
				}
			} else if (key === 'f') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleFastForward();
				}
			} else if (key === 'r') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleRewind();
				}
			} else if (key === 'b') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePrevTrack();
				}
			} else if (key === 'n') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handleNextTrack();
				}
			} else if (key === 'e') {
				if (this.usingModifierKeys(e)) {
					e.preventDefault();
					this.handlePrefsClick();
				}
			} else if (key === 'Enter') {
				if ($thisElement.attr('role') === 'button' || $thisElement.prop('tagName') === 'SPAN') {
					$thisElement.trigger( 'click' );
				} else if ($thisElement.prop('tagName') === 'LI') {
					$thisElement.trigger( 'click' );
				}
			}
		}
	};

	AblePlayer.prototype.addHtml5MediaListeners = function () {

		var thisObj = this;


		this.$media
			.on('emptied',function() {
			})
			.on('loadedmetadata',function() {
				thisObj.duration = thisObj.media.duration;
			})
			.on('canplay',function() {
			})
			.on('canplaythrough',function() {
				thisObj.onMediaNewSourceLoad();
			})
			.on('play',function() {
			})
			.on('playing',function() {
				thisObj.playing = true;
				thisObj.paused = false;
				thisObj.swappingSrc = false;
				thisObj.refreshControls('playpause');
			})
			.on('ended',function() {
				thisObj.playing = false;
				thisObj.paused = true;
				thisObj.onMediaComplete();
			})
			.on('progress', function() {
				thisObj.refreshControls('timeline');
			})
			.on('waiting',function() {
			})
			.on('durationchange',function() {
				thisObj.refreshControls('timeline');
			})
			.on('timeupdate',function() {
				thisObj.onMediaUpdateTime(); 
			})
			.on('pause',function() {
				if (!thisObj.clickedPlay) {
					if (thisObj.hasPlaylist || thisObj.swappingSrc) {
					} else {
						thisObj.playing = false;
						thisObj.paused = true;
					}
				} else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
				thisObj.clickedPlay = false; 
				thisObj.onMediaPause(); 
			})
			.on('ratechange',function() {
			})
			.on('volumechange',function() {
				thisObj.volume = thisObj.getVolume();
			})
			.on('error',function() {
				if (thisObj.debug) {
					switch (thisObj.media.error.code) {
						case 1:

														break;
						case 2:

														break;
						case 3:

														break;
						case 4:

														break;
					}
				}
			});
	};

	AblePlayer.prototype.addVimeoListeners = function () {

		var thisObj = this;

		this.vimeoPlayer.on('loaded', function(vimeoId) {
			thisObj.onMediaNewSourceLoad();
		 });
		this.vimeoPlayer.on('play', function(data) {
			thisObj.playing = true;
			thisObj.startedPlaying = true;
			thisObj.paused = false;
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('ended', function(data) {
			thisObj.playing = false;
			thisObj.paused = true;
			thisObj.onMediaComplete();
		});
		this.vimeoPlayer.on('bufferstart', function() {
		});
		this.vimeoPlayer.on('bufferend', function() {
		});
		this.vimeoPlayer.on('progress', function(data) {
		});
		this.vimeoPlayer.on('seeking', function(data) {
		});
		this.vimeoPlayer.on('seeked', function(data) {
		});
		this.vimeoPlayer.on('timeupdate',function(data) {
			thisObj.onMediaUpdateTime(data['duration'], data['seconds']);
		});
		this.vimeoPlayer.on('pause',function(data) {
			if (!thisObj.clickedPlay) {
				if (thisObj.hasPlaylist || thisObj.swappingSrc) {
				} else {
					thisObj.playing = false;
					thisObj.paused = true;
				}
			} else {
				thisObj.playing = false;
				thisObj.paused = true;
			}
			thisObj.clickedPlay = false; 
			thisObj.onMediaPause();
			thisObj.refreshControls('playpause');
		});
		this.vimeoPlayer.on('playbackratechange',function(data) {
			thisObj.vimeoPlaybackRate = data['playbackRate'];
		});
		this.vimeoPlayer.on('texttrackchange', function(data) {
		});
		this.vimeoPlayer.on('volumechange',function(data) {
			thisObj.volume = data['volume'] * 10;
		});
		this.vimeoPlayer.on('error',function(data) {
		});
	};

	AblePlayer.prototype.addEventListeners = function () {

		var thisObj = this;

		$(window).on('resize',function () {
			thisObj.resizePlayer();
		});

		if (window.MutationObserver) {
			var target = this.$ableDiv[0];
			var observer = new MutationObserver(function(mutations) {
				mutations.forEach(function(mutation) {
					if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
						if (thisObj.$ableDiv.is(':visible')) {
							thisObj.refreshControls();
						}
					}
				});
			});
			var config = { attributes: true, childList: true, characterData: true };
			observer.observe(target, config);
		}
		if (typeof this.seekBar !== 'undefined') {
			this.addSeekbarListeners();
		} else {
			setTimeout(function() {
				if (typeof thisObj.seekBar !== 'undefined') {
					thisObj.addSeekbarListeners();
				}
			},2000);
		}

		this.$controllerDiv.find('div[role="button"]').on('click',function(e){
			e.stopPropagation();
			thisObj.onClickPlayerButton(this);
		});

		$('body').on('click', function(e) {

			if (e.button !== 0) { 
				return false;
			}
			if ($('.able-popup:visible').length || $('.able-volume-slider:visible').length ) {
				thisObj.closePopups();
			}
			if (e.target.tagName === 'VIDEO') {
				thisObj.clickedPlay = true;
			}
		});

		this.$ableDiv.on('mousemove',function() {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					thisObj.invokeHideControlsTimeout();
				}
			} else {
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		$(document).on( 'keydown', function(e) {
			if (thisObj.controlsHidden) {
				thisObj.fadeControls('in');
				thisObj.controlsHidden = false;
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';
				}
				if (thisObj.hideControls) {
					thisObj.invokeHideControlsTimeout();
				}
			} else {
				if (thisObj.hideControlsTimeoutStatus === 'active') {
					window.clearTimeout(thisObj.hideControlsTimeout);
					thisObj.hideControlsTimeoutStatus = 'clear';

					if (thisObj.hideControls) {
						thisObj.invokeHideControlsTimeout();
					}
				}
			}
		});

		this.$ableDiv.on( 'keydown', function (e) {
			if (AblePlayer.nextIndex > 1) {
				thisObj.onPlayerKeyPress(e);
			}
		});

		if (this.stenoMode && (typeof this.stenoFrameContents !== 'undefined')) {
			this.stenoFrameContents.on('keydown',function(e) {
				thisObj.onPlayerKeyPress(e);
			});
		};

		if (this.$transcriptArea) {
			this.$transcriptArea.on('keydown',function (e) {
				if (AblePlayer.nextIndex > 1) {
					thisObj.onPlayerKeyPress(e);
				}
			});
		}

		if (this.$playlist) {
			this.$playlist.on( 'click', function(e) {
				if (!thisObj.userClickedPlaylist) {
					thisObj.userClickedPlaylist = true; 
					thisObj.playlistIndex = $(this).index();
					thisObj.cuePlaylistItem(thisObj.playlistIndex);
				}
			});
		}

		this.$media.on( 'click', function () {
			thisObj.handlePlay();
		});

		if (this.player === 'html5') {
			this.addHtml5MediaListeners();
		} else if (this.player === 'vimeo') {
			 this.addVimeoListeners();
		} else if (this.player === 'youtube') {
			setInterval(function () {
				thisObj.onMediaUpdateTime();
			}, 300);
		}
	};
})(jQuery);

(function ($) {
	AblePlayer.prototype.initDragDrop = function ( which ) {




		var thisObj, $window, $toolbar, windowName, $resizeHandle, $resizeSvg,
			i, x1, y1, x2, y2, $resizeLine, resizeZIndex;

		thisObj = this;

		if (which === 'transcript') {
			$window = this.$transcriptArea;
			windowName = 'transcript-window';
			$toolbar = this.$transcriptToolbar;
			$toolbar.attr( 'aria-label', this.translate( 'transcriptControls', 'Transcript Window Controls' ) );
		} else if (which === 'sign') {
			$window = this.$signWindow;
			windowName = 'sign-window';
			$toolbar = this.$signToolbar;
			$toolbar.attr( 'aria-label', this.translate( 'signControls', 'Sign Language Window Controls' ) );
		}

		$toolbar.addClass('able-draggable');
		$toolbar.attr( 'role', 'application' );

		$dragHandle = $('<div>',{
			'class': 'able-drag-handle'
		});

		$dragHandle.html('<svg version="1.1" viewBox="262.48 487.5 675.03 225" xmlns="http://www.w3.org/2000/svg"><path d="m900 562.5h-600c-13.398 0-25.777-7.1484-32.477-18.75-6.6992-11.602-6.6992-25.898 0-37.5 6.6992-11.602 19.078-18.75 32.477-18.75h600c13.398 0 25.777 7.1484 32.477 18.75 6.6992 11.602 6.6992 25.898 0 37.5-6.6992 11.602-19.078 18.75-32.477 18.75z" fill="#fff"></path>  <path d="m900 712.5h-600c-13.398 0-25.777-7.1484-32.477-18.75-6.6992-11.602-6.6992-25.898 0-37.5 6.6992-11.602 19.078-18.75 32.477-18.75h600c13.398 0 25.777 7.1484 32.477 18.75 6.6992 11.602 6.6992 25.898 0 37.5-6.6992 11.602-19.078 18.75-32.477 18.75z" fill="#fff"></path></svg>');
		$resizeHandle = $('<div>',{
			'class': 'able-resizable'
		});

		$resizeSvg = $('<svg>').attr({
			'width': '100%',
			'height': '100%',
			'viewBox': '0 0 100 100',
			'preserveAspectRatio': 'none'
		});
		for (i=1; i<=3; i++) {
			if (i === 1) {
				x1 = '100';
				y1 = '0';
				x2 = '0';
				y2 = '100';
			} else if (i === 2) {
				x1 = '33';
				y1 = '100';
				x2 = '100';
				y2 = '33';
			} else if (i === 3) {
				x1 = '67';
				y1 = '100';
				x2 = '100';
				y2 = '67';
			}
			$resizeLine = $('<line>').attr({
				'x1': x1,
				'y1': y1,
				'x2': x2,
				'y2': y2,
				'vector-effect': 'non-scaling-stroke'
			})
			$resizeSvg.append($resizeLine);
		}
		$resizeHandle.html($resizeSvg);

		resizeZIndex = parseInt($window.css('z-index')) + 100;
		$resizeHandle.css('z-index',resizeZIndex);
		$window.append($resizeHandle);
		$toolbar.append($dragHandle);

		$resizeHandle.html($resizeHandle.html());

		$dragHandle.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart' ) {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.dragDevice = 'mouse'; 
					thisObj.startDrag(which, $window);
				}
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.dragging && thisObj.dragDevice === 'mouse') {
					thisObj.endDrag(which);
				}
			}
			return false;
		});

		$resizeHandle.on('mousedown mouseup touchstart touchend', function(e) {
			e.stopPropagation();
			if (e.type === 'mousedown' || e.type === 'touchstart') {
				if (!thisObj.windowMenuClickRegistered) {
					thisObj.windowMenuClickRegistered = true;
					thisObj.startMouseX = e.pageX;
					thisObj.startMouseY = e.pageY;
					thisObj.startResize(which, $window);
				}
			} else if (e.type === 'mouseup' || e.type === 'touchend') {
				if (thisObj.resizing) {
					thisObj.endResize(which);
				}
			}
			return false;
		});

		$window.on('click', function() {

			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {
				thisObj.updateZIndex(which);
			}
			thisObj.finishingDrag = false;
		});
		this.addWindowMenu(which,$window,windowName);
	};

	AblePlayer.prototype.addWindowMenu = function(which, $window, windowName) {

		var thisObj, $windowAlert, menuId, $newButton, tooltipId, $tooltip, $popup, menuId;

		thisObj = this;

		this.windowMenuClickRegistered = false;

		this.finishingDrag = false;

		menuId = this.mediaId + '-' + windowName + '-menu';
		$newButton = $('<button>',{
			'type': 'button',
			'tabindex': '0',
			'aria-haspopup': 'true',
			'aria-controls': menuId,
			'aria-expanded': 'false',
			'class': 'able-button-handler-preferences'
		});
		this.getIcon( $newButton, 'preferences' );
		this.setText( $newButton, this.translate( 'windowButtonLabel', 'Window options' ) );

		tooltipId = this.mediaId + '-' + windowName + '-tooltip';
		$tooltip = $('<div>',{
			'class' : 'able-tooltip',
			'id' : tooltipId
		}).hide();

		$newButton.on('mouseenter focus',function(e) {
			var label = $(this).attr('aria-label');
			var tooltip = AblePlayer.localGetElementById($newButton[0], tooltipId).text(label);
			var tooltipHeight = tooltip.height();
			var tooltipY = ( tooltipHeight + 2 ) * -1;
			var tooltipX = 0;
			var tooltipStyle = {
				right: '',
				left: tooltipX + 'px',
				top: tooltipY + 'px'
			};
			tooltip.css(tooltipStyle);
			thisObj.showTooltip(tooltip);
			$(this).on('mouseleave blur',function() {
				AblePlayer.localGetElementById($newButton[0], tooltipId).text('').hide();
			});
		});

		$popup = this.setupPopups(windowName); 
		if (which === 'transcript') {
			this.$transcriptPopupButton = $newButton;
			this.$transcriptPopup = $popup;
			this.$transcriptToolbar.prepend($windowAlert,$newButton,$tooltip,$popup);
		} else if (which === 'sign') {
			this.$signPopupButton = $newButton;
			this.$signPopup = $popup;
			this.$signToolbar.append($windowAlert,$newButton,$tooltip,$popup);
		}

		$newButton.on('click keydown',function(e) {

			if (thisObj.focusNotClick) {
				return false;
			}
			if (thisObj.dragging) {
				thisObj.dragKeys(which, e);
				return false;
			}
			e.stopPropagation();
			if (!thisObj.windowMenuClickRegistered && !thisObj.finishingDrag) {

				thisObj.handleWindowButtonClick(which, e);
			}
			thisObj.finishingDrag = false;
		});

		this.addResizeDialog(which, $window);
	};

	AblePlayer.prototype.addResizeDialog = function (which, $window) {

		var thisObj, $windowPopup, $windowButton, widthId, heightId,
			$resizeForm, $resizeWrapper, $resizeWidthDiv, $resizeWidthInput, $resizeWidthLabel,
			$resizeHeightDiv, $resizeHeightInput, $resizeHeightLabel, $saveButton, $cancelButton,
			newWidth, newHeight, resizeDialog;

		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		widthId = this.mediaId + '-resize-' + which + '-width';
		heightId = this.mediaId + '-resize-' + which + '-height';

		$resizeForm = $('<div></div>',{
			'class' : 'able-resize-form'
		});

		$resizeWrapper = $('<div></div>');
		$resizeControls = $( '<div class="able-prefs-buttons"></div>' );

		$resizeWidthDiv = $('<div></div>');
		$resizeWidthInput = $('<input>',{
			'type': 'number',
			'id': widthId,
			'min': 0,
			'value': '',
		});
		$resizeWidthLabel = $('<label>',{
			'for': widthId
		}).text( this.translate( 'width', 'Width' ) );

		$resizeHeightDiv = $('<div></div>');
		$resizeHeightInput = $('<input>',{
			'type': 'number',
			'id': heightId,
			'min': 0,
			'value': '',
		});
		$resizeHeightLabel = $('<label>',{
			'for': heightId
		}).text( this.translate( 'height', 'Height' ) );

		$saveButton = $('<button class="modal-button">' + this.translate( 'save', 'Save' ) + '</button>');
		$cancelButton = $('<button class="modal-button">' + this.translate( 'cancel', 'Cancel' ) + '</button>');
		$saveButton.on('click',function () {
			newWidth = $('#' + widthId).val();
			newHeight = $('#' + heightId).val();
			thisObj.resizeObject(which,newWidth,newHeight);
			thisObj.updatePreferences(which);

			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.trigger('focus');
		});
		$cancelButton.on('click',function () {
			resizeDialog.hide();
			$windowPopup.hide();
			$windowButton.trigger('focus');
		});

		$resizeWidthDiv.append($resizeWidthLabel,$resizeWidthInput);
		$resizeHeightDiv.append($resizeHeightLabel,$resizeHeightInput);
		$resizeWrapper.append($resizeWidthDiv,$resizeHeightDiv);
		$resizeControls.append($saveButton,$cancelButton);
		$resizeForm.append($resizeWrapper,$resizeControls);

		$('body').append($resizeForm);
		resizeDialog = new AccessibleDialog(
			$resizeForm,
			$windowButton,
			this.translate( 'windowResizeHeading', 'Resize Window' ),
			this.translate( 'closeButtonLabel', 'Close' ),
		);
		if (which === 'transcript') {
			this.transcriptResizeDialog = resizeDialog;
		} else if (which === 'sign') {
			this.signResizeDialog = resizeDialog;
		}
	};

	AblePlayer.prototype.handleWindowButtonClick = function (which, e) {

		var thisObj, $windowPopup, $windowButton, $toolbar, popupTop;

		thisObj = this;
		if (this.focusNotClick) {
			return false;
		}

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			$toolbar = this.$transcriptToolbar;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			$toolbar = this.$signToolbar;
		}
		if (e.type === 'keydown') {
			if (e.key === ' ' || e.key === 'Enter') {
				this.windowMenuClickRegistered = true;
			} else if (e.key === 'Escape') {
				if ($windowPopup.is(':visible')) {
					$windowPopup.hide();
					thisObj.windowMenuClickRegistered = false;
					$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
					$windowButton.trigger('focus');
				} else {
					if (which === 'sign') {
						this.handleSignToggle();
					} else if (which === 'transcript') {
						this.handleTranscriptToggle();
					}
				}
			} else {
				return false;
			}
		} else {
			this.windowMenuClickRegistered = true;
		}

		if ( $windowPopup.is(':visible') ) {
			$windowPopup.hide();
			thisObj.windowMenuClickRegistered = false; 
			$windowPopup.find('li').removeClass('able-focus');
			$windowButton.attr('aria-expanded','false').trigger('focus');
		} else {
			this.updateZIndex(which);
			popupTop = $toolbar.outerHeight() - 1;
			$windowPopup.css('top', popupTop);
			$windowPopup.show();
			$windowButton.attr('aria-expanded','true');
			$(this).find('li').first().trigger('focus').addClass('able-focus');
			thisObj.windowMenuClickRegistered = false; 
		}
	};

	AblePlayer.prototype.handleMenuChoice = function (which, choice, e) {

		var thisObj, $window, $windowPopup, $windowButton, resizeDialog, startingWidth, startingHeight,
		aspectRatio, tempWidth, tempHeight;

		thisObj = this;
		if (which === 'transcript') {
			$window = this.$transcriptArea;
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
			resizeDialog = this.transcriptResizeDialog;
		} else if (which === 'sign') {
			$window = this.$signWindow;
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
			resizeDialog = this.signResizeDialog;

			startingWidth = $window.outerWidth();
			startingHeight = $window.outerHeight();
			aspectRatio = startingWidth / startingHeight;
			widthId = this.mediaId + '-resize-' + which + '-width';
			heightId = this.mediaId + '-resize-' + which + '-height';
			$( '#' + heightId ).prop('readonly',true);
			$( '#' + widthId ).on('input',function() {
				tempWidth = $(this).val();
				tempHeight = Math.round(tempWidth/aspectRatio);
				$( '#' + heightId ).val(tempHeight);
			});
		}
		this.$activeWindow = $window;

		if (e.type === 'keydown') {
			if (e.key === 'Escape') { 
				$windowPopup.hide();
				thisObj.windowMenuClickRegistered = false;
				$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
				$windowButton.attr('aria-expanded','false');
				$windowButton.trigger('focus');

				return false;
			} else {
				if (choice !== 'close') {
					this.$activeWindow = $window;
				}
				return false;
			}
		}

		$windowPopup.hide();
		thisObj.windowMenuClickRegistered = false;
		$windowPopup.find('li').removeClass('able-focus').attr('tabindex','-1');
		$windowButton.attr('aria-expanded','false');

		if (choice !== 'close') {
			$windowButton.trigger('focus');
		}
		if (choice === 'move') {
			this.$activeWindow.attr('role','application');

			if (!this.showedAlert(which)) {
				this.showAlert( this.translate( 'windowMoveAlert', 'Drag or use arrow keys to move the window; Enter to stop' ),which);
				if (which === 'transcript') {
					this.showedTranscriptAlert = true;
				} else if (which === 'sign') {
					this.showedSignAlert = true;
				}
			}
			this.dragDevice = (e.type === 'keydown') ? 'keyboard' : 'mouse';
			this.startDrag(which, $window);
			$windowPopup.hide().parent().attr( 'tabindex', '-1' ).trigger('focus');
		} else if (choice == 'resize') {
			var resizeFields = resizeDialog.getInputs();
			if (resizeFields) {
				resizeFields[0].value = Math.round( $window.outerWidth() );
				resizeFields[1].value = Math.round( $window.outerHeight() );
			}
			resizeDialog.show();
		} else if (choice == 'close') {
			if (which === 'transcript') {
				this.closingTranscript = true; 
				this.handleTranscriptToggle();
			} else if (which === 'sign') {
				this.closingSign = true; 
				this.handleSignToggle();
			}
		}
	};

	AblePlayer.prototype.startDrag = function(which, $element) {

		var thisObj, $windowPopup, startPos, newX, newY;

		thisObj = this;

		if (!this.$activeWindow) {
			this.$activeWindow = $element;
		}
		this.dragging = true;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
		}

		if ($windowPopup.is(':visible')) {
			$windowPopup.hide();
		}

		this.updateZIndex(which);

		startPos = this.$activeWindow.position();
		this.dragStartX = startPos.left;
		this.dragStartY = startPos.top;

		if (typeof this.startMouseX === 'undefined') {
			this.dragDevice = 'keyboard';
			this.dragKeyX = this.dragStartX;
			this.dragKeyY = this.dragStartY;
			this.startingDrag = true;
		} else {
			this.dragDevice = 'mouse';
			this.dragOffsetX = this.startMouseX - this.dragStartX;
			this.dragOffsetY = this.startMouseY - this.dragStartY;
		}

		this.$activeWindow.addClass('able-drag').css({
			'position': 'absolute',
			'top': this.dragStartY + 'px',
			'left': this.dragStartX + 'px'
		}).trigger('focus');

		var dragDevice = this.dragDevice;
		if (this.dragDevice === 'mouse') { 
			$(document).on('mousemove touchmove',function(e) {
				if (thisObj.dragging) {
					newX = e.pageX - thisObj.dragOffsetX;
					newY = e.pageY - thisObj.dragOffsetY;
					thisObj.resetDraggedObject( newX, newY );
				}
			});
		} else if (this.dragDevice === 'keyboard') {
			this.$activeWindow.on('keydown',function(e) {
				if (thisObj.dragging) {
					thisObj.dragKeys(which, e);
				}
			});
		}
		return false;
	};

	AblePlayer.prototype.dragKeys = function(which, e) {

		var key, keySpeed;

		if (this.startingDrag) {
			this.startingDrag = false;
			return false;
		}
		key = e.key;
		keySpeed = 10; 

		switch (key) {
			case 'ArrowLeft':	
				 this.dragKeyX -= keySpeed;
				 this.$srAlertBox.text( this.translate( 'windowMoveLeft', 'Window moved left' ) );
				break;
			case 'ArrowUp':	
				this.dragKeyY -= keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveUp', 'Window moved up' ) );
				break;
			case 'ArrowRight':	
				this.dragKeyX += keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveRight', 'Window moved right' ) );
				break;
			case 'ArrowDown':	
				this.dragKeyY += keySpeed;
				this.$srAlertBox.text( this.translate( 'windowMoveDown', 'Window moved down' ) );
				break;
			case 'Enter': 	
			case 'Escape': 	
				this.$srAlertBox.text( this.translate( 'windowMoveStopped', 'Window move stopped' ) );
				this.endDrag(which);
				return false;
			default:
				return false;
		}
		this.resetDraggedObject(this.dragKeyX,this.dragKeyY);
		if (e.preventDefault) {
			e.preventDefault();
		}
		return false;
	};

	AblePlayer.prototype.resetDraggedObject = function ( x, y) {
		setTimeout( () => {
			this.$srAlertBox.text( '' );
		}, 2000 );

		this.$activeWindow.css({
			'left': x + 'px',
			'top': y + 'px'
		});
	},

	AblePlayer.prototype.resizeObject = function ( which, width, height ) {

		var innerHeight;

		this.$activeWindow.css({
			'width': width + 'px',
			'height': height + 'px'
		});

		if (which === 'transcript') {
			innerHeight = height - 50;
			this.$transcriptDiv.css('height', innerHeight + 'px');
		}
	};

	AblePlayer.prototype.endDrag = function(which) {

		var thisObj, $windowPopup, $windowButton;
		thisObj = this;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown').removeClass('able-drag');
		this.$activeWindow.attr('role','dialog');
		this.$activeWindow = null;

		if (this.dragDevice === 'keyboard') {
			$windowButton.trigger('focus');
		}
		this.dragging = false;

		this.updatePreferences(which);

		this.startMouseX = undefined;
		this.startMouseY = undefined;

		this.windowMenuClickRegistered = false;
		this.finishingDrag = true; 
		setTimeout(function() {
			thisObj.finishingDrag = false;
		}, 100);
	};

	AblePlayer.prototype.startResize = function(which, $element) {

		var thisObj, $windowPopup, newWidth, newHeight;

		thisObj = this;
		this.$activeWindow = $element;
		this.resizing = true;

		$windowPopup = (which === 'transcript') ? this.$transcriptPopup : this.$signPopup;

		if ($windowPopup.is(':visible')) {
			$windowPopup.hide().parent().trigger('focus');
		}

		startPos = this.$activeWindow.position();
		this.dragKeyX = this.dragStartX;
		this.dragKeyY = this.dragStartY;
		this.dragStartWidth = this.$activeWindow.width();
		this.dragStartHeight = this.$activeWindow.outerHeight();

		$(document).on('mousemove touchmove',function(e) {
			if (thisObj.resizing) {
				newWidth = thisObj.dragStartWidth + (e.pageX - thisObj.startMouseX);
				newHeight = thisObj.dragStartHeight + (e.pageY - thisObj.startMouseY);
				thisObj.resizeObject( which, newWidth, newHeight );
			}
		});

		return false;
	};

	AblePlayer.prototype.endResize = function(which) {

		var $windowPopup, $windowButton;

		if (which === 'transcript') {
			$windowPopup = this.$transcriptPopup;
			$windowButton = this.$transcriptPopupButton;
		} else if (which === 'sign') {
			$windowPopup = this.$signPopup;
			$windowButton = this.$signPopupButton;
		}

		$(document).off('mousemove mouseup touchmove touchup');
		this.$activeWindow.off('keydown');
		$windowButton.show().trigger('focus');
		this.resizing = false;
		this.$activeWindow.removeClass('able-resize');

		this.updatePreferences(which);

		this.windowMenuClickRegistered = false;
		this.finishingDrag = true;

		setTimeout(function() {
			this.finishingDrag = false;
		}, 100);
	};
})(jQuery);

(function ($) {
	AblePlayer.prototype.initSignLanguage = function() {
		this.hasSignLanguage = false;
		var hasLocalSrc = ( this.$sources.first().attr('data-sign-src') !== undefined && this.$sources.first().attr('data-sign-src') !== "" );
		var hasRemoteSrc = ( this.$media.data('youtube-sign-src') !== undefined && this.$media.data('youtube-sign-src') !== "" );
		var hasRemoteSource = ( this.$sources.first().attr('data-youtube-sign-src') !== undefined && this.$sources.first().attr('data-youtube-sign-src') !== '' );
		if ( ! this.isIOS() && ( hasLocalSrc || hasRemoteSrc || hasRemoteSource ) && ( this.player === 'html5' || this.player === 'youtube' ) ) {
			let ytSignSrc = this.youTubeSignId ?? DOMPurify.sanitize( this.$sources.first().attr('data-youtube-sign-src') );
			let signSrc = DOMPurify.sanitize( this.$sources.first().attr('data-sign-src') );
			let signVideo = DOMPurify.sanitize( this.$media.data('youtube-sign-src') );
			this.signFile = (hasLocalSrc ) ? signSrc : false;
			if ( hasRemoteSrc ) {
				this.signYoutubeId = signVideo;
			} else if ( hasRemoteSource ) {
				this.signYoutubeId = ytSignSrc;
			}
			if ( this.signFile || this.signYoutubeId ) {
				if (this.isIOS()) {
					if (this.debug) {

											}
				} else {
					if (this.debug) {

											}
					this.hasSignLanguage = true;
					this.injectSignPlayerCode();
				}
			}
		}
	};

	AblePlayer.prototype.injectSignPlayerCode = function() {

		var thisObj, signVideoId, i, signSrc, srcType, $signSource;

		thisObj = this;
		signVideoId = this.mediaId + '-sign';

		if ( this.signFile || this.signYoutubeId ) {
			if ( null !== this.$signDivLocation ) {
				this.$signDivLocation.addClass( 'able-sign-window able-fixed' );
				this.$signWindow = this.$signDivLocation;
			} else {
				this.$signWindow = $('<div>',{
					'class' : 'able-sign-window',
					'role': 'dialog',
					'aria-label': this.translate( 'sign', 'Sign language' )
				});
				this.$signToolbar = $('<div>',{
					'class': 'able-window-toolbar able-' + this.toolbarIconColor + '-controls'
				});
				this.$signWindow.append(this.$signToolbar);
			}

			this.$ableWrapper.append(this.$signWindow);
		}

		if ( this.signFile ) {
			this.$signVideo = $('<video>',{
				'id' : signVideoId,
				'tabindex' : '-1',
				'muted' : true,
			});
			this.signVideo = this.$signVideo[0];

			if ( this.signFile ) {
				$signSource = $('<source>',{
					'src' : this.signFile,
					'type' : 'video/' + this.signFile.substr(-3)
				});
				this.$signVideo.append($signSource);
			} else {
				for (i=0; i < this.$sources.length; i++) {
					signSrc = DOMPurify.sanitize( this.$sources[i].getAttribute('data-sign-src') );
					srcType = this.$sources[i].getAttribute('type');
					if (signSrc) {
						$signSource = $('<source>',{
							'src' : signSrc,
							'type' : srcType
						});
						this.$signVideo.append($signSource);
					} else {
						this.hasSignLanguage = false;
						return;
					}
				}
			}
			this.$signWindow.append( this.$signVideo );
		} else if ( this.signYoutubeId ) {
			this.signYoutube = this.initYouTubeSignPlayer();
		}

		if ( null === this.$signDivLocation ) {
			this.initDragDrop('sign');
		}

		if (this.prefSign === 1) {
			if ( null === this.$signDivLocation ) {
				this.positionDraggableWindow('sign',this.getDefaultWidth('sign'));
			}
		} else {
			this.$signWindow.hide();
		}
	};


	AblePlayer.prototype.initYouTubeSignPlayer = function () {

		var thisObj, deferred, promise;
		thisObj = this;
		deferred = new this.defer();
		promise = deferred.promise();

		this.youTubeSignPlayerReady = false;

		if (AblePlayer.youTubeIframeAPIReady) {
			thisObj.finalizeYoutubeSignInit().then(function() {
				deferred.resolve();
			});
		} else {
			if ( ! AblePlayer.loadingYouTubeIframeAPI ) {
				thisObj.getScript('https://www.youtube.com/iframe_api', function () {

									});
			}

			$('body').on('youTubeIframeAPIReady', function () {
				thisObj.finalizeYoutubeSignInit().then(function() {
					deferred.resolve();
				});
			});
		}
		return promise;
	};

	AblePlayer.prototype.finalizeYoutubeSignInit = function () {

		var deferred, promise, thisObj, containerId, ccLoadPolicy, autoplay;

		deferred = new this.defer();
		promise = deferred.promise();
		thisObj = this;
		containerId = this.mediaId + '_youtube_sign';

		this.$signWindow.append($('<div>').attr('id', containerId));
		autoplay = (this.okToPlay) ? 1 : 0;

		this.youTubeSignPlayer = new YT.Player(containerId, {
			videoId: this.getYouTubeId(this.signYoutubeId),
			host: this.youTubeNoCookie ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com',
			playerVars: {
				autoplay: autoplay,
				cc_lang_pref: this.captionLang, 
				cc_load_policy: 0,
				controls: 0, 
				disableKb: 1, 
				enablejsapi: 1,
				hl: this.lang, 
				iv_load_policy: 3, 
				origin: window.location.origin,
				playsinline: this.playsInline,
				rel: 0, 
				start: this.startTime
			},
			events: {
				onReady: function (player) {
					player.target.mute();
					player.target.unloadModule( 'captions' );
					thisObj.youTubeSignPlayerReady = true;

					deferred.resolve();
				},
				onError: function (x) {
					deferred.reject();
				},
				onStateChange: function (x) {
					thisObj.getPlayerState().then(function() {
					});
				},
				onApiChange: function() {
				},
				onPlaybackQualityChange: function () {
				},
			}
		});

		return promise;
	};

})(jQuery);

(function ($) {

	var isoLangs = {
		"ab":{
				"name":"Abkhaz",
				"nativeName":"аҧсуа"
		},
		"aa":{
				"name":"Afar",
				"nativeName":"Afaraf"
		},
		"af":{
				"name":"Afrikaans",
				"nativeName":"Afrikaans"
		},
		"ak":{
				"name":"Akan",
				"nativeName":"Akan"
		},
		"sq":{
				"name":"Albanian",
				"nativeName":"Shqip"
		},
		"am":{
				"name":"Amharic",
				"nativeName":"አማርኛ"
		},
		"ar":{
				"name":"Arabic",
				"nativeName":"العربية"
		},
		"an":{
				"name":"Aragonese",
				"nativeName":"Aragonés"
		},
		"hy":{
				"name":"Armenian",
				"nativeName":"Հայերեն"
		},
		"as":{
				"name":"Assamese",
				"nativeName":"অসমীয়া"
		},
		"av":{
				"name":"Avaric",
				"nativeName":"авар мацӀ, магӀарул мацӀ"
		},
		"ae":{
				"name":"Avestan",
				"nativeName":"avesta"
		},
		"ay":{
				"name":"Aymara",
				"nativeName":"aymar aru"
		},
		"az":{
				"name":"Azerbaijani",
				"nativeName":"azərbaycan dili"
		},
		"bm":{
				"name":"Bambara",
				"nativeName":"bamanankan"
		},
		"ba":{
				"name":"Bashkir",
				"nativeName":"башҡорт теле"
		},
		"eu":{
				"name":"Basque",
				"nativeName":"euskara, euskera"
		},
		"be":{
				"name":"Belarusian",
				"nativeName":"Беларуская"
		},
		"bn":{
				"name":"Bengali",
				"nativeName":"বাংলা"
		},
		"bh":{
				"name":"Bihari",
				"nativeName":"भोजपुरी"
		},
		"bi":{
				"name":"Bislama",
				"nativeName":"Bislama"
		},
		"bs":{
				"name":"Bosnian",
				"nativeName":"bosanski jezik"
		},
		"br":{
				"name":"Breton",
				"nativeName":"brezhoneg"
		},
		"bg":{
				"name":"Bulgarian",
				"nativeName":"български език"
		},
		"my":{
				"name":"Burmese",
				"nativeName":"ဗမာစာ"
		},
		"ca":{
				"name":"Catalan",
				"nativeName":"Català"
		},
		"ch":{
				"name":"Chamorro",
				"nativeName":"Chamoru"
		},
		"ce":{
				"name":"Chechen",
				"nativeName":"нохчийн мотт"
		},
		"ny":{
				"name":"Chichewa",
				"nativeName":"chiCheŵa, chinyanja"
		},
		"zh":{
				"name":"Chinese",
				"nativeName":"中文 (Zhōngwén), 汉语, 漢語"
		},
		"cv":{
				"name":"Chuvash",
				"nativeName":"чӑваш чӗлхи"
		},
		"kw":{
				"name":"Cornish",
				"nativeName":"Kernewek"
		},
		"co":{
				"name":"Corsican",
				"nativeName":"corsu, lingua corsa"
		},
		"cr":{
				"name":"Cree",
				"nativeName":"ᓀᐦᐃᔭᐍᐏᐣ"
		},
		"hr":{
				"name":"Croatian",
				"nativeName":"hrvatski"
		},
		"cs":{
				"name":"Czech",
				"nativeName":"česky, čeština"
		},
		"da":{
				"name":"Danish",
				"nativeName":"dansk"
		},
		"dv":{
				"name":"Divehi",
				"nativeName":"ދިވެހި"
		},
		"nl":{
				"name":"Dutch",
				"nativeName":"Nederlands, Vlaams"
		},
		"en":{
				"name":"English",
				"nativeName":"English"
		},
		"eo":{
				"name":"Esperanto",
				"nativeName":"Esperanto"
		},
		"et":{
				"name":"Estonian",
				"nativeName":"eesti, eesti keel"
		},
		"ee":{
				"name":"Ewe",
				"nativeName":"Eʋegbe"
		},
		"fo":{
				"name":"Faroese",
				"nativeName":"føroyskt"
		},
		"fj":{
				"name":"Fijian",
				"nativeName":"vosa Vakaviti"
		},
		"fi":{
				"name":"Finnish",
				"nativeName":"suomi, suomen kieli"
		},
		"fr":{
				"name":"French",
				"nativeName":"français, langue française"
		},
		"ff":{
				"name":"Fula",
				"nativeName":"Fulfulde, Pulaar, Pular"
		},
		"gl":{
				"name":"Galician",
				"nativeName":"Galego"
		},
		"ka":{
				"name":"Georgian",
				"nativeName":"ქართული"
		},
		"de":{
				"name":"German",
				"nativeName":"Deutsch"
		},
		"el":{
				"name":"Greek",
				"nativeName":"Ελληνικά"
		},
		"gn":{
				"name":"Guaraní",
				"nativeName":"Avañeẽ"
		},
		"gu":{
				"name":"Gujarati",
				"nativeName":"ગુજરાતી"
		},
		"ht":{
				"name":"Haitian",
				"nativeName":"Kreyòl ayisyen"
		},
		"ha":{
				"name":"Hausa",
				"nativeName":"Hausa, هَوُسَ"
		},
		"he":{
				"name":"Hebrew",
				"nativeName":"עברית"
		},
		"hz":{
				"name":"Herero",
				"nativeName":"Otjiherero"
		},
		"hi":{
				"name":"Hindi",
				"nativeName":"हिन्दी, हिंदी"
		},
		"ho":{
				"name":"Hiri Motu",
				"nativeName":"Hiri Motu"
		},
		"hu":{
				"name":"Hungarian",
				"nativeName":"Magyar"
		},
		"ia":{
				"name":"Interlingua",
				"nativeName":"Interlingua"
		},
		"id":{
				"name":"Indonesian",
				"nativeName":"Bahasa Indonesia"
		},
		"ie":{
				"name":"Interlingue",
				"nativeName":"Originally called Occidental; then Interlingue after WWII"
		},
		"ga":{
				"name":"Irish",
				"nativeName":"Gaeilge"
		},
		"ig":{
				"name":"Igbo",
				"nativeName":"Asụsụ Igbo"
		},
		"ik":{
				"name":"Inupiaq",
				"nativeName":"Iñupiaq, Iñupiatun"
		},
		"io":{
				"name":"Ido",
				"nativeName":"Ido"
		},
		"is":{
				"name":"Icelandic",
				"nativeName":"Íslenska"
		},
		"it":{
				"name":"Italian",
				"nativeName":"Italiano"
		},
		"iu":{
				"name":"Inuktitut",
				"nativeName":"ᐃᓄᒃᑎᑐᑦ"
		},
		"ja":{
				"name":"Japanese",
				"nativeName":"日本語 (にほんご／にっぽんご)"
		},
		"jv":{
				"name":"Javanese",
				"nativeName":"basa Jawa"
		},
		"kl":{
				"name":"Kalaallisut",
				"nativeName":"kalaallisut, kalaallit oqaasii"
		},
		"kn":{
				"name":"Kannada",
				"nativeName":"ಕನ್ನಡ"
		},
		"kr":{
				"name":"Kanuri",
				"nativeName":"Kanuri"
		},
		"ks":{
				"name":"Kashmiri",
				"nativeName":"कश्मीरी, كشميري‎"
		},
		"kk":{
				"name":"Kazakh",
				"nativeName":"Қазақ тілі"
		},
		"km":{
				"name":"Khmer",
				"nativeName":"ភាសាខ្មែរ"
		},
		"ki":{
				"name":"Kikuyu",
				"nativeName":"Gĩkũyũ"
		},
		"rw":{
				"name":"Kinyarwanda",
				"nativeName":"Ikinyarwanda"
		},
		"ky":{
				"name":"Kyrgyz",
				"nativeName":"кыргыз тили"
		},
		"kv":{
				"name":"Komi",
				"nativeName":"коми кыв"
		},
		"kg":{
				"name":"Kongo",
				"nativeName":"KiKongo"
		},
		"ko":{
				"name":"Korean",
				"nativeName":"한국어 (韓國語), 조선말 (朝鮮語)"
		},
		"ku":{
				"name":"Kurdish",
				"nativeName":"Kurdî, كوردی‎"
		},
		"kj":{
				"name":"Kuanyama",
				"nativeName":"Kuanyama"
		},
		"la":{
				"name":"Latin",
				"nativeName":"latine, lingua latina"
		},
		"lb":{
				"name":"Luxembourgish",
				"nativeName":"Lëtzebuergesch"
		},
		"lg":{
				"name":"Luganda",
				"nativeName":"Luganda"
		},
		"li":{
				"name":"Limburgish",
				"nativeName":"Limburgs"
		},
		"ln":{
				"name":"Lingala",
				"nativeName":"Lingála"
		},
		"lo":{
				"name":"Lao",
				"nativeName":"ພາສາລາວ"
		},
		"lt":{
				"name":"Lithuanian",
				"nativeName":"lietuvių kalba"
		},
		"lu":{
				"name":"Luba-Katanga",
				"nativeName":""
		},
		"lv":{
				"name":"Latvian",
				"nativeName":"latviešu valoda"
		},
		"gv":{
				"name":"Manx",
				"nativeName":"Gaelg, Gailck"
		},
		"mk":{
				"name":"Macedonian",
				"nativeName":"македонски јазик"
		},
		"mg":{
				"name":"Malagasy",
				"nativeName":"Malagasy fiteny"
		},
		"ms":{
				"name":"Malay",
				"nativeName":"bahasa Melayu, بهاس ملايو‎"
		},
		"ml":{
				"name":"Malayalam",
				"nativeName":"മലയാളം"
		},
		"mt":{
				"name":"Maltese",
				"nativeName":"Malti"
		},
		"mi":{
				"name":"Māori",
				"nativeName":"te reo Māori"
		},
		"mr":{
				"name":"Marathi",
				"nativeName":"मराठी"
		},
		"mh":{
				"name":"Marshallese",
				"nativeName":"Kajin M̧ajeļ"
		},
		"mn":{
				"name":"Mongolian",
				"nativeName":"монгол"
		},
		"na":{
				"name":"Nauru",
				"nativeName":"Ekakairũ Naoero"
		},
		"nv":{
				"name":"Navajo",
				"nativeName":"Diné bizaad, Dinékʼehǰí"
		},
		"nb":{
				"name":"Norwegian Bokmål",
				"nativeName":"Norsk bokmål"
		},
		"nd":{
				"name":"North Ndebele",
				"nativeName":"isiNdebele"
		},
		"ne":{
				"name":"Nepali",
				"nativeName":"नेपाली"
		},
		"ng":{
				"name":"Ndonga",
				"nativeName":"Owambo"
		},
		"nn":{
				"name":"Norwegian Nynorsk",
				"nativeName":"Norsk nynorsk"
		},
		"no":{
				"name":"Norwegian",
				"nativeName":"Norsk"
		},
		"ii":{
				"name":"Nuosu",
				"nativeName":"ꆈꌠ꒿ Nuosuhxop"
		},
		"nr":{
				"name":"South Ndebele",
				"nativeName":"isiNdebele"
		},
		"oc":{
				"name":"Occitan",
				"nativeName":"Occitan"
		},
		"oj":{
				"name":"Ojibwe",
				"nativeName":"ᐊᓂᔑᓈᐯᒧᐎᓐ"
		},
		"cu":{
				"name":"Church Slavonic",
				"nativeName":"ѩзыкъ словѣньскъ"
		},
		"om":{
				"name":"Oromo",
				"nativeName":"Afaan Oromoo"
		},
		"or":{
				"name":"Oriya",
				"nativeName":"ଓଡ଼ିଆ"
		},
		"os":{
				"name":"Ossetian",
				"nativeName":"ирон æвзаг"
		},
		"pa":{
				"name":"Punjabi",
				"nativeName":"ਪੰਜਾਬੀ, پنجابی‎"
		},
		"pi":{
				"name":"Pāli",
				"nativeName":"पाऴि"
		},
		"fa":{
				"name":"Persian",
				"nativeName":"فارسی"
		},
		"pl":{
				"name":"Polish",
				"nativeName":"polski"
		},
		"ps":{
				"name":"Pashto",
				"nativeName":"پښتو"
		},
		"pt":{
				"name":"Portuguese",
				"nativeName":"Português"
		},
		"qu":{
				"name":"Quechua",
				"nativeName":"Runa Simi, Kichwa"
		},
		"rm":{
				"name":"Romansh",
				"nativeName":"rumantsch grischun"
		},
		"rn":{
				"name":"Kirundi",
				"nativeName":"kiRundi"
		},
		"ro":{
				"name":"Romanian",
				"nativeName":"română"
		},
		"ru":{
				"name":"Russian",
				"nativeName":"русский язык"
		},
		"sa":{
				"name":"Sanskrit",
				"nativeName":"संस्कृतम्"
		},
		"sc":{
				"name":"Sardinian",
				"nativeName":"sardu"
		},
		"sd":{
				"name":"Sindhi",
				"nativeName":"सिन्धी, سنڌي، سندھی‎"
		},
		"se":{
				"name":"Northern Sami",
				"nativeName":"Davvisámegiella"
		},
		"sm":{
				"name":"Samoan",
				"nativeName":"gagana faa Samoa"
		},
		"sg":{
				"name":"Sango",
				"nativeName":"yângâ tî sängö"
		},
		"sr":{
				"name":"Serbian",
				"nativeName":"српски језик"
		},
		"gd":{
				"name":"Gaelic",
				"nativeName":"Gàidhlig"
		},
		"sn":{
				"name":"Shona",
				"nativeName":"chiShona"
		},
		"si":{
				"name":"Sinhalese",
				"nativeName":"සිංහල"
		},
		"sk":{
				"name":"Slovak",
				"nativeName":"slovenčina"
		},
		"sl":{
				"name":"Slovene",
				"nativeName":"slovenščina"
		},
		"so":{
				"name":"Somali",
				"nativeName":"Soomaaliga, af Soomaali"
		},
		"st":{
				"name":"Southern Sotho",
				"nativeName":"Sesotho"
		},
		"es":{
				"name":"Spanish",
				"nativeName":"español, castellano"
		},
		"su":{
				"name":"Sundanese",
				"nativeName":"Basa Sunda"
		},
		"sw":{
				"name":"Swahili",
				"nativeName":"Kiswahili"
		},
		"ss":{
				"name":"Swati",
				"nativeName":"SiSwati"
		},
		"sv":{
				"name":"Swedish",
				"nativeName":"svenska"
		},
		"ta":{
				"name":"Tamil",
				"nativeName":"தமிழ்"
		},
		"te":{
				"name":"Telugu",
				"nativeName":"తెలుగు"
		},
		"tg":{
				"name":"Tajik",
				"nativeName":"тоҷикӣ, toğikī, تاجیکی‎"
		},
		"th":{
				"name":"Thai",
				"nativeName":"ไทย"
		},
		"ti":{
				"name":"Tigrinya",
				"nativeName":"ትግርኛ"
		},
		"bo":{
				"name":"Tibetan",
				"nativeName":"བོད་ཡིག"
		},
		"tk":{
				"name":"Turkmen",
				"nativeName":"Türkmen, Түркмен"
		},
		"tl":{
				"name":"Tagalog",
				"nativeName":"Wikang Tagalog, ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔"
		},
		"tn":{
				"name":"Tswana",
				"nativeName":"Setswana"
		},
		"to":{
				"name":"Tonga",
				"nativeName":"faka Tonga"
		},
		"tr":{
				"name":"Turkish",
				"nativeName":"Türkçe"
		},
		"ts":{
				"name":"Tsonga",
				"nativeName":"Xitsonga"
		},
		"tt":{
				"name":"Tatar",
				"nativeName":"татарча, tatarça, تاتارچا‎"
		},
		"tw":{
				"name":"Twi",
				"nativeName":"Twi"
		},
		"ty":{
				"name":"Tahitian",
				"nativeName":"Reo Tahiti"
		},
		"ug":{
				"name":"Uyghur",
				"nativeName":"Uyƣurqə, ئۇيغۇرچە‎"
		},
		"uk":{
				"name":"Ukrainian",
				"nativeName":"українська"
		},
		"ur":{
				"name":"Urdu",
				"nativeName":"اردو"
		},
		"uz":{
				"name":"Uzbek",
				"nativeName":"zbek, Ўзбек, أۇزبېك‎"
		},
		"ve":{
				"name":"Venda",
				"nativeName":"Tshivenḓa"
		},
		"vi":{
				"name":"Vietnamese",
				"nativeName":"Tiếng Việt"
		},
		"vo":{
				"name":"Volapük",
				"nativeName":"Volapük"
		},
		"wa":{
				"name":"Walloon",
				"nativeName":"Walon"
		},
		"cy":{
				"name":"Welsh",
				"nativeName":"Cymraeg"
		},
		"wo":{
				"name":"Wolof",
				"nativeName":"Wollof"
		},
		"fy":{
				"name":"Western Frisian",
				"nativeName":"Frysk"
		},
		"xh":{
				"name":"Xhosa",
				"nativeName":"isiXhosa"
		},
		"yi":{
				"name":"Yiddish",
				"nativeName":"ייִדיש"
		},
		"yo":{
				"name":"Yoruba",
				"nativeName":"Yorùbá"
		},
		"za":{
				"name":"Zhuang",
				"nativeName":"Saɯ cueŋƅ, Saw cuengh"
		},
		"ar-dz":{
				"name":"Arabic (Algeria)",
				"nativeName":"العربية (الجزائر)"
		},
		"ar-bh":{
				"name":"Arabic (Bahrain)",
				"nativeName":"العربية (البحرين)"
		},
		"ar-eg":{
				"name":"Arabic (Egypt)",
				"nativeName":"العربية (مصر)"
		},
		"ar-iq":{
				"name":"Arabic (Iraq)",
				"nativeName":"العربية (العراق)"
		},
		"ar-jo":{
				"name":"Arabic (Jordan)",
				"nativeName":"العربية (الأردن)"
		},
		"ar-kw":{
				"name":"Arabic (Kuwait)",
				"nativeName":"العربية (الكويت)"
		},
		"ar-lb":{
				"name":"Arabic (Lebanon)",
				"nativeName":"العربية (لبنان)"
		},
		"ar-ly":{
				"name":"Arabic (Libya)",
				"nativeName":"العربية (ليبيا)"
		},
		"ar-ma":{
				"name":"Arabic (Morocco)",
				"nativeName":"العربية (المملكة المغربية)"
		},
		"ar-om":{
				"name":"Arabic (Oman)",
				"nativeName":"العربية (عمان)"
		},
		"ar-qa":{
				"name":"Arabic (Qatar)",
				"nativeName":"العربية (قطر)"
		},
		"ar-sa":{
				"name":"Arabic (Saudi Arabia)",
				"nativeName":"العربية (المملكة العربية السعودية)"
		},
		"ar-sy":{
				"name":"Arabic (Syria)",
				"nativeName":"العربية (سوريا)"
		},
		"ar-tn":{
				"name":"Arabic (Tunisia)",
				"nativeName":"العربية (تونس)"
		},
		"ar-ae":{
				"name":"Arabic (U.A.E.)",
				"nativeName":"العربية (الإمارات العربية المتحدة)"
		},
		"ar-ye":{
				"name":"Arabic (Yemen)",
				"nativeName":"العربية (اليمن)"
		},
		"de-at":{
				"name":"German (Austria)",
				"nativeName":"Deutsch (Österreich)"
		},
		"de-li":{
				"name":"German (Liechtenstein)",
				"nativeName":"Deutsch (Liechtenstein)"
		},
		"de-lu":{
				"name":"German (Luxembourg)",
				"nativeName":"Deutsch (Luxemburg)"
		},
		"de-ch":{
				"name":"German (Switzerland)",
				"nativeName":"Deutsch (Schweiz)"
		},
		"en-au":{
				"name":"English (Australia)",
				"nativeName":"English (Australia)"
		},
		"en-bz":{
				"name":"English (Belize)",
				"nativeName":"English (Belize)"
		},
		"en-ca":{
				"name":"English (Canada)",
				"nativeName":"English (Canada)"
		},
		"en-ie":{
				"name":"English (Ireland)",
				"nativeName":"English (Ireland)"
		},
		"en-jm":{
				"name":"English (Jamaica)",
				"nativeName":"English (Jamaica)"
		},
		"en-nz":{
				"name":"English (New Zealand)",
				"nativeName":""
		},
		"en-za":{
				"name":"English (South Africa)",
				"nativeName":"English (South Africa)"
		},
		"en-tt":{
				"name":"English (Trinidad)",
				"nativeName":"English (Trinidad y Tobago)"
		},
		"en-gb":{
				"name":"English (United Kingdom)",
				"nativeName":"English (United Kingdom)"
		},
		"en-us":{
				"name":"English (United States)",
				"nativeName":"English (United States)"
		},
		"es-ar":{
				"name":"Spanish (Argentina)",
				"nativeName":"Español (Argentina)"
		},
		"es-bo":{
				"name":"Spanish (Bolivia)",
				"nativeName":"Español (Bolivia)"
		},
		"es-cl":{
				"name":"Spanish (Chile)",
				"nativeName":"Español (Chile)"
		},
		"es-co":{
				"name":"Spanish (Colombia)",
				"nativeName":"Español (Colombia)"
		},
		"es-cr":{
				"name":"Spanish (Costa Rica)",
				"nativeName":"Español (Costa Rica)"
		},
		"es-do":{
				"name":"Spanish (Dominican Republic)",
				"nativeName":"Español (República Dominicana)"
		},
		"es-ec":{
				"name":"Spanish (Ecuador)",
				"nativeName":"Español (Ecuador)"
		},
		"es-sv":{
				"name":"Spanish (El Salvador)",
				"nativeName":"Español (El Salvador)"
		},
		"es-gt":{
				"name":"Spanish (Guatemala)",
				"nativeName":"Español (Guatemala)"
		},
		"es-hn":{
				"name":"Spanish (Honduras)",
				"nativeName":"Español (Honduras)"
		},
		"es-mx":{
				"name":"Spanish (Mexico)",
				"nativeName":"Español (México)"
		},
		"es-ni":{
				"name":"Spanish (Nicaragua)",
				"nativeName":"Español (Nicaragua)"
		},
		"es-pa":{
				"name":"Spanish (Panama)",
				"nativeName":"Español (Panamá)"
		},
		"es-py":{
				"name":"Spanish (Paraguay)",
				"nativeName":"Español (Paraguay)"
		},
		"es-pe":{
				"name":"Spanish (Peru)",
				"nativeName":"Español (Perú)"
		},
		"es-pr":{
				"name":"Spanish (Puerto Rico)",
				"nativeName":"Español (Puerto Rico)"
		},
		"es-uy":{
				"name":"Spanish (Uruguay)",
				"nativeName":"Español (Uruguay)"
		},
		"es-ve":{
				"name":"Spanish (Venezuela)",
				"nativeName":"Español (Venezuela)"
		},
		"fr-be":{
				"name":"French (Belgium)",
				"nativeName":"français (Belgique)"
		},
		"fr-ca":{
				"name":"French (Canada)",
				"nativeName":"français (Canada)"
		},
		"fr-lu":{
				"name":"French (Luxembourg)",
				"nativeName":"français (Luxembourg)"
		},
		"fr-ch":{
				"name":"French (Switzerland)",
				"nativeName":"français (Suisse)"
		},
		"it-ch":{
				"name":"Italian (Switzerland)",
				"nativeName":"italiano (Svizzera)"
		},
		"nl-be":{
				"name":"Dutch (Belgium)",
				"nativeName":"Nederlands (België)"
		},
		"pt-br":{
				"name":"Portuguese (Brazil)",
				"nativeName":"Português (Brasil)"
		},
		"sv-fi":{
				"name":"Swedish (Finland)",
				"nativeName":"svenska (Finland)"
		},
		"zh-hk":{
				"name":"Chinese (Hong Kong)",
				"nativeName":"中文(香港特别行政區)"
		},
		"zh-cn":{
				"name":"Chinese (PRC)",
				"nativeName":"中文(中华人民共和国)"
		},
		"zh-sg":{
				"name":"Chinese (Singapore)",
				"nativeName":"中文(新加坡)"
		},
		"zh-tw":{
				"name":"Chinese Traditional (Taiwan)",
				"nativeName":"中文（台灣）"
		}
	}

	AblePlayer.prototype.getLanguageName = function (key,whichName) {


		var lang, code, subTag;
		lang = isoLangs[key.toLowerCase()];
		if (lang) {
			return (whichName === 'local') ? lang.nativeName : lang.name;
		} else if (key.includes('-')) {
			code = key.substring(0,2);
			subTag = key.substring(3);
			lang = isoLangs[code.toLowerCase()];
			if (lang) {
				return (whichName === 'local') ? lang.nativeName + ' (' + subTag + ')' : lang.name + ' (' + subTag + ')';
			}
		}
		return key;
	};

})(jQuery);
(function ($) {
	AblePlayer.prototype.getSupportedLangs = function() {
		var langs = {
			'ca'    : 'Catalan',
			'cs'    : 'Czech',
			'da'    : 'Danish',
			'de'    : 'German',
			'en'    : 'English',
			'es'    : 'Spanish',
			'fr'    : 'French',
			'he'    : 'Hebrew',
			'id'    : 'Indonesian',
			'it'    : 'Italian',
			'ja'    : 'Japanese',
			'ms'    : 'Malay',
			'nb'    : 'Norwegian Bokmål',
			'nl'    : 'Dutch',
			'pl'    : 'Polish',
			'pt'    : 'Portuguese',
			'pt-br' : 'Brazilian Portuguese',
			'sv'    : 'Swedish',
			'tr'    : 'Turkish',
			'zh-tw' : 'Chinese (Taiwan)'
		};

		return langs;
	};

	AblePlayer.prototype.translate = function( key, fallback, args = Array() ) {
		let translation = '';
		if ( this.tt[ key ] ) {
			translation = this.tt[ key ];
		} else {
			translation = fallback;
		}
		if ( args.length > 0 ) {
			args.forEach( ( val, index ) => {
				let ref = index + 1;
				translation = translation.replace( '%' + ref, val );
			});
		}

		return translation;
	}

	AblePlayer.prototype.getTranslationText = function() {

		var deferred, thisObj, supportedLangs, docLang, translationFile, i,	similarLangFound;
		deferred = new this.defer();
		thisObj = this;

		supportedLangs = this.getSupportedLangs(); 

		if (this.lang) { 
			if ( Object.hasOwn( supportedLangs,this.lang ) ) {
				if ( this.lang.indexOf('-') == 2 ) {
					this.lang = ( Object.hasOwn(supportedLangs,this.lang.substring(0,2)) !== -1 ) ? this.lang.substring(0,2) : null;
				} else {
					similarLangFound = false;
					for ( const [key,value] of Object.entries(supportedLangs) ) {
						if ( key.substring(0,2) == this.lang ) {
							this.lang = supportedLangs[i];
							similarLangFound = true;
						}
					}
					if ( !similarLangFound ) {
						this.lang = null;
					}
				}
			}
		}

		if (!this.lang) {
			if ($('body').attr('lang')) {
				docLang = $('body').attr('lang').toLowerCase();
			} else if ($('html').attr('lang')) {
				docLang = $('html').attr('lang').toLowerCase();
			} else {
				docLang = null;
			}
			if (docLang) {
				if ( Object.hasOwn( supportedLangs,docLang ) ) {
					this.lang = docLang;
				} else {
					if (docLang.indexOf('-') == 2) {
						if ( Object.hasOwn(supportedLangs,docLang.substring(0,2)) ) {
							this.lang = docLang.substring(0,2);
						}
					}
				}
			}
		}

		if (!this.lang) {
			this.lang = 'en';
		}

		if (!this.searchLang) {
			this.searchLang = this.lang;
		}
		translationFile = this.rootPath + 'translations/' + this.lang + '.json';
		fetch(translationFile)
			.then( response => {
				return response.json();
			})
			.then( data => {
				thisObj.tt = data;
				thisObj.translationFiles = true;
				deferred.resolve();
			})
			.catch( error => {

								translationFile = thisObj.rootPath + 'translations/' + thisObj.lang + '.js';
				fetch(translationFile)
					.then( response => {
						return response.json();
					})
					.then( data => {
						thisObj.tt = data;
						thisObj.translationFiles = true;
						deferred.resolve();
					})
					.catch( error => {

												thisObj.tt = {};
						thisObj.translationFiles = false;
						deferred.resolve();
					});
			});
		return deferred.promise();
	};

	AblePlayer.prototype.getSampleDescriptionText = function() {
		if ( ! this.translationFiles ) {
			this.sampleText = [];
			let translation = { 'lang':'en', 'text': this.translate( 'sampleDescriptionText', 'Adjust settings to hear this sample text.' ) };
			this.sampleText.push(translation);
		} else {
			var thisObj, supportedLangs, thisLang, translationFile, thisText, translation;

			supportedLangs = this.getSupportedLangs();
			thisObj = this;

			this.sampleText = [];
			for ( const [key,value] of Object.entries(supportedLangs) ) {
				translationFile = this.rootPath + 'translations/' + key + '.json';
				fetch(translationFile)
					.then( response => {
						return response.json();
					})
					.then( data => {
						thisText = data.sampleDescriptionText;
						translation = {'lang':thisLang, 'text': thisText};
						thisObj.sampleText.push(translation);
					});
			}
		}
	};

})(jQuery);


(function ($) {
	AblePlayer.prototype.injectVTS = function() {

		var thisObj, $heading, $instructions, $p1, $p2, $ul, $li1, $li2, $li3,
		$fieldset, $legend, i, $radioDiv, radioId, $label, $radio, $saveButton, $savedTable;

		thisObj = this;

		if ( null !== document.getElementById( 'able-vts' ) ) {
			if (this.vtsTracks.length) {
				this.langs = [];
				this.getAllLangs(this.vtsTracks);

				this.vtsLang = this.lang;

				let heading = this.translate( 'vtsHeading', 'Video Transcript Sorter' );
				$heading = $('<h2>').text( heading ); 
				$('#able-vts').append($heading);

				this.$vtsAlert = $('<div>',{
					'id': 'able-vts-alert',
					'aria-live': 'polite',
					'aria-atomic': 'true'
				})
				$('#able-vts').append(this.$vtsAlert);

				$instructions = $('<div>',{
					'id': 'able-vts-instructions'
				});
				$p1 = $('<p>').text( this.translate( 'vtsInstructions1', 'Use the Video Transcript Sorter to modify text tracks:' ) );
				$ul = $('<ul>');
				$li1 = $('<li>').text( this.translate( 'vtsInstructions2', 'Reorder chapters, descriptions, captions, and/or subtitles so they appear in the proper sequence in Able Player\'s auto-generated transcript.' ) );
				$li2 = $('<li>').text( this.translate( 'vtsInstructions3', 'Modify content or start/end times (all are directly editable within the table).' ) );
				$li3 = $('<li>').text( this.translate( 'vtsInstructions4', 'Add new content, such as chapters or descriptions.' ) );
				$p2 = $('<p>').text( this.translate( 'vtsInstructions5', 'After editing, click the "Save Changes" button to generate new content for all relevant timed text files. The new text can be copied and pasted into new WebVTT files.' ) );
				$ul.append($li1,$li2,$li3);
				$instructions.append($p1,$ul,$p2);
				$('#able-vts').append($instructions);

				$fieldset = $('<fieldset>');
				$legend = $('<legend>').text( this.translate( 'vtsSelectLanguage', 'Select a language' ) );
				$fieldset.append($legend);
				$fieldWrapper = $( '<div class="vts-lang-selector"></div>' );
				for (i in this.langs) {
					radioId = 'vts-lang-radio-' + this.langs[i];
					$radioDiv = $('<div>',{
					});
					$radio = $('<input>', {
						'type': 'radio',
						'name': 'vts-lang',
						'id': radioId,
						'value': this.langs[i]
					}).on('click',function() {
						thisObj.vtsLang = $(this).val();
						thisObj.showVtsAlert('Loading ' + thisObj.getLanguageName(thisObj.vtsLang) + ' tracks');
						thisObj.injectVtsTable('update',thisObj.vtsLang);
					});
					if (this.langs[i] == this.lang) {
						$radio.prop('checked',true);
					}
					$label = $('<label>', {
						'for': radioId
					}).text(this.getLanguageName(this.langs[i]));
					$radioDiv.append($radio,$label);
					$fieldWrapper.append($radioDiv);
				}
				$fieldset.append( $fieldWrapper );
				$('#able-vts').append($fieldset);
				let vtsSave = this.translate( 'vtsSave', 'Generate new .vtt content' );
				$saveButton = $('<button>',{
					'type': 'button',
					'id': 'able-vts-save',
					'value': 'save'
				}).text( vtsSave );
				$('#able-vts').append($saveButton);

				this.injectVtsTable('add',this.vtsLang);

				var kindOptions, beforeEditing, editedCell, editedContent, i;
				kindOptions = ['captions','chapters','descriptions','subtitles'];
				$('td[contenteditable="true"]').on('focus',function() {
					beforeEditing = $(this).text();
				}).on('blur',function() {
					if (beforeEditing != $(this).text()) {
						editedCell = $(this).index();
						editedContent = $(this).text();
						if (editedCell === 1) {
							if ($.inArray(editedContent,kindOptions) === -1) {
								if (editedContent.substring(0,1) === 's') {
									$(this).text('subtitles');
								} else if (editedContent.substring(0,1) === 'd') {
									$(this).text('descriptions');
								} else if (editedContent.substring(0,2) === 'ch') {
									$(this).text('chapters');
								} else {
									$(this).text('captions');
								}
							}
						} else if (editedCell === 2 || editedCell === 3) {
							$(this).text(thisObj.formatTimestamp(editedContent));
						}
					}
				}).on('keydown',function(e) {
					e.stopPropagation();
				});

				$('#able-vts-save').on('click',function(e) {
					e.stopPropagation();
					if ($(this).attr('value') == 'save') {
						$(this).attr('value','cancel').text( thisObj.translate( 'vtsReturn', 'Return to Editor' ) );
						$savedTable = $('#able-vts table');
						$('#able-vts-instructions').hide();
						$('#able-vts > fieldset').hide();
						$('#able-vts table').remove();
						$('#able-vts-icon-credit').remove();
						thisObj.parseVtsOutput($savedTable);
					} else {
						$(this).attr('value','save').text( vtsSave );
						$('#able-vts-output').remove();
						$('#able-vts-instructions').show();
						$('#able-vts > fieldset').show();
						$('#able-vts').append($savedTable);
						$('#able-vts').append(thisObj.getIconCredit());
						thisObj.showVtsAlert( thisObj.translate( 'vtsCancel', 'Cancelling saving. Any edits you made have been restored in the VTS table.' ) );
					}
				});
			}
		}
	};

	AblePlayer.prototype.setupVtsTracks = function(kind, lang, trackDesc, label, src, contents) {

		var srcFile, vtsCues;

		srcFile = this.getFilenameFromPath(src);
		vtsCues = this.parseVtsTracks(contents);

		this.vtsTracks.push({
			'kind': kind,
			'language': lang,
			'label': label,
			'srcFile': srcFile,
			'cues': vtsCues
		});
	};

	AblePlayer.prototype.getFilenameFromPath = function(path) {

		var lastSlash;
		lastSlash = path.lastIndexOf('/');
		return (lastSlash === -1) ? path : path.substring(lastSlash+1);
	};

	AblePlayer.prototype.getFilenameFromTracks = function(kind,lang) {

		for (var i=0; i<this.vtsTracks.length; i++) {
			if (this.vtsTracks[i].kind === kind && this.vtsTracks[i].language === lang) {
				return this.vtsTracks[i].srcFile;
			}
		}
		return false;
	};

	AblePlayer.prototype.parseVtsTracks = function(contents) {

		var rows, timeParts, cues, i, j, thisRow, nextRow, content, blankRow;
		rows = contents.split("\n");
		cues = [];
		i = 0;
		while (i < rows.length) {
			thisRow = rows[i];
			if (thisRow.indexOf(' --> ') !== -1) {
				timeParts = thisRow.trim().split(' ');
				if (this.isValidTimestamp(timeParts[0]) && this.isValidTimestamp(timeParts[2])) {
					content = '';
					j = i+1;
					blankRow = false;
					while (j < rows.length && !blankRow) {
						nextRow = rows[j].trim();
						if (nextRow.length > 0) {
							if (content.length > 0) {
								content += "\n" + nextRow;
							} else {
								content += nextRow;
							}
						} else {
							blankRow = true;
						}
						j++;
					}
					cues.push({
						'start': timeParts[0],
						'end': timeParts[2],
						'content': content
					});
					i = j; 
				}
			} else {
				i++;
			}
		}
		return cues;
	};

	AblePlayer.prototype.isValidTimestamp = function(timestamp) {

		return (/^[0-9:,.]*$/.test(timestamp)) ? true : false;
	};

	AblePlayer.prototype.formatTimestamp = function(timestamp) {


		var firstPart, lastPart;

		firstPart = timestamp.substring(0,timestamp.lastIndexOf('.')+1);
		lastPart = timestamp.substring(timestamp.lastIndexOf('.')+1);


		if (lastPart.length > 3) {
			lastPart = lastPart.substring(0,3);
		} else if (lastPart.length < 3) {
			while (lastPart.length < 3) {
				lastPart += '0';
			}
		}
		return firstPart + lastPart;
	};


	AblePlayer.prototype.injectVtsTable = function(action,lang) {


		var $table, $thead, headers, i, $tr, $th, $td, rows, rowNum, rowId;

		if (action === 'update') {
			$('#able-vts table').remove();
			$('#able-vts-icon-credit').remove();
		}

		$table = $('<table>',{
			'lang': lang
		});
		$thead = $( '<thead>' );
		$tr = $( '<tr>' );
		headers = [
			this.translate( 'vtsRow', 'Row' ),
			this.translate( 'vtsKind', 'Kind' ),
			this.translate( 'vtsStart', 'Start' ),
			this.translate( 'vtsEnd', 'End' ),
			this.translate( 'vtsContent', 'Content' ),
			this.translate( 'vtsActions', 'Actions' )
		];
		for (i=0; i < headers.length; i++) {
			$th = $('<th>', {
				'scope': 'col'
			}).text(headers[i]);
			if (headers[i] === 'Actions') {
				$th.addClass('actions');
			}
			$tr.append($th);
		}
		$thead.append($tr);
		$table.append($thead);

		rows = this.getAllRows(lang);
		for (i=0; i < rows.length; i++) {
			rowNum = i + 1;
			rowId = 'able-vts-row-' + rowNum;
			$tr = $('<tr>',{
				'id': rowId,
				'class': 'kind-' + rows[i].kind
			});
			$td = $('<td>').text(rowNum);
			$tr.append($td);

			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].kind);
			$tr.append($td);

			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].start);
			$tr.append($td);

			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].end);
			$tr.append($td);

			$td = $('<td>',{
				'contenteditable': 'true'
			}).text(rows[i].content); 
			$tr.append($td);

			$td = this.addVtsActionButtons(rowNum,rows.length);
			$tr.append($td);

			$table.append($tr);
		}
		$('#able-vts').append($table);

		$('#able-vts').append(this.getIconCredit());

	};

	AblePlayer.prototype.addVtsActionButtons = function(rowNum,numRows) {

		var thisObj, $td, buttons, i, button, $button, $svg, $g, pathString, pathString2, $path, $path2;
		thisObj = this;
		$td = $('<td>');
		buttons = ['up','down','insert','delete'];

		for (i=0; i < buttons.length; i++) {
			button = buttons[i];
			if (button === 'up') {
				if (rowNum > 1) {
					$button = $('<button>',{
						'id': 'able-vts-button-up-' + rowNum,
						'title': 'Move up',
						'aria-label': 'Move Row ' + rowNum + ' up'
					}).on('click', function(el) {
						thisObj.onClickVtsActionButton(el.currentTarget);
					});
					$svg = $('<svg>',{
						'focusable': 'false',
						'aria-hidden': 'true',
						'x': '0px',
						'y': '0px',
						'width': '254.296px',
						'height': '254.296px',
						'viewBox': '0 0 254.296 254.296',
						'style': 'enable-background:new 0 0 254.296 254.296'
					});
					pathString = 'M249.628,176.101L138.421,52.88c-6.198-6.929-16.241-6.929-22.407,0l-0.381,0.636L4.648,176.101'
						+ 'c-6.198,6.897-6.198,18.052,0,24.981l0.191,0.159c2.892,3.305,6.865,5.371,11.346,5.371h221.937c4.577,0,8.613-2.161,11.41-5.594'
						+ 'l0.064,0.064C255.857,194.153,255.857,182.998,249.628,176.101z';
					$path = $('<path>',{
						'd': pathString
					});
					$g = $('<g>').append($path);
					$svg.append($g);
					$button.append($svg);
					$button.html($button.html());
					$td.append($button);
				}
			} else if (button === 'down') {
				if (rowNum < numRows) {
					$button = $('<button>',{
						'id': 'able-vts-button-down-' + rowNum,
						'title': 'Move down',
						'aria-label': 'Move Row ' + rowNum + ' down'
					}).on('click', function(el) {
						thisObj.onClickVtsActionButton(el.currentTarget);
					});
					$svg = $('<svg>',{
						'focusable': 'false',
						'aria-hidden': 'true',
						'x': '0px',
						'y': '0px',
						'width': '292.362px',
						'height': '292.362px',
						'viewBox': '0 0 292.362 292.362',
						'style': 'enable-background:new 0 0 292.362 292.362'
					});
					pathString = 'M286.935,69.377c-3.614-3.617-7.898-5.424-12.848-5.424H18.274c-4.952,0-9.233,1.807-12.85,5.424'
						+ 'C1.807,72.998,0,77.279,0,82.228c0,4.948,1.807,9.229,5.424,12.847l127.907,127.907c3.621,3.617,7.902,5.428,12.85,5.428'
						+ 's9.233-1.811,12.847-5.428L286.935,95.074c3.613-3.617,5.427-7.898,5.427-12.847C292.362,77.279,290.548,72.998,286.935,69.377z';
					$path = $('<path>',{
						'd': pathString
					});
					$g = $('<g>').append($path);
					$svg.append($g);
					$button.append($svg);
					$button.html($button.html());
					$td.append($button);
				}
			} else if (button === 'insert') {
				$button = $('<button>',{
					'id': 'able-vts-button-insert-' + rowNum,
					'title': 'Insert row below',
					'aria-label': 'Insert row before Row ' + rowNum
				}).on('click', function(el) {
					thisObj.onClickVtsActionButton(el.currentTarget);
				});
				$svg = $('<svg>',{
					'focusable': 'false',
					'aria-hidden': 'true',
					'x': '0px',
					'y': '0px',
					'width': '401.994px',
					'height': '401.994px',
					'viewBox': '0 0 401.994 401.994',
					'style': 'enable-background:new 0 0 401.994 401.994'
				});
				pathString = 'M394,154.175c-5.331-5.33-11.806-7.994-19.417-7.994H255.811V27.406c0-7.611-2.666-14.084-7.994-19.414'
					+ 'C242.488,2.666,236.02,0,228.398,0h-54.812c-7.612,0-14.084,2.663-19.414,7.993c-5.33,5.33-7.994,11.803-7.994,19.414v118.775'
					+ 'H27.407c-7.611,0-14.084,2.664-19.414,7.994S0,165.973,0,173.589v54.819c0,7.618,2.662,14.086,7.992,19.411'
					+ 'c5.33,5.332,11.803,7.994,19.414,7.994h118.771V374.59c0,7.611,2.664,14.089,7.994,19.417c5.33,5.325,11.802,7.987,19.414,7.987'
					+ 'h54.816c7.617,0,14.086-2.662,19.417-7.987c5.332-5.331,7.994-11.806,7.994-19.417V255.813h118.77'
					+ 'c7.618,0,14.089-2.662,19.417-7.994c5.329-5.325,7.994-11.793,7.994-19.411v-54.819C401.991,165.973,399.332,159.502,394,154.175z';
				$path = $('<path>',{
					'd': pathString
				});
				$g = $('<g>').append($path);
				$svg.append($g);
				$button.append($svg);
				$button.html($button.html());
				$td.append($button);
			} else if (button === 'delete') {
				$button = $('<button>',{
					'id': 'able-vts-button-delete-' + rowNum,
					'title': 'Delete row ',
					'aria-label': 'Delete Row ' + rowNum
				}).on('click', function(el) {
					thisObj.onClickVtsActionButton(el.currentTarget);
				});
				$svg = $('<svg>',{
					'focusable': 'false',
					'aria-hidden': 'true',
					'x': '0px',
					'y': '0px',
					'width': '508.52px',
					'height': '508.52px',
					'viewBox': '0 0 508.52 508.52',
					'style': 'enable-background:new 0 0 508.52 508.52'
				});
				pathString = 'M397.281,31.782h-63.565C333.716,14.239,319.478,0,301.934,0h-95.347'
					+ 'c-17.544,0-31.782,14.239-31.782,31.782h-63.565c-17.544,0-31.782,14.239-31.782,31.782h349.607'
					+ 'C429.063,46.021,414.825,31.782,397.281,31.782z';
				$path = $('<path>',{
					'd': pathString
				});
				pathString2 = 'M79.456,476.737c0,17.544,14.239,31.782,31.782,31.782h286.042'
					+ 'c17.544,0,31.782-14.239,31.782-31.782V95.347H79.456V476.737z M333.716,174.804c0-8.772,7.151-15.891,15.891-15.891'
					+ 'c8.74,0,15.891,7.119,15.891,15.891v254.26c0,8.74-7.151,15.891-15.891,15.891c-8.74,0-15.891-7.151-15.891-15.891V174.804z'
					+ 'M238.369,174.804c0-8.772,7.119-15.891,15.891-15.891c8.74,0,15.891,7.119,15.891,15.891v254.26'
					+ 'c0,8.74-7.151,15.891-15.891,15.891c-8.772,0-15.891-7.151-15.891-15.891V174.804z M143.021,174.804'
					+ 'c0-8.772,7.119-15.891,15.891-15.891c8.772,0,15.891,7.119,15.891,15.891v254.26c0,8.74-7.119,15.891-15.891,15.891'
					+ 'c-8.772,0-15.891-7.151-15.891-15.891V174.804z';
				$path2 = $('<path>',{
					'd': pathString2
				});

				$g = $('<g>').append($path,$path2);
				$svg.append($g);
				$button.append($svg);
				$button.html($button.html());
				$td.append($button);
			}
		}
		return $td;
	};

	AblePlayer.prototype.updateVtsActionButtons = function($buttons,nextRowNum) {

		var i, $thisButton, id, label, newId, newLabel;
		for (i=0; i < $buttons.length; i++) {
			$thisButton = $buttons.eq(i);
			id = $thisButton.attr('id');
			label = $thisButton.attr('aria-label');
			newId = id.replace(/[0-9]+/g, nextRowNum);
			newLabel = label.replace(/[0-9]+/g, nextRowNum);
			$thisButton.attr('id',newId);
			$thisButton.attr('aria-label',newLabel);
		}
	}

	AblePlayer.prototype.getIconCredit = function() {

		var credit
			= 'Action buttons made by <a target="_blank" rel="noreferrer" href="https://www.elegantthemes.com">Elegant Themes</a>'
			+ ' from <a target="_blank" rel="noreferrer" href="https://www.flaticon.com">flaticon</a>'
			+ ' are licensed by <a target="_blank" rel="noreferrer" href="https://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">CC 3.0 BY</a>'
		;
		return '<div id="able-vts-icon-credit">' + credit + '</div>';
	};

	AblePlayer.prototype.getAllLangs = function(tracks) {

		var i;
		for (i in tracks) {
			if (tracks[i].hasOwnProperty('language')) {
				if ($.inArray(tracks[i].language,this.langs) === -1) {
					this.langs[this.langs.length] = tracks[i].language;
				}
			}
		}
	};

	AblePlayer.prototype.getAllRows = function(lang) {

		var i, track, c, cues;
		cues = [];
		for (i=0; i < this.vtsTracks.length; i++) {
			track = this.vtsTracks[i];
			if (track.language == lang) {
				for (c in track.cues) {
					cues.push({
						'kind': track.kind,
						'lang': lang,
						'id': track.cues[c].id,
						'start': track.cues[c].start,
						'end': track.cues[c].end,
						'content': track.cues[c].content
					});
				}
			}
		}
		cues.sort(function(a,b) {
			return a.start > b.start ? 1 : -1;
		});
		return cues;
	};


	AblePlayer.prototype.onClickVtsActionButton = function(el) {

		var idParts, action, rowNum;
		idParts = $(el).attr('id').split('-');
		action = idParts[3];
		rowNum = idParts[4];
		if (action == 'up') {
			this.moveRow(rowNum,'up');
		} else if (action == 'down') {
			this.moveRow(rowNum,'down');
		} else if (action == 'insert') {
			this.insertRow(rowNum);
		} else if (action == 'delete') {
			this.deleteRow(rowNum);
		}
	};

	AblePlayer.prototype.insertRow = function(rowNum) {

		var $table, $rows, numRows, newRowNum, newRowId, $tr, $td, $select,
		options, i, $option, newKind, newClass, $parentRow, nextRowNum, $buttons;

		$table = $('#able-vts table');
		$rows = $table.find('tr');

		numRows = $rows.length - 1; 

		newRowNum = parseInt(rowNum) + 1;
		newRowId = 'able-vts-row-' + newRowNum;

		$tr = $('<tr>',{
			'id': newRowId
		});

		$td = $('<td>').text(newRowNum);
		$tr.append($td);

		newKind = null;
		$select = $('<select>',{
			'id': 'able-vts-kind-' + newRowNum,
			'aria-label': 'What kind of track is this?',
			'placeholder': 'Select a kind'
		}).on('change',function() {
			newKind = $(this).val();
			newClass = 'kind-' + newKind;
			$parentRow = $(this).closest('tr');
			$(this).parent().text(newKind);
			$parentRow.addClass(newClass);
		});
		options = ['','captions','chapters','descriptions','subtitles'];
		for (i=0; i<options.length; i++) {
			$option = $('<option>',{
				'value': options[i]
			}).text(options[i]);
			$select.append($option);
		}
		$td = $('<td>').append($select);
		$tr.append($td);

		$td = $('<td>',{
			'contenteditable': 'true'
		}); 
		$tr.append($td);

		$td = $('<td>',{
			'contenteditable': 'true'
		}); 
		$tr.append($td);

		$td = $('<td>',{
			'contenteditable': 'true'
		});
		$tr.append($td);

		$td = this.addVtsActionButtons(newRowNum,numRows);
		$tr.append($td);

		$table.find('tr').eq(rowNum).after($tr);

		for (i=newRowNum; i <= numRows; i++) {
			nextRowNum = i + 1;
			$rows.eq(i).attr('id','able-vts-row-' + nextRowNum); 
			$rows.eq(i).find('td').eq(0).text(nextRowNum); 
			$buttons = $rows.eq(i).find('button');
			this.updateVtsActionButtons($buttons,nextRowNum);
		}

		this.adjustTimes(newRowNum);

		let newAlert = this.translate( 'vtsNewRow', 'A new row %1 has been inserted.', [ newRowNum ] );
		this.showVtsAlert( newAlert );

		$select.trigger('focus');

	};

	AblePlayer.prototype.deleteRow = function(rowNum) {

		var $table, $rows, numRows, i, nextRowNum, $buttons;

		$table = $('#able-vts table');
		$table[0].deleteRow(rowNum);
		$rows = $table.find('tr'); 
		numRows = $rows.length - 1; 

		for (i=rowNum; i <= numRows; i++) {
			nextRowNum = i;
			$rows.eq(i).attr('id','able-vts-row-' + nextRowNum); 
			$rows.eq(i).find('td').eq(0).text(nextRowNum); 
			$buttons = $rows.eq(i).find('button');
			this.updateVtsActionButtons($buttons,nextRowNum);
		}

		let newAlert = this.translate( 'vtsDeletedRow', 'Row %1 has been deleted.', [ rowNum ] );
		this.showVtsAlert( newAlert );

	};

	AblePlayer.prototype.moveRow = function(rowNum,direction) {

		var $rows, $thisRow, otherRowNum, $otherRow, msg;

		$rows = $('#able-vts table').find('tr');
		$thisRow = $('#able-vts table').find('tr').eq(rowNum);
		if (direction == 'up') {
			otherRowNum = parseInt(rowNum) - 1;
			$otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
			$otherRow.before($thisRow);
		} else if (direction == 'down') {
			otherRowNum = parseInt(rowNum) + 1;
			$otherRow = $('#able-vts table').find('tr').eq(otherRowNum);
			$otherRow.after($thisRow);
		}
		$thisRow.attr('id','able-vts-row-' + otherRowNum);
		$thisRow.find('td').eq(0).text(otherRowNum);
		this.updateVtsActionButtons($thisRow.find('button'),otherRowNum);
		$otherRow.attr('id','able-vts-row-' + rowNum);
		$otherRow.find('td').eq(0).text(rowNum);
		this.updateVtsActionButtons($otherRow.find('button'),rowNum);

		this.adjustTimes(otherRowNum);

		msg = this.translate( 'vtsMovedRow', 'Row %1 has been moved %2 and is now Row %3.', [ rowNum, direction, otherRowNum ] );
		this.showVtsAlert(msg);
	};

	AblePlayer.prototype.adjustTimes = function(rowNum) {




		var	 minDuration, $rows, prevRowNum, nextRowNum, $row, $prevRow, $nextRow,
				kind, prevKind, nextKind,
				start, prevStart, nextStart,
				end, prevEnd, nextEnd;

		minDuration = [];
		minDuration['captions'] = .001;
		minDuration['descriptions'] = .001;
		minDuration['chapters'] = .001;

		$rows = $('#able-vts table').find('tr');

		$row = $rows.eq(rowNum);
		kind = ($row.is('[class^="kind-"]')) ? this.getKindFromClass($row.attr('class')) : 'captions';

		start = this.getSecondsFromColonTime($row.find('td').eq(2).text());
		end = this.getSecondsFromColonTime($row.find('td').eq(3).text());

		if (rowNum > 1) {
			prevRowNum = rowNum - 1;
			$prevRow = $rows.eq(prevRowNum);
			prevKind = ($prevRow.is('[class^="kind-"]')) ? this.getKindFromClass($prevRow.attr('class')) : null;
			prevStart = this.getSecondsFromColonTime($prevRow.find('td').eq(2).text());
			prevEnd = this.getSecondsFromColonTime($prevRow.find('td').eq(3).text());
		} else {
			prevRowNum = null;
			$prevRow = null;
			prevKind = null;
			prevStart = null;
			prevEnd = null;
		}

		if (rowNum < ($rows.length - 1)) {
			nextRowNum = rowNum + 1;
			$nextRow = $rows.eq(nextRowNum);
			nextKind = ($nextRow.is('[class^="kind-"]')) ? this.getKindFromClass($nextRow.attr('class')) : null;
			nextStart = this.getSecondsFromColonTime($nextRow.find('td').eq(2).text());
			nextEnd = this.getSecondsFromColonTime($nextRow.find('td').eq(3).text());
		} else {
			nextRowNum = null;
			$nextRow = null;
			nextKind = null;
			nextStart = null;
			nextEnd = null;
		}

		if (isNaN(start)) {
			if (prevKind == null) {
				prevKind = 'captions';
				$prevRow.attr('class','kind-captions');
				$prevRow.find('td').eq(1).html('captions');
			}
			if (prevKind === 'captions') {
				start = (parseFloat(prevEnd) + .001).toFixed(3);
				end = (nextStart) ? (parseFloat(nextStart) - .001).toFixed(3) : (parseFloat(start) + minDuration[kind]).toFixed(3);
			} else if (prevKind === 'chapters') {
				start = (parseFloat(prevStart) + .001).toFixed(3);
				end = (nextStart) ? (parseFloat(nextStart) - .001).toFixed(3) : (parseFloat(start) + minDurartion[kind]).toFixed(3);
			} else if (prevKind === 'descriptions') {
				start = (parseFloat(prevStart) + minDuration['descriptions']).toFixed(3);
				end = (parseFloat(start) + minDuration['descriptions']).toFixed(3);
			}
		} else {
			if (prevStart) {
				if (prevStart < start) {
					if (start < nextStart) {
					} else {
						nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
						nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
					}
				} else {
					start = (parseFloat(prevStart) + minDuration[prevKind]).toFixed(3);
					end = (parseFloat(start) + minDuration[kind]).toFixed(3);
				}
			} else {
				if (start < nextStart) {
				} else {
					nextStart = (parseFloat(start) + minDuration[kind]).toFixed(3);
					nextEnd = (parseFloat(nextStart) + minDuration[nextKind]).toFixed(3);
				}
			}
		}

		if (end - start < minDuration[kind]) {
			end = (parseFloat(start) + minDuration[kind]).toFixed(3);
			if (nextStart) {
				nextStart = (parseFloat(end) + .001).toFixed(3);
			}
		}

		$row.find('td').eq(2).text(this.formatSecondsAsColonTime(start,true));
		$row.find('td').eq(3).text(this.formatSecondsAsColonTime(end,true));
		if ($prevRow) {
			$prevRow.find('td').eq(2).text(this.formatSecondsAsColonTime(prevStart,true));
			$prevRow.find('td').eq(3).text(this.formatSecondsAsColonTime(prevEnd,true));
		}
		if ($nextRow) {
			$nextRow.find('td').eq(2).text(this.formatSecondsAsColonTime(nextStart,true));
			$nextRow.find('td').eq(3).text(this.formatSecondsAsColonTime(nextEnd,true));
		}
	};

	AblePlayer.prototype.getKindFromClass = function(myclass) {


		var kindStart, kindEnd;

		kindStart = myclass.indexOf('kind-')+5;
		kindEnd = myclass.indexOf(' ',kindStart);
		if (kindEnd == -1) {
			return myclass.substring(kindStart);
		} else {
			return myclass.substring(kindStart,kindEnd);
		}
	};

	AblePlayer.prototype.showVtsAlert = function(message) {

		const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
		this.$vtsAlert.text(message).show();
		delay(10000).then(() => {
			this.$vtsAlert.text(message).hide()
		});
	};

	AblePlayer.prototype.parseVtsOutput = function($table) {

		var lang, i, kinds, kind, vtt, $rows, start, end, content, $output;

		lang = $table.attr('lang');
		kinds = ['captions','chapters','descriptions','subtitles'];
		vtt = {};
		for (i=0; i < kinds.length; i++) {
			kind = kinds[i];
			vtt[kind] = 'WEBVTT' + "\n\n";
		}
		$rows = $table.find('tr');
		if ($rows.length > 0) {
			for (i=0; i < $rows.length; i++) {
				kind = $rows.eq(i).find('td').eq(1).text();
				if ($.inArray(kind,kinds) !== -1) {
					start = $rows.eq(i).find('td').eq(2).text();
					end = $rows.eq(i).find('td').eq(3).text();
					content = $rows.eq(i).find('td').eq(4)[0].innerText;
					if (start !== undefined && end !== undefined) {
						vtt[kind] += start + ' --> ' + end + "\n";
						if (content !== 'undefined') {
							vtt[kind] += content;
						}
						vtt[kind] += "\n\n";
					}
				}
			}
		}
		$output = $('<div>',{
			'id': 'able-vts-output'
		})
		$('#able-vts').append($output);
		for (i=0; i < kinds.length; i++) {
			kind = kinds[i];
			if (vtt[kind].length > 8) {
				this.showWebVttOutput(kind,vtt[kind],lang)
			}
		}
	};

	AblePlayer.prototype.showWebVttOutput = function(kind,vttString,lang) {

		var $heading, filename, $p, pText, $textarea;

		$heading = $('<h3>').text( this.capitalizeFirstLetter( kind ) );
		filename = this.getFilenameFromTracks(kind,lang);
		pText = 'If you made changes, copy/paste the following content ';
		if (filename) {
			pText += 'to replace the original content of your ' + this.getLanguageName(lang) + ' ';
			pText += '<em>' + kind + '</em> WebVTT file (<strong>' + filename + '</strong>).';
		} else {
			pText += 'into a new ' + this.getLanguageName(lang) + ' <em>' + kind + '</em> WebVTT file.';
		}
		$p = $('<p>',{
			'class': 'able-vts-output-instructions'
		}).html(pText);
		$textarea = $('<textarea>').text(vttString);
		$('#able-vts-output').append($heading,$p,$textarea);
	};

})(jQuery);

(function ($) {

	AblePlayer.prototype.initVimeoPlayer = function () {

		var thisObj, deferred, promise, containerId, vimeoId, options;
		thisObj = this;

		deferred = new this.defer();
		promise = deferred.promise();

		containerId = this.mediaId + '_vimeo';

		this.$mediaContainer.prepend($('<div>').attr('id', containerId));

		vimeoId = (this.vimeoDescId && this.prefDesc) ? this.vimeoDescId : this.vimeoId;

		this.activeVimeoId = vimeoId;


		autoplay = (this.okToPlay) ? 'true' : 'false';

		if (this.playerWidth) {
			if (this.vimeoUrlHasParams) {
				options = {
					url: vimeoId,
					width: this.playerWidth,
					controls: false
				}
			} else {
				options = {
					id: vimeoId,
					width: this.playerWidth,
					controls: false
				}
			}
		} else {
			if (this.vimeoUrlHasParams) {
				options = {
					url: vimeoId,
					controls: false
				}
			} else {
				options = {
					id: vimeoId,
					controls: false
				}
			}
		}

		this.vimeoPlayer = new Vimeo.Player(containerId, options);

		this.vimeoPlayer.ready().then(function() {
			$('#'+containerId).children('iframe').attr({
				'tabindex': '-1',
				'aria-hidden': true
			});

			thisObj.vimeoPlayer.getVideoWidth().then(function(width) {
				if (width) {
					thisObj.vimeoPlayer.getVideoHeight().then(function(height) {
						if (height) {
							thisObj.resizePlayer(width,height);
						}
					});
				}
			}).catch(function(error) {
			});

			if (!thisObj.hasPlaylist) {
				thisObj.$media.remove();


				thisObj.vimeoPlaybackRate = 1;
				thisObj.vimeoPlayer.setPlaybackRate(thisObj.vimeoPlaybackRate).then(function(playbackRate) {
					thisObj.vimeoSupportsPlaybackRateChange = true;
				}).catch(function(error) {
					thisObj.vimeoSupportsPlaybackRateChange = false;
				});
				deferred.resolve();
			}
		});
		return promise;
	};

	AblePlayer.prototype.getVimeoPaused = function () {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		this.vimeoPlayer.getPaused().then(function (paused) {
			deferred.resolve(paused);
		});

		return promise;
	}

	AblePlayer.prototype.getVimeoEnded = function () {

		var deferred, promise;
		deferred = new this.defer();
		promise = deferred.promise();

		this.vimeoPlayer.getEnded().then(function (ended) {
			deferred.resolve(ended);
		});

		return promise;
	}

	AblePlayer.prototype.getVimeoState = function () {

		var deferred, promise, promises, gettingPausedPromise, gettingEndedPromise;

		deferred = new this.defer();
		promise = deferred.promise();
		promises = [];

		gettingPausedPromise = this.vimeoPlayer.getPaused();
		gettingEndedPromise = this.vimeoPlayer.getEnded();

		promises.push(gettingPausedPromise);
		promises.push(gettingEndedPromise);

		gettingPausedPromise.then(function (paused) {
			deferred.resolve(paused);
		});
		gettingEndedPromise.then(function (ended) {
			deferred.resolve(ended);
		});
		$.when.apply($, promises).then(function () {
			deferred.resolve();
		});
		return promise;
	}

	AblePlayer.prototype.getVimeoCaptionTracks = function () {

		var deferred = new this.defer();
		var promise = deferred.promise();

		var thisObj, i, isDefaultTrack;

		thisObj = this;

		this.vimeoPlayer.getTextTracks().then(function(tracks) {


				if (tracks.length) {

					for (i=0; i<tracks.length; i++) {

						thisObj.hasCaptions = true;
						if (thisObj.prefCaptions === 1) {
								thisObj.captionsOn = true;
						} else {
							thisObj.captionsOn = false;
						}
						if (tracks[i]['language'] === thisObj.lang) {
							isDefaultTrack = true;
						} else {
								isDefaultTrack = false;
						}
						thisObj.tracks.push({
							'kind': tracks[i]['kind'],
							'language': tracks[i]['language'],
							'label': tracks[i]['label'],
							'def': isDefaultTrack
						});
					}
					thisObj.captions = thisObj.tracks;
					thisObj.hasCaptions = true;

					thisObj.setupPopups('captions');
					deferred.resolve();
			 	} else {
					thisObj.hasCaptions = false;
					thisObj.usingVimeoCaptions = false;
					deferred.resolve();
				}
			});

		return promise;
	};

	AblePlayer.prototype.getVimeoPosterUrl = function (vimeoId, width) {

		var url = 'http://vimeo.com/api/oembed.json?url=https://vimeo.com/' + vimeoId, imageUrl = '';

				fetch( url ).then( response => {

			return response.json();
  		})
		.then( json => {
			imageUrl = json.thumbnail_url;
		})
		.catch( error => {
			if (thisObj.debug) {

							}
		});

		return imageUrl;
	};

	AblePlayer.prototype.getVimeoId = function (url) {


		this.vimeoUrlHasParams = false;

		if (typeof url === 'number') {
			return url;
		} else {
			urlObject = new URL(url);
		}
		if ( 'vimeo.com' === urlObject.hostname || 'player.vimeo.com' === urlObject.hostname ) {
			if ( '' !== urlObject.search ) {
				this.vimeoUrlHasParams = true;
				return url;
			} else {
				if ( 'player.vimeo.com' === urlObject.hostname ) {
					return urlObject.pathname.replace( '/video/', '' );
				} else {
					return urlObject.pathname.replace( '/', '' );
				}
			}
		} else {
			return url;
		}
	};

})(jQuery);
