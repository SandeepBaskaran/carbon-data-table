# Carbon Data Table Plugin

A Figma plugin for creating and managing Carbon Design System data tables with full customization support. Build tables from scratch or extract data from existing tables in your designs.

## Installation

### Installation Steps

1. **Install dependencies**: Run `npm install`
2. **Build the plugin**: Run `npm run build`
3. **Open Figma** and go to **Plugins** → **Development** → **Import plugin from manifest…**
4. **Select** the `manifest.json` file from this project directory

## Usage

### Creating a New Table

1. Open the plugin: **Plugins** → **Development** → **sandeepbaskaran/carbon-data-table**
2. **Configure Body Variant**: 
   - Select variant: Default, Select Checkbox, or Select Radio
   - Enable "Expandable" if needed (Default & Checkbox only)
   - Enable "Show Batch Actions" if needed (Checkbox only)
3. **Build Your Table**:
   - Use the grid editor to add/remove rows and columns
   - Click on cells to edit their content
   - Header row (first row) is automatically styled
   - Add rows/columns using the + buttons
   - Remove rows/columns by hovering over headers and clicking −
4. **Configure Pagination**:
   - Choose pagination type: Advanced, Simple, or Unbound
   - For Advanced: Set items per page, total items, and total pages text
   - For Simple/Unbound: Set current page text
5. **Insert Table**: Click "Insert Table" to create the table on your canvas

### Fetching Data from Existing Tables

1. **Select an existing Carbon Data Table** component in your Figma canvas
2. The plugin UI will automatically detect the selection and show "Fetch table data" button
3. Click **"Fetch table data"** to extract:
   - All cell values (header and body rows)
   - Table variant configuration (Default/Checkbox/Radio)
   - Expandable and batch actions settings
   - Pagination component type and values
4. The plugin UI will populate with all the extracted data
5. You can now modify the data and click "Modify Table" to update the selected table

### Modifying Existing Tables

1. **Select an existing Carbon Data Table** component in your Figma canvas
2. The plugin will detect the selection and change the button to "Modify Table"
3. Make your changes in the plugin UI:
   - Edit cell values in the grid
   - Change body variant or options
   - Update pagination settings
4. Click **"Modify Table"** to apply changes to the selected table

### Uploading Data from Files

1. Click the **"Upload .csv/.xlsx/.json"** button in the footer
2. Select a file from your computer:
   - **CSV files**: Comma-separated values format
   - **XLSX files**: Microsoft Excel format
   - **JSON files**: JavaScript Object Notation format
3. The plugin will automatically:
   - Validate file type and size (max 50KB)
   - Parse the file content
   - Update the table grid with the data
   - Create or delete rows/columns as needed
4. **Limits**: Maximum 13 rows (1 header + 12 data rows) and 12 columns. Extra data beyond these limits will be ignored.
5. After upload, you can edit the data and click "Insert Table" or "Modify Table" to apply changes

## Features

### 📊 Table Builder
- **Dynamic Grid Editor**: Interactive table editor with visual controls
- **Flexible Sizing**: Up to 12 columns and 13 rows (1 header + 12 body rows)
- **Default Values**: Auto-fills new cells with "Header" or "Content"
- **Add/Remove**: Easily add or remove rows and columns with + and − buttons
- **Live Editing**: Edit cell content directly in the plugin UI

### 🎨 Body Variants
Choose from multiple table body styles:
- **Default**: Standard data table
- **Select Checkbox**: Row selection with checkboxes
- **Select Radio**: Row selection with radio buttons

**Additional Options:**
- **Expandable**: Add expandable row functionality (Default & Checkbox only)
- **Show Batch Actions**: Enable batch action bar (Checkbox only)

### 📄 Pagination Variants
Configure pagination with three different styles:

**Advanced Pagination:**
- Items per page (customizable)
- Total items display (e.g., "1–100 of 100 items")
- Total pages indicator (e.g., "of 10 pages")

**Simple Pagination:**
- Current page display (e.g., "Page 1")

**Unbound Pagination:**
- Current page display without total pages

### 🔄 Insert & Modify
- **Insert Table**: Create a new table with your configuration
- **Modify Table**: Select an existing table to update its:
  - Content (all cells)
  - Body variant
  - Pagination variant
  - Pagination text values

### 📥 Fetch Table Data
- **Extract from Canvas**: Select any Carbon Data Table component and fetch its data
- **Automatic Detection**: Plugin automatically detects valid table selections
- **Complete Extraction**: Retrieves all cell values, variant settings, and pagination configuration
- **Seamless Editing**: Fetched data populates the plugin UI for easy modification

### 📤 Upload Data from Files
- **Multiple Formats**: Support for CSV, XLSX (Excel), and JSON file formats
- **File Validation**: Automatic validation of file type and size (50KB maximum)
- **Automatic Parsing**: Intelligently parses file content and converts to table format
- **Dynamic Grid**: Automatically creates or deletes rows and columns based on uploaded data
- **Data Limits**: Respects plugin limits (13 rows max, 12 columns max) and ignores extra data
- **JSON Support**: Handles arrays of objects, arrays of arrays, and single object formats

### 🎨 Theming
- **Auto Dark/Light Mode**: Matches Figma's theme automatically
- **Carbon Design System**: Uses official IBM Carbon components

## Version

**Current Version: v1.0.0**

This version includes all features:
- Table builder with dynamic grid editor
- Multiple body variants (Default, Checkbox, Radio)
- Expandable rows and batch actions support
- Three pagination types (Advanced, Simple, Unbound)
- Fetch table data from existing components
- Modify existing tables
- Upload data from CSV, XLSX, and JSON files
- Auto dark/light mode theming

## License

MIT

## Author

Sandeep Baskaran
