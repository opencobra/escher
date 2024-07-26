
## This is a introduction to the conversion method of `SBML` file format to `escher JSON` file format.

### 1. Install the necessary packages

```bash
pip install json
pip install argparse
pip install sys
pip install xmltodict
```

### 2. Run the script
Tips: if the output file is not a `JSON` type, there will be an warning.

```bash
python sbml2escher.py --input=<input_file> --output=<output_file>
```
If you don't specify the input file, the default input file will be `SBML.xml` in the current directory.
If you don't specify the output file, the default output file will be `sbml2escher_output.json` in the current directory.



