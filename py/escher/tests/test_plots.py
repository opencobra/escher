from escher import __schema_version__, __map_model_version__
from escher import Builder
from escher.plots import (
    _load_resource,
    server_index,
    model_json_for_name,
    map_json_for_name,
)
from escher.urls import get_url

import base64
import os
import sys
from os.path import join, basename
import json
import re
from pytest import raises, mark, param
from urllib.error import URLError
import pandas as pd
import cobra


@mark.web
def test_server_index():
    index = server_index()
    map_0 = index['maps'][0]
    assert 'organism' in map_0
    assert 'map_name' in map_0
    model_0 = index['models'][0]
    assert 'organism' in model_0
    assert 'model_name' in model_0


# helper functions


def test_load_resource_json(tmpdir):
    test_json = '{"r": "val"}'
    assert _load_resource(test_json, 'name') == test_json


def test_load_resource_long_json(tmpdir):
    # this used to fail on Windows with Python 3
    test_json = '{"r": "' + ('val' * 100000) + '"}'
    assert _load_resource(test_json, 'name') == test_json


def test_load_resource_directory(tmpdir):
    directory = os.path.abspath(os.path.dirname(__file__))
    val = _load_resource(join(directory, 'example.json'), 'name').strip()
    assert val == '{"r": "val"}'


def test_load_resource_invalid_file(tmpdir):
    with raises(ValueError) as err:
        p = join(str(tmpdir), 'dummy')
        with open(p, 'w') as f:
            f.write('dummy')
        _load_resource(p, 'name')
        assert 'not a valid json file' in err.value


@mark.web
def test_load_resource_web(tmpdir):
    url = '/'.join([get_url('map_download'),
                    'Escherichia%20coli/iJO1366.Central%20metabolism.json'])
    _ = json.loads(_load_resource(url, 'name'))


def look_for_string(st, substring):
    """Look for the string in the substring. This solves a bug in py.test
    for these cases"""
    try:
        found = st.find(substring)
        assert found > -1
    except AssertionError:
        raise AssertionError('Could not find\n\n{substring}\n\nin\n\n{st}'
                             .format(substring=substring, st=st))


def test_save_html(tmpdir):
    b = Builder(map_json='"useless_map"', model_json='"useless_model"')
    filepath = join(str(tmpdir), 'builder.html')
    b.save_html(filepath)
    with open(filepath, 'r') as f:
        html = f.read()

    look_for_string(
        html,
        'escher.Builder(data.map_data, data.model_data, ',
    )
    look_for_string(
        html,
        "map_data = JSON.parse(b64DecodeUnicode('InVzZWxlc3NfbWFwIg=='))",
    )
    look_for_string(
        html,
        "model_data = JSON.parse(b64DecodeUnicode('InVzZWxlc3NfbW9kZWwi'))",
    )
    assert 'embedded_css =' not in html


def test_save_html_includes_data_and_options(tmpdir):
    b = Builder(reaction_data={'GAPD': 10}, hide_secondary_metabolites=True)
    b.gene_data = {'b1779': 2}
    filepath = join(str(tmpdir), 'builder.html')
    b.save_html(filepath)
    with open(filepath, 'r') as f:
        html = f.read()

    match = re.search(r"newOptions = JSON.parse\(b64DecodeUnicode\('([^']*)'\)\)",
                      html)
    options = json.loads(base64.b64decode(match.group(1)))
    assert options['reaction_data'] == {'GAPD': 10}
    assert options['gene_data'] == {'b1779': 2}
    assert 'metabolite_data' not in options
    assert options['hide_secondary_metabolites'] is True


def test_save_html_embedded_css(tmpdir):
    # ok with embedded_css arg
    b = Builder(embedded_css='useless_css')
    filepath = join(str(tmpdir), 'builder.html')
    b.save_html(filepath)
    with open(filepath, 'r') as f:
        html = f.read()

    look_for_string(
        html,
        "embedded_css = b64DecodeUnicode('dXNlbGVzc19jc3M=')",
    )


def test_Builder_options():
    b = Builder(metabolite_no_data_color='blue')
    assert b.metabolite_no_data_color == 'blue'
    b.metabolite_no_data_color = 'white'
    assert b.metabolite_no_data_color == 'white'


@mark.parametrize('data,expected', [
    param(pd.Series({'x': 1}), {'x': 1}),
    param({'x': 1}, {'x': 1}),
    param(None, None),
    param({}, {}),
    param(
        pd.DataFrame([{'x': 1, 'y': 3}, {'x': 2}]).T,
        [{'x': 1, 'y': 3}, {'x': 2}]
    )
])
def test_handling_cobra_fluxes(data, expected):
    b = Builder(reaction_data=data,
                gene_data=data,
                metabolite_data=data)
    assert b.reaction_data == expected
    assert b.gene_data == expected
    assert b.metabolite_data == expected


def test_widget_bundle():
    import escher.plots
    bundle = join(os.path.dirname(escher.plots.__file__), 'static',
                  'escher-widget.js')
    assert os.path.isfile(bundle)
    assert 'render' in str(Builder()._esm)


def test_option_names():
    b = Builder()
    assert b._option_names == sorted(b.traits(option=True))
    assert 'reaction_data' in b._option_names
    assert 'full_screen_button' in b._option_names
    assert 'map_json' not in b._option_names


def test_selection_traits():
    b = Builder()
    assert b.selected_reaction == ''
    assert b.selected_metabolite == ''
    assert b.selected_reaction_event == {}
    assert b.selected_metabolite_event == {}


def test_data_reads_back_as_python_objects():
    b = Builder(reaction_data={'PGI': 1.0})
    assert b.reaction_data == {'PGI': 1.0}
    b.reaction_data = None
    assert b.reaction_data is None


def test_model_and_names_read_back():
    model = cobra.Model('test_model')
    b = Builder(model=model, map_json='"a_map"')
    assert b.model is model
    assert json.loads(b._loaded_model_json)['id'] == 'test_model'
    b.model_name = None
    assert b.map_name is None


def test_save_html_uses_current_model_and_css(tmpdir):
    b = Builder(map_json='"a_map"', model_json='"first_model"')
    b.model_json = '"second_model"'
    b.embedded_css = 'new_css'
    filepath = join(str(tmpdir), 'builder.html')
    b.save_html(filepath)
    with open(filepath, 'r') as f:
        html = f.read()
    assert base64.b64encode(b'"second_model"').decode() in html
    assert base64.b64encode(b'new_css').decode() in html
