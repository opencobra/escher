/* global global */
import {select as d3Select} from 'd3-selection'

const jsdom = require('jsdom')
const { JSDOM } = jsdom

// body selection
const dom = new JSDOM('', { pretendToBeVisual: true })
const document = dom.window.document
const d3Body = d3Select(document).select('body')

// globals
global.document = document
global.window = dom.window
global.navigator = { platform: 'node.js' }

// Dummy SVGElement for d3-zoom.js:L87
const Dummy = () => {}
Dummy.prototype = {}
global.SVGElement = Dummy

module.exports = d3Body
