## This is an introduction to the conversion method of `celldesigner` file format to `escher JSON` file format.

### 1. Install the necessary packages

```bash
pip install json
pip install argparse
pip install sys
pip install xmltodict
pip install requests
```

### 2. Run the script

The whole process is to transform the `celldesigner` file format to the `escher JSON` file format.

First, we will use the public API provided by [MINERVA](https://minerva.pages.uni.lu/doc/api/16.4/index.html) to convert
the `celldesigner` file format to the `SBML` file format, a process which you won't see.

Then, we will use our script to convert the `SBML` file format to the `escher JSON` file format.

However, if you specify the input file format as `sbml`, the script will directly convert the `SBML` file format to
the `escher JSON` file format.

Example:

```bash
python celldesigner2escher.py --input=<input_file> --output=<output_file> --input-format=<'celldesigner'|'sbml'>
```

| Argument         | Description            | Default                           |
|------------------|------------------------|-----------------------------------|
| `--input`        | The input file path.   | `celldesigner.xml`                |
| `--output`       | The output file path.  | `celldesigner2escher_output.json` |
| `--input-format` | The input file format. | `celldesigner`                    |

Tips:

1. If the output file is not a `JSON` type, there will be a warning.
2. If you don't specify the input file, the default input file will be `celldesigner.xml` in the current directory.
3. If you don't specify the output file, the default output file will be `celldesigner2escher_output.json` in the
   current directory.
