/* global Blob, XMLSerializer, Image, btoa */
import {csvParseRows as d3_csvParseRows } from "d3-dsv";
import vkbeautify from "vkbeautify";
import _ from "underscore";
import GIF from "gif.js";
import {json as d3_json, text as d3_text} from "d3-request";
import { selection as d3_selection, select as d3_select } from "d3-selection";
import {gsap} from "gsap";
import * as d3_scale from "d3-scale";
import { axisBottom as d3_axis_bottom } from "d3-axis";
import { saveAs } from "file-saver";

try {
  var isFileSaverSupported = !!new Blob;
} catch (e) {
  console.warn('Not a browser, so FileSaver.js not available.')
}


/**
 * Check if Blob is available, and alert if it is not.
 */
function _check_filesaver() {
  try {
    var isFileSaverSupported = !!new Blob()
  } catch (e) {
    alert('Blob not supported')
  }
}

function set_options(options, defaults, must_be_float) {
  if (options === undefined || options === null) {
    return defaults
  }
  var i = -1
  var out = {}
  for (var key in defaults) {
    var has_key = ((key in options) &&
                   (options[key] !== null) &&
                   (options[key] !== undefined))
    var val = (has_key ? options[key] : defaults[key])
    if (must_be_float && key in must_be_float) {
      val = parseFloat(val)
      if (isNaN(val)) {
        if (has_key) {
          console.warn('Bad float for option ' + key)
          val = parseFloat(defaults[key])
          if (isNaN(val)) {
            console.warn('Bad float for default ' + key)
            val = null
          }
        } else {
          console.warn('Bad float for default ' + key)
          val = null
        }
      }
    }
    out[key] = val
  }
  return out
}


function remove_child_nodes(selection) {
  /** Removes all child nodes from a d3 selection

   */
  var node = selection.node()
  while (node.hasChildNodes()) {
    node.removeChild(node.lastChild)
  }
}


function load_css(css_path, callback) {
  var css = ""
  if (css_path) {
    d3_text(css_path, function(error, text) {
      if (error) {
        console.warn(error)
      }
      css = text
      callback(css)
    })
  }
  return false
}


function _ends_with (str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1
}

/**
 * Load a file.
 * @param {} t - this context for callback. Should be an object.
 * @param {} files_to_load - A filename to load. Must be JSON or CSS.
 * @param {} callback - Function to run after the file is loaded. Takes the
 * arguments error and data.
 * @param {} value - If the value is specified, just assign it and do not
 * execute the ajax query.
 */
function load_the_file (t, file, callback, value) {
  if (value) {
    if (file) console.warn('File ' + file + ' overridden by value.')
    callback.call(t, null, value)
    return
  }
  if (!file) {
    callback.call(t, 'No filename', null)
    return
  }
  if (_ends_with(file, 'json')) {
    d3_json(file, function(e, d) { callback.call(t, e, d) })
  } else if (_ends_with(file, 'css')) {
    d3_text(file, function(e, d) { callback.call(t, e, d) })
  } else {
    callback.call(t, 'Unrecognized file type', null)
  }
  return
}


function load_files (t, files_to_load, final_callback) {
  /** Load multiple files asynchronously by calling utils.load_the_file.

      t: this context for callback. Should be an object.

      files_to_load: A list of objects with the attributes:

      { file: a_filename.json, callback: a_callback_fn }

      File must be JSON or CSS.

      final_callback: Function that runs after all files have loaded.

  */
  if (files_to_load.length === 0) final_callback.call(t)
  var i = -1,
  remaining = files_to_load.length
  while (++i < files_to_load.length) {
    load_the_file(
      t,
      files_to_load[i].file,
      function(e, d) {
        this.call(t, e, d)
        if (!--remaining) final_callback.call(t)
      }.bind(files_to_load[i].callback),
      files_to_load[i].value
    )
  }
}


/**
 * Create a constructor that returns a new object with our without the 'new'
 * keyword.
 *
 * Adapted from Hubert Kauker (MIT Licensed), John Resig (MIT Licensed).
 * http://stackoverflow.com/questions/7892884/simple-class-instantiation
 */
function make_class () {
  var is_internal
  var constructor = function (args) {
    if (this instanceof constructor) {
      if (typeof this.init === 'function') {
        this.init.apply(this, is_internal ? args : arguments)
      }
    } else {
      is_internal = true
      var instance = new constructor(arguments)
      is_internal = false
      return instance
    }
  }
  return constructor
}

/**
 * Return a class that can be instantiated without the new keyword.
 * @param {Class} AClass - Any ES6 class.
 */
function class_with_optional_new (AClass) {
  return new Proxy(AClass, {
    apply (Target, thisArg, args) {
      return new Target(...args)
    }
  })
}

function setup_defs(svg, style) {
  // add stylesheet
  svg.select("defs").remove()
  var defs = svg.append("defs")
  // make sure the defs is the first node
  var node = defs.node()
  node.parentNode.insertBefore(node, node.parentNode.firstChild)
  defs.append("style")
    .attr("type", "text/css")
      .text(style)
  return defs
}

