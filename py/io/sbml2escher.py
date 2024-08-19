"""
This module provides tools for converting SBML and CellDesigner XML files to Escher format.
"""
import json
import argparse
import sys
import time
import os

from xml.parsers.expat import ExpatError
import xmltodict
import requests

# define edges
edges = {}
# define nodes
nodes = {}


# identify the file type, whether it is CellDesigner XML or SBML XML
def identify_file_type(file_path):
    """
    Identify the file type, whether it is CellDesigner XML or SBML XML
    :param file_path: path to the file
    :return: file type, data
    """
    file_data = load_xml_data(file_path)
    # assume the file is SBML XML if it has the 'sbml' tag
    if 'sbml' in file_data:
        if '@xmlns:celldesigner' in file_data['sbml']:
            # assume the file is CellDesigner XML if it has the 'xmlns:celldesigner' attribute
            return 'celldesigner', file_data
        return 'sbml', file_data

    return 'Unknown XML type', None


def celldesigner2sbml(input_file_path, output_file_path):
    """
    Convert CellDesigner XML to SBML XML
    :param input_file_path: path to the CellDesigner XML file
    :param output_file_path: path to the output SBML XML file
    :return: None
    """
    start_at = time.time()
    with open(input_file_path, 'rb') as file:
        file_data = file.read()

    # Define the URL for the conversion service
    url = 'https://minerva-service.lcsb.uni.lu/minerva/api/convert/CellDesigner_SBML:SBML'
    # Define the headers for the HTTP request
    headers = {
        'Content-Type': 'text/plain'
    }

    # Make the HTTP POST request to the conversion service, timeout set to 10 minutes
    response = requests.post(url, data=file_data, headers=headers, timeout=600)

    # Check if the response is successful
    if response.status_code == 200:
        # Save the response content to the specified output file
        with open(output_file_path, 'wb') as file:
            file.write(response.content)
        end_at = time.time()
        print(f"CellDesigner2SBML request completed in {end_at - start_at:.2f} seconds.")

        print(f"CellDesigner2SBML request successful, file saved as {output_file_path}")
    else:
        print(f"CellDesigner2SBML request failed with status code {response.status_code}, "
              f"error message: {response.text}")
        sys.exit(1)


