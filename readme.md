# Carbon Data Table Plugin

A Figma plugin for creating and managing IBM Carbon Design System data tables. Build tables from scratch, import from files, or extract data from existing table components.

## What is Carbon?

Carbon Design System is IBM's open-source design system for digital products and experiences. This plugin uses Carbon's official data table components.

**Carbon Design System**: [https://www.figma.com/community/file/1157761560874207208/v11-carbon-design-system](https://www.figma.com/community/file/1157761560874207208/v11-carbon-design-system)

## Requirements

- **Carbon Design System library** must be enabled in your Figma file
- The plugin will show setup instructions if the library isn't detected

## Features

### Table Builder
- Interactive grid editor (up to 12 columns × 13 rows)
- Add/remove rows and columns
- Live cell editing

### Variants
- Default, Checkbox, Radio selection types
- Expandable rows (Default & Checkbox)
- Batch actions (Checkbox)

### Pagination
- Advanced, Simple, Unbound types
- Customizable text values

### Data Import
- Upload CSV, XLSX, or JSON files (max 50KB)
- Automatic parsing and grid population

### Data Extraction
- Fetch data from existing Carbon Data Table components
- Extract cell values, variants, and pagination settings

### Table Modification
- Update existing table components
- Change variants, content, and pagination

## Installation

1. Run `npm install`
2. Run `npm run build`
3. In Figma: **Plugins** → **Development** → **Import plugin from manifest…**
4. Select `manifest.json`

## Version

**v1.0.0** - Initial release with all core features

## License

MIT

## Author

Sandeep Baskaran