/**
 * Run through the d3 data binding steps for an object. Also checks to make sure
 * none of the values in the *object* are undefined, and ignores those.
 *
 * The create_function, update_function, and exit_function CAN modify the input
 * data object.
 *
 * @param {} container_sel - A d3 selection containing all objects.
 *
 * @param {} parent_node_selector - A selector string for a subselection of
 * container_sel.
 *
 * @param {} children_selector - A selector string for each DOM element to bind.
 *
 * @param {} object - An object to bind to the selection.
 *
 * @param {} id_key - The key that will be used to store object IDs in the bound
 * data points.
 *
 * @param {} create_function - A function for enter selection. Create function
 * must return a selection of the new nodes.
 *
 * @param {} update_function - A function for update selection.
 *
 * @param {} exit_function - A function for exit selection.
 */
function draw_an_object (container_sel, parent_node_selector, children_selector,
                         object, id_key, create_function, update_function,
                         exit_function) {
  var draw_object = {}

  for (var id in object) {
    if (object[id] === undefined) {
      console.warn('Undefined value for id ' + id + ' in object. Ignoring.')
    } else {
      draw_object[id] = object[id]
    }
  }

  var sel = container_sel.select(parent_node_selector)
      .selectAll(children_selector)
      .data(make_array_ref(draw_object, id_key),
            function (d) { return d[id_key] })

  // enter: generate and place reaction
  var update_sel = create_function
      ? create_function(sel.enter()).merge(sel)
      : sel

  // update: update when necessary
  if (update_function) {
    update_sel.call(update_function)
  }

  // exit
  if (exit_function) {
    sel.exit().call(exit_function)
  }
}

/**
 * Run through the d3 data binding steps for an object that is nested within
 * another element with D3 data.
 *
 * The create_function, update_function, and exit_function CAN modify the input
 * data object.
 *
 * @param {} container_sel - A d3 selection containing all objects.
 *
 * @param {} children_selector - A selector string for each DOM element to bind.
 *
 * @param {} object_data_key - A key for the parent object containing data for
 * the new selection.
 *
 * @param {} id_key - The key that will be used to store object IDs in the bound
 * data points.
 *
 * @param {} create_function - A function for enter selection. Create function
 * must return a selection of the new nodes.
 *
 * @param {} update_function - A function for update selection.
 *
 * @param {} exit_function - A function for exit selection.
 */
function draw_a_nested_object (container_sel, children_selector, object_data_key,
                               id_key, create_function, update_function,
                               exit_function) {
  var sel = container_sel.selectAll(children_selector)
      .data(function(d) { return make_array_ref(d[object_data_key], id_key) },
            function(d) { return d[id_key] })

  // enter: generate and place reaction
  var update_sel = (create_function ?
                    create_function(sel.enter()).merge(sel) :
                    sel)

  // update: update when necessary
  if (update_function) {
    update_sel.call(update_function)
  }

  // exit
  if (exit_function) {
    sel.exit().call(exit_function)
  }
}

function make_array(obj, id_key) { // is this super slow?
  var array = []
  for (var key in obj) {
    // copy object
    var it = clone(obj[key])
    // add key as 'id'
    it[id_key] = key
    // add object to array
    array.push(it)
  }
  return array
}

function make_array_ref(obj, id_key) {
  /** Turn the object into an array, but only by reference. Faster than
      make_array.

  */
  var array = []
  for (var key in obj) {
    // copy object
    var it = obj[key]
    // add key as 'id'
    it[id_key] = key
    // add object to array
    array.push(it)
  }
  return array
}

