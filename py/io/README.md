## This guide introduces the method for converting `CellDesigner` or `SBML` file formats to `Escher JSON` format.

Before starting the installation, verify if Python 3 and pip are already installed:

- **Check Python 3 installation:**
    - Open a command prompt (Windows) or terminal (macOS/Linux) and type:
      ```
      python3 --version
      ```
    - If Python 3 is installed, it will display the version number. If not, no output will be shown or an error message will appear.


- **Check pip installation:**
    - In the same command prompt or terminal, type:
      ```
      pip --version
      ```
    - If pip is installed, it will show the version number. If pip is not installed, you'll see an error message indicating that pip is not recognized.

If both Python 3 and pip are installed, you can skip to Step 1. If not, please follow the installation instructions below to install Python 3 and pip.


### 0. Install Python and pip

#### Windows
- **Install Python:**
    - Follow the detailed guide on how to install Python 3 on Windows here: [Installing Python on Windows](https://www.dataquest.io/blog/installing-python-on-windows/).
    - Make sure to add Python to your PATH during the installation process.

- **Install pip:**
    - After installing Python 3, you can install pip by following this guide: [Installing PIP on Windows](https://www.dataquest.io/blog/install-pip-windows/).

#### macOS
- **Install Python 3 using Homebrew:**
   - If Homebrew is not installed, open Terminal and run:
     ```
     /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
     ```
   - Install Python 3:
     ```
     brew install python3
     ```
- **Verify pip installation:**
  - `pip` should be installed automatically with Python 3. To verify that `pip` is installed, type the following command in Terminal:
    ```
    pip --version
    ```
    - If `pip` is installed, you should see a version number. If not, you can install `pip` by running:
    ```
    python3 -m ensurepip --upgrade
    ```

#### Linux (Debian/Ubuntu)
- **Install Python 3:**
   - Open Terminal and run:
     ```
     sudo apt update
     sudo apt install python3 python3-pip
     ```

### 1. Setup Virtual Environment and Install Dependencies

#### a. Download the `sbml2escher.py` script, click the "Download" button at the top right of the [page](https://github.com/opencobra/escher/blob/master/py/io/sbml2escher.py).

- Open a terminal (Linux/macOS) or command prompt (Windows).
- Navigate to the directory containing the `sbml2escher.py` file:
```
cd path/to/directory/containing/sbml2escher.py
```
- Confirm you are in the correct directory by listing the contents: 
```
   ls  # On Linux/macOS
   dir # On Windows
```
- Look for the `sbml2escher.py` file in the output to verify its presence.
    
In both cases, using the `ls` (Linux/macOS) or `dir` (Windows) command allows you to see the files and ensure you are in the correct directory. This is crucial before proceeding with any further operations such as setting up environments or running scripts.

#### b. **Create a virtual environment:**
   - Run:
     ```
     python3 -m venv venv
     ```

#### c. **Activate the virtual environment:**
   - On Windows:
     ```
     .\venv\Scripts\activate
     ```
   - On macOS/Linux:
     ```
     source venv/bin/activate
     ```

#### d. **Install dependencies:**
   - Ensure your virtual environment is active and run:
     ```
     pip install xmltodict requests
     ```

### 2. Run the script

The entire process involves converting the `CellDesigner` or `SBML` file format to the `Escher JSON` file format.

> Note: Ensure that the file names do not contain any spaces.

If the input file format is `CellDesigner`, the script will utilize the public API provided by [MINERVA](https://minerva.pages.uni.lu/doc/api/16.4/index.html) to convert the `CellDesigner` file format to the `SBML` file format. This intermediate step is handled behind the scenes.

If the input file format is `SBML`, the script will directly convert the `SBML` file format to the `Escher JSON` file format.


Example:

```bash
python3 sbml2escher.py --input=<input_file> --output=<output_file>
```

| Argument         | Description            | Default                           |
|------------------|------------------------|-----------------------------------|
| `--input`        | The input file path.   | `sbml.xml`                |
| `--output`       | The output file path.  | `sbml2escher_output.json` |

Tips:

1. If the output file is not a `JSON` type, there will be a warning.
2. If you don't specify the input file, the default input file will be `sbml.xml` in the current directory.
3. If you don't specify the output file, the default output file will be `sbml2escher_output.json` in the
   current directory.

### Q&A

**Q1: What should I do if I encounter the "brew-core is a shallow clone" issue while installing Python 3 on macOS using Homebrew?**

A: If you encounter the "brew-core is a shallow clone" issue during the installation of Python 3 on macOS via Homebrew, you can resolve it by following these steps:

```bash
cd /usr/local/Homebrew/Library/Taps/homebrew/
rm -rf homebrew-core
git clone https://github.com/Homebrew/homebrew-core.git
```

For more details, you can refer to this Stack Overflow discussion: [How to remove the shallow clone warning from Homebrew](https://stackoverflow.com/questions/45782694/how-to-remove-the-shallow-clone-warning-from-homebrew).

**Q2: What should I do if I encounter the error `sbml2escher.py: error: unrecognized arguments:` when running the script?**

A: If you encounter the error `sbml2escher.py: error: unrecognized arguments:` while running the script, please check if the input or output file name contains any spaces. Ensure that the file names do not have spaces, as spaces can cause this error.