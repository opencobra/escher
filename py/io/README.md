## This guide introduces the method for converting `CellDesigner` or `SBML` file formats to `Escher JSON` format.

### 1. Install the necessary packages

```bash
pip install json # for save the output file
pip install argparse # for parse the command line arguments
pip install sys # for exit the program
pip install xmltodict # for parse the xml file
pip install requests # for send the request to the MINERVA API
pip install os # for check the file existence in the process of deleting the temporary file
pip install xml # for parse the xml file so that we can identify the file format
```

### 2. Run the script

The whole process is to transform the `CellDesigner` or `SBML` file format to the `Escher JSON` file format.

If the input file format is `CellDesigner`, the script will use the public API provided by [MINERVA](https://minerva.pages.uni.lu/doc/api/16.4/index.html) to convert
the `CellDesigner` file format to the `SBML` file format, a process which you won't see.

If the input file format is `SBML`, the script will directly convert the `SBML` file format to the `Escher JSON` file format.


Example:

```bash
python celldesigner2escher.py --input=<input_file> --output=<output_file>
```

| Argument         | Description            | Default                           |
|------------------|------------------------|-----------------------------------|
| `--input`        | The input file path.   | `celldesigner.xml`                |
| `--output`       | The output file path.  | `celldesigner2escher_output.json` |

Tips:

1. If the output file is not a `JSON` type, there will be a warning.
2. If you don't specify the input file, the default input file will be `celldesigner.xml` in the current directory.
3. If you don't specify the output file, the default output file will be `celldesigner2escher_output.json` in the
   current directory.
