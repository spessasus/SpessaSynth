# Adding a New Locale

### Contributing a New Translation

We welcome contributions from translators! To add a new locale, please follow these steps:

1. **Create a New Locale Folder**
    - Create a new folder in `src/website/locale/locale_files` named `locale_[your language 2-letter ISO code]`. For example, for German, the folder name would be `locale_de`.

2. **Copy an Existing Locale**
    - Copy the contents of `locale_en` (or any other existing locale you want to translate from) into your new folder.

3. **Update `locale.js`**
    - Open `locale.js` in your new folder.
    - Rename all instances of `export const localeEnglish` to reflect your language. For example, `localeEnglish` would become `localeGerman` for German.

4. **Translate Strings**
    - Translate all the strings in the `locale.js` file and all `.js` files in the folder.
    - You may add comments to indicate who translated the text, e.g., `// translated by: XYZ`.

5. **Update `locale_list.js`**
    - Open `locale_list.js`.
    - Add a new entry for your locale. For example, for German, add: `"de": localeGerman,`.

6. **Submit a Pull Request**
    - After completing the translation and updates, create a pull request with your changes.

<!--don't use github !NOTE here as people might open this README in a text editor-->
> **Note:** Strings containing placeholders, like `Channel {0}`, should keep the placeholders intact. They are used for formatting and should not be altered.
