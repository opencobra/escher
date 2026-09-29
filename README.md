[![PyPi](https://img.shields.io/pypi/v/escher.svg)](https://pypi.python.org/pypi/Escher)
[![NPM](https://img.shields.io/npm/v/escher.svg)](https://www.npmjs.com/package/escher)
[![Gitter.im](https://img.shields.io/gitter/room/zakandrewking/gitter.svg?color=orange)](https://gitter.im/zakandrewking/escher)
[![Documentation Status](https://readthedocs.org/projects/escher/badge/?version=latest)](https://escher.readthedocs.io/en/latest/?badge=latest)
[![Travis](https://img.shields.io/travis/zakandrewking/escher/master.svg)](https://travis-ci.org/zakandrewking/escher)
[![Coverage Status](https://img.shields.io/coveralls/zakandrewking/escher/master.svg)](https://coveralls.io/github/zakandrewking/escher?branch=master)
[![MIT](https://img.shields.io/pypi/l/escher.svg?color=blueviolet)](https://github.com/zakandrewking/escher/blob/master/LICENSE)

# Escher

Escher is a web-based tool to build, view, share, and embed metabolic maps. The
easiest way to use Escher is to browse or build maps on the
[Escher website](http://escher.github.io/).

Visit the [documentation](http://escher.readthedocs.org/) to get started with
Escher and explore the API.

Check out the
[developer docs](https://escher.readthedocs.org/en/latest/development.html),
the [Gitter chat room](https://gitter.im/zakandrewking/escher), and the
[Development Roadmap](https://github.com/zakandrewking/escher/wiki/Development-Roadmap) for information
on Escher development. Feel free to submit bugs and feature requests as Issues,
or, better yet, Pull Requests.

Follow [@zakandrewking](https://twitter.com/zakandrewking) for Escher updates.

You can help support Escher by citing our publication when you use Escher or
EscherConverter:

Zachary A. King, Andreas Dräger, Ali Ebrahim, Nikolaus Sonnenschein, Nathan
E. Lewis, and Bernhard O. Palsson (2015) *Escher: A web application for
building, sharing, and embedding data-rich visualizations of biological
pathways*, PLOS Computational Biology 11(8):
e1004321. doi:[10.1371/journal.pcbi.1004321](http://dx.doi.org/10.1371/journal.pcbi.1004321)

Escher was developed at [SBRG](http://systemsbiology.ucsd.edu/). Funding was
provided by [The National Science Foundation Graduate Research Fellowship](https://www.nsfgrfp.org)
under Grant no. DGE-1144086, The European Commission as part of a Marie Curie
International Outgoing Fellowship within the EU 7th Framework Program for
Research and Technological Development ([EU project AMBiCon, 332020](http://ec.europa.eu/research/mariecurieactions/node_en)),
and [The Novo Nordisk Foundation](http://novonordiskfonden.dk/)
through [The Center for Biosustainability](https://www.biosustain.dtu.dk/)
at the Technical University of Denmark (NNF10CC1016517)

# Building and testing Escher

## JavaScript

First, install dependencies with [npm](https://www.npmjs.com) (or you can use
[yarn](https://yarnpkg.com)):

```
npm install
```

Escher uses [Vite](https://vite.dev) to manage the build process. To build
`dist/escher.js`, `dist/escher.min.js` and the Jupyter widget bundle, run:

```
npm run build
```

You can run a development server (http://localhost:7621) with:

```
npm run start
# or to rebuild dist/escher.js when the source code changes:
npm run watch
```

To test the JavaScript files, run:

```
npm run test
```

## Python

Escher has a Python package for generating Escher visualizations from within a
Python data anlaysis session. To learn more about using the features of the
Python package, check out the documentation:

https://escher.readthedocs.io/en/latest/escher-python.html

You can install it with pip:

```
pip install escher
```

## Jupyter

The Escher widget works in JupyterLab, Jupyter Notebook 7, VS Code, Google
Colab, and other environments that support
[anywidget](https://anywidget.dev). No Jupyter extension needs to be installed
or enabled.

```python
import escher

# Display a map in a notebook
builder = escher.Builder(map_name='e_coli_core.Core metabolism')
builder
```

The displayed map updates when its traits change, for example in a later cell:

```python
builder.reaction_data = {'PFK': 1.5, 'PYK': 0.8}
```

Map names must match the names in the Escher map index. To see the available
maps, run `escher.list_available_maps()`.

To overlay fluxes from a [COBRApy](https://github.com/opencobra/cobrapy) model:

```python
import cobra
import escher

model = cobra.io.load_model('textbook')
solution = model.optimize()

builder = escher.Builder(
    map_name='e_coli_core.Core metabolism',
    model=model,
    reaction_data=solution.fluxes.to_dict(),
)
builder
```

To react to clicks in the map, observe `selected_reaction_event` or
`selected_metabolite_event`. Their values look like
`{'bigg_id': 'PFK', 'event_id': 3}`; `event_id` increases with every click, so
observers fire even when the same item is clicked twice.

- Reaction clicks are reported in any mode.
- Metabolite clicks are reported when a node is selected, which happens in
  select or build mode (for example, the arrow tool in the left toolbar).
- `selected_reaction` and `selected_metabolite` hold the latest BiGG ID. With
  `enable_tooltips` on, hovering over a reaction also updates
  `selected_reaction`.

Callbacks run outside the cell that displayed the map, so send their output to
an `Output` widget:

```python
import ipywidgets as widgets

out = widgets.Output()
display(out)

def on_reaction_click(change):
    with out:
        print(change['new']['bigg_id'])

builder.observe(on_reaction_click, names='selected_reaction_event')
```

## Python/Jupyter Development

For development of the Python package, first build the JavaScript package and
copy it over to the `py` directory with these commands in the Escher root:

```
npm install
npm run build
npm run copy
```

Then in the `py` directory, install the Python package in editable mode with
the test dependencies:

```
cd py
pip install -e ".[test]"
```

(Use `".[test,docs]"` to also install the dependencies for building the docs.)

For Python testing, run this in the `py` directory:

```
cd py
pytest
```

If you use [uv](https://docs.astral.sh/uv/), `uv run --extra test pytest`
creates the environment from the lockfile (`py/uv.lock`) and runs the tests in
one step. After changing dependencies in `py/pyproject.toml`, run `uv lock` to
update the lockfile.

The Jupyter widget is built from `src/escher-widget.js` into
`py/escher/static/escher-widget.js` by `npm run build`. After changing the
JavaScript, run `npm run build && npm run copy` and restart the notebook kernel to
pick up the new bundle.

## Docs

The docs are built with Sphinx and nbsphinx from the requirements in
`docs/requirements.txt`, the same ones Read the Docs uses. If
[uv](https://docs.astral.sh/uv/) is installed, `build_docs` runs Sphinx in a
temporary environment with those requirements; otherwise install them first
with `pip install -r docs/requirements.txt`. nbsphinx also needs
[Pandoc](https://pandoc.org/installing.html) (`brew install pandoc` on macOS).

Build and view the docs (on Windows, run `python build_docs`):

```
cd docs
./build_docs
cd _build/html
python -m http.server
```
