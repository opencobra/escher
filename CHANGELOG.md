# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.2] - 2025-10-27
### Changed
- Updated the `sbml2escher.py` script to use the latest version of the documentation.

## [1.8.1] - 2024-10-25
### Changed
- Re-tagged the repository to ensure that the Read the Docs `stable` version points to the latest release.

## [1.8.0] - 2024-10-24
### Added
- Added support for Python 3.12.
- Added the `sbml2escher.py` script, which supports converting SBML or CellDesigner-format SBML data to Escher JSON format.
- Added animation support for reaction data.
- Added the "Import Background", "Clear Background", and "Export as GIF" options to the map menu.
- Added the following features to the settings menu: "Open in VMH/biGG", "Line Style", "Hide No Data Reactions", and "Animation Speed".
- Added initial API support for `show_reaction_data_animation`, `animation_line_style`, `reaction_data_threshold`, `hidden_no_data_reaction`, `open_in_vmh`, `vmh_basic_url`, and `background_image_url`.

### Changed
- Migrated the test framework from Mochapack to Vitest.

### Fixed
- Fixed several bugs and optimized the logic for initializing and adding elements.