function compare_arrays(a1, a2) {
  /** Compares two simple (not-nested) arrays.

   */
  if (!a1 || !a2) return false
  if (a1.length != a2.length) return false
  for (var i = 0, l=a1.length; i < l; i++) {
    if (a1[i] != a2[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false
    }
  }
  return true
}

/**
 * Convert an array of objects to an object with all keys and values
 * that are arrays of the same length as arr. Fills in spaces with null.
 *
 *  For example, [ { a: 1 }, { b: 2 }] becomes { a: [1, null], b: [null, 2] }.
 */
function arrayToObject (arr) {
  // new object
  const obj = {}
  // for each element of the array
  for (let i = 0, l = arr.length; i < l; i++) {
    const column = arr[i]
    const keys = Object.keys(column)
    for (var k = 0, nk = keys.length; k < nk; k++) {
      var id = keys[k]
      if (!(id in obj)) {
        var n = []
        // fill spaces with null
        for (var j = 0; j < l; j++) {
          n[j] = null
        }
        n[i] = column[id]
        obj[id] = n
      } else {
        obj[id][i] = column[id]
      }
    }
  }
  return obj
}

/**
 * Deep copy for array and object types. All other types are returned by
 * reference.
 * @param {T<Object|Array|*>} obj - The object to copy.
 * @return {T} The copied object.
 */
function clone (obj) {
  if (_.isArray(obj))
    return _.map(obj, function(t) { return clone(t) })
  else if (_.isObject(obj))
    return _.mapObject(obj, function (t, k) { return clone(t) })
  else
    return obj
}

function extend(obj1, obj2, overwrite) {
  /** Extends obj1 with keys/values from obj2. Performs the extension
      cautiously, and does not override attributes, unless the overwrite
      argument is true.

      Arguments
      ---------

      obj1: Object to extend

      obj2: Object with which to extend.

      overwrite: (Optional, Default false) Overwrite attributes in obj1.

  */

  if (overwrite === undefined)
    overwrite = false

  for (var attrname in obj2) {
    if (!(attrname in obj1) || overwrite) // UNIT TEST This
      obj1[attrname] = obj2[attrname]
    else
      throw new Error('Attribute ' + attrname + ' already in object.')
  }
}

function uniqueConcat (arrays) {
  const newArray = []
  arrays.forEach(a => {
    a.forEach(x => {
      if (newArray.indexOf(x) < 0) {
        newArray.push(x)
      }
    })
  })
  return newArray
}

/**
 * Return unique values in array of strings.
 *
 * http://stackoverflow.com/questions/1960473/unique-values-in-an-array
 */
function unique_strings_array (arr) {
  var a = []
  for (var i = 0, l = arr.length; i < l; i++) {
    if (a.indexOf(arr[i]) === -1) {
      a.push(arr[i])
    }
  }
  return a
}

/**
 * Returns a function, that, as long as it continues to be invoked, will not be
 * triggered. The function will be called after it stops being called for N
 * milliseconds. If "immediate" is passed, trigger the function on the leading
 * edge, instead of the trailing.
 */
function debounce (func, wait, immediate) {
  var timeout
  return function () {
    var context = this
    var args = arguments
    var later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

/**
 * Return a copy of the object with just the given ids.
 * @param {} obj - An object
 * @param {} ids - An array of id strings
 */
function object_slice_for_ids (obj, ids) {
  var subset = {}
  var i = -1
  while (++i < ids.length) {
    subset[ids[i]] = clone(obj[ids[i]])
  }
  if (ids.length !== Object.keys(subset).length) {
    console.warn('did not find correct reaction subset')
  }
  return subset
}

/**
 * Return a reference of the object with just the given ids. Faster than
 * object_slice_for_ids.
 * @param {} obj - An object.
 * @param {} ids - An array of id strings.
 */
function object_slice_for_ids_ref (obj, ids) {
  var subset = {}
  var i = -1
  while (++i < ids.length) {
    subset[ids[i]] = obj[ids[i]]
  }
  if (ids.length !== Object.keys(subset).length) {
    console.warn('did not find correct reaction subset')
  }
  return subset
}

function c_plus_c (coords1, coords2) {
  if (coords1 === null || coords2 === null ||
      coords1 === undefined || coords2 === undefined) {
    return null
  }
  return {
    x: coords1.x + coords2.x,
    y: coords1.y + coords2.y,
  }
}

function c_minus_c (coords1, coords2) {
  if (coords1 === null || coords2 === null ||
      coords1 === undefined || coords2 === undefined) {
    return null
  }
  return {
    x: coords1.x - coords2.x,
    y: coords1.y - coords2.y,
  }
}

function c_times_scalar (coords, scalar) {
  return {
    x: coords.x * scalar,
    y: coords.y * scalar,
  }
}

/**
 * Download JSON file in a blob.
 */
function download_json (json, name) {
  // Alert if blob isn't going to work
  _check_filesaver()

  var j = JSON.stringify(json)
  var blob = new Blob([j], { type: 'application/json' })
  saveAs(blob, name + '.json')
}

/**
 * Try to load the file as JSON.
 * @param {} f - The file path
 * @param {} callback - A callback function that accepts arguments: error, data.
 * @param {} pre_fn (optional) - A function to call before loading the data.
 * @param {} failure_fn (optional) - A function to call if the load fails or is
 * aborted.
*/
function load_json (f, callback, pre_fn, failure_fn) {
  // Check for the various File API support
  if (!(window.File && window.FileReader && window.FileList && window.Blob)) {
    callback('The File APIs are not fully supported in this browser.', null)
  }

  var reader = new window.FileReader()
  // Closure to capture the file information.
  reader.onload = function (event) {
    var result = event.target.result
    var data
    // Try JSON
    try {
      data = JSON.parse(result)
    } catch (e) {
      // If it failed, return the error
      callback(e, null)
      return
    }
    // If successful, return the data
    callback(null, data)
  }
  if (pre_fn !== undefined && pre_fn !== null) {
    try { pre_fn() }
    catch (e) { console.warn(e) }
  }
  reader.onabort = function(event) {
    try { failure_fn() }
    catch (e) { console.warn(e) }
  }
  reader.onerror = function(event) {
    try { failure_fn() }
    catch (e) { console.warn(e) }
  }
  // Read in the image file as a data URL
  reader.readAsText(f)
}

/**
 * Try to load the file as JSON or CSV (JSON first).
 * @param {String} f - The file path
 * @param {Function}  csv_converter - A function to convert the CSV output to equivalent JSON.
 * @param {Function} callback - A callback function that accepts arguments: error, data.
 * @param {} pre_fn (optional) - A function to call before loading the data.
 * @param {} failure_fn (optional) - A function to call if the load fails or is
 * aborted.
 * @param {} debug_event (optional) - An event, with a string at
 * event.target.result, to load as though it was the contents of a loaded file.
 */
function load_json_or_csv (f, csv_converter, callback, pre_fn, failure_fn,
                           debug_event) {
  // Capture the file information.
  var onload_function = function(event) {
    var result = event.target.result
    var data
    var errors
    // try JSON
    try {
      data = JSON.parse(result)
    } catch (e) {
      errors = 'JSON error: ' + e

      // try csv
      try {
        data = csv_converter(d3_csvParseRows(result))
      } catch (e) {
        // if both failed, return the errors
        callback(errors + '\nCSV error: ' + e, null)
        return
      }
    }
    // if successful, return the data
    callback(null, data)
  }
  if (debug_event !== undefined && debug_event !== null) {
    console.warn('Debugging load_json_or_csv')
    return onload_function(debug_event)
  }

  // Check for the various File API support.
  if (!(window.File && window.FileReader && window.FileList && window.Blob))
    callback("The File APIs are not fully supported in this browser.", null)
  var reader = new window.FileReader()

  if (pre_fn !== undefined && pre_fn !== null) {
    try { pre_fn(); }
    catch (e) { console.warn(e); }
  }
  reader.onabort = function(event) {
    try { failure_fn(); }
    catch (e) { console.warn(e); }
  }
  reader.onerror = function(event) {
    try { failure_fn(); }
    catch (e) { console.warn(e); }
  }
  // Read in the image file as a data URL.
  reader.onload = onload_function
  reader.readAsText(f)
}

/**
 * Download an svg file using FileSaver.js.
 * @param {String} name - The filename (without extension)
 * @param {D3 Selection} svg_sel - The d3 selection for the SVG element
 * @param {Boolean} do_beautify - If true, then beautify the SVG output
 */
function downloadSvg (name, svg_sel, do_beautify) {
  // Alert if blob isn't going to work
  _check_filesaver()

  // Make the xml string
  var xml = (new XMLSerializer()).serializeToString(svg_sel.node())
  if (do_beautify) xml = vkbeautify.xml(xml)
  xml = ('<?xml version="1.0" encoding="utf-8"?>\n' +
         '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"\n' +
         ' "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
         xml)

  // Save
  var blob = new Blob([ xml ], { type: 'image/svg+xml' })
  saveAs(blob, name + '.svg')
}

/**
 * Download a png file using FileSaver.js.
 * @param {String} name - The filename (without extension).
 * @param {D3 Selection} svg_sel - The d3 selection for the SVG element.
 */
function downloadPng (name, svg_sel) {
  // Alert if blob isn't going to work
  _check_filesaver()

  // Make the xml string
  var xml = new XMLSerializer().serializeToString(svg_sel.node())
  xml = ('<?xml version="1.0" encoding="utf-8"?>\n' +
         '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN"\n' +
         ' "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n' +
         xml)

  // Canvas to hold the image
  var canvas = document.createElement('canvas')
  var context = canvas.getContext('2d')

  // Get SVG size
  var svg_size = svg_sel.node().getBBox()
  var svg_width = svg_size.width + svg_size.x
  var svg_height = svg_size.height + svg_size.y

  // Canvas size = SVG size. Constrained to 10000px for very large SVGs
  if (svg_width < 10000 && svg_height < 10000) {
    canvas.width = svg_width
    canvas.height = svg_height
  } else {
    if (canvas.width > canvas.height) {
      canvas.width = 10000
      canvas.height = 10000 * (svg_height / svg_width)
    } else {
      canvas.width = 10000 * (svg_width / svg_height)
      canvas.height = 10000
    }
  }

  // Image element appended with data
  var base_image = new Image()
  base_image.src = 'data:image/svg+xml;base64,' + btoa(xml)

  base_image.onload = function () {
    // Draw image to canvas with white background
    context.fillStyle = '#FFF'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(base_image, 0, 0, canvas.width, canvas.height)

    // Save image
    canvas.toBlob(function (blob) {
      saveAs(blob, name + '.png')
    })
  }
}

/**
 * Download a png file using FileSaver.js.
 * @param {String} name - The filename (without extension).
 * @param {D3 Selection} svg_sel - The d3 selection for the SVG element.
 */
function downloadGif(name, svg_sel) {
  // Alert if blob isn't going to work
  _check_filesaver()
  // Create a loading indicator
  const {removeLoadingIndicator} = _create_loading_indicator()

  // Canvas to hold the image
  var canvas = document.createElement('canvas')
  var context = canvas.getContext('2d', { willReadFrequently: true })
  const DOMURL = window.URL || window.webkitURL || window;
  // total frames
  const frameCount = 20;
  // delay between frames
  const delay = 100;
  // Calculate the size of the picture
  const boundingClientRect= document.querySelector('rect#canvas').getBoundingClientRect()
  const { width, height, x, y, left, top } = boundingClientRect
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight
  const picWidth = width > screenWidth ? screenWidth : width
  const picHeight = height > screenHeight ? screenHeight : height
  // Calculate the offset of the svg data
  const offset = {
    x: width > screenWidth ? window.scrollX : left,
    y: height > screenHeight ? window.scrollY : top
  }
  // Set the canvas size
  canvas.width = picWidth
  canvas.height = picHeight

  // Function to process SVG to Canvas
  const processSVGToCanvas = () => {
    let svgElement = document.querySelector('.escher-svg').cloneNode(true);
    svgElement.setAttribute('viewBox', `${offset.x} ${offset.y} ${picWidth} ${picHeight}`);
    svgElement.setAttribute('width', picWidth);
    svgElement.setAttribute('height', picHeight);

    let svgData = new XMLSerializer().serializeToString(svgElement);
    let svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

    return DOMURL.createObjectURL(svgBlob);
  }

  const base_image = new Image()
  fetch('https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js')
    .then((response) => {
      if (!response.ok)
        throw new Error("Network response was not OK");
      return response.blob();
    }).then(workerBlob => {
    const gif = new GIF({
      workers: 4,
      quality: 10,
      workerScript: URL.createObjectURL(workerBlob),
      width: picWidth,
      height: picHeight,
    });

    const captureFrame = (index) => {
      if (index < frameCount) {
        let url = processSVGToCanvas();

        base_image.onload = function () {
          // Clear the canvas before drawing
          context.clearRect(0, 0, picWidth, picHeight);
          context.drawImage(base_image, 0, 0, picWidth, picHeight);
          gif.addFrame(context, { copy: true, delay });
          DOMURL.revokeObjectURL(url);
          setTimeout(() => {
            requestAnimationFrame(() => captureFrame(index + 1));
          }, delay);
        };

        base_image.src = url;
      } else {
        gif.on('finished', function (blob) {
          const downloadUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = `${name}.gif`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          // Remove or hide the loading indicator
          removeLoadingIndicator();
        });

        gif.render();
      }
    };

    captureFrame(0);
  });
}

/**
 * Create a loading indicator for the export process.
 * @return {Function} A function to remove the loading indicator.
 * @private
 */
function _create_loading_indicator() {
  var loadingIndicator = document.createElement('div');
  loadingIndicator.setAttribute('id', 'loadingIndicator');
  loadingIndicator.style.position = 'fixed';
  loadingIndicator.style.top = '0';
  loadingIndicator.style.left = '0';
  loadingIndicator.style.width = '100%';
  loadingIndicator.style.height = '100%';
  loadingIndicator.style.background = 'rgba(0, 0, 0, 0.5)';
  loadingIndicator.style.zIndex = '1000';
  loadingIndicator.style.justifyContent = 'center';
  loadingIndicator.style.alignItems = 'center';
  loadingIndicator.style.display = 'flex';
  loadingIndicator.style.color = 'white';
  loadingIndicator.style.fontSize = '24px';
  loadingIndicator.textContent = 'Exporting...';
  document.body.appendChild(loadingIndicator);

  return {
    removeLoadingIndicator: () => document.body.removeChild(loadingIndicator)
  }
}

function rotate_coords_recursive (coords_array, angle, center) {
  return coords_array.map(function (c) {
    return rotate_coords(c, angle, center)
  })
}

/**
 * Calculates displacement { x: dx, y: dy } based on rotating point c around
 * center with angle.
 */
function rotate_coords (c, angle, center) {
  var dx = Math.cos(-angle) * (c.x - center.x) +
      Math.sin(-angle) * (c.y - center.y)
    + center.x - c.x
  var dy = - Math.sin(-angle) * (c.x - center.x) +
    Math.cos(-angle) * (c.y - center.y)
    + center.y - c.y
  return { x: dx, y: dy }
}

/**
 * Get the angle between coordinates
 * @param {Object} coords - Array of 2 coordinate objects { x: 1, y: 1 }
 * @return {Number} angle between 0 and 2PI.
 */
function get_angle (coords) {
  var denominator = coords[1].x - coords[0].x
  var numerator = coords[1].y - coords[0].y
  if (denominator === 0 && numerator >= 0) {
    return Math.PI/2
  } else if (denominator === 0 && numerator < 0) {
    return 3*Math.PI/2
  } else if (denominator >= 0 && numerator >= 0) {
    return Math.atan(numerator/denominator)
  } else if (denominator >= 0) {
    return (Math.atan(numerator/denominator) + 2*Math.PI)
  } else {
    return (Math.atan(numerator/denominator) + Math.PI)
  }
}

function to_degrees (radians) {
  return radians * 180 / Math.PI
}

/**
 * Force to domain -PI to PI
 */
function angleNorm (radians) {
  if (radians < -Math.PI) {
    return radians + Math.floor((radians - Math.PI) / (-2 * Math.PI)) * 2 * Math.PI
  } else if (radians > Math.PI) {
    return radians - Math.floor((radians + Math.PI) / (2 * Math.PI)) * 2 * Math.PI
  } else {
    return radians
  }
}

function to_radians (degrees) {
  return Math.PI / 180 * degrees
}

/**
 * Convert to radians, and force to domain -PI to PI
 */
function to_radians_norm (degrees) {
  var radians = to_radians(degrees)
  return angleNorm(radians)
}

function angle_for_event (displacement, point, center) {
  var gamma =  Math.atan2((point.x - center.x), (center.y - point.y))
  var beta = Math.atan2((point.x - center.x + displacement.x),
                        (center.y - point.y - displacement.y))
  var angle = beta - gamma
  return angle
}

function distance (start, end) {
  return Math.sqrt(Math.pow(end.y - start.y, 2) + Math.pow(end.x - start.x, 2))
}

/**
 * Report an error if any of the arguments are undefined. Call by passing in
 * "arguments" from any function and an array of argument names.
 */
function check_undefined (args, names) {
  names.forEach(function (name, i) {
    if (args[i] === undefined) {
      console.error(`Argument is undefined: ${names[i]}`)
    }
  })
}

function compartmentalize (bigg_id, compartment_id) {
  return `${bigg_id}_${compartment_id}`;
}

/**
 * Returns an array of [bigg_id, compartment id]. Matches compartment ids with
 * length 1 or 2. Return [ id, null ] if no match is found.
 */
function decompartmentalize (id) {
  var reg = /(.*)\[([a-z0-9]{1,2})\]$/;
  var result = reg.exec(id)
  return result !== null ? result.slice(1,3) : [ id, null ]
}

function mean (array) {
  var sum = array.reduce(function (a, b) { return a + b })
  var avg = sum / array.length
  return avg
}

function median (array) {
  array.sort(function(a, b) { return a - b })
  var half = Math.floor(array.length / 2)
  if(array.length % 2 == 1) {
    return array[half]
  } else {
    return (array[half-1] + array[half]) / 2.0
  }
}

function quartiles (array) {
  array.sort(function (a, b) { return a - b })
  var half = Math.floor(array.length / 2)
  if (array.length === 1) {
    return [
      array[0],
      array[0],
      array[0],
    ]
  } else if (array.length % 2 === 1) {
    return [
      median(array.slice(0, half)),
      array[half],
      median(array.slice(half + 1)),
    ]
  } else {
    return [
      median(array.slice(0, half)),
      (array[half-1] + array[half]) / 2.0,
      median(array.slice(half)),
    ]
  }
}

/**
 * Generate random characters
 *
 * Thanks to @csharptest.net
 * http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript
 */
function random_characters (num) {
  var text = ''
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  for (var i = 0; i < num; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

function generate_map_id () {
  return random_characters(12)
}

/**
 * Check that the selection has the given parent tag.
 * @param {D3 Selection|DOM Node} el - A D3 Selection or DOM Node to check.
 * @param {String} tag - A tag name (case insensitive).
 */
function check_for_parent_tag (el, tag) {
  // make sure it is a node
  if (el instanceof d3_selection) {
    el = el.node()
  }
  while (el.parentNode !== null) {
    el = el.parentNode
    if (el.tagName === undefined) {
      continue
    }
    if (el.tagName.toLowerCase() === tag.toLowerCase()) {
      return true
    }
  }
  return false
}

/**
 * Convert model or map name to url.
 * @param {String} name - The short name, e.g. e_coli.iJO1366.central_metabolism.
 * @param {String} download_url (optional) - The url to prepend.
 */
function name_to_url (name, download_url) {
  if (download_url !== undefined && download_url !== null) {
    // strip download_url
    download_url = download_url.replace(/^\/|\/$/g, '')
    name = [download_url, name].join('/')
  }
  // strip final path
  return name.replace(/^\/|\/$/g, '') + '.json'
}

/**
 * Get the document for the node
 */
function get_document (node) {
  return node.ownerDocument
}

/**
 * Get the window for the node
 */
function get_window (node) {
  return get_document(node).defaultView
}

// filter the data which is less than threshold
function process_reaction_data (data, threshold = 0) {
  if (!(data instanceof Array)) {
    data = [ data ]
  }

  const obj = data[0];

  // call the function for each key in the object
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      let value = Number(obj[key]);

      // check if value is an object, if it is, call the function again
      if (typeof value === 'object' && value !== null) {
        processObject(value);
      } else if (typeof value === 'number' && Math.abs(value) < threshold) {
        // if value is a number and less than threshold, set it to 0
        obj[key] = 0;
      }
    }
  }

  return [obj];
}

/**
 * Get translation and rotation values for a transform string. This used to be
 * in d3, but since v4, I just adapted a solution from SO:
 *
 * http://stackoverflow.com/questions/38224875/replacing-d3-transform-in-d3-v4
 *
 * To get skew and scale out, go back to that example.
 *
 * TODO rename function without "catch"
 *
 * @param {String} transform_attr - A transform string.
 */
function d3_transform_catch (transform_attr) {
  if (transform_attr.indexOf('skew') !== -1 ||
      transform_attr.indexOf('matrix') !== -1) {
    throw new Error('d3_transform_catch does not work with skew or matrix')
  }

  var translate_res = (/translate\s*\(\s*([0-9.-]+)\s*,\s*([0-9.-]+)\s*\)/
                       .exec(transform_attr))
  var tn = _.isNull(translate_res)
  var tx = tn ? 0.0 : Number(translate_res[1])
  var ty = tn ? 0.0 : Number(translate_res[2])

  var rotate_res = (/rotate\s*\(\s*([0-9.-]+)\s*\)/
                    .exec(transform_attr))
  var rn = _.isNull(rotate_res)
  var r = rn ? 0.0 : Number(rotate_res[1])

  var scale_res = (/scale\s*\(\s*([0-9.-]+)\s*\)/
                   .exec(transform_attr))
  var sn = _.isNull(scale_res)
  var s = sn ? 0.0 : Number(scale_res[1])

  return { translate: [ tx, ty ], rotate: r, scale: s, }

  // // Create a dummy g for calculation purposes only. This will new be appended
  // // to the DOM and will be discarded once this function returns.
  // var g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

  // // Set the transform attribute to the provided string value.
  // g.setAttributeNS(null, 'transform', transform_attr)

  // // Consolidate the SVGTransformList containing all Try to a single
  // // SVGTransform of type SVG_TRANSFORM_MATRIX and get its SVGMatrix.

  // var matrix = g.transform.baseVal.consolidate().matrix

  // // Below calculations are taken and adapted from the private func
  // // transform/decompose.js of D3's module d3-interpolate.
  // var a = matrix.a
  // var b = matrix.b
  // var c = matrix.c
  // var d = matrix.d
  // var e = matrix.e
  // var f = matrix.f
  // var scaleX = Math.sqrt(a * a + b * b)

  // if (scaleX) {
  //   a /= scaleX
  //   b /= scaleX
  // }

  // if (a * d < b * c) {
  //   a = -a
  //   b = -b
  // }

  // return {
  //   translate: [ e, f ],
  //   rotate: Math.atan2(b, a) * Math.PI / 180,
  // }
}

/**
 * Look for name in the user agent string.
 */
// function check_browser (name) {
//   var browser = function() {
//     // Thanks to
//     // http://stackoverflow.com/questions/2400935/browser-detection-in-javascript
//     var ua = navigator.userAgent
//     var M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []
//     var tem
//     if (/trident/i.test(M[1])) {
//       tem = /\brv[ :]+(\d+)/g.exec(ua) || []
//       return 'IE '+ (tem[1] || '')
//     }
//     if (M[1] === 'Chrome') {
//       tem = ua.match(/\b(OPR|Edge)\/(\d+)/)
//       if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera')
//     }
//     M = M[2] ? [ M[1], M[2] ]: [ navigator.appName, navigator.appVersion, '-?' ]
//     if ((tem = ua.match(/version\/(\d+)/i)) !== null) {
//       M.splice(1, 1, tem[1])
//     }
//     return M.join(' ')
//   }

//   try {
//     // navigator.userAgent is deprecated, so don't count on it
//     return browser().toLowerCase().indexOf(name) > -1
//   } catch (e) {
//     return false
//   }
// }

/**
 * the function to handle the animation of the reaction data
 * @param {Array} entries - The array of IntersectionObserverEntry objects.
 * @param {IntersectionObserver} observer - The IntersectionObserver object.
 * @param {Object} settings - The settings object, containing the get and set methods.
 * @param {Boolean} has_data_on_reactions - The flag to indicate if the data on reactions is loaded.
 * @param {Object} scale - The scale object, containing the reaction_animation_duration and reaction_size methods.
 * @returns void
 */
function handle_animation(entries, observer, settings, has_data_on_reactions, scale) {
  // show the reaction data animation
  const show_animation = settings.get('show_reaction_data_animation')
  // animation line style
  const line_style = settings.get('animation_line_style')

  entries.forEach(entry => {
    // get the node
    const node = entry.target;
    // check if the element is in the viewport
    if (entry.isIntersecting) {
      // show the animation when the element is in the viewport
      const dataBindByD3 = node.__data__;
      if (has_data_on_reactions && show_animation && dataBindByD3.data) {
        const fluxData = dataBindByD3.data;
        const velocity = scale.reaction_animation_duration(fluxData);
        const strokeDash = scale.reaction_size(fluxData) * 2;
        const strokeDashArray = line_style === 'dashed' ? `${strokeDash}, ${strokeDash}` : `2, ${strokeDash}`;
        // Check if the animation is already running and the velocity has changed
        if (node.animation && node.animation.data !== velocity) {
          node.animation.kill()
          node.animation = null
        }

        if(!node.animation) {
          const node_length = node.getTotalLength();
          const direction = dataBindByD3.data_string.startsWith("-") ? 1 : -1;
          node.setAttribute("stroke-dasharray", strokeDashArray);
          node.animation = gsap.to(node, {
            strokeDashoffset: direction * node_length * 2,
            repeat: -1,
            ease: "none",
            // insure the animation restarts if the velocity changes
            immediateRender: true,
            duration: velocity * node_length / 100,
            data: velocity
          });
        }else {
          node.setAttribute("stroke-dasharray", strokeDashArray);
          node.animation.play(); // show the animation
        }
      }
    } else {
      // stop the animation when the element is not in the viewport
      if (node.animation) {
        node.removeAttribute("stroke-dasharray");
        node.animation.pause(); // stop the animation
      }
    }
  });
}

/**
 * update the color legends when the data on reactions is loaded
 * @param reaction_color_scale - The color scale for reactions.
 * @param has_data_on_reactions - The flag to indicate if the data on reactions is loaded.
 * @returns void
 */
function update_color_legends(reaction_color_scale, has_data_on_reactions) {
  // get the domain and range of the color scale
  const domain = reaction_color_scale.domain();
  const range = reaction_color_scale.range();
  // get elements for the color legends
  const LEGEND_WIDTH = 200;
  const LEGEND_HEIGHT = 19;
  const svg = d3_select(".legend-container")
  const legend = svg.select(".legend-group");
  const gradient = legend.select(".legend-defs linearGradient");
  // define the linear gradient data for the color rectangle
  gradient.selectAll("stop").data(_get_color_linearGradient_data(domain, range)).enter().append('stop')
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);
  // draw the color rectangle
  legend.select(".legend-rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", LEGEND_WIDTH)
    .attr("height", LEGEND_HEIGHT)
    .style("fill", "url(#legend-gradient)");

  const legendScale = d3_scale.scaleLinear()
    .domain([Math.min(...domain), Math.max(...domain)])
    .range([0, LEGEND_WIDTH]);

  // define the axis and text for the color legend
  const legendAxis = d3_axis_bottom(legendScale)
    .tickValues([domain[0], domain[domain.length - 1]])
    .tickFormat(d => d === domain[0] ? 'min' : d === domain[domain.length - 1] ? 'max' : '');

  // draw the color legend axis
  legend.select(".legend-axis")
    .attr("transform", `translate(0, ${LEGEND_HEIGHT})`)
    .call(legendAxis);

  has_data_on_reactions ? svg.style("display", "block") : svg.style("display", "none");
}

// get the linear gradient data for the color rectangle, used by update_color_legends(internal function)
function _get_color_linearGradient_data(domain, range) {
  const minDomain = domain[0];
  const maxDomain = domain[domain.length - 1];
  const percentages = domain.map(value => ((value - minDomain) / (maxDomain - minDomain)) * 100);

  const data = [];
  for (let i = 0; i < domain.length; i++) {
    if (typeof range[i] === 'string' || range[i] instanceof String) {
      data.push({
        offset: `${percentages[i]}%`,
        color: range[i]
      });
    }
  }
  return data
}

/**
 * Get current date in the format of "YYYY-MM-DD".
 * @returns {string}
 */
function get_current_date() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get local storage item.
 *
 * @param key - The key of the item to get.
 * @param defaultValue - The default value to return if the item is not found.
 * @returns {null|string}
 */
function get_local_storage_item(key, defaultValue = null) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {
    console.warn('LocalStorage is not available.', e);
  }
  return defaultValue;
}


export default {
  set_options,
  remove_child_nodes,
  load_css,
  load_files,
  load_the_file,
  make_class,
  class_with_optional_new,
  setup_defs,
  draw_an_object,
  draw_a_nested_object,
  make_array,
  make_array_ref,
  compare_arrays,
  arrayToObject,
  clone,
  extend,
  uniqueConcat,
  unique_strings_array,
  debounce,
  object_slice_for_ids,
  object_slice_for_ids_ref,
  c_plus_c,
  c_minus_c,
  c_times_scalar,
  download_json,
  load_json,
  load_json_or_csv,
  downloadSvg,
  downloadPng,
  downloadGif,
  rotate_coords_recursive,
  rotate_coords,
  get_angle,
  to_degrees,
  angleNorm,
  to_radians,
  to_radians_norm,
  angle_for_event,
  distance,
  check_undefined,
  compartmentalize,
  decompartmentalize,
  mean,
  median,
  quartiles,
  random_characters,
  generate_map_id,
  check_for_parent_tag,
  name_to_url,
  get_document,
  get_window,
  d3_transform_catch,
  process_reaction_data,
  // check_browser,
  handle_animation,
  update_color_legends,
  get_current_date,
  get_local_storage_item,
}