# Load XML data
def load_xml_data(file_path):
    """
    Load XML data from a file
    :param file_path: path to the XML file
    :return: None
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return xmltodict.parse(file.read())
    except FileNotFoundError:
        print(f"Error: The file {file_path} was not found.")
        sys.exit(1)
    except IOError as e:
        print(f"Error: Could not read the XML file {file_path}. I/O error: {e}")
        sys.exit(1)
    except ExpatError as e:
        print(f"Error: Failed to parse XML file {file_path}. Parsing error: {e}")
        sys.exit(1)


# Save escher JSON data
def save_json_data(json_data, file_path):
    """
    Save JSON data to a file
    :param data: formatted JSON data
    :param file_path: path to the output file
    :return: None
    """
    if not file_path.endswith('.json'):
        print(f"Warning: The output file {file_path} does not have a .json extension. "
              f"It might not be opened correctly by JSON readers.")
    try:
        with open(file_path, 'w', encoding='utf-8') as file:
            json.dump(json_data, file, indent=4)
    except IOError as e:
        print(f"Error: Could not write the JSON data to the file {file_path}. I/O error: {e}")
        sys.exit(1)


# check if the role is substrate or sidesubstrate
def is_substrates_metabolite(role):
    """
    Check if the role is substrate or sidesubstrate
    :param role: role of the metabolite
    :return: bool
    """
    return role in ('substrate', 'sidesubstrate')


# check if the role is product or sideproduct
def is_products_metabolite(role):
    """
    Check if the role is product or sideproduct
    :param role: role of the metabolite
    :return: bool
    """
    return role in ('product', 'sideproduct')


# check if the role is main metabolite
def is_main_metabolite(role):
    """
    Check if the role is main metabolite
    :param role: role of the metabolite
    :return: bool
    """
    return role in ('substrate', 'product')


# check if the role is valid metabolite
def is_valid_metabolite(role):
    """
    Check if the role is valid metabolite
    :param role: role of the metabolite
    :return: bool
    """
    return role in ('substrate', 'sidesubstrate', 'product', 'sideproduct')


def get_metabolites_for_reaction(reaction, specie2bigg):
    """
    Get the metabolites for the reaction
    :param reaction: reaction object
    :param specie2bigg: dict of species id to bigg_id
    :return: metabolites of the reaction, {'bigg_id': str, 'coefficient': int}[]
    """
    reaction_metabolites = []
    # get the list of reactants
    list_of_reactants = reaction.get('listOfReactants', {}).get('speciesReference')
    if isinstance(list_of_reactants, dict):
        list_of_reactants = [list_of_reactants]
    for reactant in list_of_reactants:
        metabolite_id = reactant['@species']
        metabolite_name = specie2bigg[metabolite_id]
        reaction_metabolites.append({
            'bigg_id': metabolite_name,
            'coefficient': -1
        })

    # get the list of products
    list_of_products = reaction.get('listOfProducts', {}).get('speciesReference')
    if isinstance(list_of_products, dict):
        list_of_products = [list_of_products]
    for product in list_of_products:
        metabolite_id = product['@species']
        metabolite_name = specie2bigg[metabolite_id]
        reaction_metabolites.append({
            'bigg_id': metabolite_name,
            'coefficient': 1
        })

    return reaction_metabolites


# add a segment
def put_segment_to_segments(segments, segment_id, from_node_id, to_node_id, b1=None, b2=None):
    """
    Add a segment to the segments
    :param segments: all segments in the single reaction
    :param segment_id: segment id
    :param from_node_id: from node id
    :param to_node_id: to node id
    :param b1: bezier control point 1
    :param b2: bezier control point 2
    :return: None
    """
    segments[segment_id] = {
        'from_node_id': from_node_id,
        'to_node_id': to_node_id,
        'b1': b1,
        'b2': b2,
    }


def process_metabolite(role, index, start_node_id, end_node_id, start_x, start_y, segments,
                       mato_species_glyph, length_of_metabolite_segments, metabolite_curve_id):
    """
    Process the metabolite
    :param role: metabolite role
    :param index: index of the metabolite segment
    :param start_node_id: the id of the start node in the reaction
    :param end_node_id: the id of the end node in the reaction
    :param start_x: the x position of the start node in the metabolite segment
    :param start_y: the y position of the start node in the metabolite segment
    :param segments: all segments in the single reaction
    :param mato_species_glyph: mato species glyph
    :param length_of_metabolite_segments: length of the metabolite segments
    :param metabolite_curve_id: metabolite curve id
    :return: None
    """
    metabolite_segment_id = f"{metabolite_curve_id}-{mato_species_glyph}"
    current_metabolite_segment_id = f"{metabolite_segment_id}-{index}"
    next_metabolite_segment_id = f"{metabolite_segment_id}-{index + 1}"

    def handle_cant_direct_connect_to_reaction(is_produce_node, node_in_reaction):
        """
        Handle the situation that the metabolite can't directly connect to the reaction
        :param is_produce_node: whether the node is a product node
        :param node_in_reaction: the node in the reaction
        :return: None
        """
        # sign the next node
        only_one_segment = length_of_metabolite_segments == 1
        next_node = mato_species_glyph if only_one_segment else next_metabolite_segment_id

        if node_in_reaction and (
                start_x != nodes[node_in_reaction]['x'] or
                start_y != nodes[node_in_reaction]['y']
        ):
            # if the start node is not the same as the node in the reaction
            # create a new node and update the segments
            extra_seg_id = f"{current_metabolite_segment_id}-extra"
            # add the extra node
            nodes[extra_seg_id] = {
                'node_type': 'multimarker',
                'x': start_x,
                'y': start_y,
            }

            # update the segments
            update_segments_with_node(is_produce_node, segments, start_x, start_y,
                                      extra_seg_id, node_in_reaction, current_metabolite_segment_id)

            # the flux direction is from the reaction to the product node
            # reverse when the node is a substrate
            # cause the flux direction is from the substrate node to the reaction
            from_id, to_id = (extra_seg_id, next_node) if is_produce_node else (
                next_node, extra_seg_id)

            put_segment_to_segments(segments, current_metabolite_segment_id, from_id, to_id)
        else:
            from_id, to_id = (node_in_reaction, next_node) if is_produce_node else (
                next_node, node_in_reaction)

            put_segment_to_segments(segments, current_metabolite_segment_id, from_id, to_id)

    if is_valid_metabolite(role):
        if index == 0:
            _node_in_reaction = end_node_id if is_products_metabolite(role) else start_node_id
            handle_cant_direct_connect_to_reaction(is_products_metabolite(role),
                _node_in_reaction)

        elif index == length_of_metabolite_segments - 1:
            from_id, to_id = (
                current_metabolite_segment_id, mato_species_glyph) if is_products_metabolite(
                role) else (
                mato_species_glyph, current_metabolite_segment_id)
            put_segment_to_segments(segments, current_metabolite_segment_id, from_id, to_id)

        else:
            from_id, to_id = (
                current_metabolite_segment_id,
                next_metabolite_segment_id) if is_products_metabolite(
                role) else (
                next_metabolite_segment_id, current_metabolite_segment_id)
            put_segment_to_segments(segments, current_metabolite_segment_id, from_id, to_id)

        nodes[current_metabolite_segment_id] = {
            'node_type': 'multimarker',
            'x': start_x,
            'y': start_y,
        }
    else:
        print("Unknown role", role)


def set_reaction_label_position(start, end, reaction):
    """
    Calculate and set the label position of the reaction
    :param start: start node
    :param end: end node
    :param reaction: reaction object
    :return: None
    """
    # calculate the mid node
    mid_node = {
        'x': (float(start['@layout:x']) + float(end['@layout:x'])) / 2,
        'y': (float(start['@layout:y']) + float(end['@layout:y'])) / 2
    }
    reaction['label_x'] = mid_node['x']
    reaction['label_y'] = mid_node['y'] - 20


def is_point_on_segment(px, py, x1, y1, x2, y2):
    """
    Check if a point is on a segment
    :param px: point x
    :param py: point y
    :param x1: start node x
    :param y1: start node y
    :param x2: end node x
    :param y2: end node y
    :return: bool of whether the point is on the segment
    """

    # calculate the cross product to determine if the point is on the segment
    cross_product = (py - y1) * (x2 - x1) - (px - x1) * (y2 - y1)
    # because of the floating point error, we use 1e-6 as the threshold
    if abs(cross_product) > 1e-6:
        return False

    # check if the point is within the x range
    # the range is extended by 1 to avoid the floating point error
    if px < min(x1, x2) - 1 or px > max(x1, x2) + 1:
        return False

    # check if the point is within the y range
    # the range is extended by 1 to avoid the floating point error
    if py < min(y1, y2) - 1 or py > max(y1, y2) + 1:
        return False

    return True


def update_segments_with_node(is_produce_node, segments, start_x, start_y, extra_node_id,
                              node_in_reaction_curve,
                              seg_id_for_debug=None):
    """
    Delete the target segment and insert new node and segments
    :param segments: all segments in the single reaction
    :param start_x: current x position
    :param start_y: current y position
    :param extra_node_id: current node id, which is not the same as the start/end node id
    :param node_in_reaction_curve: start/end node id, for the not found situation
    :param seg_id_for_debug: current segment id, for the debug
    :return: None
    """
    segment_to_remove = None
    from_node_id = None
    to_node_id = None

    # find the segment containing start_x and start_y
    for seg_id, segment in segments.items():
        from_node = nodes[segment['from_node_id']]
        to_node = nodes[segment['to_node_id']]
        if is_point_on_segment(start_x, start_y, from_node['x'], from_node['y'], to_node['x'],
                               to_node['y']):
            segment_to_remove = seg_id
            from_node_id = segment['from_node_id']
            to_node_id = segment['to_node_id']
            break

    # if no segment is found
    # create a new segment from the target(start/end) node to the current node
    if segment_to_remove is None:
        print("No segment found containing the point.", seg_id_for_debug)

        # the flux direction is from the reaction to the product node
        # reverse when the node is a substrate
        # cause the flux direction is from the substrate node to the reaction
        _from_node_id, _to_node_id = (
            node_in_reaction_curve, extra_node_id) if is_produce_node else (
            extra_node_id, node_in_reaction_curve)
        put_segment_to_segments(segments, extra_node_id, _from_node_id, _to_node_id)
        return

    # delete the target segment
    del segments[segment_to_remove]

    # create two new segments
    new_segment_1_id = f"{extra_node_id}-left"
    new_segment_2_id = f"{extra_node_id}-right"
    put_segment_to_segments(segments, new_segment_1_id, from_node_id, extra_node_id)
    put_segment_to_segments(segments, new_segment_2_id, extra_node_id, to_node_id)


def create_reaction_basic_info(model, specie2bigg, layout_width, layout_height):
    """
    Create the basic information of reactions, expect the label position and segments
    :param model: model object
    :param specie2bigg: species id to bigg_id, for the convenience of getting bigg_id
    :param layout_width: layout_width
    :param layout_height: layout_height
    :return: None
    """
    reactions = model['listOfReactions']['reaction']
    for reaction in reactions:
        reaction_id = reaction['@id']
        reaction_name = reaction['@name'] if '@name' in reaction else reaction_id
        reaction_reversible = reaction['@reversible'] == 'true'
        reaction_metabolites = get_metabolites_for_reaction(reaction, specie2bigg)
        edges[reaction_id] = {}
        edges[reaction_id]['name'] = reaction_name
        edges[reaction_id]['bigg_id'] = reaction_name
        edges[reaction_id]['reversibility'] = reaction_reversible
        edges[reaction_id]['metabolites'] = reaction_metabolites
        # set the default label position, outside the layout
        edges[reaction_id]['label_x'] = layout_width + 100
        edges[reaction_id]['label_y'] = layout_height + 100


def create_metabolite_nodes(specie2bigg, layout_root):
    """
    Create the nodes for metabolites, expect the multimarker nodes
    :param specie2bigg: species id to bigg_id, for the convenience of getting bigg_id
    :param layout_root: layout root object, contains all layout information
    :return: None
    """
    list_of_species_glyphs = layout_root['layout:listOfSpeciesGlyphs']['layout:speciesGlyph']
    for species_glyph in list_of_species_glyphs:
        layout_id = species_glyph['@layout:id']
        species_id = species_glyph['@layout:species']
        position = species_glyph['layout:boundingBox']['layout:position']
        width = species_glyph['layout:boundingBox']['layout:dimensions']['@layout:width']
        height = species_glyph['layout:boundingBox']['layout:dimensions']['@layout:height']
        name = specie2bigg[species_id]
        nodes[layout_id] = {
            'bigg_id': name,
            'name': name,
            'node_type': 'metabolite',
            'x': float(position['@layout:x']) + float(width) / 2,
            'y': float(position['@layout:y']) + float(height) / 2,
            'label_x': float(position['@layout:x']) + float(width) / 2,
            'label_y': float(position['@layout:y']) + float(height) / 2,
            'node_is_primary': False
        }


def create_reaction_segments(reaction_glyph, reaction_layout_id, segments, reaction):
    """
    Create the segments for a reaction, only the trunk reaction segments
    :param reaction_glyph: reaction glyph
    :param reaction_layout_id: reaction layout id
    :param segments: all segments in the single reaction
    :param reaction: current reaction object
    :return: reaction start node id and reaction end node id, for the connection of the metabolites
    """
    list_of_reaction_segments = []
    reaction_seg_start_node_id = None
    reaction_seg_end_node_id = None
    if 'layout:curve' in reaction_glyph:
        layout_curve = reaction_glyph['layout:curve']
        if layout_curve is not None and 'layout:listOfCurveSegments' in layout_curve:
            list_of_reaction_curves = layout_curve['layout:listOfCurveSegments']
            curve_segment_in_list = 'layout:curveSegment' in list_of_reaction_curves
            if list_of_reaction_curves is not None and curve_segment_in_list:
                list_of_reaction_segments = list_of_reaction_curves['layout:curveSegment']

    if isinstance(list_of_reaction_segments, dict):
        list_of_reaction_segments = [list_of_reaction_segments]

    length_of_reaction_segments = len(list_of_reaction_segments)
    # retrieve the line segments of reaction to create the segments of edges
    for index, reaction_segment in enumerate(list_of_reaction_segments):
        start = reaction_segment['layout:start']
        end = reaction_segment['layout:end']
        start_x = float(start['@layout:x'])
        start_y = float(start['@layout:y'])
        end_x = float(end['@layout:x'])
        end_y = float(end['@layout:y'])
        current_reaction_segment_id = f"{reaction_layout_id}-{index}"
        next_reaction_segment_id = f"{reaction_layout_id}-{index + 1}"

        start_id = f"{current_reaction_segment_id}"
        nodes[start_id] = {
            'node_type': 'multimarker',
            'x': start_x,
            'y': start_y,
        }
        end_id = f"{next_reaction_segment_id}-end"
        if index == length_of_reaction_segments - 1:
            # sign the end node, for the connection of the metabolites
            reaction_seg_end_node_id = end_id
            nodes[end_id] = {
                'node_type': 'multimarker',
                'x': end_x,
                'y': end_y,
            }
        if index == 0:
            # sign the start node, for the connection of the metabolites
            reaction_seg_start_node_id = start_id
            set_reaction_label_position(start, end, reaction)

        to_id = end_id if index == length_of_reaction_segments - 1 else next_reaction_segment_id
        put_segment_to_segments(segments, current_reaction_segment_id, start_id, to_id)

    return reaction_seg_start_node_id, reaction_seg_end_node_id


def create_metabolite_segments(reaction_glyph, reaction_layout_id, segments,
                               reaction_seg_start_node_id,
                               reaction_seg_end_node_id):
    """
    Create the segments for metabolites
    :param reaction_glyph: reaction glyph
    :param reaction_layout_id: reaction layout id
    :param segments: all segments in the single reaction
    :param reaction_seg_start_node_id: substart/sidesubstart connect to this node
    :param reaction_seg_end_node_id: this node connect to product/sideproduct
    :return: None
    """
    list_of_metabolite_curves = reaction_glyph['layout:listOfSpeciesReferenceGlyphs'][
        'layout:speciesReferenceGlyph']
    for metabolite_curve in list_of_metabolite_curves:
        metabolite_curve_id = f"{reaction_layout_id}-{metabolite_curve['@layout:id']}"
        role = metabolite_curve['@layout:role']
        mato_species_glyph = metabolite_curve['@layout:speciesGlyph']
        start_node_id = reaction_seg_start_node_id
        end_node_id = reaction_seg_end_node_id

        # get the list of curve segments in each metabolite
        list_of_metabolite_segments = \
            metabolite_curve['layout:curve']['layout:listOfCurveSegments'][
                "layout:curveSegment"]
        if isinstance(list_of_metabolite_segments, dict):
            list_of_metabolite_segments = [list_of_metabolite_segments]

        length_of_metabolite_segments = len(list_of_metabolite_segments)
        for index, metabolite_segment in enumerate(list_of_metabolite_segments):
            start_x = float(metabolite_segment['layout:start']['@layout:x'])
            start_y = float(metabolite_segment['layout:start']['@layout:y'])

            # mark the primary metabolites
            if is_main_metabolite(role):
                nodes[mato_species_glyph]['node_is_primary'] = True

            process_metabolite(role, index, start_node_id, end_node_id, start_x, start_y,
                               segments,
                               mato_species_glyph, length_of_metabolite_segments,
                               metabolite_curve_id)


# create the segments for all reactions
def create_all_segments(layout_root):
    """
    Create the segments for all reactions
    :param layout_root: layout root object, contains all layout information
    :return: None
    """
    list_of_reaction_glyphs = layout_root['layout:listOfReactionGlyphs']['layout:reactionGlyph']
    for reaction_glyph in list_of_reaction_glyphs:
        reaction = edges[reaction_glyph['@layout:reaction']]
        segments = {}
        reaction_layout_id = reaction_glyph['@layout:id']

        # add the segments of reaction
        reaction_seg_start_node_id, reaction_seg_end_node_id = create_reaction_segments(
            reaction_glyph,
            reaction_layout_id,
            segments, reaction)

        # create the segments of metabolites
        create_metabolite_segments(reaction_glyph, reaction_layout_id, segments,
                                   reaction_seg_start_node_id,
                                   reaction_seg_end_node_id)

        reaction['segments'] = segments
        edges[reaction_glyph['@layout:reaction']] = reaction


def sbml2escher(input_file_path, output_file_path, delete_temp_file=False):
    """
    Main function to convert the SBML JSON to Escher JSON
    :param input_file_path: input file path
    :param output_file_path: output file path
    :return: None
    """

    # Load your original sbml data
    xml_data = load_xml_data(input_file_path)

    # map basic information
    model = xml_data['sbml']['model']

    # create species2bigg, for the convenience of getting bigg_id
    specie2bigg = {}
    for sp in model['listOfSpecies']['species']:
        # cause the bigg_id converted by minerva is not the format we want
        # so we need to replace the brackets for the link to the metabolite or reaction
        specie2bigg[sp['@id']] = sp['@name']

    # define the list of layouts
    list_of_layouts = model['layout:listOfLayouts']
    # dict or list is better?
    if isinstance(list_of_layouts, dict):
        list_of_layouts = [list_of_layouts]

    layout_root = list_of_layouts[0]['layout:layout']
    layout_width = float(layout_root['layout:dimensions']['@layout:width'])
    layout_height = float(layout_root['layout:dimensions']['@layout:height'])

    # create reactions, expect the label position and segments
    create_reaction_basic_info(model, specie2bigg, layout_width, layout_height)

    # create nodes, expect the multimarker nodes
    create_metabolite_nodes(specie2bigg, layout_root)

    # create the segments of edges
    create_all_segments(layout_root)

    escher_maps = [{
        "map_name": model['@id'],
        "map_id": model['@id'],
        "map_description": "",
        "homepage": "https://escher.github.io",
        "schema": "https://escher.github.io/escher/jsonschema/1-0-0#"
    },
        {
            "reactions": edges,
            "nodes": nodes,
            "text_labels": {},
            "canvas": {
                "x": -layout_width / 20,
                "y": -layout_height / 20,
                "width": layout_width * 1.1,
                "height": layout_height * 1.1
            }
        }
    ]

    # Save the new JSON data
    save_json_data(escher_maps, output_file_path)

    # if it is celldesigner2escher, the script will create the `sbml` temp file
    # and delete it after the conversion
    if delete_temp_file:
        try:
            os.remove(input_file_path)
            print(f"File {input_file_path} deleted successfully")
        except OSError as e:
            print(f"Error: {input_file_path} - {e.strerror}")

    print(f"convert success, and save to {output_file_path}")


if __name__ == "__main__":
    start_time = time.time()
    parser = argparse.ArgumentParser(description='Process some JSON files.')
    parser.add_argument('--input', default='sbml.xml', help='Path to the input XML file')
    parser.add_argument('--output', default='sbml2escher_output.json',
                        help='Path to the output JSON file')

    args = parser.parse_args()
    INPUT_PATH = args.input
    OUPUT_PATH = args.output

    input_format, data = identify_file_type(INPUT_PATH)
    # Convert CellDesigner XML to SBML XML if needed
    if input_format in ('celldesigner', 'sbml'):
        if input_format == 'celldesigner':
            TEMP_OUTPUT_FILE_PATH = 'SBML_converted.xml'
            celldesigner2sbml(INPUT_PATH, TEMP_OUTPUT_FILE_PATH)
            INPUT_PATH = TEMP_OUTPUT_FILE_PATH

        sbml2escher(INPUT_PATH, OUPUT_PATH, input_format == 'celldesigner')
        end_time = time.time()
        print(f"Conversion completed in {end_time - start_time:.2f} seconds.")
    else:
        print(f"Error: The input file {INPUT_PATH} is not a valid CellDesigner or SBML XML file.")
        sys.exit(1)
